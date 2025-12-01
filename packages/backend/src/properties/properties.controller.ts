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
  @ApiOperation({ summary: 'Search for addresses using Google Places Autocomplete' })
  async searchAddress(@Query('q') query: string) {
    console.log('[Address Search] Query received:', query);

    if (!query || query.length < 3) {
      return { success: true, data: [], message: 'Query too short' };
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('[Address Search] GOOGLE_PLACES_API_KEY not configured');
      return { success: false, data: [], error: 'Geocoding service not configured' };
    }

    try {
      // Use Google Places Autocomplete
      const params = new URLSearchParams({
        input: query,
        key: apiKey,
        types: 'address',
        components: 'country:us',
      });

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
      console.log('[Address Search] Fetching Google Places');

      const response = await fetch(url);

      if (!response.ok) {
        console.error('[Address Search] Google error:', response.status);
        return { success: false, data: [], error: `Geocoding service returned ${response.status}` };
      }

      const result = await response.json();
      console.log('[Address Search] Status:', result.status, 'Results:', result.predictions?.length || 0);

      if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') {
        console.error('[Address Search] Google API error:', result.status, result.error_message);
        return { success: false, data: [], error: result.error_message || result.status };
      }

      // Transform to frontend format, include place_id for details lookup
      const data = (result.predictions || []).map((p: any) => ({
        display_name: p.description,
        place_id: p.place_id,
        address: {
          // Parse from structured_formatting for preview
          road: p.structured_formatting?.main_text || '',
          city: p.structured_formatting?.secondary_text?.split(',')[0]?.trim() || '',
        },
      }));

      return { success: true, data };
    } catch (error) {
      console.error('[Address Search] Failed:', error);
      return { success: false, data: [], error: String(error) };
    }
  }

  @Get('address/details/:placeId')
  @ApiOperation({ summary: 'Get full address details from Google Place ID' })
  async getAddressDetails(@Param('placeId') placeId: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Geocoding service not configured' };
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: apiKey,
        fields: 'address_components,formatted_address',
      });

      const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.status !== 'OK') {
        return { success: false, error: result.error_message || result.status };
      }

      const components = result.result.address_components || [];
      const getComponent = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.long_name || '';
      const getShortComponent = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.short_name || '';

      return {
        success: true,
        data: {
          display_name: result.result.formatted_address,
          address: {
            house_number: getComponent('street_number'),
            road: getComponent('route'),
            city: getComponent('locality') || getComponent('sublocality') || getComponent('neighborhood'),
            state: getShortComponent('administrative_area_level_1'),
            postcode: getComponent('postal_code'),
            country: getComponent('country'),
          },
        },
      };
    } catch (error) {
      console.error('[Address Details] Failed:', error);
      return { success: false, error: String(error) };
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
