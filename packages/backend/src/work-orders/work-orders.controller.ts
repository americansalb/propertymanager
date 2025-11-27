import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  AssignWorkOrderDto,
  CompleteWorkOrderDto,
  UpdateWorkOrderStatusDto,
  WorkOrderQueryDto,
} from './dto';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';

@ApiTags('work-orders')
@Controller('work-orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WorkOrdersController {
  constructor(private workOrdersService: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all work orders with optional filters' })
  @ApiResponse({ status: 200, description: 'List of work orders retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property' })
  @ApiQuery({ name: 'vendorId', required: false, description: 'Filter by vendor' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size' })
  async findAll(@OrganizationId() organizationId: string, @Query() query: WorkOrderQueryDto) {
    const result = await this.workOrdersService.findAll(organizationId, query);
    return { success: true, ...result };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get work order statistics' })
  @ApiResponse({ status: 200, description: 'Work order statistics retrieved successfully' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property' })
  async getStats(
    @OrganizationId() organizationId: string,
    @Query('propertyId') propertyId?: string,
  ) {
    const stats = await this.workOrdersService.getStats(organizationId, propertyId);
    return { success: true, data: stats };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single work order by ID' })
  @ApiResponse({ status: 200, description: 'Work order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const workOrder = await this.workOrdersService.findOne(id, organizationId);
    return { success: true, data: workOrder };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get work order status history' })
  @ApiResponse({ status: 200, description: 'Status history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async getStatusHistory(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const history = await this.workOrdersService.getStatusHistory(id, organizationId);
    return { success: true, data: history };
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
  @ApiResponse({ status: 400, description: 'Invalid data or status transition' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const workOrder = await this.workOrdersService.update(id, dto, organizationId, userId);
    return { success: true, data: workOrder };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update work order status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const workOrder = await this.workOrdersService.updateStatus(id, dto, organizationId, userId);
    return { success: true, data: workOrder };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign work order to vendor or user' })
  @ApiResponse({ status: 200, description: 'Work order assigned successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  @ApiResponse({ status: 400, description: 'Invalid assignment' })
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignWorkOrderDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const workOrder = await this.workOrdersService.assign(id, dto, organizationId, userId);
    return { success: true, data: workOrder };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark work order as completed' })
  @ApiResponse({ status: 200, description: 'Work order completed successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  @ApiResponse({ status: 400, description: 'Cannot complete work order in current status' })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteWorkOrderDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const workOrder = await this.workOrdersService.complete(id, dto, organizationId, userId);
    return { success: true, data: workOrder };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a work order' })
  @ApiResponse({ status: 200, description: 'Work order cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel work order in current status' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const workOrder = await this.workOrdersService.cancel(id, reason, organizationId, userId);
    return { success: true, data: workOrder };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a work order' })
  @ApiResponse({ status: 200, description: 'Work order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete work order in current status' })
  async remove(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const result = await this.workOrdersService.remove(id, organizationId, userId);
    return { success: true, data: result };
  }
}
