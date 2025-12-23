import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
  forwardRef,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { HelcimService } from './helcim.service';
import { SettlementsService } from '../settlements/settlements.service';
import {
  type RecordPaymentDto,
  type RefundPaymentDto,
  PaymentStatus,
} from '../financial/dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private helcimService: HelcimService,
    @Inject(forwardRef(() => SettlementsService))
    private settlementsService: SettlementsService,
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
    } else if (tenant.lease?.id) {
      // Auto-allocate to oldest outstanding charges (only if tenant has a lease)
      await this.autoAllocatePayment(payment.id, dto.amount, tenant.lease.id, organizationId);
    }

    // Credit landlord settlement balance
    try {
      // For manual payments (cash/check), we charge minimal or no processing fee
      await this.settlementsService.creditPayment(
        payment.id,
        dto.amount,
        dto.method,
        organizationId,
        'RENT', // Default charge type
      );
      this.logger.log({
        message: 'settlement.credited',
        paymentId: payment.id,
        amount: dto.amount,
        organizationId,
      });
    } catch (error) {
      this.logger.error({
        message: 'settlement.credit_failed',
        paymentId: payment.id,
        error: (error as Error).message,
      });
      // Don't fail the payment - settlement can be reconciled later
    }

    // Return payment with allocations
    return this.findOne(payment.id, organizationId);
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

    // If this was a Helcim payment, process refund through Helcim
    if (payment.helcimTransactionId) {
      await this.helcimService.processRefund(
        parseInt(payment.helcimTransactionId, 10),
        refundAmount,
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

    // Debit landlord settlement balance
    try {
      await this.settlementsService.debitRefund(id, refundAmount, organizationId);
      this.logger.log({
        message: 'settlement.refund_debited',
        paymentId: id,
        refundAmount,
        organizationId,
      });
    } catch (error) {
      this.logger.error({
        message: 'settlement.refund_debit_failed',
        paymentId: id,
        error: (error as Error).message,
      });
    }

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
    // Use transaction to ensure all allocations are atomic
    await this.prisma.$transaction(async (tx) => {
      for (const allocation of allocations) {
        // Verify charge exists and get current balance
        const charge = await tx.charge.findFirst({
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
        await tx.paymentAllocation.create({
          data: {
            paymentId,
            chargeId: allocation.chargeId,
            amount: allocation.amount,
          },
        });

        // Update charge
        const newAmountPaid = Number(charge.amountPaid) + allocation.amount;
        await tx.charge.update({
          where: { id: allocation.chargeId },
          data: {
            amountPaid: newAmountPaid,
            status: newAmountPaid >= Number(charge.amount) ? 'PAID' : 'PARTIALLY_PAID',
          },
        });
      }
    });
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

    // Use transaction to ensure all allocations are atomic
    await this.prisma.$transaction(async (tx) => {
      for (const charge of outstandingCharges) {
        if (remainingAmount <= 0) {
          break;
        }

        const chargeBalance = Number(charge.amount) - Number(charge.amountPaid);
        const allocationAmount = Math.min(remainingAmount, chargeBalance);

        // Create allocation
        await tx.paymentAllocation.create({
          data: {
            paymentId,
            chargeId: charge.id,
            amount: allocationAmount,
          },
        });

        // Update charge
        const newAmountPaid = Number(charge.amountPaid) + allocationAmount;
        await tx.charge.update({
          where: { id: charge.id },
          data: {
            amountPaid: newAmountPaid,
            status: newAmountPaid >= Number(charge.amount) ? 'PAID' : 'PARTIALLY_PAID',
          },
        });

        remainingAmount -= allocationAmount;
      }
    });

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

    // Use transaction to ensure all reversals are atomic
    await this.prisma.$transaction(async (tx) => {
      for (const allocation of allocations) {
        if (remainingRefund <= 0) {
          break;
        }

        const reverseAmount = Math.min(remainingRefund, Number(allocation.amount));

        // Update charge
        const newAmountPaid = Math.max(0, Number(allocation.charge.amountPaid) - reverseAmount);
        const chargeAmount = Number(allocation.charge.amount);

        await tx.charge.update({
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
          await tx.paymentAllocation.delete({
            where: { id: allocation.id },
          });
        } else {
          await tx.paymentAllocation.update({
            where: { id: allocation.id },
            data: {
              amount: Number(allocation.amount) - reverseAmount,
            },
          });
        }

        remainingRefund -= reverseAmount;
      }
    });
  }
}
