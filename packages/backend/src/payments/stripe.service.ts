import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StripeService {
  private stripe!: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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
      include: {
        unit: { include: { property: true } },
        lease: { include: { unit: { include: { property: true } } } },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get unit and property from direct assignment or lease
    const unitData = tenant.unit || tenant.lease?.unit;
    const propertyData = tenant.unit?.property || tenant.lease?.unit?.property;

    if (!unitData || !propertyData) {
      throw new Error('Tenant has no unit assigned');
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
        propertyId: propertyData.id,
        unitId: unitData.id,
        ...metadata,
      },
      description: `Rent payment for ${propertyData.name} - Unit ${unitData.unitNumber}`,
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

    // Get tenant with lease info for notification
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

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
      if (remainingAmount <= 0) {
        break;
      }

      const charge = await this.prisma.charge.findUnique({
        where: { id: chargeId },
      });

      if (!charge) {
        continue;
      }

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

    // Send payment received notification
    if (tenant && tenant.lease) {
      try {
        await this.notificationsService.sendPaymentReceivedNotification(
          tenant.email,
          `${tenant.firstName} ${tenant.lastName}`,
          amount,
          new Date(),
          tenant.lease.unit.property.name,
          tenant.lease.unit.unitNumber,
          payment.id,
          tenant.lease.unit.property.organizationId,
        );
        this.logger.log(`Payment notification sent to ${tenant.email}`);
      } catch (error) {
        this.logger.error('Failed to send payment notification', error);
      }
    }
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

    const amount = paymentIntent.amount / 100;

    // Get tenant with lease info for notification
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        method: this.mapPaymentMethod(paymentIntent.payment_method_types[0]),
        status: 'FAILED',
        amount,
        stripePaymentIntentId: paymentIntent.id,
        paymentDate: new Date(),
      },
    });

    this.logger.warn(`Payment failed for tenant: ${tenantId}`);

    // Send payment failed notification
    if (tenant && tenant.lease) {
      try {
        const failureReason =
          paymentIntent.last_payment_error?.message || 'Payment could not be processed';
        await this.notificationsService.sendPaymentFailedNotification(
          tenant.email,
          `${tenant.firstName} ${tenant.lastName}`,
          amount,
          tenant.lease.unit.property.name,
          tenant.lease.unit.unitNumber,
          failureReason,
          payment.id,
          tenant.lease.unit.property.organizationId,
        );
        this.logger.log(`Payment failure notification sent to ${tenant.email}`);
      } catch (error) {
        this.logger.error('Failed to send payment failure notification', error);
      }
    }
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

  /**
   * Create a Setup Intent for saving payment methods without immediate charge
   */
  async createSetupIntent(
    customerId: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.SetupIntent> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'us_bank_account'],
      metadata,
    });

    this.logger.log(`Setup intent created: ${setupIntent.id} for customer ${customerId}`);

    return setupIntent;
  }

  /**
   * Confirm a Setup Intent
   */
  async confirmSetupIntent(
    setupIntentId: string,
    paymentMethodId: string,
  ): Promise<Stripe.SetupIntent> {
    const setupIntent = await this.stripe.setupIntents.confirm(setupIntentId, {
      payment_method: paymentMethodId,
    });

    this.logger.log(`Setup intent confirmed: ${setupIntent.id}`);

    return setupIntent;
  }

  /**
   * Charge using a saved payment method
   */
  async chargeWithSavedMethod(
    customerId: string,
    paymentMethodId: string,
    amount: number,
    metadata: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata,
    });

    this.logger.log(`Off-session payment created: ${paymentIntent.id} for $${amount}`);

    return paymentIntent;
  }

  /**
   * Detach a payment method from customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);

    this.logger.log(`Payment method detached: ${paymentMethodId}`);

    return paymentMethod;
  }

  /**
   * Set default payment method for customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    this.logger.log(`Default payment method set: ${paymentMethodId} for customer ${customerId}`);

    return customer as Stripe.Customer;
  }

  /**
   * Get default payment method for customer
   */
  async getDefaultPaymentMethod(customerId: string): Promise<Stripe.PaymentMethod | null> {
    const customer = await this.stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });

    if (customer.deleted) {
      return null;
    }

    const defaultMethod = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

    if (!defaultMethod || typeof defaultMethod === 'string') {
      return null;
    }

    return defaultMethod as Stripe.PaymentMethod;
  }

  /**
   * List all payment methods for customer (cards and bank accounts)
   */
  async listAllPaymentMethods(customerId: string): Promise<{
    cards: Stripe.PaymentMethod[];
    bankAccounts: Stripe.PaymentMethod[];
  }> {
    const [cards, bankAccounts] = await Promise.all([
      this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      }),
      this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'us_bank_account',
      }),
    ]);

    return {
      cards: cards.data,
      bankAccounts: bankAccounts.data,
    };
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    if (cancelAtPeriodEnd) {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      this.logger.log(`Subscription ${subscriptionId} will cancel at period end`);
      return subscription;
    }

    const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
    this.logger.log(`Subscription ${subscriptionId} canceled immediately`);
    return subscription;
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible',
      },
    });

    this.logger.log(`Subscription ${subscriptionId} paused`);

    return subscription;
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      pause_collection: '',
    });

    this.logger.log(`Subscription ${subscriptionId} resumed`);

    return subscription;
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'latest_invoice'],
    });
  }

  /**
   * List customer subscriptions
   */
  async listSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    return subscriptions.data;
  }

  /**
   * Create an invoice for one-time charges
   */
  async createInvoice(
    customerId: string,
    items: Array<{ amount: number; description: string }>,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Invoice> {
    // Create invoice items
    for (const item of items) {
      await this.stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(item.amount * 100),
        currency: 'usd',
        description: item.description,
      });
    }

    // Create and finalize the invoice
    const invoice = await this.stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
      metadata,
    });

    const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

    this.logger.log(`Invoice created and finalized: ${finalizedInvoice.id}`);

    return finalizedInvoice;
  }

  /**
   * Pay an invoice immediately
   */
  async payInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    const invoice = await this.stripe.invoices.pay(invoiceId);

    this.logger.log(`Invoice paid: ${invoiceId}`);

    return invoice;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.retrieve(invoiceId);
  }

  /**
   * List customer invoices
   */
  async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    const invoice = await this.stripe.invoices.voidInvoice(invoiceId);

    this.logger.log(`Invoice voided: ${invoiceId}`);

    return invoice;
  }

  /**
   * Retrieve payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

    this.logger.log(`Payment intent canceled: ${paymentIntentId}`);

    return paymentIntent;
  }

  /**
   * Get balance transactions for reconciliation
   */
  async getBalanceTransactions(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<Stripe.BalanceTransaction[]> {
    const transactions = await this.stripe.balanceTransactions.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit,
    });

    return transactions.data;
  }

  /**
   * Get payout details
   */
  async getPayout(payoutId: string): Promise<Stripe.Payout> {
    return this.stripe.payouts.retrieve(payoutId);
  }

  /**
   * List payouts
   */
  async listPayouts(limit: number = 10): Promise<Stripe.Payout[]> {
    const payouts = await this.stripe.payouts.list({ limit });
    return payouts.data;
  }

  /**
   * Verify bank account with micro-deposits
   */
  async verifyBankAccount(
    paymentMethodId: string,
    _amounts: [number, number],
  ): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.type !== 'us_bank_account') {
      throw new Error('Payment method is not a bank account');
    }

    // Bank account verification is handled through the SetupIntent flow
    // This is a placeholder for manual verification if needed
    this.logger.log(`Bank account verification requested for: ${paymentMethodId}`);

    return paymentMethod;
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return !!this.stripe;
  }

  /**
   * Get Stripe account details (for debugging)
   */
  async getAccountInfo(): Promise<Stripe.Account | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      return await this.stripe.accounts.retrieve();
    } catch (error) {
      this.logger.error('Failed to retrieve Stripe account info', error);
      return null;
    }
  }
}
