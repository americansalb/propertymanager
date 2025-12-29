import {
  Controller,
  Post,
  Body,
  HttpCode,
  Logger,
  Headers,
  UnauthorizedException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { type Request } from 'express';
import * as crypto from 'crypto';

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
  private readonly webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('HELCIM_WEBHOOK_SECRET') || '';
    if (!this.webhookSecret) {
      this.logger.warn('HELCIM_WEBHOOK_SECRET not configured - webhook verification disabled');
    }
  }

  /**
   * Verify Helcim webhook signature using HMAC-SHA256
   */
  private verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      // In production without a secret, reject all webhooks for security
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        this.logger.error('Webhook rejected: HELCIM_WEBHOOK_SECRET not configured in production');
        return false;
      }
      // In development, log warning but allow (for testing)
      this.logger.warn('Webhook signature verification skipped - no secret configured');
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
      this.logger.error('Signature verification error', error);
      return false;
    }
  }

  @Post('helcim')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleHelcimWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-helcim-signature') signature: string,
    @Body() event: HelcimWebhookEvent,
  ) {
    // Get raw body for signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(event);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // In production, always require signature if webhook secret is configured
    if (isProduction && this.webhookSecret && !signature) {
      this.logger.warn(
        `Webhook rejected: Missing signature for transaction ${event.transactionId}`,
      );
      throw new UnauthorizedException('Webhook signature required');
    }

    // Verify webhook signature if provided
    if (signature && !this.verifySignature(rawBody, signature)) {
      this.logger.warn(`Invalid webhook signature for transaction ${event.transactionId}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Log with security context
    this.logger.log({
      message: 'Helcim webhook received',
      event: event.event,
      transactionId: event.transactionId,
      signatureProvided: !!signature,
      signatureValid: !!signature,
    });

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
