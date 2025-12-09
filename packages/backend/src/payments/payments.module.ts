import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { HelcimService } from './helcim.service';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => SettlementsModule)],
  providers: [PaymentsService, HelcimService],
  controllers: [PaymentsController, PaymentsWebhookController],
  exports: [HelcimService],
})
export class PaymentsModule {}
