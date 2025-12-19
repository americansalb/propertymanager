import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
  type OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { execSync } from 'child_process';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { CorrelationIdMiddleware } from './logger/correlation-id.middleware';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { createWinstonOptions } from './logger/logger.config';
import { PrismaService } from './prisma/prisma.service';

// Core modules
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { LeasesModule } from './leases/leases.module';
import { FinancialModule } from './financial/financial.module';
import { PaymentsModule } from './payments/payments.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { VendorsModule } from './vendors/vendors.module';
import { ReportsModule } from './reports/reports.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduledTasksModule } from './scheduled/scheduled-tasks.module';
import { TenantAuthModule } from './tenant-auth/tenant-auth.module';
import { TenantPortalModule } from './tenant-portal/tenant-portal.module';
import { TenantsModule } from './tenants/tenants.module';
import { EmailModule } from './email/email.module';
import { MobileModule } from './mobile/mobile.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { RequestLoggerMiddleware } from './monitoring/request-logger.middleware';
import { SettlementsModule } from './settlements/settlements.module';

@Module({
  controllers: [AppController],
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logging
    WinstonModule.forRoot(createWinstonOptions()),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),

    // Core modules
    PrismaModule,
    EmailModule,
    StorageModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PropertiesModule,
    UnitsModule,
    LeasesModule,
    FinancialModule,
    PaymentsModule,
    WorkOrdersModule,
    VendorsModule,
    ReportsModule,
    EventsModule,
    NotificationsModule,
    ScheduledTasksModule,
    TenantAuthModule,
    TenantPortalModule,
    TenantsModule,
    MobileModule,
    DocumentsModule,
    HealthModule,
    MonitoringModule,
    MarketplaceModule,
    SettlementsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger('DatabaseSetup');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const dbPath = join(process.cwd(), 'packages', 'database');
    this.logger.log('🔧 DATABASE SETUP STARTING...');
    this.logger.log(`Database path: ${dbPath}`);

    // Run db push to ensure schema is in sync
    try {
      this.logger.log('📦 Running prisma db push...');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        cwd: dbPath,
        stdio: 'inherit',
        env: { ...process.env },
      });
      this.logger.log('✅ DB push complete');
    } catch (e: unknown) {
      this.logger.error(`❌ DB push failed: ${e instanceof Error ? e.message : e}`);
    }

    // Unlock landlord account and set password on every deploy
    try {
      const landlordEmail = 'landlord@aalb.org';
      const landlordPassword = 'winner';
      const passwordHash = await bcrypt.hash(landlordPassword, 12);

      const result = await this.prisma.user.updateMany({
        where: { email: landlordEmail },
        data: {
          passwordHash,
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });

      if (result.count > 0) {
        this.logger.log(`✅ Landlord account unlocked and password set`);
      }
    } catch (e: unknown) {
      this.logger.error(
        `❌ Failed to update landlord account: ${e instanceof Error ? e.message : e}`,
      );
    }

    this.logger.log('🔧 DATABASE SETUP FINISHED');
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
