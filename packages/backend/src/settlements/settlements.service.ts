import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Fee rates by tier (these should match PRICING_MODEL.md)
const CARD_FEE_RATES: Record<string, number> = {
  TRIAL: 0.028, // 2.80%
  STARTER: 0.027, // 2.70%
  PROFESSIONAL: 0.026, // 2.60%
  ENTERPRISE: 0.0249, // 2.49%
};

const ACH_FEES: Record<string, number> = {
  TRIAL: 2.95,
  STARTER: 2.5,
  PROFESSIONAL: 2.0,
  ENTERPRISE: 2.0,
};

// Our actual costs
const HELCIM_COST_RATE = 0.0227; // 2.27%
const HELCIM_COST_FIXED = 0.25; // $0.25
const DWOLLA_COST = 0.25; // $0.25 per ACH

@Injectable()
export class SettlementsService {
  constructor(
    private prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get or create organization balance record
   */
  async getOrCreateBalance(organizationId: string) {
    let balance = await this.prisma.organizationBalance.findUnique({
      where: { organizationId },
    });

    if (!balance) {
      balance = await this.prisma.organizationBalance.create({
        data: { organizationId },
      });
    }

    return balance;
  }

  /**
   * Get organization balance with recent activity
   */
  async getBalance(organizationId: string) {
    const balance = await this.getOrCreateBalance(organizationId);

    const recentEntries = await this.prisma.settlementLedger.findMany({
      where: { balanceId: balance.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const pendingPayouts = await this.prisma.payoutRequest.findMany({
      where: {
        balanceId: balance.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...balance,
      recentActivity: recentEntries,
      pendingPayouts,
    };
  }

  /**
   * Credit landlord balance when a payment is completed
   * Called after successful payment processing
   */
  async creditPayment(
    paymentId: string,
    amount: number,
    paymentMethod: 'CREDIT_CARD' | 'ACH' | 'CHECK' | 'CASH' | string,
    organizationId: string,
    chargeType: string = 'RENT',
  ) {
    const balance = await this.getOrCreateBalance(organizationId);

    // Get organization's subscription plan for fee calculation
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const plan = organization?.plan || 'TRIAL';

    // Calculate fees based on payment method
    let platformFee = 0;
    let processingCost = 0;

    if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') {
      // Card payment: charge tier rate, our cost is Helcim rate
      const chargedRate = CARD_FEE_RATES[plan] || 0.028;
      platformFee = amount * chargedRate;
      processingCost = amount * HELCIM_COST_RATE + HELCIM_COST_FIXED;
    } else if (paymentMethod === 'ACH') {
      // ACH payment: flat fee charged, our cost is Dwolla
      platformFee = ACH_FEES[plan] || 2.95;
      processingCost = DWOLLA_COST;
    } else {
      // Cash/check: no processing fees, small platform fee
      platformFee = 0;
      processingCost = 0;
    }

    // Our margin = what we charge - what we pay
    const ourMargin = Math.max(0, platformFee - processingCost);

    // Amount landlord gets = payment amount - platform fee
    const landlordCredit = amount - platformFee;

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Get current balance for running total
      const currentBalance = await tx.organizationBalance.findUnique({
        where: { id: balance.id },
      });

      const currentAvailable = Number(currentBalance?.availableBalance || 0);
      const currentCollected = Number(currentBalance?.totalCollected || 0);
      const currentFees = Number(currentBalance?.totalFees || 0);

      // Create ledger entry for the payment credit
      const entryType = chargeType === 'RENT' ? 'RENT_COLLECTED' : 'FEE_COLLECTED';
      const newRunningBalance = currentAvailable + landlordCredit;

      await tx.settlementLedger.create({
        data: {
          balanceId: balance.id,
          type: entryType,
          amount: landlordCredit,
          runningBalance: newRunningBalance,
          description: `${chargeType} payment received (net of ${platformFee.toFixed(2)} processing fee)`,
          referenceType: 'Payment',
          referenceId: paymentId,
          paymentId,
        },
      });

      // Update balance
      await tx.organizationBalance.update({
        where: { id: balance.id },
        data: {
          availableBalance: newRunningBalance,
          totalCollected: currentCollected + amount,
          totalFees: currentFees + platformFee,
        },
      });

      this.logger.log({
        message: 'settlement.payment_credited',
        paymentId,
        organizationId,
        grossAmount: amount,
        platformFee,
        processingCost,
        landlordCredit,
        ourMargin,
        newBalance: newRunningBalance,
      });

      return {
        grossAmount: amount,
        platformFee,
        landlordCredit,
        newBalance: newRunningBalance,
      };
    });
  }

  /**
   * Debit balance for refunds
   */
  async debitRefund(
    paymentId: string,
    refundAmount: number,
    organizationId: string,
  ) {
    const balance = await this.getOrCreateBalance(organizationId);

    return this.prisma.$transaction(async (tx) => {
      const currentBalance = await tx.organizationBalance.findUnique({
        where: { id: balance.id },
      });

      const currentAvailable = Number(currentBalance?.availableBalance || 0);
      const newRunningBalance = currentAvailable - refundAmount;

      if (newRunningBalance < 0) {
        this.logger.warn({
          message: 'settlement.negative_balance_warning',
          organizationId,
          currentBalance: currentAvailable,
          refundAmount,
          newBalance: newRunningBalance,
        });
      }

      await tx.settlementLedger.create({
        data: {
          balanceId: balance.id,
          type: 'REFUND',
          amount: -refundAmount,
          runningBalance: newRunningBalance,
          description: `Refund issued for payment`,
          referenceType: 'Payment',
          referenceId: paymentId,
          paymentId,
        },
      });

      await tx.organizationBalance.update({
        where: { id: balance.id },
        data: {
          availableBalance: newRunningBalance,
        },
      });

      this.logger.log({
        message: 'settlement.refund_debited',
        paymentId,
        organizationId,
        refundAmount,
        newBalance: newRunningBalance,
      });

      return { refundAmount, newBalance: newRunningBalance };
    });
  }

  /**
   * Request a payout (withdrawal)
   */
  async requestPayout(
    organizationId: string,
    amount: number,
    bankAccountId: string,
    requestedById: string,
  ) {
    const balance = await this.getOrCreateBalance(organizationId);

    const availableBalance = Number(balance.availableBalance);

    if (amount > availableBalance) {
      throw new BadRequestException(
        `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
      );
    }

    if (amount < 1) {
      throw new BadRequestException('Minimum payout amount is $1.00');
    }

    // Get bank account details
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        organizationId,
        isActive: true,
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found or not active');
    }

    // Create payout request
    const payoutRequest = await this.prisma.payoutRequest.create({
      data: {
        balanceId: balance.id,
        amount,
        bankAccountId,
        bankName: bankAccount.bankName,
        accountLast4: bankAccount.accountNumber,
        requestedById,
      },
    });

    // Reserve the funds (move from available to pending)
    await this.prisma.$transaction(async (tx) => {
      const currentBalance = await tx.organizationBalance.findUnique({
        where: { id: balance.id },
      });

      const currentAvailable = Number(currentBalance?.availableBalance || 0);
      const currentPending = Number(currentBalance?.pendingBalance || 0);

      await tx.organizationBalance.update({
        where: { id: balance.id },
        data: {
          availableBalance: currentAvailable - amount,
          pendingBalance: currentPending + amount,
        },
      });
    });

    this.logger.log({
      message: 'settlement.payout_requested',
      payoutRequestId: payoutRequest.id,
      organizationId,
      amount,
      bankAccountId,
      requestedById,
    });

    return payoutRequest;
  }

  /**
   * Process a payout (called by scheduled job or admin)
   */
  async processPayout(payoutRequestId: string, processedById?: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { balance: true },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    if (payoutRequest.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot process payout with status ${payoutRequest.status}`,
      );
    }

    // Mark as processing
    await this.prisma.payoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
        processedById,
      },
    });

    // TODO: Integrate with Dwolla/ACH provider here
    // For now, we'll simulate successful processing

    this.logger.log({
      message: 'settlement.payout_processing',
      payoutRequestId,
      amount: payoutRequest.amount,
    });

    return payoutRequest;
  }

  /**
   * Complete a payout (called after ACH transfer succeeds)
   */
  async completePayout(payoutRequestId: string, providerTransferId?: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { balance: true },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    const amount = Number(payoutRequest.amount);

    return this.prisma.$transaction(async (tx) => {
      // Update payout request
      await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          dwollaTransferId: providerTransferId,
        },
      });

      // Get current balance
      const currentBalance = await tx.organizationBalance.findUnique({
        where: { id: payoutRequest.balanceId },
      });

      const currentPending = Number(currentBalance?.pendingBalance || 0);
      const currentPaidOut = Number(currentBalance?.totalPaidOut || 0);

      // Update ledger
      await tx.settlementLedger.create({
        data: {
          balanceId: payoutRequest.balanceId,
          type: 'PAYOUT',
          amount: -amount,
          runningBalance: Number(currentBalance?.availableBalance || 0),
          description: `Payout to bank account ending in ${payoutRequest.accountLast4}`,
          referenceType: 'PayoutRequest',
          referenceId: payoutRequestId,
          payoutRequestId,
        },
      });

      // Update balance (move from pending, add to total paid out)
      await tx.organizationBalance.update({
        where: { id: payoutRequest.balanceId },
        data: {
          pendingBalance: currentPending - amount,
          totalPaidOut: currentPaidOut + amount,
        },
      });

      this.logger.log({
        message: 'settlement.payout_completed',
        payoutRequestId,
        amount,
        providerTransferId,
      });

      return { success: true, amount };
    });
  }

  /**
   * Fail a payout (return funds to available)
   */
  async failPayout(payoutRequestId: string, reason: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { balance: true },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    const amount = Number(payoutRequest.amount);

    return this.prisma.$transaction(async (tx) => {
      // Update payout request
      await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: reason,
        },
      });

      // Return funds to available balance
      const currentBalance = await tx.organizationBalance.findUnique({
        where: { id: payoutRequest.balanceId },
      });

      const currentAvailable = Number(currentBalance?.availableBalance || 0);
      const currentPending = Number(currentBalance?.pendingBalance || 0);

      await tx.organizationBalance.update({
        where: { id: payoutRequest.balanceId },
        data: {
          availableBalance: currentAvailable + amount,
          pendingBalance: currentPending - amount,
        },
      });

      this.logger.log({
        message: 'settlement.payout_failed',
        payoutRequestId,
        amount,
        reason,
      });

      return { success: false, reason };
    });
  }

  /**
   * Get settlement ledger history
   */
  async getLedgerHistory(
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const balance = await this.getOrCreateBalance(organizationId);

    const where: any = { balanceId: balance.id };

    if (options?.startDate) {
      where.createdAt = { ...where.createdAt, gte: options.startDate };
    }
    if (options?.endDate) {
      where.createdAt = { ...where.createdAt, lte: options.endDate };
    }
    if (options?.type) {
      where.type = options.type;
    }

    const [entries, total] = await Promise.all([
      this.prisma.settlementLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.settlementLedger.count({ where }),
    ]);

    return { entries, total };
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(
    organizationId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const balance = await this.getOrCreateBalance(organizationId);

    const where: any = { balanceId: balance.id };

    if (options?.status) {
      where.status = options.status;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payoutRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.payoutRequest.count({ where }),
    ]);

    return { payouts, total };
  }

  /**
   * Update payout settings
   */
  async updatePayoutSettings(
    organizationId: string,
    settings: {
      autoPayoutEnabled?: boolean;
      autoPayoutDay?: number;
      autoPayoutMinimum?: number;
      payoutBankAccountId?: string;
    },
  ) {
    const balance = await this.getOrCreateBalance(organizationId);

    if (settings.autoPayoutDay && (settings.autoPayoutDay < 1 || settings.autoPayoutDay > 28)) {
      throw new BadRequestException('Auto-payout day must be between 1 and 28');
    }

    if (settings.payoutBankAccountId) {
      const bankAccount = await this.prisma.bankAccount.findFirst({
        where: {
          id: settings.payoutBankAccountId,
          organizationId,
          isActive: true,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException('Bank account not found');
      }
    }

    return this.prisma.organizationBalance.update({
      where: { id: balance.id },
      data: {
        autoPayoutEnabled: settings.autoPayoutEnabled,
        autoPayoutDay: settings.autoPayoutDay,
        autoPayoutMinimum: settings.autoPayoutMinimum,
        payoutBankAccountId: settings.payoutBankAccountId,
      },
    });
  }
}
