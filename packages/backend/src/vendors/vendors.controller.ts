import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vendor (public endpoint for self-registration)' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() createVendorDto: CreateVendorDto & { organizationId?: string },
  ) {
    // For public self-registration, use a default/public organization
    // Or create vendor without organizationId requirement
    const organizationId = createVendorDto.organizationId || 'public-marketplace';
    const vendor = await this.vendorsService.create(organizationId, createVendorDto);
    return { success: true, data: vendor };
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all vendors (authenticated)' })
  @ApiResponse({ status: 200, description: 'List of vendors' })
  async findAll(@OrganizationId() organizationId: string) {
    const vendors = await this.vendorsService.findAll(organizationId);
    return { success: true, data: vendors };
  }

  @Get('pending')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending vendor applications (authenticated)' })
  @ApiResponse({ status: 200, description: 'List of pending vendors' })
  async findPending(@OrganizationId() organizationId: string) {
    const vendors = await this.vendorsService.findPendingVendors(organizationId);
    return { success: true, data: vendors };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor by ID (authenticated)' })
  @ApiResponse({ status: 200, description: 'Vendor details' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findOne(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const vendor = await this.vendorsService.findOne(id, organizationId);
    return { success: true, data: vendor };
  }

  @Get(':id/stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor statistics (authenticated)' })
  @ApiResponse({ status: 200, description: 'Vendor statistics' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getVendorStats(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const result = await this.vendorsService.getVendorStats(id, organizationId);
    return { success: true, data: result };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor (authenticated)' })
  @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const vendor = await this.vendorsService.update(id, organizationId, updateVendorDto);
    return { success: true, data: vendor };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete vendor (authenticated)' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async remove(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const result = await this.vendorsService.remove(id, organizationId);
    return { success: true, data: result };
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending vendor application (authenticated)' })
  @ApiResponse({ status: 200, description: 'Vendor approved successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async approve(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() body: { notes?: string },
  ) {
    const vendor = await this.vendorsService.approveVendor(
      id,
      organizationId,
      body.notes,
    );
    return { success: true, data: vendor };
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending vendor application (authenticated)' })
  @ApiResponse({ status: 200, description: 'Vendor rejected successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async reject(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() body: { reason: string; notes?: string },
  ) {
    const vendor = await this.vendorsService.rejectVendor(
      id,
      organizationId,
      body.reason,
      body.notes,
    );
    return { success: true, data: vendor };
  }
}
