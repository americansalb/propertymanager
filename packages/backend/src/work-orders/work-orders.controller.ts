import { Controller, Get, Post, Put, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';

@ApiTags('operations')
@Controller('work-orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WorkOrdersController {
  constructor(private workOrdersService: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all work orders for organization' })
  @ApiResponse({ status: 200, description: 'List of work orders retrieved successfully' })
  async findAll(@OrganizationId() organizationId: string) {
    const workOrders = await this.workOrdersService.findAll(organizationId);
    return { success: true, data: workOrders };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single work order by ID' })
  @ApiResponse({ status: 200, description: 'Work order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const workOrder = await this.workOrdersService.findOne(id, organizationId);
    return { success: true, data: workOrder };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new work order' })
  @ApiResponse({ status: 201, description: 'Work order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data provided' })
  async create(
    @Body() dto: CreateWorkOrderDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const workOrder = await this.workOrdersService.create(dto, organizationId, userId);
    return { success: true, data: workOrder };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a work order' })
  @ApiResponse({ status: 200, description: 'Work order updated successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  @ApiResponse({ status: 400, description: 'Invalid data provided' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const workOrder = await this.workOrdersService.update(id, dto, organizationId, userId);
    return { success: true, data: workOrder };
  }
}
