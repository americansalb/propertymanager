import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn('Stripe secret key not configured');
      return;
    }

    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    this.logger.log('Stripe service initialized');
  }

  /**
   * Create a payment intent for rent payment
   */
  async createPaymentIntent(
    amount: number,
    tenantId: string,
    chargeIds: string[],
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { lease: { include: { unit: { include: { property: true } } } } },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tenantId,
        chargeIds: chargeIds.join(','),
        propertyId: tenant.lease.unit.property.id,
        unitId: tenant.lease.unitId,
        ...metadata,
      },
      description: `Rent payment for ${tenant.lease.unit.property.name} - Unit ${tenant.lease.unit.unitNumber}`,
    });

    this.logger.log(`Payment intent created: ${paymentIntent.id} for ${amount}`);

    return paymentIntent;
  }

  /**
   * Create or retrieve Stripe customer for tenant
   */
  async getOrCreateCustomer(
    tenantId: string,
    email: string,
    name: string,
  ): Promise<Stripe.Customer> {
    // Check if customer already exists in our database
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant && (tenant as any).stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve((tenant as any).stripeCustomerId);
        if (!customer.deleted) {
          return customer as Stripe.Customer;
        }
      } catch (error) {
        this.logger.warn(`Stripe customer not found, creating new one`);
      }
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        tenantId,
      },
    });

    this.logger.log(`Stripe customer created: ${customer.id}`);

    return customer;
  }

  /**
   * Save payment method for recurring payments
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    this.logger.log(`Payment method ${paymentMethodId} attached to customer ${customerId}`);

    return paymentMethod;
  }

  /**
   * Create subscription for auto-pay
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata,
    });

    this.logger.log(`Subscription created: ${subscription.id}`);

    return subscription;
  }

  /**
   * Process refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason,
  ): Promise<Stripe.Refund> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason,
    });

    this.logger.log(`Refund created: ${refund.id}`);

    return refund;
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(signature: string, payload: Buffer): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    this.logger.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return event;
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { tenantId, chargeIds } = paymentIntent.metadata;

    if (!tenantId || !chargeIds) {
      this.logger.error('Missing metadata in payment intent');
      return;
    }

    const amount = paymentIntent.amount / 100;

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        method: this.mapPaymentMethod(paymentIntent.payment_method_types[0]),
        status: 'COMPLETED',
        amount,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: paymentIntent.latest_charge as string,
        paymentDate: new Date(),
      },
    });

    this.logger.log(`Payment recorded: ${payment.id}`);

    // Allocate payment to charges
    const chargeIdList = chargeIds.split(',');
    let remainingAmount = amount;

    for (const chargeId of chargeIdList) {
      if (remainingAmount <= 0) break;

      const charge = await this.prisma.charge.findUnique({
        where: { id: chargeId },
      });

      if (!charge) continue;

      const chargeBalance = Number(charge.amount) - Number(charge.amountPaid);
      const allocationAmount = Math.min(remainingAmount, chargeBalance);

      await this.prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          chargeId: charge.id,
          amount: allocationAmount,
        },
      });

      await this.prisma.charge.update({
        where: { id: chargeId },
        data: {
          amountPaid: Number(charge.amountPaid) + allocationAmount,
          status:
            Number(charge.amountPaid) + allocationAmount >= Number(charge.amount)
              ? 'PAID'
              : 'PARTIALLY_PAID',
        },
      });

      remainingAmount -= allocationAmount;
    }

    this.logger.log(`Payment allocated across ${chargeIdList.length} charges`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const { tenantId } = paymentIntent.metadata;

    if (!tenantId) {
      this.logger.error('Missing tenantId in payment intent');
      return;
    }

    await this.prisma.payment.create({
      data: {
        tenantId,
        method: this.mapPaymentMethod(paymentIntent.payment_method_types[0]),
        status: 'FAILED',
        amount: paymentIntent.amount / 100,
        stripePaymentIntentId: paymentIntent.id,
        paymentDate: new Date(),
      },
    });

    this.logger.warn(`Payment failed for tenant: ${tenantId}`);
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    // Store subscription info in database
    this.logger.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
  }

  /**
   * Handle subscription canceled
   */
  private async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription canceled: ${subscription.id}`);
  }

  /**
   * Map Stripe payment method to our enum
   */
  private mapPaymentMethod(stripeMethod: string): any {
    switch (stripeMethod) {
      case 'card':
        return 'CREDIT_CARD';
      case 'us_bank_account':
        return 'ACH';
      default:
        return 'CREDIT_CARD';
    }
  }

  /**
   * Get payment methods for customer
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  /**
   * Calculate platform fee (for marketplace model)
   */
  calculatePlatformFee(amount: number, feePercentage: number = 2.5): number {
    return Math.round(amount * (feePercentage / 100) * 100) / 100;
  }
}
