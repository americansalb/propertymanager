import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('occupancy')
  async getOccupancy(@OrganizationId() organizationId: string) {
    const report = await this.reportsService.getOccupancyReport(organizationId);
    return { success: true, data: report };
  }
}
