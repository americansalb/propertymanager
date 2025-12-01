import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { EventsService } from '../events/events.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';

@ApiTags('properties')
@Controller('properties')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PropertiesController {
  constructor(
    private propertiesService: PropertiesService,
    private eventsService: EventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all properties for organization' })
  async findAll(@OrganizationId() organizationId: string) {
    const properties = await this.propertiesService.findAll(organizationId);
    return { success: true, data: properties };
  }

  @Get('address/search')
  @ApiOperation({ summary: 'Search for addresses using geocoding' })
  async searchAddress(@Query('q') query: string) {
    if (!query || query.length < 3) {
      return { success: true, data: [] };
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        countrycodes: 'us',
        limit: '5',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            'User-Agent': 'PropertyManager/1.0 (property management application)',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Nominatim returned ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Address search failed:', error);
      return { success: true, data: [] };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const property = await this.propertiesService.findById(id, organizationId);
    return { success: true, data: property };
  }

  @Post()
  @ApiOperation({ summary: 'Create new property' })
  async create(@Body() data: CreatePropertyDto, @OrganizationId() organizationId: string) {
    const property = await this.propertiesService.create(data, organizationId);
    return { success: true, data: property };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update property' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdatePropertyDto,
    @OrganizationId() organizationId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user as { id?: string } | undefined;
    const property = await this.propertiesService.update(id, data, organizationId, user?.id);

    // Track property update event
    await this.eventsService.track(
      {
        name: 'property_updated',
        category: 'property_management',
        properties: { propertyId: property.id },
      },
      organizationId,
      user?.id,
      req,
    );

    return { success: true, data: property };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete property' })
  async delete(@Param('id') id: string, @OrganizationId() organizationId: string) {
    await this.propertiesService.delete(id, organizationId);
    return { success: true, message: 'Property deleted successfully' };
  }
}
