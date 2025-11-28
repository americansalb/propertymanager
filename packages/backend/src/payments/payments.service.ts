import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import {
  type RecordPaymentDto,
  type CreatePaymentIntentDto,
  type RefundPaymentDto,
  PaymentStatus,
} from '../financial/dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Find all payments for an organization
   */
  async findAll(
    organizationId: string,
    filters?: { tenantId?: string; status?: string; leaseId?: string },
  ) {
    return this.prisma.payment.findMany({
      where: {
        tenant: {
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
            ...(filters?.leaseId && { id: filters.leaseId }),
          },
        },
        ...(filters?.tenantId && { tenantId: filters.tenantId }),
        ...(filters?.status && { status: filters.status as any }),
      },
      include: {
        tenant: {
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
        },
        allocations: {
          include: {
            charge: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Find a single payment by ID
   */
  async findOne(id: string, organizationId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        tenant: {
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
      },
      include: {
        tenant: {
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
        },
        allocations: {
          include: {
            charge: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  /**
   * Record a manual payment (cash, check, money order, etc.)
   */
  async recordPayment(dto: RecordPaymentDto, organizationId: string, userId?: string) {
    // Verify tenant exists and belongs to organization
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: dto.tenantId,
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
      include: {
        lease: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found or does not belong to your organization');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        tenantId: dto.tenantId,
        method: dto.method,
        status: PaymentStatus.COMPLETED,
        amount: dto.amount,
        paymentDate: new Date(dto.paymentDate),
        checkNumber: dto.checkNumber,
        memo: dto.memo,
      },
    });

    this.logger.log({
      message: 'payment.recorded',
      paymentId: payment.id,
      tenantId: dto.tenantId,
      method: dto.method,
      amount: dto.amount,
      organizationId,
      userId,
    });

    // Allocate payment to charges
    if (dto.allocations && dto.allocations.length > 0) {
      // Manual allocation
      await this.allocatePaymentManually(payment.id, dto.allocations, organizationId);
    } else {
      // Auto-allocate to oldest outstanding charges
      await this.autoAllocatePayment(payment.id, dto.amount, tenant.lease.id, organizationId);
    }

    // Return payment with allocations
    return this.findOne(payment.id, organizationId);
  }

  /**
   * Create a Stripe payment intent for online payment
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto, organizationId: string, userId?: string) {
    // Verify tenant exists and belongs to organization
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: dto.tenantId,
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found or does not belong to your organization');
    }

    // Verify all charges exist and belong to the tenant's lease
    if (dto.chargeIds && dto.chargeIds.length > 0) {
      const charges = await this.prisma.charge.findMany({
        where: {
          id: { in: dto.chargeIds },
          lease: {
            tenants: {
              some: { id: dto.tenantId },
            },
          },
        },
      });

      if (charges.length !== dto.chargeIds.length) {
        throw new BadRequestException(
          'One or more charges not found or do not belong to this tenant',
        );
      }
    }

    const paymentIntent = await this.stripeService.createPaymentIntent(
      dto.amount,
      dto.tenantId,
      dto.chargeIds || [],
    );

    this.logger.log({
      message: 'payment.intent_created',
      paymentIntentId: paymentIntent.id,
      tenantId: dto.tenantId,
      amount: dto.amount,
      organizationId,
      userId,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: dto.amount,
    };
  }

  /**
   * Refund a payment (partial or full)
   */
  async refundPayment(id: string, dto: RefundPaymentDto, organizationId: string, userId?: string) {
    const payment = await this.findOne(id, organizationId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot refund a payment with status ${payment.status}. Only COMPLETED payments can be refunded.`,
      );
    }

    const refundAmount = dto.amount || Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    // If this was a Stripe payment, process refund through Stripe
    if (payment.stripePaymentIntentId) {
      await this.stripeService.createRefund(
        payment.stripePaymentIntentId,
        refundAmount,
        dto.reason as any,
      );
    }

    // Update payment status (only full refunds change status to REFUNDED)
    const isFullRefund = refundAmount === Number(payment.amount);
    if (isFullRefund) {
      await this.prisma.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REFUNDED,
          memo: `Refunded: ${refundAmount}${dto.reason ? ` - ${dto.reason}` : ''}`,
        },
      });
    }

    // Reverse allocations
    await this.reverseAllocations(id, refundAmount);

    this.logger.log({
      message: 'payment.refunded',
      paymentId: id,
      refundAmount,
      isFullRefund,
      organizationId,
      userId,
    });

    return this.findOne(id, organizationId);
  }

  /**
   * Void a pending payment
   */
  async voidPayment(id: string, organizationId: string, userId?: string) {
    const payment = await this.findOne(id, organizationId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot void a payment with status ${payment.status}. Only PENDING payments can be voided.`,
      );
    }

    await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.FAILED,
        memo: 'Voided',
      },
    });

    this.logger.log({
      message: 'payment.voided',
      paymentId: id,
      organizationId,
      userId,
    });

    return this.findOne(id, organizationId);
  }

  /**
   * Get payment history for a lease
   */
  async getLeasePaymentHistory(leaseId: string, organizationId: string) {
    // Verify lease belongs to organization
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: leaseId,
        unit: {
          property: {
            organizationId,
          },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found or does not belong to your organization');
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        tenant: {
          leaseId,
        },
        status: PaymentStatus.COMPLETED,
      },
      include: {
        tenant: true,
        allocations: {
          include: {
            charge: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    // Count refunded payments separately
    const refundedPayments = await this.prisma.payment.findMany({
      where: {
        tenant: { leaseId },
        status: PaymentStatus.REFUNDED,
      },
      select: { amount: true },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefunded = refundedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      leaseId,
      payments,
      summary: {
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
        netPaid: Math.round((totalPaid - totalRefunded) * 100) / 100,
        paymentCount: payments.length,
      },
    };
  }

  /**
   * Get payment methods breakdown
   */
  async getPaymentMethodsSummary(organizationId: string, startDate?: Date, endDate?: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        tenant: {
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
        ...(startDate && { paymentDate: { gte: startDate } }),
        ...(endDate && { paymentDate: { lte: endDate } }),
      },
      select: {
        method: true,
        amount: true,
      },
    });

    const summary: Record<string, { count: number; total: number }> = {};

    for (const payment of payments) {
      const method = payment.method || 'OTHER';
      if (!summary[method]) {
        summary[method] = { count: 0, total: 0 };
      }
      summary[method].count++;
      summary[method].total += Number(payment.amount);
    }

    // Round totals
    for (const method of Object.keys(summary)) {
      summary[method].total = Math.round(summary[method].total * 100) / 100;
    }

    return summary;
  }

  /**
   * Allocate payment manually to specific charges
   */
  private async allocatePaymentManually(
    paymentId: string,
    allocations: { chargeId: string; amount: number }[],
    organizationId: string,
  ) {
    for (const allocation of allocations) {
      // Verify charge exists and get current balance
      const charge = await this.prisma.charge.findFirst({
        where: {
          id: allocation.chargeId,
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
      });

      if (!charge) {
        throw new BadRequestException(`Charge ${allocation.chargeId} not found`);
      }

      const chargeBalance = Number(charge.amount) - Number(charge.amountPaid);
      if (allocation.amount > chargeBalance) {
        throw new BadRequestException(
          `Allocation amount ${allocation.amount} exceeds charge balance ${chargeBalance}`,
        );
      }

      // Create allocation
      await this.prisma.paymentAllocation.create({
        data: {
          paymentId,
          chargeId: allocation.chargeId,
          amount: allocation.amount,
        },
      });

      // Update charge
      const newAmountPaid = Number(charge.amountPaid) + allocation.amount;
      await this.prisma.charge.update({
        where: { id: allocation.chargeId },
        data: {
          amountPaid: newAmountPaid,
          status: newAmountPaid >= Number(charge.amount) ? 'PAID' : 'PARTIALLY_PAID',
        },
      });
    }
  }

  /**
   * Auto-allocate payment to oldest outstanding charges (FIFO)
   */
  private async autoAllocatePayment(
    paymentId: string,
    amount: number,
    leaseId: string,
    organizationId: string,
  ) {
    // Get outstanding charges for the lease, ordered by due date (oldest first)
    const outstandingCharges = await this.prisma.charge.findMany({
      where: {
        leaseId,
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    let remainingAmount = amount;

    for (const charge of outstandingCharges) {
      if (remainingAmount <= 0) {
        break;
      }

      const chargeBalance = Number(charge.amount) - Number(charge.amountPaid);
      const allocationAmount = Math.min(remainingAmount, chargeBalance);

      // Create allocation
      await this.prisma.paymentAllocation.create({
        data: {
          paymentId,
          chargeId: charge.id,
          amount: allocationAmount,
        },
      });

      // Update charge
      const newAmountPaid = Number(charge.amountPaid) + allocationAmount;
      await this.prisma.charge.update({
        where: { id: charge.id },
        data: {
          amountPaid: newAmountPaid,
          status: newAmountPaid >= Number(charge.amount) ? 'PAID' : 'PARTIALLY_PAID',
        },
      });

      remainingAmount -= allocationAmount;
    }

    // Log any unapplied amount as credit
    if (remainingAmount > 0) {
      this.logger.log({
        message: 'payment.unapplied_credit',
        paymentId,
        leaseId,
        unappliedAmount: remainingAmount,
      });
    }
  }

  /**
   * Reverse allocations when refunding a payment
   */
  private async reverseAllocations(paymentId: string, refundAmount: number) {
    // Get allocations in reverse order (newest first for LIFO reversal)
    const allocations = await this.prisma.paymentAllocation.findMany({
      where: { paymentId },
      include: { charge: true },
      orderBy: { createdAt: 'desc' },
    });

    let remainingRefund = refundAmount;

    for (const allocation of allocations) {
      if (remainingRefund <= 0) {
        break;
      }

      const reverseAmount = Math.min(remainingRefund, Number(allocation.amount));

      // Update charge
      const newAmountPaid = Math.max(0, Number(allocation.charge.amountPaid) - reverseAmount);
      const chargeAmount = Number(allocation.charge.amount);

      await this.prisma.charge.update({
        where: { id: allocation.chargeId },
        data: {
          amountPaid: newAmountPaid,
          status:
            newAmountPaid === 0
              ? 'POSTED'
              : newAmountPaid >= chargeAmount
                ? 'PAID'
                : 'PARTIALLY_PAID',
        },
      });

      // Update or delete allocation
      if (reverseAmount >= Number(allocation.amount)) {
        await this.prisma.paymentAllocation.delete({
          where: { id: allocation.id },
        });
      } else {
        await this.prisma.paymentAllocation.update({
          where: { id: allocation.id },
          data: {
            amount: Number(allocation.amount) - reverseAmount,
          },
        });
      }

      remainingRefund -= reverseAmount;
    }
  }

  // ============================================================
  // SAVED PAYMENT METHODS (Stripe)
  // ============================================================

  /**
   * Get saved payment methods for a user (from Stripe)
   */
  async getSavedPaymentMethods(userId: string) {
    // Get user's Stripe customer ID from their tenant record
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId }, // Allow lookup by email as fallback
        ],
        stripeCustomerId: { not: null },
      },
    });

    if (!tenant || !tenant.stripeCustomerId) {
      return [];
    }

    try {
      const paymentMethods = await this.stripeService.listPaymentMethods(tenant.stripeCustomerId);

      // Get default payment method
      const customer = await this.stripeService.getCustomer(tenant.stripeCustomerId);
      const defaultMethodId =
        typeof customer.invoice_settings?.default_payment_method === 'string'
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings?.default_payment_method?.id;

      return paymentMethods.map((method) => ({
        id: method.id,
        brand: method.card?.brand || 'unknown',
        last4: method.card?.last4 || '****',
        expiryMonth: method.card?.exp_month || 0,
        expiryYear: method.card?.exp_year || 0,
        isDefault: method.id === defaultMethodId,
      }));
    } catch (error) {
      this.logger.error({
        message: 'payment_methods.fetch_failed',
        userId,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Remove a saved payment method
   */
  async removeSavedPaymentMethod(methodId: string, userId: string) {
    // Verify the payment method belongs to this user
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: userId }, { email: userId }],
        stripeCustomerId: { not: null },
      },
    });

    if (!tenant || !tenant.stripeCustomerId) {
      throw new NotFoundException('User not found or no Stripe customer');
    }

    try {
      // Verify ownership by checking if the method belongs to this customer
      const method = await this.stripeService.getPaymentMethod(methodId);
      if (method.customer !== tenant.stripeCustomerId) {
        throw new NotFoundException('Payment method not found');
      }

      await this.stripeService.detachPaymentMethod(methodId);

      this.logger.log({
        message: 'payment_methods.removed',
        userId,
        methodId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error({
        message: 'payment_methods.remove_failed',
        userId,
        methodId,
        error: (error as Error).message,
      });
      throw new BadRequestException('Failed to remove payment method');
    }
  }

  /**
   * Set a payment method as the default
   */
  async setDefaultPaymentMethod(methodId: string, userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: userId }, { email: userId }],
        stripeCustomerId: { not: null },
      },
    });

    if (!tenant || !tenant.stripeCustomerId) {
      throw new NotFoundException('User not found or no Stripe customer');
    }

    try {
      // Verify ownership
      const method = await this.stripeService.getPaymentMethod(methodId);
      if (method.customer !== tenant.stripeCustomerId) {
        throw new NotFoundException('Payment method not found');
      }

      await this.stripeService.setDefaultPaymentMethod(tenant.stripeCustomerId, methodId);

      this.logger.log({
        message: 'payment_methods.default_set',
        userId,
        methodId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error({
        message: 'payment_methods.set_default_failed',
        userId,
        methodId,
        error: (error as Error).message,
      });
      throw new BadRequestException('Failed to set default payment method');
    }
  }
}
