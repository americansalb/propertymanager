import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { CorrelationIdMiddleware } from './logger/correlation-id.middleware';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { createWinstonOptions } from './logger/logger.config';

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
import { EmailModule } from './email/email.module';
import { MobileModule } from './mobile/mobile.module';

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
    MobileModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
