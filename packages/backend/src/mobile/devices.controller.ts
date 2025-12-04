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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DeviceService } from './device.service';
import { RegisterDeviceDto, UpdateDeviceDto, SendPushNotificationDto } from './dto/mobile.dto';
import { type AuthenticatedRequest } from '../common/types/authenticated-request';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('devices')
export class DevicesController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered devices' })
  async findAll(@Req() req: AuthenticatedRequest, @Query('userId') userId?: string) {
    return this.deviceService.findAll(req.user.organizationId, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user devices' })
  async getMyDevices(@Req() req: AuthenticatedRequest) {
    return this.deviceService.findByUserId(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get device statistics' })
  async getStats(@Req() req: AuthenticatedRequest) {
    return this.deviceService.getStats(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.deviceService.findById(id, req.user.organizationId);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a device for push notifications' })
  async register(@Req() req: AuthenticatedRequest, @Body() data: RegisterDeviceDto) {
    return this.deviceService.register(data, req.user.id);
  }

  @Post('push')
  @ApiOperation({ summary: 'Send push notification to users' })
  async sendPush(@Body() data: SendPushNotificationDto) {
    return this.deviceService.sendPushNotification(data.userIds, {
      title: data.title,
      body: data.body,
      data: data.data,
      badge: data.badge,
      sound: data.sound,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update device' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: UpdateDeviceDto,
  ) {
    return this.deviceService.update(id, data, req.user.organizationId);
  }

  @Put(':id/activity')
  @ApiOperation({ summary: 'Update device activity timestamp' })
  async updateActivity(@Param('id') id: string) {
    return this.deviceService.updateActivity(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate device' })
  async deactivate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.deviceService.deactivate(id, req.user.organizationId);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete device' })
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.deviceService.delete(id, req.user.organizationId);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup inactive devices' })
  async cleanup(@Query('days') days?: string) {
    return this.deviceService.cleanupInactiveDevices(days ? parseInt(days) : undefined);
  }
}
