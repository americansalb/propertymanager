import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: {
    database: ComponentHealth;
    memory: ComponentHealth;
    disk?: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  details?: Record<string, unknown>;
}

interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: {
    database: boolean;
    configuration: boolean;
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.startTime = Date.now();
  }

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async healthCheck(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const environment = this.configService.get<string>('NODE_ENV') || 'development';

    // Check database
    const databaseHealth = await this.checkDatabase();

    // Check memory
    const memoryHealth = this.checkMemory();

    // Determine overall status
    let status: HealthStatus['status'] = 'healthy';
    if (databaseHealth.status === 'down') {
      status = 'unhealthy';
    } else if (databaseHealth.status === 'degraded' || memoryHealth.status === 'degraded') {
      status = 'degraded';
    }

    return {
      status,
      timestamp,
      version: process.env.npm_package_version || '0.1.0',
      uptime,
      environment,
      checks: {
        database: databaseHealth,
        memory: memoryHealth,
      },
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for Kubernetes/orchestrators' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readinessCheck(): Promise<ReadinessStatus> {
    const timestamp = new Date().toISOString();

    // Check database connection
    let databaseReady = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseReady = true;
    } catch {
      databaseReady = false;
    }

    // Check configuration
    const configurationReady = this.checkConfiguration();

    const ready = databaseReady && configurationReady;

    return {
      ready,
      timestamp,
      checks: {
        database: databaseReady,
        configuration: configurationReady,
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check for Kubernetes/orchestrators' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async livenessCheck(): Promise<{ alive: boolean; timestamp: string }> {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  @ApiOperation({ summary: 'Get application version info' })
  @ApiResponse({ status: 200, description: 'Version information' })
  getVersion(): {
    version: string;
    nodeVersion: string;
    environment: string;
    buildTime?: string;
  } {
    return {
      version: process.env.npm_package_version || '0.1.0',
      nodeVersion: process.version,
      environment: this.configService.get<string>('NODE_ENV') || 'development',
      buildTime: process.env.BUILD_TIME,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get basic application metrics' })
  @ApiResponse({ status: 200, description: 'Application metrics' })
  getMetrics(): {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: NodeJS.CpuUsage;
  } {
    const memoryUsage = process.memoryUsage();
    const _totalMemory = require('os').totalmem();

    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      cpu: process.cpuUsage(),
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      // Degraded if response > 1000ms
      const status = responseTime > 1000 ? 'degraded' : 'up';

      return {
        status,
        responseTime,
        details: {
          type: 'postgresql',
        },
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  private checkMemory(): ComponentHealth {
    const memoryUsage = process.memoryUsage();
    const heapPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status: ComponentHealth['status'] = 'up';
    if (heapPercentage > 90) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapPercentage: Math.round(heapPercentage),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
    };
  }

  private checkConfiguration(): boolean {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
    ];

    return requiredEnvVars.every((envVar) => {
      const value = this.configService.get<string>(envVar);
      return value !== undefined && value !== '';
    });
  }
}
