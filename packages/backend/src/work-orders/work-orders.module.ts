import { Module } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [WorkOrdersService],
  controllers: [WorkOrdersController],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
