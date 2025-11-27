import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { type ApiResponse } from '../auth/auth.controller';

@ApiTags('events')
@Controller('events')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Track an event' })
  async track(
    @Body() dto: CreateEventDto,
    @OrganizationId() organizationId: string,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const user = (req as { user?: { id?: string } }).user;
    const event = await this.eventsService.track(dto, organizationId, user?.id, req);

    return {
      success: true,
      data: event,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get events for organization' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('userId') userId?: string,
    @Query('name') name?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ApiResponse> {
    const events = await this.eventsService.findAll(organizationId, {
      userId,
      name,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: events,
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get event analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['name', 'category', 'userId'] })
  async getAnalytics(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'name' | 'category' | 'userId',
  ): Promise<ApiResponse> {
    const analytics = await this.eventsService.getAnalytics(organizationId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy,
    });

    return {
      success: true,
      data: analytics,
    };
  }
}
