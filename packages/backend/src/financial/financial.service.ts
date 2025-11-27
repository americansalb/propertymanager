import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async getChartOfAccounts(organizationId: string) {
    return this.prisma.chartOfAccounts.findMany({
      where: { organizationId },
      orderBy: { accountNumber: 'asc' },
    });
  }

  async getDashboardSummary(_organizationId: string) {
    // Placeholder for financial summary
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netOperatingIncome: 0,
      cashBalance: 0,
    };
  }
}
