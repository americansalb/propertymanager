import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  type CreateChargeDto,
  type UpdateChargeDto,
  type PostChargeDto,
  type GenerateRentChargesDto,
  type GenerateLateFeeDto,
} from './dto/charge.dto';

@Injectable()
export class ChargesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Find all charges for an organization
   */
  async findAll(organizationId: string, filters?: { leaseId?: string; status?: string }) {
    return this.prisma.charge.findMany({
      where: {
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
        ...(filters?.status && { status: filters.status as any }),
      },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            tenants: {
              where: { isPrimary: true },
            },
          },
        },
        payments: {
          include: {
            payment: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  /**
   * Find a single charge by ID
   */
  async findOne(id: string, organizationId: string) {
    const charge = await this.prisma.charge.findFirst({
      where: {
        id,
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
            tenants: true,
          },
        },
        payments: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!charge) {
      throw new NotFoundException(`Charge with ID ${id} not found`);
    }

    return charge;
  }

  /**
   * Create a new charge
   */
  async create(dto: CreateChargeDto, organizationId: string, userId?: string) {
    // Verify lease exists and belongs to organization
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: dto.leaseId,
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

    const charge = await this.prisma.charge.create({
      data: {
        leaseId: dto.leaseId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        postDate: dto.postDate ? new Date(dto.postDate) : null,
        status: dto.postDate ? 'POSTED' : 'PENDING',
        isRecurring: dto.isRecurring || false,
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

    this.logger.log({
      message: 'charge.created',
      chargeId: charge.id,
      leaseId: dto.leaseId,
      type: dto.type,
      amount: dto.amount,
      organizationId,
      userId,
    });

    return charge;
  }

  /**
   * Update a charge (only PENDING charges can be updated)
   */
  async update(id: string, dto: UpdateChargeDto, organizationId: string, userId?: string) {
    const charge = await this.findOne(id, organizationId);

    if (charge.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot update a charge with status ${charge.status}. Only PENDING charges can be modified.`,
      );
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: {
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
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

    this.logger.log({
      message: 'charge.updated',
      chargeId: id,
      organizationId,
      userId,
    });

    return updated;
  }

  /**
   * Post a PENDING charge (makes it active and billable)
   */
  async post(id: string, dto: PostChargeDto, organizationId: string, userId?: string) {
    const charge = await this.findOne(id, organizationId);

    if (charge.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot post a charge with status ${charge.status}. Only PENDING charges can be posted.`,
      );
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: {
        status: 'POSTED',
        postDate: dto.postDate ? new Date(dto.postDate) : new Date(),
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

    this.logger.log({
      message: 'charge.posted',
      chargeId: id,
      organizationId,
      userId,
    });

    return updated;
  }

  /**
   * Void a charge (only PENDING or POSTED charges with no payments)
   */
  async void(id: string, organizationId: string, userId?: string) {
    const charge = await this.findOne(id, organizationId);

    if (charge.status === 'PAID' || charge.status === 'PARTIALLY_PAID') {
      throw new BadRequestException(
        'Cannot void a charge that has payments. Refund the payments first.',
      );
    }

    if (charge.status === 'VOID') {
      throw new BadRequestException('Charge is already voided');
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: { status: 'VOID' },
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

    this.logger.log({
      message: 'charge.voided',
      chargeId: id,
      organizationId,
      userId,
    });

    return updated;
  }

  /**
   * Delete a PENDING or VOID charge
   */
  async delete(id: string, organizationId: string, userId?: string) {
    const charge = await this.findOne(id, organizationId);

    if (charge.status !== 'PENDING' && charge.status !== 'VOID') {
      throw new BadRequestException(
        `Cannot delete a charge with status ${charge.status}. Only PENDING or VOID charges can be deleted.`,
      );
    }

    await this.prisma.charge.delete({ where: { id } });

    this.logger.log({
      message: 'charge.deleted',
      chargeId: id,
      organizationId,
      userId,
    });

    return { success: true, message: 'Charge deleted successfully' };
  }

  /**
   * Generate monthly rent charges for all active leases
   */
  async generateRentCharges(dto: GenerateRentChargesDto, organizationId: string, userId?: string) {
    const now = new Date();
    const month = dto.month || now.getMonth() + 1;
    const year = dto.year || now.getFullYear();
    const dueDay = dto.dueDay || 1;

    // Find all active leases
    const leases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        unit: {
          property: {
            organizationId,
            ...(dto.propertyId && { id: dto.propertyId }),
          },
        },
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        charges: {
          where: {
            type: 'RENT',
            dueDate: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1),
            },
          },
        },
      },
    });

    const generatedCharges = [];
    const skippedLeases = [];

    for (const lease of leases) {
      // Skip if rent charge already exists for this month
      if (lease.charges.length > 0) {
        skippedLeases.push({
          leaseId: lease.id,
          reason: 'Rent charge already exists for this period',
        });
        continue;
      }

      const dueDate = new Date(year, month - 1, dueDay);

      const charge = await this.prisma.charge.create({
        data: {
          leaseId: lease.id,
          type: 'RENT',
          amount: Number(lease.monthlyRent),
          description: `Rent for ${this.getMonthName(month)} ${year}`,
          dueDate,
          postDate: new Date(),
          status: 'POSTED',
          isRecurring: false,
        },
      });

      generatedCharges.push(charge);
    }

    this.logger.log({
      message: 'charges.rent_generated',
      month,
      year,
      generatedCount: generatedCharges.length,
      skippedCount: skippedLeases.length,
      organizationId,
      userId,
    });

    return {
      generated: generatedCharges.length,
      skipped: skippedLeases.length,
      charges: generatedCharges,
      skippedDetails: skippedLeases,
    };
  }

  /**
   * Generate late fees for overdue charges
   */
  async generateLateFees(dto: GenerateLateFeeDto, organizationId: string, userId?: string) {
    const gracePeriodDays = dto.gracePeriodDays ?? 5;
    const feeType = dto.feeType || 'FLAT';
    const feeAmount = dto.feeAmount ?? 50;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

    // Find all overdue rent charges without late fees
    const overdueCharges = await this.prisma.charge.findMany({
      where: {
        type: 'RENT',
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        dueDate: { lt: cutoffDate },
        lease: {
          status: 'ACTIVE',
          unit: {
            property: {
              organizationId,
              ...(dto.propertyId && { id: dto.propertyId }),
            },
          },
        },
      },
      include: {
        lease: {
          include: {
            charges: {
              where: {
                type: 'LATE_FEE',
              },
            },
            tenant: true,
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    const generatedFees = [];
    const skippedCharges = [];

    for (const charge of overdueCharges) {
      // Check if late fee already exists for this rent charge period
      const existingLateFee = charge.lease.charges.some(
        (c) =>
          c.type === 'LATE_FEE' &&
          c.dueDate.getMonth() === charge.dueDate.getMonth() &&
          c.dueDate.getFullYear() === charge.dueDate.getFullYear(),
      );

      if (existingLateFee) {
        skippedCharges.push({
          chargeId: charge.id,
          reason: 'Late fee already exists for this period',
        });
        continue;
      }

      const balance = Number(charge.amount) - Number(charge.amountPaid);
      const lateFeeAmount = feeType === 'PERCENTAGE' ? (balance * feeAmount) / 100 : feeAmount;

      const lateFee = await this.prisma.charge.create({
        data: {
          leaseId: charge.leaseId,
          type: 'LATE_FEE',
          amount: Math.round(lateFeeAmount * 100) / 100,
          description: `Late fee for ${this.getMonthName(charge.dueDate.getMonth() + 1)} rent`,
          dueDate: new Date(),
          postDate: new Date(),
          status: 'POSTED',
          isRecurring: false,
        },
      });

      generatedFees.push(lateFee);

      // Send late fee notification to tenant
      if (charge.lease.tenant) {
        const tenant = charge.lease.tenant;
        const property = charge.lease.unit.property;
        const unit = charge.lease.unit;

        try {
          await this.notificationsService.sendLateFeeNotification(
            tenant.email,
            `${tenant.firstName} ${tenant.lastName}`,
            Math.round(lateFeeAmount * 100) / 100,
            balance,
            property.name,
            unit.unitNumber,
            lateFee.id,
            organizationId,
          );
          this.logger.log({
            message: 'charges.late_fee_notification_sent',
            tenantEmail: tenant.email,
            lateFeeId: lateFee.id,
          });
        } catch (error) {
          this.logger.error({
            message: 'charges.late_fee_notification_failed',
            tenantEmail: tenant.email,
            error: (error as Error).message,
          });
        }
      }
    }

    this.logger.log({
      message: 'charges.late_fees_generated',
      generatedCount: generatedFees.length,
      skippedCount: skippedCharges.length,
      organizationId,
      userId,
    });

    return {
      generated: generatedFees.length,
      skipped: skippedCharges.length,
      fees: generatedFees,
      skippedDetails: skippedCharges,
    };
  }

  /**
   * Get outstanding charges for a tenant/lease
   */
  async getOutstandingCharges(leaseId: string, organizationId: string) {
    const charges = await this.prisma.charge.findMany({
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

    return charges.map((charge) => ({
      ...charge,
      balance: Number(charge.amount) - Number(charge.amountPaid),
    }));
  }

  /**
   * Get total balance for a lease
   */
  async getLeaseBalance(leaseId: string, organizationId: string) {
    const charges = await this.getOutstandingCharges(leaseId, organizationId);
    const totalBalance = charges.reduce((sum, charge) => sum + charge.balance, 0);

    return {
      leaseId,
      totalBalance: Math.round(totalBalance * 100) / 100,
      chargeCount: charges.length,
      charges,
    };
  }

  private getMonthName(month: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1] || '';
  }
}
