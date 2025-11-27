import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max notifications to return' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @UserId() userId: string,
    @OrganizationId() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    const notifications = await this.notificationsService.getNotificationsForUser(
      userId,
      organizationId,
      limit ? parseInt(limit, 10) : 50,
    );
    return { success: true, data: notifications };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(
    @UserId() userId: string,
    @OrganizationId() organizationId: string,
  ) {
    const count = await this.notificationsService.getUnreadCount(userId, organizationId);
    return { success: true, data: { count } };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(id);
    return { success: true, data: notification };
  }

  @Post('process-pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process pending notifications (admin)' })
  @ApiResponse({ status: 200, description: 'Pending notifications processed' })
  async processPending() {
    const result = await this.notificationsService.processPendingNotifications();
    return { success: true, data: result };
  }
}
