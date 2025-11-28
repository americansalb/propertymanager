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
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @OrganizationId() organizationId: string,
    @Body() createVendorDto: CreateVendorDto,
  ) {
    const vendor = await this.vendorsService.create(organizationId, createVendorDto);
    return { success: true, data: vendor };
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors' })
  @ApiResponse({ status: 200, description: 'List of vendors' })
  async findAll(@OrganizationId() organizationId: string) {
    const vendors = await this.vendorsService.findAll(organizationId);
    return { success: true, data: vendors };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
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
  @ApiOperation({ summary: 'Get vendor statistics' })
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
  @ApiOperation({ summary: 'Update vendor' })
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
  @ApiOperation({ summary: 'Delete vendor' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async remove(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const result = await this.vendorsService.remove(id, organizationId);
    return { success: true, data: result };
  }
}
