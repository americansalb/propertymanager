import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [PaymentsService, StripeService],
  controllers: [PaymentsController, PaymentsWebhookController],
  exports: [StripeService],
})
export class PaymentsModule {}
