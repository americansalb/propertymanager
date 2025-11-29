import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeasesModule } from '../leases/leases.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    LeasesModule,
    NotificationsModule,
    PaymentsModule,
    FinancialModule,
  ],
  providers: [ScheduledTasksService],
  exports: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
