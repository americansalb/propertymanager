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
   * Get payment receipt data for display or PDF generation
   */
  async getPaymentReceipt(id: string, organizationId: string) {
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
                    property: {
                      include: {
                        organization: true,
                      },
                    },
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

    const property = payment.tenant?.lease?.unit?.property;
    const unit = payment.tenant?.lease?.unit;
    const organization = property?.organization;

    return {
      receiptNumber: `RCP-${payment.id.slice(0, 8).toUpperCase()}`,
      paymentId: payment.id,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      checkNumber: payment.checkNumber,
      memo: payment.memo,
      tenant: {
        id: payment.tenant?.id,
        firstName: payment.tenant?.firstName,
        lastName: payment.tenant?.lastName,
        email: payment.tenant?.email,
      },
      property: {
        id: property?.id,
        name: property?.name,
        address: property?.address1,
        city: property?.city,
        state: property?.state,
        zipCode: property?.zipCode,
      },
      unit: {
        id: unit?.id,
        unitNumber: unit?.unitNumber,
      },
      organization: {
        id: organization?.id,
        name: organization?.name,
      },
      allocations: payment.allocations.map((alloc) => ({
        chargeId: alloc.chargeId,
        amount: alloc.amount,
        chargeType: alloc.charge?.type,
        chargeDescription: alloc.charge?.description,
      })),
      generatedAt: new Date().toISOString(),
    };
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

  /**
   * Get or create a Stripe customer for a tenant
   */
  async getOrCreateStripeCustomer(tenantId: string, organizationId: string) {
    // Verify tenant exists and belongs to organization
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
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

    if (!tenant) {
      throw new NotFoundException('Tenant not found or does not belong to your organization');
    }

    const fullName = `${tenant.firstName} ${tenant.lastName}`;
    const customer = await this.stripeService.getOrCreateCustomer(tenantId, tenant.email, fullName);

    this.logger.log({
      message: 'stripe.customer_retrieved',
      customerId: customer.id,
      tenantId,
      organizationId,
    });

    return customer;
  }

  /**
   * Enable auto-pay for a tenant
   */
  async enableAutoPay(
    tenantId: string,
    paymentMethodId: string,
    dayOfMonth: number,
    organizationId: string,
  ) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
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
      throw new NotFoundException('Tenant not found');
    }

    // Get or create Stripe customer
    const customer = await this.getOrCreateStripeCustomer(tenantId, organizationId);

    // Set default payment method
    await this.stripeService.setDefaultPaymentMethod(customer.id, paymentMethodId);

    // Get tenant's lease to update auto-pay settings
    const tenantWithLease = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { leaseId: true },
    });

    if (!tenantWithLease) {
      throw new NotFoundException('Tenant not found');
    }

    // Update lease with auto-pay settings
    await this.prisma.lease.update({
      where: { id: tenantWithLease.leaseId },
      data: {
        autoPayEnabled: true,
        autoPayDay: dayOfMonth,
        autoPayPaymentMethodId: paymentMethodId,
      },
    });

    this.logger.log({
      message: 'autopay.enabled',
      tenantId,
      paymentMethodId,
      dayOfMonth,
      organizationId,
    });

    return {
      enabled: true,
      dayOfMonth,
      paymentMethodId,
    };
  }

  /**
   * Disable auto-pay for a tenant
   */
  async disableAutoPay(tenantId: string, organizationId: string) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
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
      throw new NotFoundException('Tenant not found');
    }

    // Update lease to disable auto-pay
    await this.prisma.lease.update({
      where: { id: tenant.leaseId },
      data: {
        autoPayEnabled: false,
        autoPayDay: null,
        autoPayPaymentMethodId: null,
      },
    });

    this.logger.log({
      message: 'autopay.disabled',
      tenantId,
      organizationId,
    });

    return { enabled: false };
  }

  /**
   * Get auto-pay status for a tenant
   */
  async getAutoPayStatus(tenantId: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
      select: {
        lease: {
          select: {
            autoPayEnabled: true,
            autoPayDay: true,
            autoPayPaymentMethodId: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let defaultPaymentMethod = null;
    try {
      const customer = await this.getOrCreateStripeCustomer(tenantId, organizationId);
      const pm = await this.stripeService.getDefaultPaymentMethod(customer.id);
      if (pm) {
        defaultPaymentMethod = {
          id: pm.id,
          type: pm.type,
          last4: pm.card?.last4 || pm.us_bank_account?.last4,
          brand: pm.card?.brand,
          bankName: pm.us_bank_account?.bank_name,
        };
      }
    } catch {
      // No Stripe customer yet, that's fine
    }

    return {
      enabled: tenant.lease.autoPayEnabled || false,
      dayOfMonth: tenant.lease.autoPayDay,
      defaultPaymentMethod,
    };
  }
}
