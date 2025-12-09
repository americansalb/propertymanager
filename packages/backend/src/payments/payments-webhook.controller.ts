import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

interface HelcimWebhookEvent {
  event: string;
  transactionId: number;
  status: string;
  amount: number;
  cardToken?: string;
  customerCode?: string;
  invoiceNumber?: string;
}

@ApiTags('payments')
@Controller('payments/webhook')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post('helcim')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleHelcimWebhook(@Body() event: HelcimWebhookEvent) {
    this.logger.log(`Helcim webhook received: ${event.event} - Transaction ${event.transactionId}`);

    // Find the payment by Helcim transaction ID
    const payment = await this.prisma.payment.findFirst({
      where: { helcimTransactionId: String(event.transactionId) },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for transaction ${event.transactionId}`);
      return { received: true, processed: false };
    }

    // Update payment status based on webhook event
    switch (event.event) {
      case 'transaction.approved':
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });
        break;

      case 'transaction.declined':
      case 'transaction.failed':
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
        break;

      case 'transaction.refunded':
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });
        break;

      default:
        this.logger.debug(`Unhandled Helcim event type: ${event.event}`);
    }

    return { received: true, eventType: event.event, transactionId: event.transactionId };
  }
}
