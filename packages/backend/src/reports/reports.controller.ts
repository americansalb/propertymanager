import { Controller, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('occupancy')
  @ApiOperation({ summary: 'Get occupancy report' })
  @ApiResponse({ status: 200, description: 'Occupancy report data' })
  async getOccupancy(@OrganizationId() organizationId: string) {
    const report = await this.reportsService.getOccupancyReport(organizationId);
    return { success: true, data: report };
  }

  @Get('rent-roll')
  @ApiOperation({ summary: 'Get rent roll report' })
  @ApiResponse({ status: 200, description: 'Rent roll data' })
  async getRentRoll(@OrganizationId() organizationId: string) {
    const report = await this.reportsService.getRentRollReport(organizationId);
    return { success: true, data: report };
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Get income statement (P&L) report' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Income statement data' })
  async getIncomeStatement(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const report = await this.reportsService.getIncomeStatementReport(
      organizationId,
      startDate,
      endDate,
    );
    return { success: true, data: report };
  }

  @Get('ar-aging')
  @ApiOperation({ summary: 'Get accounts receivable aging report' })
  @ApiResponse({ status: 200, description: 'AR aging data' })
  async getARAgingReport(@OrganizationId() organizationId: string) {
    const report = await this.reportsService.getARAgingReport(organizationId);
    return { success: true, data: report };
  }

  @Get('collections')
  @ApiOperation({ summary: 'Get collections report' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Collections data' })
  async getCollectionsReport(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const report = await this.reportsService.getCollectionsReport(
      organizationId,
      startDate,
      endDate,
    );
    return { success: true, data: report };
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Maintenance data' })
  async getMaintenanceReport(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const report = await this.reportsService.getMaintenanceReport(
      organizationId,
      startDate,
      endDate,
    );
    return { success: true, data: report };
  }

  // CSV Export Endpoints

  @Get('rent-roll/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="rent-roll.csv"')
  @ApiOperation({ summary: 'Export rent roll to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportRentRoll(
    @OrganizationId() organizationId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.getRentRollReport(organizationId);

    const headers = [
      'propertyName',
      'unitNumber',
      'tenantName',
      'tenantEmail',
      'startDate',
      'endDate',
      'monthlyRent',
      'securityDeposit',
      'balance',
      'status',
      'daysUntilExpiration',
    ];

    const data = report.leases.map((lease) => ({
      ...lease,
      startDate: lease.startDate.toISOString().split('T')[0],
      endDate: lease.endDate?.toISOString().split('T')[0] || 'N/A',
    }));

    const csv = this.reportsService.exportToCSV(data, headers);
    res.send(csv);
  }

  @Get('ar-aging/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="ar-aging.csv"')
  @ApiOperation({ summary: 'Export AR aging to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportARAgingReport(
    @OrganizationId() organizationId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.getARAgingReport(organizationId);

    const headers = [
      'tenantName',
      'propertyName',
      'unitNumber',
      'current',
      'days1to30',
      'days31to60',
      'days61to90',
      'days90Plus',
      'total',
      'lastPaymentDate',
    ];

    const data = report.tenants.map((tenant) => ({
      ...tenant,
      lastPaymentDate: tenant.lastPaymentDate?.toISOString().split('T')[0] || 'N/A',
    }));

    const csv = this.reportsService.exportToCSV(data, headers);
    res.send(csv);
  }

  @Get('income-statement/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="income-statement.csv"')
  @ApiOperation({ summary: 'Export income statement to CSV' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportIncomeStatement(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Res() res: Response,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const report = await this.reportsService.getIncomeStatementReport(
      organizationId,
      startDate,
      endDate,
    );

    // Create summary CSV
    const data = [
      { category: 'INCOME', item: 'Rental Income', amount: report.income.rentalIncome },
      { category: 'INCOME', item: 'Late Fees', amount: report.income.lateFees },
      { category: 'INCOME', item: 'Other Income', amount: report.income.otherIncome },
      { category: 'INCOME', item: 'Total Income', amount: report.income.totalIncome },
      { category: 'EXPENSE', item: 'Maintenance', amount: report.expenses.maintenance },
      { category: 'EXPENSE', item: 'Utilities', amount: report.expenses.utilities },
      { category: 'EXPENSE', item: 'Insurance', amount: report.expenses.insurance },
      { category: 'EXPENSE', item: 'Property Tax', amount: report.expenses.propertyTax },
      { category: 'EXPENSE', item: 'Management Fees', amount: report.expenses.managementFees },
      { category: 'EXPENSE', item: 'Other Expenses', amount: report.expenses.otherExpenses },
      { category: 'EXPENSE', item: 'Total Expenses', amount: report.expenses.totalExpenses },
      { category: 'NET', item: 'Net Operating Income', amount: report.netOperatingIncome },
    ];

    const headers = ['category', 'item', 'amount'];
    const csv = this.reportsService.exportToCSV(data, headers);
    res.send(csv);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary data' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  async getDashboard(@OrganizationId() organizationId: string) {
    // Parallel fetch of key metrics
    const [occupancy, rentRoll, arAging] = await Promise.all([
      this.reportsService.getOccupancyReport(organizationId),
      this.reportsService.getRentRollReport(organizationId),
      this.reportsService.getARAgingReport(organizationId),
    ]);

    return {
      success: true,
      data: {
        occupancy: {
          rate: occupancy.summary.occupancyRate,
          totalUnits: occupancy.summary.totalUnits,
          vacantUnits: occupancy.summary.vacantUnits,
          lossToVacancy: occupancy.summary.lossToVacancy,
        },
        revenue: {
          monthlyRent: rentRoll.summary.totalMonthlyRent,
          avgRent: rentRoll.summary.avgRent,
          securityDeposits: rentRoll.summary.totalSecurityDeposits,
        },
        receivables: {
          totalOutstanding: arAging.summary.totalOutstanding,
          current: arAging.summary.current,
          pastDue: arAging.summary.totalOutstanding - arAging.summary.current,
          over90Days: arAging.summary.days90Plus,
        },
        leases: {
          total: rentRoll.summary.totalLeases,
          expiringNext30Days: rentRoll.summary.expiringNext30Days,
          expiringNext60Days: rentRoll.summary.expiringNext60Days,
          expiringNext90Days: rentRoll.summary.expiringNext90Days,
        },
      },
    };
  }
}
