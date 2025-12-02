import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateServiceCatalogDto,
  UpdateServiceCatalogDto,
  ServiceCatalogQueryDto,
  CreateMarketplaceJobDto,
  DispatchJobDto,
  AcceptJobDto,
  type DeclineJobDto,
  type SubmitQuoteDto,
  type CompleteJobDto,
  ConfirmJobDto,
  DisputeJobDto,
  MarketplaceJobQueryDto,
  CreateVendorMarketplaceProfileDto,
  UpdateVendorMarketplaceProfileDto,
  AddVendorServiceDto,
  UpdateVendorServiceDto,
  VendorMarketplaceQueryDto,
  CreateVendorRatingDto,
  UpdateVendorRatingDto,
  VendorRatingQueryDto,
} from './dto';

@ApiTags('marketplace')
@Controller('marketplace')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  // ============================================================================
  // SERVICE CATALOG ENDPOINTS
  // ============================================================================

  @Post('services')
  @UseGuards(RolesGuard)
  @Roles('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a service catalog entry' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  async createService(@Body() dto: CreateServiceCatalogDto) {
    const service = await this.marketplaceService.createServiceCatalog(dto);
    return { success: true, data: service };
  }

  @Get('services')
  @ApiOperation({ summary: 'Get all services in the catalog' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async findAllServices(@Query() query: ServiceCatalogQueryDto) {
    const services = await this.marketplaceService.findAllServiceCatalog(query);
    return { success: true, data: services };
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOneService(@Param('id') id: string) {
    const service = await this.marketplaceService.findOneServiceCatalog(id);
    return { success: true, data: service };
  }

  @Put('services/:id')
  @UseGuards(RolesGuard)
  @Roles('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a service catalog entry' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  async updateService(@Param('id') id: string, @Body() dto: UpdateServiceCatalogDto) {
    const service = await this.marketplaceService.updateServiceCatalog(id, dto);
    return { success: true, data: service };
  }

  @Delete('services/:id')
  @UseGuards(RolesGuard)
  @Roles('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a service catalog entry' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  async deleteService(@Param('id') id: string) {
    const result = await this.marketplaceService.deleteServiceCatalog(id);
    return { success: true, data: result };
  }

  // ============================================================================
  // VENDOR MARKETPLACE PROFILE ENDPOINTS
  // ============================================================================

  @Post('vendors')
  @ApiOperation({ summary: 'Create a vendor marketplace profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  async createVendorProfile(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateVendorMarketplaceProfileDto,
  ) {
    const profile = await this.marketplaceService.createVendorMarketplaceProfile(
      dto,
      organizationId,
    );
    return { success: true, data: profile };
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Get all vendor marketplace profiles' })
  @ApiResponse({ status: 200, description: 'List of vendor profiles' })
  async findAllVendorProfiles(
    @OrganizationId() organizationId: string,
    @Query() query: VendorMarketplaceQueryDto,
  ) {
    const result = await this.marketplaceService.findAllVendorMarketplaceProfiles(
      query,
      organizationId,
    );
    return { success: true, ...result };
  }

  @Get('vendors/browse')
  @ApiOperation({ summary: 'Browse marketplace vendors (all organizations)' })
  @ApiResponse({ status: 200, description: 'List of marketplace vendors' })
  async browseVendors(@Query() query: VendorMarketplaceQueryDto) {
    const result = await this.marketplaceService.findAllVendorMarketplaceProfiles(query);
    return { success: true, ...result };
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get vendor marketplace profile by ID' })
  @ApiParam({ name: 'id', description: 'Vendor profile ID' })
  @ApiResponse({ status: 200, description: 'Vendor profile details' })
  async findOneVendorProfile(@Param('id') id: string) {
    const profile = await this.marketplaceService.findOneVendorMarketplaceProfile(id);
    return { success: true, data: profile };
  }

  @Get('vendors/by-vendor/:vendorId')
  @ApiOperation({ summary: 'Get vendor marketplace profile by vendor ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 200, description: 'Vendor profile details' })
  async findVendorProfileByVendorId(
    @Param('vendorId') vendorId: string,
    @OrganizationId() organizationId: string,
  ) {
    const profile = await this.marketplaceService.findVendorMarketplaceProfileByVendorId(
      vendorId,
      organizationId,
    );
    return { success: true, data: profile };
  }

  @Put('vendors/:id')
  @ApiOperation({ summary: 'Update vendor marketplace profile' })
  @ApiParam({ name: 'id', description: 'Vendor profile ID' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateVendorProfile(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() dto: UpdateVendorMarketplaceProfileDto,
  ) {
    const profile = await this.marketplaceService.updateVendorMarketplaceProfile(
      id,
      dto,
      organizationId,
    );
    return { success: true, data: profile };
  }

  @Post('vendors/:id/services')
  @ApiOperation({ summary: 'Add a service to vendor profile' })
  @ApiParam({ name: 'id', description: 'Vendor profile ID' })
  @ApiResponse({ status: 201, description: 'Service added successfully' })
  async addVendorService(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() dto: AddVendorServiceDto,
  ) {
    const service = await this.marketplaceService.addVendorService(id, dto, organizationId);
    return { success: true, data: service };
  }

  @Put('vendors/services/:serviceId')
  @ApiOperation({ summary: 'Update a vendor service' })
  @ApiParam({ name: 'serviceId', description: 'Vendor service ID' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  async updateVendorService(
    @Param('serviceId') serviceId: string,
    @OrganizationId() organizationId: string,
    @Body() dto: UpdateVendorServiceDto,
  ) {
    const service = await this.marketplaceService.updateVendorService(
      serviceId,
      dto,
      organizationId,
    );
    return { success: true, data: service };
  }

  @Delete('vendors/services/:serviceId')
  @ApiOperation({ summary: 'Remove a service from vendor profile' })
  @ApiParam({ name: 'serviceId', description: 'Vendor service ID' })
  @ApiResponse({ status: 200, description: 'Service removed successfully' })
  async removeVendorService(
    @Param('serviceId') serviceId: string,
    @OrganizationId() organizationId: string,
  ) {
    const result = await this.marketplaceService.removeVendorService(serviceId, organizationId);
    return { success: true, data: result };
  }

  // ============================================================================
  // MARKETPLACE JOB ENDPOINTS
  // ============================================================================

  @Post('jobs')
  @ApiOperation({ summary: 'Create a marketplace job from a work order' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  async createJob(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateMarketplaceJobDto,
  ) {
    const job = await this.marketplaceService.createMarketplaceJob(dto, organizationId, userId);
    return { success: true, data: job };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get all marketplace jobs' })
  @ApiResponse({ status: 200, description: 'List of marketplace jobs' })
  async findAllJobs(
    @OrganizationId() organizationId: string,
    @Query() query: MarketplaceJobQueryDto,
  ) {
    const result = await this.marketplaceService.findAllMarketplaceJobs(query, organizationId);
    return { success: true, ...result };
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get marketplace job by ID' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async findOneJob(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const job = await this.marketplaceService.findOneMarketplaceJob(id, organizationId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/dispatch')
  @ApiOperation({ summary: 'Dispatch a job to a vendor' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job dispatched successfully' })
  async dispatchJob(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: DispatchJobDto,
  ) {
    const job = await this.marketplaceService.dispatchJob(id, dto, organizationId, userId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/accept')
  @ApiOperation({ summary: 'Accept a dispatched job (vendor endpoint)' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job accepted successfully' })
  async acceptJob(@Param('id') id: string, @Body() dto: AcceptJobDto, @Request() req: any) {
    // In a real implementation, we'd get the vendor profile ID from the authenticated vendor user
    // For now, require it in the request body or extract from user context
    const vendorProfileId = req.body.vendorProfileId || req.user?.vendorProfileId;
    if (!vendorProfileId) {
      return { success: false, error: { message: 'Vendor profile ID required' } };
    }
    const job = await this.marketplaceService.acceptJob(id, dto, vendorProfileId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/decline')
  @ApiOperation({ summary: 'Decline a dispatched job (vendor endpoint)' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job declined successfully' })
  async declineJob(
    @Param('id') id: string,
    @Body() dto: DeclineJobDto & { vendorProfileId: string },
  ) {
    const job = await this.marketplaceService.declineJob(id, dto, dto.vendorProfileId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/quote')
  @ApiOperation({ summary: 'Submit a quote for a job (vendor endpoint)' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Quote submitted successfully' })
  async submitQuote(
    @Param('id') id: string,
    @Body() dto: SubmitQuoteDto & { vendorProfileId: string },
  ) {
    const job = await this.marketplaceService.submitQuote(id, dto, dto.vendorProfileId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/quote/approve')
  @ApiOperation({ summary: 'Approve a vendor quote' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Quote approved successfully' })
  async approveQuote(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const job = await this.marketplaceService.approveQuote(id, organizationId, userId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/quote/decline')
  @ApiOperation({ summary: 'Decline a vendor quote' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Quote declined successfully' })
  async declineQuote(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const job = await this.marketplaceService.declineQuote(id, organizationId, userId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/start')
  @ApiOperation({ summary: 'Start work on a job (vendor endpoint)' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job started successfully' })
  async startJob(@Param('id') id: string, @Body() body: { vendorProfileId: string }) {
    const job = await this.marketplaceService.startJob(id, body.vendorProfileId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/complete')
  @ApiOperation({ summary: 'Mark job as complete (vendor endpoint)' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job completed successfully' })
  async completeJob(
    @Param('id') id: string,
    @Body() dto: CompleteJobDto & { vendorProfileId: string },
  ) {
    const job = await this.marketplaceService.completeJob(id, dto, dto.vendorProfileId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/confirm')
  @ApiOperation({ summary: 'Confirm job completion and release payment' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job confirmed successfully' })
  async confirmJob(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: ConfirmJobDto,
  ) {
    const job = await this.marketplaceService.confirmJob(id, dto, organizationId, userId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/dispute')
  @ApiOperation({ summary: 'Open a dispute on a completed job' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Dispute opened successfully' })
  async disputeJob(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: DisputeJobDto,
  ) {
    const job = await this.marketplaceService.disputeJob(id, dto, organizationId, userId);
    return { success: true, data: job };
  }

  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancel a marketplace job' })
  @ApiParam({ name: 'id', description: 'Marketplace job ID' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  async cancelJob(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const job = await this.marketplaceService.cancelJob(id, organizationId, userId);
    return { success: true, data: job };
  }

  // ============================================================================
  // VENDOR RATING ENDPOINTS
  // ============================================================================

  @Post('ratings')
  @ApiOperation({ summary: 'Create a vendor rating' })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  async createRating(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Request() req: any,
    @Body() dto: CreateVendorRatingDto,
  ) {
    const userName = req.user?.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`
      : 'Anonymous';
    const rating = await this.marketplaceService.createVendorRating(
      dto,
      organizationId,
      userId,
      userName,
    );
    return { success: true, data: rating };
  }

  @Get('vendors/:vendorProfileId/ratings')
  @ApiOperation({ summary: 'Get all ratings for a vendor' })
  @ApiParam({ name: 'vendorProfileId', description: 'Vendor profile ID' })
  @ApiResponse({ status: 200, description: 'List of ratings' })
  async findAllRatings(
    @Param('vendorProfileId') vendorProfileId: string,
    @Query() query: VendorRatingQueryDto,
  ) {
    const result = await this.marketplaceService.findAllVendorRatings(vendorProfileId, query);
    return { success: true, ...result };
  }

  @Put('ratings/:id')
  @ApiOperation({ summary: 'Update a vendor rating' })
  @ApiParam({ name: 'id', description: 'Rating ID' })
  @ApiResponse({ status: 200, description: 'Rating updated successfully' })
  async updateRating(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdateVendorRatingDto,
  ) {
    const rating = await this.marketplaceService.updateVendorRating(id, dto, userId);
    return { success: true, data: rating };
  }

  // ============================================================================
  // STATISTICS ENDPOINTS
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get marketplace statistics' })
  @ApiResponse({ status: 200, description: 'Marketplace statistics' })
  async getStats(@OrganizationId() organizationId: string) {
    const stats = await this.marketplaceService.getMarketplaceStats(organizationId);
    return { success: true, data: stats };
  }
}
