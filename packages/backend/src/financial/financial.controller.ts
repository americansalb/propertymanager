import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { ChargesService } from './charges.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import {
  CreateChargeDto,
  UpdateChargeDto,
  PostChargeDto,
  GenerateRentChargesDto,
  GenerateLateFeeDto,
} from './dto/charge.dto';

@ApiTags('financial')
@Controller('financial')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class FinancialController {
  constructor(
    private financialService: FinancialService,
    private chargesService: ChargesService,
  ) {}

  // ============================================================
  // DASHBOARD & REPORTS
  // ============================================================

  @Get('chart-of-accounts')
  @ApiOperation({ summary: 'Get chart of accounts' })
  @ApiResponse({ status: 200, description: 'Chart of accounts' })
  async getChartOfAccounts(@OrganizationId() organizationId: string) {
    const accounts = await this.financialService.getChartOfAccounts(organizationId);
    return { success: true, data: accounts };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get financial dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary with key metrics' })
  async getDashboard(@OrganizationId() organizationId: string) {
    const summary = await this.financialService.getDashboardSummary(organizationId);
    return { success: true, data: summary };
  }

  @Get('aging-report')
  @ApiOperation({ summary: 'Get aging report for outstanding balances' })
  @ApiResponse({ status: 200, description: 'Aging report with breakdown by days overdue' })
  async getAgingReport(@OrganizationId() organizationId: string) {
    const report = await this.financialService.getAgingReport(organizationId);
    return { success: true, data: report };
  }

  @Get('rent-roll')
  @ApiOperation({ summary: 'Get rent roll for all active leases' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property' })
  @ApiResponse({ status: 200, description: 'Rent roll with lease and rent information' })
  async getRentRoll(
    @OrganizationId() organizationId: string,
    @Query('propertyId') propertyId?: string,
  ) {
    const rentRoll = await this.financialService.getRentRoll(organizationId, propertyId);
    return { success: true, data: rentRoll };
  }

  @Get('ledger/:leaseId')
  @ApiOperation({ summary: 'Get tenant ledger for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Tenant ledger with all transactions' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getTenantLedger(
    @Param('leaseId') leaseId: string,
    @OrganizationId() organizationId: string,
  ) {
    const ledger = await this.financialService.getTenantLedger(leaseId, organizationId);
    return { success: true, data: ledger };
  }

  @Get('property/:propertyId/summary')
  @ApiOperation({ summary: 'Get financial summary for a property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'Property financial summary' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getPropertySummary(
    @Param('propertyId') propertyId: string,
    @OrganizationId() organizationId: string,
  ) {
    const summary = await this.financialService.getPropertySummary(propertyId, organizationId);
    return { success: true, data: summary };
  }

  // ============================================================
  // CHARGES MANAGEMENT
  // ============================================================

  @Get('charges')
  @ApiOperation({ summary: 'Get all charges' })
  @ApiQuery({ name: 'leaseId', required: false, description: 'Filter by lease' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'List of charges' })
  async getCharges(
    @OrganizationId() organizationId: string,
    @Query('leaseId') leaseId?: string,
    @Query('status') status?: string,
  ) {
    const charges = await this.chargesService.findAll(organizationId, { leaseId, status });
    return { success: true, data: charges };
  }

  @Get('charges/:id')
  @ApiOperation({ summary: 'Get a single charge by ID' })
  @ApiParam({ name: 'id', description: 'Charge ID' })
  @ApiResponse({ status: 200, description: 'Charge details' })
  @ApiResponse({ status: 404, description: 'Charge not found' })
  async getCharge(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const charge = await this.chargesService.findOne(id, organizationId);
    return { success: true, data: charge };
  }

  @Post('charges')
  @ApiOperation({ summary: 'Create a new charge' })
  @ApiResponse({ status: 201, description: 'Charge created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async createCharge(
    @Body() dto: CreateChargeDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const charge = await this.chargesService.create(dto, organizationId, userId);
    return { success: true, data: charge };
  }

  @Put('charges/:id')
  @ApiOperation({ summary: 'Update a PENDING charge' })
  @ApiParam({ name: 'id', description: 'Charge ID' })
  @ApiResponse({ status: 200, description: 'Charge updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update charge in current status' })
  @ApiResponse({ status: 404, description: 'Charge not found' })
  async updateCharge(
    @Param('id') id: string,
    @Body() dto: UpdateChargeDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const charge = await this.chargesService.update(id, dto, organizationId, userId);
    return { success: true, data: charge };
  }

  @Post('charges/:id/post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a PENDING charge (make it active)' })
  @ApiParam({ name: 'id', description: 'Charge ID' })
  @ApiResponse({ status: 200, description: 'Charge posted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot post charge in current status' })
  @ApiResponse({ status: 404, description: 'Charge not found' })
  async postCharge(
    @Param('id') id: string,
    @Body() dto: PostChargeDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const charge = await this.chargesService.post(id, dto, organizationId, userId);
    return { success: true, data: charge, message: 'Charge posted successfully' };
  }

  @Post('charges/:id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a charge (only if no payments)' })
  @ApiParam({ name: 'id', description: 'Charge ID' })
  @ApiResponse({ status: 200, description: 'Charge voided successfully' })
  @ApiResponse({ status: 400, description: 'Cannot void charge with payments' })
  @ApiResponse({ status: 404, description: 'Charge not found' })
  async voidCharge(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const charge = await this.chargesService.void(id, organizationId, userId);
    return { success: true, data: charge, message: 'Charge voided successfully' };
  }

  @Delete('charges/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a PENDING or VOID charge' })
  @ApiParam({ name: 'id', description: 'Charge ID' })
  @ApiResponse({ status: 200, description: 'Charge deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete charge in current status' })
  @ApiResponse({ status: 404, description: 'Charge not found' })
  async deleteCharge(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const result = await this.chargesService.delete(id, organizationId, userId);
    return result;
  }

  // ============================================================
  // CHARGE GENERATION
  // ============================================================

  @Post('charges/generate-rent')
  @ApiOperation({ summary: 'Generate monthly rent charges for active leases' })
  @ApiResponse({ status: 201, description: 'Rent charges generated' })
  async generateRentCharges(
    @Body() dto: GenerateRentChargesDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const result = await this.chargesService.generateRentCharges(dto, organizationId, userId);
    return { success: true, data: result };
  }

  @Post('charges/generate-late-fees')
  @ApiOperation({ summary: 'Generate late fees for overdue charges' })
  @ApiResponse({ status: 201, description: 'Late fees generated' })
  async generateLateFees(
    @Body() dto: GenerateLateFeeDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const result = await this.chargesService.generateLateFees(dto, organizationId, userId);
    return { success: true, data: result };
  }

  // ============================================================
  // LEASE BALANCE QUERIES
  // ============================================================

  @Get('leases/:leaseId/outstanding')
  @ApiOperation({ summary: 'Get outstanding charges for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Outstanding charges' })
  async getOutstandingCharges(
    @Param('leaseId') leaseId: string,
    @OrganizationId() organizationId: string,
  ) {
    const charges = await this.chargesService.getOutstandingCharges(leaseId, organizationId);
    return { success: true, data: charges };
  }

  @Get('leases/:leaseId/balance')
  @ApiOperation({ summary: 'Get total balance for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease balance' })
  async getLeaseBalance(
    @Param('leaseId') leaseId: string,
    @OrganizationId() organizationId: string,
  ) {
    const balance = await this.chargesService.getLeaseBalance(leaseId, organizationId);
    return { success: true, data: balance };
  }
}
