import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import { CreateLeaseDto } from './dto/create-lease.dto';
import {
  UpdateLeaseDto,
  TerminateLeaseDto,
  RenewLeaseDto,
  AddTenantDto,
} from './dto/update-lease.dto';

@ApiTags('leases')
@Controller('leases')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class LeasesController {
  constructor(private leasesService: LeasesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all leases for the organization' })
  @ApiResponse({ status: 200, description: 'List of leases' })
  async findAll(@OrganizationId() organizationId: string) {
    const leases = await this.leasesService.findAll(organizationId);
    return { success: true, data: leases };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single lease by ID' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease details' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const lease = await this.leasesService.findOne(id, organizationId);
    return { success: true, data: lease };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lease with tenants' })
  @ApiResponse({ status: 201, description: 'Lease created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or business rule violation' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  async create(
    @Body() dto: CreateLeaseDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.create(dto, organizationId, userId);
    return { success: true, data: lease };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a lease (DRAFT or ACTIVE only)' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update lease in current status' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeaseDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.update(id, dto, organizationId, userId);
    return { success: true, data: lease };
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a DRAFT lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease activated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot activate lease in current status' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async activate(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.activate(id, organizationId, userId);
    return { success: true, data: lease, message: 'Lease activated successfully' };
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate an ACTIVE lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease terminated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot terminate lease in current status' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async terminate(
    @Param('id') id: string,
    @Body() dto: TerminateLeaseDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.terminate(id, dto, organizationId, userId);
    return { success: true, data: lease, message: 'Lease terminated successfully' };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a DRAFT lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel lease in current status' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async cancel(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.cancel(id, organizationId, userId);
    return { success: true, data: lease, message: 'Lease cancelled successfully' };
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew an ACTIVE or EXPIRED lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 201, description: 'Lease renewed successfully (new lease created)' })
  @ApiResponse({ status: 400, description: 'Cannot renew lease in current status' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async renew(
    @Param('id') id: string,
    @Body() dto: RenewLeaseDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.renew(id, dto, organizationId, userId);
    return { success: true, data: lease, message: 'Lease renewed successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a DRAFT or CANCELLED lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete lease in current status' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async delete(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const result = await this.leasesService.delete(id, organizationId, userId);
    return result;
  }

  // ============================================================
  // TENANT MANAGEMENT ENDPOINTS
  // ============================================================

  @Post(':id/tenants')
  @ApiOperation({ summary: 'Add a tenant to a lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 201, description: 'Tenant added successfully' })
  @ApiResponse({ status: 400, description: 'Cannot add tenant to lease in current status' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async addTenant(
    @Param('id') id: string,
    @Body() dto: AddTenantDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.addTenant(id, dto, organizationId, userId);
    return { success: true, data: lease, message: 'Tenant added successfully' };
  }

  @Delete(':id/tenants/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a tenant from a lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant removed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot remove primary tenant or last tenant' })
  @ApiResponse({ status: 404, description: 'Lease or tenant not found' })
  async removeTenant(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.removeTenant(id, tenantId, organizationId, userId);
    return { success: true, data: lease, message: 'Tenant removed successfully' };
  }

  @Post(':id/tenants/:tenantId/set-primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a tenant as the primary tenant' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Primary tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Lease or tenant not found' })
  async setPrimaryTenant(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.setPrimaryTenant(id, tenantId, organizationId, userId);
    return { success: true, data: lease, message: 'Primary tenant updated successfully' };
  }

  // ============================================================
  // LEASE EXPIRATION TRACKING ENDPOINTS (Phase 50)
  // ============================================================

  @Get('expiring/:days')
  @ApiOperation({ summary: 'Get leases expiring within specified days' })
  @ApiParam({ name: 'days', description: 'Number of days ahead to check (default 30)' })
  @ApiResponse({ status: 200, description: 'List of expiring leases' })
  async getExpiringLeases(
    @Param('days') days: string,
    @OrganizationId() organizationId: string,
  ) {
    const daysAhead = parseInt(days, 10) || 30;
    const leases = await this.leasesService.getExpiringLeases(organizationId, daysAhead);
    return { success: true, data: leases };
  }

  @Get('expiration/summary')
  @ApiOperation({ summary: 'Get lease expiration summary by time period' })
  @ApiResponse({ status: 200, description: 'Expiration summary counts' })
  async getExpirationSummary(@OrganizationId() organizationId: string) {
    const summary = await this.leasesService.getExpirationSummary(organizationId);
    return { success: true, data: summary };
  }

  @Post('expiration/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process expired leases (admin only)' })
  @ApiResponse({ status: 200, description: 'Expired leases processed' })
  async processExpiredLeases(@OrganizationId() organizationId: string) {
    const result = await this.leasesService.processExpiredLeases(organizationId);
    return { success: true, data: result };
  }

  // ============================================================
  // AUTO-PAY MANAGEMENT ENDPOINTS (Phase 70)
  // ============================================================

  @Post(':id/autopay')
  @ApiOperation({ summary: 'Enable auto-pay for a lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Auto-pay enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid auto-pay settings or lease not active' })
  async enableAutoPay(
    @Param('id') id: string,
    @Body() dto: { autoPayDay: number; paymentMethodId: string },
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.enableAutoPay(
      id,
      dto.autoPayDay,
      dto.paymentMethodId,
      organizationId,
      userId,
    );
    return { success: true, data: lease, message: 'Auto-pay enabled successfully' };
  }

  @Delete(':id/autopay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable auto-pay for a lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Auto-pay disabled successfully' })
  async disableAutoPay(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.disableAutoPay(id, organizationId, userId);
    return { success: true, data: lease, message: 'Auto-pay disabled successfully' };
  }

  @Put(':id/autopay')
  @ApiOperation({ summary: 'Update auto-pay settings for a lease' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Auto-pay settings updated successfully' })
  async updateAutoPaySettings(
    @Param('id') id: string,
    @Body() dto: { autoPayDay: number; paymentMethodId?: string },
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const lease = await this.leasesService.updateAutoPaySettings(
      id,
      dto.autoPayDay,
      dto.paymentMethodId,
      organizationId,
      userId,
    );
    return { success: true, data: lease, message: 'Auto-pay settings updated successfully' };
  }
}
