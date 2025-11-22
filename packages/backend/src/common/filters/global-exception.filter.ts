import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as Sentry from '@sentry/node';
import { getRequestContextMeta } from '../request-context';

/**
 * Global exception filter that:
 * - Catches all unhandled exceptions
 * - Logs errors via Winston
 * - Sends errors to Sentry (production only)
 * - Returns consistent error response format
 * - Includes correlationId for tracing
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract request context (correlationId, userId, organizationId)
    const { correlationId, userId, organizationId } = getRequestContextMeta(request);

    // Determine HTTP status and error message
    const { status, message, code, errors } = this.parseException(exception);

    // Log the error
    this.logError(exception, {
      correlationId,
      userId,
      organizationId,
      path: request.url,
      method: request.method,
      status,
      code,
    });

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(exception, {
        user: userId
          ? {
              id: userId,
              organizationId,
            }
          : undefined,
        tags: {
          correlationId,
          path: request.url,
          method: request.method,
        },
      });
    }

    // Build error response
    const errorResponse = {
      success: false,
      error: {
        message,
        code,
        statusCode: status,
        correlationId,
        ...(errors && { errors }),
        ...(process.env.NODE_ENV !== 'production' && exception instanceof Error && { stack: exception.stack }),
      },
    };

    response.status(status).json(errorResponse);
  }

  private parseException(exception: unknown): {
    status: number;
    message: string;
    code: string;
    errors?: string[];
  } {
    // Handle NestJS HttpException (includes BadRequestException, NotFoundException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && 'message' in response) {
        return {
          status,
          message: Array.isArray(response.message)
            ? response.message[0]
            : (response.message as string),
          code: this.getErrorCode(status),
          errors: Array.isArray(response.message) ? response.message : undefined,
        };
      }

      return {
        status,
        message: exception.message,
        code: this.getErrorCode(status),
      };
    }

    // Handle Prisma errors
    if (this.isPrismaError(exception)) {
      return this.parsePrismaError(exception);
    }

    // Handle generic Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      };
    }

    // Unknown exception type
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  private isPrismaError(exception: unknown): exception is { code: string; meta?: { target?: string[] } } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string'
    );
  }

  private parsePrismaError(error: { code: string; meta?: { target?: string[] } }): {
    status: number;
    message: string;
    code: string;
  } {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${error.meta?.target?.[0] || 'value'} already exists`,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        };

      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
          code: 'FOREIGN_KEY_VIOLATION',
        };

      case 'P2014':
        // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required relation missing',
          code: 'REQUIRED_RELATION_VIOLATION',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
          code: 'DATABASE_ERROR',
        };
    }
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return codes[status] || 'UNKNOWN_ERROR';
  }

  private logError(
    exception: unknown,
    context: {
      correlationId?: string;
      userId?: string;
      organizationId?: string;
      path: string;
      method: string;
      status: number;
      code: string;
    },
  ) {
    const logData = {
      message: 'http.error',
      ...context,
      error: {
        name: exception instanceof Error ? exception.name : 'UnknownError',
        message: exception instanceof Error ? exception.message : String(exception),
      },
    };

    // Log as error for 5xx, warn for 4xx
    if (context.status >= 500) {
      this.logger.error(
        logData,
        exception instanceof Error ? exception.stack : undefined,
        GlobalExceptionFilter.name,
      );
    } else {
      this.logger.warn(logData, GlobalExceptionFilter.name);
    }
  }
}
