import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('financial')
@Controller('financial')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class FinancialController {
  constructor(private financialService: FinancialService) {}

  @Get('chart-of-accounts')
  async getChartOfAccounts(@OrganizationId() organizationId: string) {
    const accounts = await this.financialService.getChartOfAccounts(organizationId);
    return { success: true, data: accounts };
  }

  @Get('dashboard')
  async getDashboard(@OrganizationId() organizationId: string) {
    const summary = await this.financialService.getDashboardSummary(organizationId);
    return { success: true, data: summary };
  }
}
