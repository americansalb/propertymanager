import { Controller, Post, Headers, RawBodyRequest, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { StripeService } from './stripe.service';

@ApiTags('payments')
@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private stripeService: StripeService) {}

  @Post('stripe')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!request.rawBody) {
      throw new Error('Raw body not available');
    }

    const event = await this.stripeService.handleWebhook(signature, request.rawBody);

    return { received: true, eventId: event.id };
  }
}
