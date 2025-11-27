import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get chart of accounts for an organization
   */
  async getChartOfAccounts(organizationId: string) {
    return this.prisma.chartOfAccounts.findMany({
      where: { organizationId },
      orderBy: { accountNumber: 'asc' },
    });
  }

  /**
   * Get financial dashboard summary
   */
  async getDashboardSummary(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get total outstanding charges
    const outstandingCharges = await this.prisma.charge.aggregate({
      where: {
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
      _sum: {
        amount: true,
        amountPaid: true,
      },
    });

    const totalOutstanding =
      (Number(outstandingCharges._sum.amount) || 0) -
      (Number(outstandingCharges._sum.amountPaid) || 0);

    // Get this month's revenue (payments received)
    const monthlyPayments = await this.prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
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
      _sum: {
        amount: true,
      },
    });

    // Get this month's charges posted
    const monthlyCharges = await this.prisma.charge.aggregate({
      where: {
        postDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get overdue charges
    const overdueCharges = await this.prisma.charge.aggregate({
      where: {
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        dueDate: { lt: now },
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
      _sum: {
        amount: true,
        amountPaid: true,
      },
      _count: true,
    });

    const totalOverdue =
      (Number(overdueCharges._sum.amount) || 0) - (Number(overdueCharges._sum.amountPaid) || 0);

    // Get active leases count
    const activeLeases = await this.prisma.lease.count({
      where: {
        status: 'ACTIVE',
        unit: {
          property: {
            organizationId,
          },
        },
      },
    });

    // Get occupancy rate
    const totalUnits = await this.prisma.unit.count({
      where: {
        property: {
          organizationId,
        },
      },
    });

    const occupiedUnits = await this.prisma.unit.count({
      where: {
        status: 'OCCUPIED',
        property: {
          organizationId,
        },
      },
    });

    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      monthlyRevenue: Math.round((Number(monthlyPayments._sum.amount) || 0) * 100) / 100,
      monthlyCharges: Math.round((Number(monthlyCharges._sum.amount) || 0) * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      overdueCount: overdueCharges._count,
      activeLeases,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      totalUnits,
      occupiedUnits,
    };
  }

  /**
   * Get tenant ledger (all charges and payments for a lease)
   */
  async getTenantLedger(leaseId: string, organizationId: string) {
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
    });

    if (!lease) {
      throw new NotFoundException('Lease not found or does not belong to your organization');
    }

    // Get all charges
    const charges = await this.prisma.charge.findMany({
      where: { leaseId },
      orderBy: { dueDate: 'asc' },
    });

    // Get all payments with allocations
    const payments = await this.prisma.payment.findMany({
      where: {
        tenant: {
          leaseId,
        },
      },
      include: {
        tenant: true,
        allocations: {
          include: {
            charge: true,
          },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // Build ledger entries
    const ledgerEntries: Array<{
      date: Date;
      type: 'CHARGE' | 'PAYMENT';
      description: string;
      chargeAmount: number | null;
      paymentAmount: number | null;
      balance: number;
      referenceId: string;
    }> = [];

    let runningBalance = 0;

    // Combine and sort by date
    const allTransactions = [
      ...charges.map((c) => ({
        date: c.postDate || c.dueDate,
        type: 'CHARGE' as const,
        item: c,
      })),
      ...payments.map((p) => ({
        date: p.paymentDate,
        type: 'PAYMENT' as const,
        item: p,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const tx of allTransactions) {
      if (tx.type === 'CHARGE') {
        const charge = tx.item as (typeof charges)[0];
        if (charge.status !== 'VOID' && charge.status !== 'PENDING') {
          runningBalance += Number(charge.amount);
          ledgerEntries.push({
            date: tx.date,
            type: 'CHARGE',
            description: charge.description || `${charge.type} charge`,
            chargeAmount: Number(charge.amount),
            paymentAmount: null,
            balance: Math.round(runningBalance * 100) / 100,
            referenceId: charge.id,
          });
        }
      } else {
        const payment = tx.item as (typeof payments)[0];
        if (payment.status === 'COMPLETED') {
          const effectiveAmount = Number(payment.amount);
          runningBalance -= effectiveAmount;
          ledgerEntries.push({
            date: tx.date,
            type: 'PAYMENT',
            description: `Payment - ${payment.method}${payment.checkNumber ? ` (${payment.checkNumber})` : ''}`,
            chargeAmount: null,
            paymentAmount: effectiveAmount,
            balance: Math.round(runningBalance * 100) / 100,
            referenceId: payment.id,
          });
        }
      }
    }

    // Calculate summary
    const totalCharges = charges
      .filter((c) => c.status !== 'VOID' && c.status !== 'PENDING')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const totalPayments = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      lease: {
        id: lease.id,
        property: lease.unit.property.name,
        unit: lease.unit.unitNumber,
        tenant: lease.tenants[0]
          ? `${lease.tenants[0].firstName} ${lease.tenants[0].lastName}`
          : 'Unknown',
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRent: Number(lease.monthlyRent),
      },
      ledger: ledgerEntries,
      summary: {
        totalCharges: Math.round(totalCharges * 100) / 100,
        totalPayments: Math.round(totalPayments * 100) / 100,
        currentBalance: Math.round(runningBalance * 100) / 100,
      },
    };
  }

  /**
   * Get property financial summary
   */
  async getPropertySummary(propertyId: string, organizationId: string) {
    // Verify property belongs to organization
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      include: {
        units: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found or does not belong to your organization');
    }

    // Get outstanding charges for this property
    const outstandingCharges = await this.prisma.charge.aggregate({
      where: {
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        lease: {
          unit: {
            propertyId,
          },
        },
      },
      _sum: {
        amount: true,
        amountPaid: true,
      },
    });

    const totalOutstanding =
      (Number(outstandingCharges._sum.amount) || 0) -
      (Number(outstandingCharges._sum.amountPaid) || 0);

    // Get this month's collections
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyCollections = await this.prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        tenant: {
          lease: {
            unit: {
              propertyId,
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get expected rent (sum of monthly rent for active leases)
    const activeLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        unit: {
          propertyId,
        },
      },
      select: {
        monthlyRent: true,
      },
    });

    const expectedRent = activeLeases.reduce((sum, l) => sum + Number(l.monthlyRent), 0);

    // Get unit breakdown
    const unitStatuses = await this.prisma.unit.groupBy({
      by: ['status'],
      where: {
        propertyId,
      },
      _count: true,
    });

    return {
      propertyId,
      propertyName: property.name,
      totalUnits: property.units.length,
      unitBreakdown: unitStatuses.reduce(
        (acc, u) => {
          acc[u.status] = u._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      financial: {
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        monthlyCollections: Math.round((Number(monthlyCollections._sum.amount) || 0) * 100) / 100,
        expectedRent: Math.round(expectedRent * 100) / 100,
        collectionRate:
          expectedRent > 0
            ? Math.round(((Number(monthlyCollections._sum.amount) || 0) / expectedRent) * 100)
            : 0,
      },
    };
  }

  /**
   * Get aging report (breakdown of outstanding balances by age)
   */
  async getAgingReport(organizationId: string) {
    const now = new Date();

    const charges = await this.prisma.charge.findMany({
      where: {
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
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
            tenants: {
              where: { isPrimary: true },
            },
          },
        },
      },
    });

    const aging = {
      current: { count: 0, total: 0 },
      days1to30: { count: 0, total: 0 },
      days31to60: { count: 0, total: 0 },
      days61to90: { count: 0, total: 0 },
      over90: { count: 0, total: 0 },
    };

    const details: Array<{
      leaseId: string;
      property: string;
      unit: string;
      tenant: string;
      balance: number;
      dueDate: Date;
      daysOverdue: number;
      bucket: string;
    }> = [];

    for (const charge of charges) {
      const balance = Number(charge.amount) - Number(charge.amountPaid);
      if (balance <= 0) {
        continue;
      }

      const dueDate = charge.dueDate;
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      let bucket: keyof typeof aging;
      if (daysOverdue <= 0) {
        bucket = 'current';
      } else if (daysOverdue <= 30) {
        bucket = 'days1to30';
      } else if (daysOverdue <= 60) {
        bucket = 'days31to60';
      } else if (daysOverdue <= 90) {
        bucket = 'days61to90';
      } else {
        bucket = 'over90';
      }

      aging[bucket].count++;
      aging[bucket].total += balance;

      details.push({
        leaseId: charge.leaseId,
        property: charge.lease.unit.property.name,
        unit: charge.lease.unit.unitNumber,
        tenant: charge.lease.tenants[0]
          ? `${charge.lease.tenants[0].firstName} ${charge.lease.tenants[0].lastName}`
          : 'Unknown',
        balance: Math.round(balance * 100) / 100,
        dueDate,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      });
    }

    // Round totals
    for (const bucket of Object.keys(aging) as (keyof typeof aging)[]) {
      aging[bucket].total = Math.round(aging[bucket].total * 100) / 100;
    }

    return {
      summary: aging,
      totalOutstanding: Object.values(aging).reduce((sum, b) => sum + b.total, 0),
      details: details.sort((a, b) => b.daysOverdue - a.daysOverdue),
    };
  }

  /**
   * Get rent roll (all active leases with rent info)
   */
  async getRentRoll(organizationId: string, propertyId?: string) {
    const leases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        unit: {
          property: {
            organizationId,
            ...(propertyId && { id: propertyId }),
          },
        },
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        tenants: {
          where: { isPrimary: true },
        },
        charges: {
          where: {
            status: { in: ['POSTED', 'PARTIALLY_PAID'] },
          },
        },
      },
      orderBy: [{ unit: { property: { name: 'asc' } } }, { unit: { unitNumber: 'asc' } }],
    });

    const rentRoll = leases.map((lease) => {
      const balance = lease.charges.reduce(
        (sum, c) => sum + (Number(c.amount) - Number(c.amountPaid)),
        0,
      );

      return {
        leaseId: lease.id,
        property: lease.unit.property.name,
        unit: lease.unit.unitNumber,
        tenant: lease.tenants[0]
          ? `${lease.tenants[0].firstName} ${lease.tenants[0].lastName}`
          : 'Unknown',
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRent: Number(lease.monthlyRent),
        securityDeposit: Number(lease.securityDeposit),
        currentBalance: Math.round(balance * 100) / 100,
      };
    });

    const totalMonthlyRent = rentRoll.reduce((sum, r) => sum + r.monthlyRent, 0);
    const totalBalance = rentRoll.reduce((sum, r) => sum + r.currentBalance, 0);

    return {
      rentRoll,
      summary: {
        leaseCount: rentRoll.length,
        totalMonthlyRent: Math.round(totalMonthlyRent * 100) / 100,
        annualizedRent: Math.round(totalMonthlyRent * 12 * 100) / 100,
        totalOutstanding: Math.round(totalBalance * 100) / 100,
      },
    };
  }
}
