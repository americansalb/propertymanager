import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface HelcimPaymentResponse {
  transactionId: number;
  cardBatchId: number;
  dateCreated: string;
  status: string;
  type: string;
  amount: number;
  currency: string;
  cardToken?: string;
  cardNumber?: string;
  cardHolderName?: string;
  customerCode?: string;
  invoiceNumber?: string;
  approvalCode?: string;
  avsResponse?: string;
  cvvResponse?: string;
}

interface HelcimRefundResponse {
  transactionId: number;
  status: string;
  amount: number;
  originalTransactionId: number;
}

interface HelcimPayInitResponse {
  checkoutToken: string;
  secretToken: string;
}

interface HelcimCardTokenResponse {
  cardToken: string;
  cardNumber: string;
  cardExpiry: string;
  cardType: string;
  cardHolderName: string;
}

@Injectable()
export class HelcimService {
  private readonly logger = new Logger(HelcimService.name);
  private readonly apiBaseUrl = 'https://api.helcim.com/v2';
  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly terminalId: string;
  private isConfigured = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {
    this.apiToken = this.configService.get<string>('HELCIM_API_TOKEN') || '';
    this.accountId = this.configService.get<string>('HELCIM_ACCOUNT_ID') || '';
    this.terminalId = this.configService.get<string>('HELCIM_TERMINAL_ID') || '';

    if (!this.apiToken || !this.accountId) {
      this.logger.warn('Helcim credentials not configured');
      return;
    }

    this.isConfigured = true;
    this.logger.log('Helcim service initialized');
  }

  /**
   * Check if Helcim is properly configured
   */
  checkConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Make API request to Helcim
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    body?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'api-token': this.apiToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Helcim API error: ${response.status} - ${errorText}`);
      throw new Error(`Helcim API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Initialize HelcimPay.js checkout session
   * This creates a token that the frontend uses to show the payment form
   */
  async initializeCheckout(
    amount: number,
    tenantId: string,
    chargeIds: string[],
    metadata?: Record<string, string>,
  ): Promise<{ checkoutToken: string; secretToken: string }> {
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

    const unitData = tenant.unit || tenant.lease?.unit;
    const propertyData = tenant.unit?.property || tenant.lease?.unit?.property;

    const response = await this.apiRequest<HelcimPayInitResponse>(
      '/helcim-pay/initialize',
      'POST',
      {
        paymentType: 'purchase',
        amount: amount,
        currency: 'USD',
        customerCode: tenantId,
        invoiceNumber: chargeIds.join('-').substring(0, 16),
        paymentMethod: 'card',
        // Store metadata for webhook processing
        metadata: JSON.stringify({
          tenantId,
          chargeIds: chargeIds.join(','),
          propertyId: propertyData?.id,
          unitId: unitData?.id,
          ...metadata,
        }),
      },
    );

    this.logger.log(`Helcim checkout initialized for tenant ${tenantId}, amount: $${amount}`);

    return {
      checkoutToken: response.checkoutToken,
      secretToken: response.secretToken,
    };
  }

  /**
   * Process a card payment using a card token from HelcimPay.js
   */
  async processPayment(
    cardToken: string,
    amount: number,
    tenantId: string,
    chargeIds: string[],
    metadata?: Record<string, string>,
  ): Promise<HelcimPaymentResponse> {
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

    const unitData = tenant.unit || tenant.lease?.unit;
    const propertyData = tenant.unit?.property || tenant.lease?.unit?.property;

    const response = await this.apiRequest<HelcimPaymentResponse>(
      '/payment/purchase',
      'POST',
      {
        cardToken,
        amount,
        currency: 'USD',
        customerCode: tenantId,
        invoiceNumber: chargeIds.join('-').substring(0, 16),
        comments: `Rent payment for ${propertyData?.name || 'Property'} - Unit ${unitData?.unitNumber || 'N/A'}`,
      },
    );

    this.logger.log(`Payment processed: Transaction ${response.transactionId} for $${amount}`);

    // Record the payment
    await this.recordPayment(response, tenantId, chargeIds, metadata);

    return response;
  }

  /**
   * Process a card payment directly (card-not-present / keyed)
   */
  async processDirectPayment(
    cardNumber: string,
    cardExpiry: string,
    cardCvv: string,
    cardHolderName: string,
    amount: number,
    tenantId: string,
    chargeIds: string[],
    billingAddress?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    },
  ): Promise<HelcimPaymentResponse> {
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

    const unitData = tenant.unit || tenant.lease?.unit;
    const propertyData = tenant.unit?.property || tenant.lease?.unit?.property;

    const response = await this.apiRequest<HelcimPaymentResponse>(
      '/payment/purchase',
      'POST',
      {
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardExpiry,
        cardCvv,
        cardHolderName,
        amount,
        currency: 'USD',
        customerCode: tenantId,
        invoiceNumber: chargeIds.join('-').substring(0, 16),
        comments: `Rent payment for ${propertyData?.name || 'Property'} - Unit ${unitData?.unitNumber || 'N/A'}`,
        ...(billingAddress && {
          billingAddress: {
            street1: billingAddress.street,
            city: billingAddress.city,
            province: billingAddress.state,
            postalCode: billingAddress.postalCode,
            country: billingAddress.country,
          },
        }),
      },
    );

    this.logger.log(`Direct payment processed: Transaction ${response.transactionId} for $${amount}`);

    await this.recordPayment(response, tenantId, chargeIds);

    return response;
  }

  /**
   * Verify a card without charging (pre-auth of $0 or $1)
   */
  async verifyCard(
    cardToken: string,
    tenantId: string,
  ): Promise<{ success: boolean; cardToken: string; last4: string }> {
    const response = await this.apiRequest<HelcimPaymentResponse>(
      '/payment/verify',
      'POST',
      {
        cardToken,
        customerCode: tenantId,
      },
    );

    return {
      success: response.status === 'APPROVED',
      cardToken: response.cardToken || cardToken,
      last4: response.cardNumber?.slice(-4) || '',
    };
  }

  /**
   * Save a card for future payments
   */
  async saveCard(
    cardToken: string,
    tenantId: string,
  ): Promise<HelcimCardTokenResponse> {
    // In Helcim, the cardToken from a successful transaction can be reused
    // We just need to store it in our database
    const response = await this.apiRequest<HelcimCardTokenResponse>(
      '/card-token',
      'POST',
      {
        cardToken,
        customerCode: tenantId,
      },
    );

    this.logger.log(`Card saved for tenant ${tenantId}`);

    return response;
  }

  /**
   * Process refund
   */
  async processRefund(
    originalTransactionId: number,
    amount?: number,
  ): Promise<HelcimRefundResponse> {
    const body: Record<string, unknown> = {
      originalTransactionId,
    };

    if (amount) {
      body.amount = amount;
    }

    const response = await this.apiRequest<HelcimRefundResponse>(
      '/payment/refund',
      'POST',
      body,
    );

    this.logger.log(`Refund processed: Transaction ${response.transactionId}`);

    return response;
  }

  /**
   * Record payment in database and allocate to charges
   */
  private async recordPayment(
    helcimResponse: HelcimPaymentResponse,
    tenantId: string,
    chargeIds: string[],
    metadata?: Record<string, string>,
  ) {
    const amount = helcimResponse.amount;

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
        method: 'CREDIT_CARD',
        status: helcimResponse.status === 'APPROVED' ? 'COMPLETED' : 'FAILED',
        amount,
        helcimTransactionId: String(helcimResponse.transactionId),
        paymentDate: new Date(),
      },
    });

    this.logger.log(`Payment recorded: ${payment.id}`);

    if (helcimResponse.status !== 'APPROVED') {
      // Send failure notification
      if (tenant && tenant.lease) {
        try {
          await this.notificationsService.sendPaymentFailedNotification(
            tenant.email,
            `${tenant.firstName} ${tenant.lastName}`,
            amount,
            tenant.lease.unit.property.name,
            tenant.lease.unit.unitNumber,
            'Card payment was declined',
            payment.id,
            tenant.lease.unit.property.organizationId,
          );
        } catch (error) {
          this.logger.error('Failed to send payment failure notification', error);
        }
      }
      return payment;
    }

    // Allocate payment to charges
    let remainingAmount = amount;

    for (const chargeId of chargeIds) {
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

    this.logger.log(`Payment allocated across ${chargeIds.length} charges`);

    // Send success notification
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

    return payment;
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: number): Promise<HelcimPaymentResponse> {
    return this.apiRequest<HelcimPaymentResponse>(
      `/payment/transaction/${transactionId}`,
      'GET',
    );
  }

  /**
   * Get Helcim.js configuration for frontend
   */
  getClientConfig() {
    return {
      accountId: this.accountId,
      terminalId: this.terminalId,
      isConfigured: this.isConfigured,
    };
  }
}
