import { Injectable, NestMiddleware, Inject, LoggerService } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

interface RequestLog {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength?: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  organizationId?: string;
  correlationId?: string;
  error?: string;
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  // Paths to exclude from logging (health checks, metrics, etc.)
  private readonly excludedPaths = [
    '/api/v1/health',
    '/api/v1/health/live',
    '/api/v1/health/ready',
    '/api/v1/health/metrics',
    '/favicon.ico',
  ];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip logging for excluded paths
    if (this.excludedPaths.some((path) => req.url.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();

    // Capture original end function
    const originalEnd = res.end.bind(res);

    // Override end function to log after response
    res.end = (...args: unknown[]): Response => {
      const responseTime = Date.now() - startTime;

      // Get user info from request (set by JWT middleware)
      const user = (req as Request & { user?: { id?: string; organizationId?: string } }).user;

      const logData: RequestLog = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime,
        contentLength: res.get('Content-Length'),
        userAgent: req.get('User-Agent'),
        ip: this.getClientIp(req),
        correlationId: (req as Request & { correlationId?: string }).correlationId,
      };

      // Add user context if available
      if (user) {
        logData.userId = user.id;
        logData.organizationId = user.organizationId;
      }

      // Log based on status code
      if (res.statusCode >= 500) {
        this.logger.error({
          message: 'http.request.error',
          ...logData,
        });
      } else if (res.statusCode >= 400) {
        this.logger.warn({
          message: 'http.request.client_error',
          ...logData,
        });
      } else if (responseTime > 3000) {
        // Log slow requests
        this.logger.warn({
          message: 'http.request.slow',
          ...logData,
        });
      } else {
        this.logger.log({
          message: 'http.request',
          ...logData,
        });
      }

      // Call original end
      return originalEnd(...(args as Parameters<typeof originalEnd>)) as Response;
    };

    next();
  }

  /**
   * Get client IP address, accounting for proxies
   */
  private getClientIp(req: Request): string {
    // Check for forwarded IP (behind load balancer/proxy)
    const forwardedFor = req.get('X-Forwarded-For');
    if (forwardedFor) {
      // Get first IP in chain (original client)
      return forwardedFor.split(',')[0].trim();
    }

    // Check for real IP header (nginx)
    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    // Fall back to socket address
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
