import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('properties')
@Controller('properties')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all properties for organization' })
  async findAll(@OrganizationId() organizationId: string) {
    const properties = await this.propertiesService.findAll(organizationId);
    return { success: true, data: properties };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const property = await this.propertiesService.findById(id, organizationId);
    return { success: true, data: property };
  }

  @Post()
  @ApiOperation({ summary: 'Create new property' })
  async create(@Body() data: any, @OrganizationId() organizationId: string) {
    const property = await this.propertiesService.create(data, organizationId);
    return { success: true, data: property };
  }
}
