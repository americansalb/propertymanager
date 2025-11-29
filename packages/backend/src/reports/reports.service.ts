import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ChargeStatus,
  PaymentStatus,
  UnitStatus,
  LeaseStatus,
  WorkOrderStatus,
} from '@propertymaster/database';

export interface OccupancyReport {
  summary: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    vacantRented: number;
    onNotice: number;
    underMaintenance: number;
    occupancyRate: number;
    potentialRent: number;
    actualRent: number;
    lossToVacancy: number;
  };
  byProperty: Array<{
    propertyId: string;
    propertyName: string;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    potentialRent: number;
    actualRent: number;
  }>;
  byUnitType: Array<{
    unitType: string;
    total: number;
    occupied: number;
    occupancyRate: number;
    avgRent: number;
  }>;
}

export interface RentRollReport {
  summary: {
    totalLeases: number;
    totalMonthlyRent: number;
    totalSecurityDeposits: number;
    avgRent: number;
    expiringNext30Days: number;
    expiringNext60Days: number;
    expiringNext90Days: number;
  };
  leases: Array<{
    leaseId: string;
    propertyName: string;
    unitNumber: string;
    tenantName: string;
    tenantEmail: string;
    startDate: Date;
    endDate: Date | null;
    monthlyRent: number;
    securityDeposit: number;
    balance: number;
    status: string;
    daysUntilExpiration: number | null;
  }>;
}

export interface IncomeStatementReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  income: {
    rentalIncome: number;
    lateFees: number;
    otherIncome: number;
    totalIncome: number;
  };
  expenses: {
    maintenance: number;
    utilities: number;
    insurance: number;
    propertyTax: number;
    managementFees: number;
    otherExpenses: number;
    totalExpenses: number;
  };
  netOperatingIncome: number;
  byProperty?: Array<{
    propertyId: string;
    propertyName: string;
    income: number;
    expenses: number;
    noi: number;
  }>;
  byMonth?: Array<{
    month: string;
    income: number;
    expenses: number;
    noi: number;
  }>;
}

export interface ARAgingReport {
  summary: {
    totalOutstanding: number;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
  };
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    propertyName: string;
    unitNumber: string;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
    total: number;
    lastPaymentDate: Date | null;
  }>;
}

export interface CollectionsReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalCollected: number;
    totalBilled: number;
    collectionRate: number;
    avgDaysToCollect: number;
    paymentCount: number;
  };
  byMethod: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  byProperty: Array<{
    propertyId: string;
    propertyName: string;
    collected: number;
    billed: number;
    collectionRate: number;
  }>;
  trend: Array<{
    date: string;
    collected: number;
    billed: number;
  }>;
}

export interface MaintenanceReport {
  summary: {
    totalWorkOrders: number;
    openWorkOrders: number;
    completedWorkOrders: number;
    avgCompletionDays: number;
    totalCost: number;
    avgCostPerOrder: number;
  };
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
    avgCompletionDays: number;
  }>;
  byProperty: Array<{
    propertyId: string;
    propertyName: string;
    totalOrders: number;
    openOrders: number;
    totalCost: number;
  }>;
  byCategory: Array<{
    type: string;
    count: number;
    totalCost: number;
    avgCost: number;
  }>;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate comprehensive occupancy report
   */
  async getOccupancyReport(organizationId: string): Promise<OccupancyReport> {
    // Get all properties for the organization
    const properties = await this.prisma.property.findMany({
      where: { organizationId },
      include: {
        units: {
          include: {
            leases: {
              where: { status: LeaseStatus.ACTIVE },
            },
          },
        },
      },
    });

    let totalUnits = 0;
    let occupiedUnits = 0;
    let vacantUnits = 0;
    let vacantRented = 0;
    let onNotice = 0;
    let underMaintenance = 0;
    let potentialRent = 0;
    let actualRent = 0;

    const byProperty: OccupancyReport['byProperty'] = [];
    const unitTypeMap = new Map<string, { total: number; occupied: number; rents: number[] }>();

    for (const property of properties) {
      let propertyOccupied = 0;
      let propertyVacant = 0;
      let propertyPotentialRent = 0;
      let propertyActualRent = 0;

      for (const unit of property.units) {
        totalUnits++;

        const marketRent = Number(unit.marketRent);
        potentialRent += marketRent;
        propertyPotentialRent += marketRent;

        // Track by unit type
        const typeData = unitTypeMap.get(unit.type) || { total: 0, occupied: 0, rents: [] };
        typeData.total++;
        typeData.rents.push(marketRent);

        if (unit.status === UnitStatus.OCCUPIED) {
          occupiedUnits++;
          propertyOccupied++;
          typeData.occupied++;
          const activeRent = unit.leases[0]?.monthlyRent
            ? Number(unit.leases[0].monthlyRent)
            : marketRent;
          actualRent += activeRent;
          propertyActualRent += activeRent;
        } else if (unit.status === UnitStatus.VACANT) {
          vacantUnits++;
          propertyVacant++;
        } else if (unit.status === UnitStatus.VACANT_RENTED) {
          vacantRented++;
          propertyVacant++;
        } else if (unit.status === UnitStatus.NOTICE) {
          onNotice++;
          occupiedUnits++;
          propertyOccupied++;
          typeData.occupied++;
        } else if (unit.status === UnitStatus.MAINTENANCE) {
          underMaintenance++;
          propertyVacant++;
        }

        unitTypeMap.set(unit.type, typeData);
      }

      byProperty.push({
        propertyId: property.id,
        propertyName: property.name,
        totalUnits: property.units.length,
        occupiedUnits: propertyOccupied,
        vacantUnits: propertyVacant,
        occupancyRate: property.units.length > 0
          ? (propertyOccupied / property.units.length) * 100
          : 0,
        potentialRent: propertyPotentialRent,
        actualRent: propertyActualRent,
      });
    }

    const byUnitType: OccupancyReport['byUnitType'] = [];
    unitTypeMap.forEach((data, type) => {
      byUnitType.push({
        unitType: type,
        total: data.total,
        occupied: data.occupied,
        occupancyRate: data.total > 0 ? (data.occupied / data.total) * 100 : 0,
        avgRent: data.rents.length > 0
          ? data.rents.reduce((a, b) => a + b, 0) / data.rents.length
          : 0,
      });
    });

    return {
      summary: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        vacantRented,
        onNotice,
        underMaintenance,
        occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        potentialRent,
        actualRent,
        lossToVacancy: potentialRent - actualRent,
      },
      byProperty,
      byUnitType,
    };
  }

  /**
   * Generate rent roll report
   */
  async getRentRollReport(organizationId: string): Promise<RentRollReport> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Get active leases with related data
    const leases = await this.prisma.lease.findMany({
      where: {
        unit: {
          property: { organizationId },
        },
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.DRAFT] },
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
            status: { in: [ChargeStatus.PENDING, ChargeStatus.POSTED, ChargeStatus.PARTIALLY_PAID] },
          },
        },
      },
    });

    let totalMonthlyRent = 0;
    let totalSecurityDeposits = 0;
    let expiringNext30Days = 0;
    let expiringNext60Days = 0;
    let expiringNext90Days = 0;

    const leaseDetails: RentRollReport['leases'] = [];

    for (const lease of leases) {
      const monthlyRent = Number(lease.monthlyRent);
      const securityDeposit = Number(lease.securityDeposit);

      totalMonthlyRent += monthlyRent;
      totalSecurityDeposits += securityDeposit;

      // Calculate outstanding balance
      const balance = lease.charges.reduce((sum, charge) => {
        return sum + (Number(charge.amount) - Number(charge.amountPaid));
      }, 0);

      // Check expiration
      let daysUntilExpiration: number | null = null;
      if (lease.endDate) {
        daysUntilExpiration = Math.ceil(
          (lease.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (lease.endDate <= thirtyDaysFromNow) {
          expiringNext30Days++;
        } else if (lease.endDate <= sixtyDaysFromNow) {
          expiringNext60Days++;
        } else if (lease.endDate <= ninetyDaysFromNow) {
          expiringNext90Days++;
        }
      }

      const primaryTenant = lease.tenants[0];

      leaseDetails.push({
        leaseId: lease.id,
        propertyName: lease.unit.property.name,
        unitNumber: lease.unit.unitNumber,
        tenantName: primaryTenant
          ? `${primaryTenant.firstName} ${primaryTenant.lastName}`
          : 'N/A',
        tenantEmail: primaryTenant?.email || 'N/A',
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRent,
        securityDeposit,
        balance,
        status: lease.status,
        daysUntilExpiration,
      });
    }

    return {
      summary: {
        totalLeases: leases.length,
        totalMonthlyRent,
        totalSecurityDeposits,
        avgRent: leases.length > 0 ? totalMonthlyRent / leases.length : 0,
        expiringNext30Days,
        expiringNext60Days,
        expiringNext90Days,
      },
      leases: leaseDetails,
    };
  }

  /**
   * Generate income statement (P&L) report
   */
  async getIncomeStatementReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IncomeStatementReport> {
    // Get completed payments in the period
    const payments = await this.prisma.payment.findMany({
      where: {
        tenant: {
          lease: {
            unit: {
              property: { organizationId },
            },
          },
        },
        status: PaymentStatus.COMPLETED,
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        allocations: {
          include: {
            charge: true,
          },
        },
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
      },
    });

    // Calculate income by category
    let rentalIncome = 0;
    let lateFees = 0;
    let otherIncome = 0;

    const propertyIncomeMap = new Map<string, { id: string; name: string; income: number }>();

    for (const payment of payments) {
      const property = payment.tenant?.lease?.unit?.property;
      if (property) {
        const existing = propertyIncomeMap.get(property.id) || {
          id: property.id,
          name: property.name,
          income: 0,
        };
        existing.income += Number(payment.amount);
        propertyIncomeMap.set(property.id, existing);
      }

      for (const allocation of payment.allocations) {
        const amount = Number(allocation.amount);
        switch (allocation.charge.type) {
          case 'RENT':
            rentalIncome += amount;
            break;
          case 'LATE_FEE':
            lateFees += amount;
            break;
          default:
            otherIncome += amount;
        }
      }
    }

    // Get expenses (bills paid in the period)
    const bills = await this.prisma.bill.findMany({
      where: {
        vendor: { organizationId },
        status: 'PAID',
        paidDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        vendor: true,
      },
    });

    // Calculate expenses by category
    let maintenance = 0;
    let utilities = 0;
    let insurance = 0;
    let propertyTax = 0;
    let managementFees = 0;
    let otherExpenses = 0;

    const propertyExpenseMap = new Map<string, number>();

    for (const bill of bills) {
      const amount = Number(bill.amount);

      if (bill.propertyId) {
        const existing = propertyExpenseMap.get(bill.propertyId) || 0;
        propertyExpenseMap.set(bill.propertyId, existing + amount);
      }

      switch (bill.vendor.type) {
        case 'MAINTENANCE':
        case 'GENERAL_CONTRACTOR':
        case 'PLUMBING':
        case 'ELECTRICAL':
        case 'HVAC':
          maintenance += amount;
          break;
        case 'UTILITY':
          utilities += amount;
          break;
        default:
          otherExpenses += amount;
      }
    }

    const totalIncome = rentalIncome + lateFees + otherIncome;
    const totalExpenses = maintenance + utilities + insurance + propertyTax + managementFees + otherExpenses;

    // Build property breakdown
    const byProperty: IncomeStatementReport['byProperty'] = [];
    propertyIncomeMap.forEach((incomeData, propertyId) => {
      const expenses = propertyExpenseMap.get(propertyId) || 0;
      byProperty.push({
        propertyId: incomeData.id,
        propertyName: incomeData.name,
        income: incomeData.income,
        expenses,
        noi: incomeData.income - expenses,
      });
    });

    return {
      period: { startDate, endDate },
      income: {
        rentalIncome,
        lateFees,
        otherIncome,
        totalIncome,
      },
      expenses: {
        maintenance,
        utilities,
        insurance,
        propertyTax,
        managementFees,
        otherExpenses,
        totalExpenses,
      },
      netOperatingIncome: totalIncome - totalExpenses,
      byProperty,
    };
  }

  /**
   * Generate accounts receivable aging report
   */
  async getARAgingReport(organizationId: string): Promise<ARAgingReport> {
    const now = new Date();

    // Get all outstanding charges
    const charges = await this.prisma.charge.findMany({
      where: {
        lease: {
          unit: {
            property: { organizationId },
          },
        },
        status: { in: [ChargeStatus.PENDING, ChargeStatus.POSTED, ChargeStatus.PARTIALLY_PAID] },
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
    });

    // Group by tenant
    const tenantAgingMap = new Map<
      string,
      {
        tenantId: string;
        tenantName: string;
        propertyName: string;
        unitNumber: string;
        current: number;
        days1to30: number;
        days31to60: number;
        days61to90: number;
        days90Plus: number;
        lastPaymentDate: Date | null;
      }
    >();

    let totalCurrent = 0;
    let totalDays1to30 = 0;
    let totalDays31to60 = 0;
    let totalDays61to90 = 0;
    let totalDays90Plus = 0;

    for (const charge of charges) {
      const outstanding = Number(charge.amount) - Number(charge.amountPaid);
      if (outstanding <= 0) continue;

      const daysPastDue = Math.floor(
        (now.getTime() - charge.dueDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      const tenant = charge.lease.tenants[0];
      if (!tenant) continue;

      const existing = tenantAgingMap.get(tenant.id) || {
        tenantId: tenant.id,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        propertyName: charge.lease.unit.property.name,
        unitNumber: charge.lease.unit.unitNumber,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90Plus: 0,
        lastPaymentDate: null,
      };

      // Calculate last payment date
      const lastPayment = charge.payments
        .filter((p) => p.payment.status === PaymentStatus.COMPLETED)
        .sort((a, b) => b.payment.paymentDate.getTime() - a.payment.paymentDate.getTime())[0];
      if (
        lastPayment &&
        (!existing.lastPaymentDate ||
          lastPayment.payment.paymentDate > existing.lastPaymentDate)
      ) {
        existing.lastPaymentDate = lastPayment.payment.paymentDate;
      }

      // Categorize by aging bucket
      if (daysPastDue <= 0) {
        existing.current += outstanding;
        totalCurrent += outstanding;
      } else if (daysPastDue <= 30) {
        existing.days1to30 += outstanding;
        totalDays1to30 += outstanding;
      } else if (daysPastDue <= 60) {
        existing.days31to60 += outstanding;
        totalDays31to60 += outstanding;
      } else if (daysPastDue <= 90) {
        existing.days61to90 += outstanding;
        totalDays61to90 += outstanding;
      } else {
        existing.days90Plus += outstanding;
        totalDays90Plus += outstanding;
      }

      tenantAgingMap.set(tenant.id, existing);
    }

    // Build tenant list with totals
    const tenants: ARAgingReport['tenants'] = [];
    tenantAgingMap.forEach((data) => {
      tenants.push({
        ...data,
        total:
          data.current + data.days1to30 + data.days31to60 + data.days61to90 + data.days90Plus,
      });
    });

    // Sort by total outstanding (descending)
    tenants.sort((a, b) => b.total - a.total);

    return {
      summary: {
        totalOutstanding:
          totalCurrent + totalDays1to30 + totalDays31to60 + totalDays61to90 + totalDays90Plus,
        current: totalCurrent,
        days1to30: totalDays1to30,
        days31to60: totalDays31to60,
        days61to90: totalDays61to90,
        days90Plus: totalDays90Plus,
      },
      tenants,
    };
  }

  /**
   * Generate collections report
   */
  async getCollectionsReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CollectionsReport> {
    // Get all payments in the period
    const payments = await this.prisma.payment.findMany({
      where: {
        tenant: {
          lease: {
            unit: {
              property: { organizationId },
            },
          },
        },
        paymentDate: {
          gte: startDate,
          lte: endDate,
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
      },
    });

    // Get all charges in the period
    const charges = await this.prisma.charge.findMany({
      where: {
        lease: {
          unit: {
            property: { organizationId },
          },
        },
        dueDate: {
          gte: startDate,
          lte: endDate,
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

    // Calculate totals
    let totalCollected = 0;
    let totalDaysToCollect = 0;
    let collectionCount = 0;

    const methodMap = new Map<string, { amount: number; count: number }>();
    const propertyMap = new Map<
      string,
      { id: string; name: string; collected: number; billed: number }
    >();

    const completedPayments = payments.filter((p) => p.status === PaymentStatus.COMPLETED);

    for (const payment of completedPayments) {
      const amount = Number(payment.amount);
      totalCollected += amount;
      collectionCount++;

      // Track by method
      const method = payment.method;
      const methodData = methodMap.get(method) || { amount: 0, count: 0 };
      methodData.amount += amount;
      methodData.count++;
      methodMap.set(method, methodData);

      // Track by property
      const property = payment.tenant?.lease?.unit?.property;
      if (property) {
        const propertyData = propertyMap.get(property.id) || {
          id: property.id,
          name: property.name,
          collected: 0,
          billed: 0,
        };
        propertyData.collected += amount;
        propertyMap.set(property.id, propertyData);
      }
    }

    // Calculate total billed
    let totalBilled = 0;
    for (const charge of charges) {
      const amount = Number(charge.amount);
      totalBilled += amount;

      const property = charge.lease.unit.property;
      const propertyData = propertyMap.get(property.id) || {
        id: property.id,
        name: property.name,
        collected: 0,
        billed: 0,
      };
      propertyData.billed += amount;
      propertyMap.set(property.id, propertyData);
    }

    // Build by method breakdown
    const byMethod: CollectionsReport['byMethod'] = [];
    methodMap.forEach((data, method) => {
      byMethod.push({
        method,
        amount: data.amount,
        count: data.count,
        percentage: totalCollected > 0 ? (data.amount / totalCollected) * 100 : 0,
      });
    });
    byMethod.sort((a, b) => b.amount - a.amount);

    // Build by property breakdown
    const byProperty: CollectionsReport['byProperty'] = [];
    propertyMap.forEach((data) => {
      byProperty.push({
        propertyId: data.id,
        propertyName: data.name,
        collected: data.collected,
        billed: data.billed,
        collectionRate: data.billed > 0 ? (data.collected / data.billed) * 100 : 0,
      });
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalCollected,
        totalBilled,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
        avgDaysToCollect:
          collectionCount > 0 ? Math.round(totalDaysToCollect / collectionCount) : 0,
        paymentCount: collectionCount,
      },
      byMethod,
      byProperty,
      trend: [], // Would need daily aggregation for trend
    };
  }

  /**
   * Generate maintenance report
   */
  async getMaintenanceReport(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MaintenanceReport> {
    const where: {
      organizationId: string;
      requestedDate?: { gte: Date; lte: Date };
    } = { organizationId };

    if (startDate && endDate) {
      where.requestedDate = { gte: startDate, lte: endDate };
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where,
      include: {
        property: true,
      },
    });

    let totalCost = 0;
    let totalCompletionDays = 0;
    let completedCount = 0;

    const statusMap = new Map<string, number>();
    const priorityMap = new Map<string, { count: number; completionDays: number }>();
    const propertyMap = new Map<
      string,
      { id: string; name: string; total: number; open: number; cost: number }
    >();
    const typeMap = new Map<string, { count: number; cost: number }>();

    for (const wo of workOrders) {
      // Track status
      statusMap.set(wo.status, (statusMap.get(wo.status) || 0) + 1);

      // Track priority
      const priorityData = priorityMap.get(wo.priority) || { count: 0, completionDays: 0 };
      priorityData.count++;

      // Track property
      const propertyData = propertyMap.get(wo.propertyId) || {
        id: wo.propertyId,
        name: wo.property.name,
        total: 0,
        open: 0,
        cost: 0,
      };
      propertyData.total++;

      // Track type
      const typeData = typeMap.get(wo.type) || { count: 0, cost: 0 };
      typeData.count++;

      // Check if completed
      if (wo.status === WorkOrderStatus.COMPLETED && wo.completedDate) {
        const completionDays = Math.ceil(
          (wo.completedDate.getTime() - wo.requestedDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        totalCompletionDays += completionDays;
        priorityData.completionDays += completionDays;
        completedCount++;
      }

      // Check if open
      if (
        [
          WorkOrderStatus.SUBMITTED,
          WorkOrderStatus.ASSIGNED,
          WorkOrderStatus.IN_PROGRESS,
          WorkOrderStatus.ON_HOLD,
        ].includes(wo.status as WorkOrderStatus)
      ) {
        propertyData.open++;
      }

      // Track cost
      if (wo.actualCost) {
        const cost = Number(wo.actualCost);
        totalCost += cost;
        propertyData.cost += cost;
        typeData.cost += cost;
      }

      priorityMap.set(wo.priority, priorityData);
      propertyMap.set(wo.propertyId, propertyData);
      typeMap.set(wo.type, typeData);
    }

    // Build by status
    const byStatus: MaintenanceReport['byStatus'] = [];
    statusMap.forEach((count, status) => {
      byStatus.push({
        status,
        count,
        percentage: workOrders.length > 0 ? (count / workOrders.length) * 100 : 0,
      });
    });

    // Build by priority
    const byPriority: MaintenanceReport['byPriority'] = [];
    priorityMap.forEach((data, priority) => {
      byPriority.push({
        priority,
        count: data.count,
        avgCompletionDays: data.count > 0 ? Math.round(data.completionDays / data.count) : 0,
      });
    });

    // Build by property
    const byProperty: MaintenanceReport['byProperty'] = [];
    propertyMap.forEach((data) => {
      byProperty.push({
        propertyId: data.id,
        propertyName: data.name,
        totalOrders: data.total,
        openOrders: data.open,
        totalCost: data.cost,
      });
    });

    // Build by category
    const byCategory: MaintenanceReport['byCategory'] = [];
    typeMap.forEach((data, type) => {
      byCategory.push({
        type,
        count: data.count,
        totalCost: data.cost,
        avgCost: data.count > 0 ? data.cost / data.count : 0,
      });
    });

    return {
      summary: {
        totalWorkOrders: workOrders.length,
        openWorkOrders: byStatus.find((s) => s.status !== 'COMPLETED')?.count || 0,
        completedWorkOrders: completedCount,
        avgCompletionDays: completedCount > 0 ? Math.round(totalCompletionDays / completedCount) : 0,
        totalCost,
        avgCostPerOrder: workOrders.length > 0 ? totalCost / workOrders.length : 0,
      },
      byStatus,
      byPriority,
      byProperty,
      byCategory,
    };
  }

  /**
   * Export report to CSV format
   */
  exportToCSV(data: Record<string, unknown>[], headers: string[]): string {
    const csvRows: string[] = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
