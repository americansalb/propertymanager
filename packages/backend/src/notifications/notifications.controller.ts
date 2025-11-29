import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../email/email.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';

class SendTestEmailDto {
  @IsEmail()
  to: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

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

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics for organization' })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getStats(@OrganizationId() organizationId: string) {
    const stats = await this.notificationsService.getNotificationStats(organizationId);
    return { success: true, data: stats };
  }

  @Get('email-status')
  @ApiOperation({ summary: 'Get email service status' })
  @ApiResponse({ status: 200, description: 'Email service status' })
  async getEmailStatus() {
    const provider = this.emailService.getProvider();
    const enabled = this.emailService.isEnabled();
    const connected = await this.emailService.verifyConnection();

    return {
      success: true,
      data: {
        provider,
        enabled,
        connected,
      },
    };
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

  @Post('retry-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry failed notifications (admin)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max notifications to retry' })
  @ApiResponse({ status: 200, description: 'Failed notifications retried' })
  async retryFailed(
    @OrganizationId() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.notificationsService.retryFailedNotifications(
      organizationId,
      limit ? parseInt(limit, 10) : 50,
    );
    return { success: true, data: result };
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test email to verify email configuration' })
  @ApiBody({ type: SendTestEmailDto })
  @ApiResponse({ status: 200, description: 'Test email sent' })
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const result = await this.emailService.sendWelcomeEmail(
      dto.to,
      dto.name || 'Test User',
      'https://app.propertymaster.io/login',
    );

    return {
      success: result.success,
      data: {
        messageId: result.messageId,
        error: result.error,
        provider: this.emailService.getProvider(),
      },
    };
  }
}
