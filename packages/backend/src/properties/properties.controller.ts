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
    console.log('[Address Search] Query received:', query);

    if (!query || query.length < 3) {
      return { success: true, data: [], message: 'Query too short' };
    }

    try {
      // Use Photon (free, optimized for autocomplete) with US bias
      const params = new URLSearchParams({
        q: query,
        limit: '5',
        lang: 'en',
        lat: '39.8283',  // Center of US for better results
        lon: '-98.5795',
      });

      const url = `https://photon.komoot.io/api/?${params}`;
      console.log('[Address Search] Fetching Photon:', url);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      console.log('[Address Search] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Address Search] Photon error:', response.status, errorText);
        return { success: false, data: [], error: `Geocoding service returned ${response.status}` };
      }

      const geojson = await response.json();
      console.log('[Address Search] Results count:', geojson.features?.length || 0);

      // Transform Photon GeoJSON to Nominatim-like format for frontend compatibility
      // Filter to only US addresses
      const data = (geojson.features || [])
        .filter((f: any) => f.properties?.country === 'United States')
        .map((feature: any) => {
          const p = feature.properties || {};
          return {
            display_name: [
              p.housenumber,
              p.street,
              p.city,
              p.state,
              p.postcode,
              p.country,
            ].filter(Boolean).join(', '),
            address: {
              house_number: p.housenumber,
              road: p.street,
              city: p.city,
              town: p.city,
              state: p.state,
              postcode: p.postcode,
              country: p.country,
            },
            type: p.type,
          };
        });

      return { success: true, data };
    } catch (error) {
      console.error('[Address Search] Failed:', error);
      return { success: false, data: [], error: String(error) };
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
