import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a payment processing fails
 * Returns HTTP 402 Payment Required
 */
export class PaymentFailedException extends HttpException {
  constructor(reason: string, paymentIntentId?: string, declineCode?: string) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'PAYMENT_FAILED',
        message: `Payment failed: ${reason}`,
        details: {
          reason,
          paymentIntentId,
          declineCode,
        },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
