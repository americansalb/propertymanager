import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('operations')
@Controller('work-orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WorkOrdersController {
  constructor(private workOrdersService: WorkOrdersService) {}

  @Get()
  async findAll(@OrganizationId() organizationId: string) {
    const workOrders = await this.workOrdersService.findAll(organizationId);
    return { success: true, data: workOrders };
  }

  @Post()
  async create(@Body() data: any, @OrganizationId() organizationId: string) {
    const workOrder = await this.workOrdersService.create(data, organizationId);
    return { success: true, data: workOrder };
  }
}
