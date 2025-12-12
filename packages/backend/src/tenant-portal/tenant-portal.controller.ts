import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantPortalService } from './tenant-portal.service';
import { TenantAuthService } from '../tenant-auth/tenant-auth.service';
import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Response } from 'express';

class CreateMaintenanceRequestDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @IsIn(['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Pest Control', 'General', 'Other'])
  category!: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'])
  priority?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  permissionToEnter?: boolean;

  @IsOptional()
  @IsString()
  preferredTimes?: string;

  @IsOptional()
  @IsString({ each: true })
  photos?: string[];
}

class SendMessageDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

class UpdateAutoPayDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  day?: number;
}

class CreatePaymentIntentDto {
  @IsString({ each: true })
  chargeIds!: string[];

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

class UploadDocumentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn([
    'LEASE_AGREEMENT',
    'LEASE_ADDENDUM',
    'MOVE_IN_CHECKLIST',
    'MOVE_OUT_CHECKLIST',
    'COMMUNITY_RULES',
    'INSURANCE_CERTIFICATE',
    'PET_DOCUMENTATION',
    'PAYMENT_RECEIPT',
    'ANNUAL_STATEMENT',
    'OTHER',
  ])
  type!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  storageUrl!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  size!: number;
}

class SubmitFeedbackDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  timelinessRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;

  @IsOptional()
  @IsBoolean()
  issueResolved?: boolean;

  @IsOptional()
  @IsBoolean()
  followUpRequested?: boolean;

  @IsOptional()
  @IsString()
  followUpReason?: string;
}

class FollowUpRequestDto {
  @IsString()
  reason!: string;
}

class RenewalResponseDto {
  @IsString()
  @IsIn(['ACCEPT', 'DECLINE', 'COUNTER', 'MOVE_OUT'])
  response!: 'ACCEPT' | 'DECLINE' | 'COUNTER' | 'MOVE_OUT';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  counterOfferRent?: number;

  @IsOptional()
  @IsString()
  counterOfferNotes?: string;
}

@ApiTags('tenant-portal')
@Controller('tenant-portal')
@ApiBearerAuth()
export class TenantPortalController {
  constructor(
    private portalService: TenantPortalService,
    private authService: TenantAuthService,
  ) {}

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get tenant dashboard data' })
  async getDashboard(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getDashboard(tenantId);
    return { success: true, data: result };
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  @Get('payments')
  @ApiOperation({ summary: 'Get payment history' })
  async getPaymentHistory(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getPaymentHistory(
      tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data: result };
  }

  @Get('payments/outstanding')
  @ApiOperation({ summary: 'Get outstanding charges' })
  async getOutstandingCharges(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getOutstandingCharges(tenantId);
    return { success: true, data: result };
  }

  @Get('payments/autopay')
  @ApiOperation({ summary: 'Get auto-pay settings' })
  async getAutoPaySettings(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getAutoPaySettings(tenantId);
    return { success: true, data: result };
  }

  @Put('payments/autopay')
  @ApiOperation({ summary: 'Update auto-pay settings' })
  async updateAutoPaySettings(
    @Headers('authorization') authHeader: string,
    @Body() dto: UpdateAutoPayDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.updateAutoPaySettings(tenantId, dto.enabled, dto.day);
    return { success: true, data: result };
  }

  @Post('payments/create-intent')
  @ApiOperation({ summary: 'Create a payment intent for submitting payment' })
  async createPaymentIntent(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.createPaymentIntent(
      tenantId,
      dto.chargeIds,
      dto.amount,
    );
    return { success: true, data: result };
  }

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance requests' })
  async getMaintenanceRequests(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getMaintenanceRequests(tenantId, status);
    return { success: true, data: result };
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Create maintenance request' })
  async createMaintenanceRequest(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateMaintenanceRequestDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.createMaintenanceRequest(tenantId, dto);
    return { success: true, data: result };
  }

  @Get('maintenance/:id')
  @ApiOperation({ summary: 'Get maintenance request details' })
  async getMaintenanceRequest(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getMaintenanceRequest(tenantId, id);
    return { success: true, data: result };
  }

  // ============================================================================
  // LEASE
  // ============================================================================

  @Get('lease')
  @ApiOperation({ summary: 'Get lease details' })
  async getLeaseDetails(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getLeaseDetails(tenantId);
    return { success: true, data: result };
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  @Get('messages')
  @ApiOperation({ summary: 'Get messages' })
  async getMessages(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getMessages(
      tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data: result };
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(@Headers('authorization') authHeader: string, @Body() dto: SendMessageDto) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.sendMessage(tenantId, dto);
    return { success: true, data: result };
  }

  @Put('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markMessageAsRead(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.markMessageAsRead(tenantId, id);
    return { success: true, data: result };
  }

  @Get('messages/unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  async getUnreadCount(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getUnreadCount(tenantId);
    return { success: true, data: result };
  }

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  @Get('documents')
  @ApiOperation({ summary: 'Get tenant documents' })
  async getDocuments(
    @Headers('authorization') authHeader: string,
    @Query('type') type?: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getDocuments(tenantId, type);
    return { success: true, data: result };
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Get document download URL' })
  async getDocumentDownloadUrl(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getDocumentDownloadUrl(tenantId, id);
    return { success: true, data: result };
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload a document' })
  async uploadDocument(
    @Headers('authorization') authHeader: string,
    @Body() dto: UploadDocumentDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.uploadDocument(tenantId, dto);
    return { success: true, data: result };
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  @Get('notifications')
  @ApiOperation({ summary: 'Get notifications' })
  async getNotifications(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getNotifications(
      tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data: result };
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getNotificationUnreadCount(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getNotificationUnreadCount(tenantId);
    return { success: true, data: result };
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationAsRead(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.markNotificationAsRead(tenantId, id);
    return { success: true, data: result };
  }

  @Put('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsAsRead(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.markAllNotificationsAsRead(tenantId);
    return { success: true, data: result };
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.deleteNotification(tenantId, id);
    return { success: true, data: result };
  }

  // ============================================================================
  // PAYMENT RECEIPTS & EXPORTS
  // ============================================================================

  @Get('payments/:id/receipt')
  @ApiOperation({ summary: 'Get payment receipt' })
  async getPaymentReceipt(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getPaymentReceipt(tenantId, id);
    return { success: true, data: result };
  }

  @Get('payments/export')
  @ApiOperation({ summary: 'Export payment history' })
  async exportPaymentHistory(
    @Headers('authorization') authHeader: string,
    @Query('format') format: string = 'csv',
    @Query('year') year?: string,
    @Res() res?: Response,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.exportPaymentHistory(
      tenantId,
      format as 'csv' | 'json',
      year ? parseInt(year) : undefined,
    );

    if (res) {
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
      return;
    }

    return { success: true, data: result };
  }

  @Get('payments/annual-statement/:year')
  @ApiOperation({ summary: 'Get annual statement' })
  async getAnnualStatement(
    @Headers('authorization') authHeader: string,
    @Param('year') year: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getAnnualStatement(tenantId, parseInt(year));
    return { success: true, data: result };
  }

  // ============================================================================
  // MAINTENANCE FEEDBACK
  // ============================================================================

  @Post('maintenance/:id/feedback')
  @ApiOperation({ summary: 'Submit maintenance feedback' })
  async submitMaintenanceFeedback(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.submitMaintenanceFeedback(tenantId, id, dto);
    return { success: true, data: result };
  }

  @Get('maintenance/:id/feedback')
  @ApiOperation({ summary: 'Get maintenance feedback' })
  async getMaintenanceFeedback(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getMaintenanceFeedback(tenantId, id);
    return { success: true, data: result };
  }

  @Put('maintenance/:id/feedback')
  @ApiOperation({ summary: 'Update maintenance feedback' })
  async updateMaintenanceFeedback(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.updateMaintenanceFeedback(tenantId, id, dto);
    return { success: true, data: result };
  }

  @Post('maintenance/:id/follow-up')
  @ApiOperation({ summary: 'Request maintenance follow-up' })
  async requestMaintenanceFollowUp(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: FollowUpRequestDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.requestMaintenanceFollowUp(tenantId, id, dto.reason);
    return { success: true, data: result };
  }

  // ============================================================================
  // LEASE RENEWAL
  // ============================================================================

  @Get('lease/renewal-offers')
  @ApiOperation({ summary: 'Get lease renewal offers' })
  async getRenewalOffers(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getRenewalOffers(tenantId);
    return { success: true, data: result };
  }

  @Get('lease/renewal-offers/:id')
  @ApiOperation({ summary: 'Get renewal offer details' })
  async getRenewalOfferDetails(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.getRenewalOfferDetails(tenantId, id);
    return { success: true, data: result };
  }

  @Post('lease/renewal-offers/:id/respond')
  @ApiOperation({ summary: 'Respond to renewal offer' })
  async respondToRenewalOffer(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: RenewalResponseDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.respondToRenewalOffer(tenantId, id, dto);
    return { success: true, data: result };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async extractTenantId(authHeader: string): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    const token = authHeader.substring(7);
    const payload = await this.authService.validateTenantToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }
    return payload.sub;
  }
}
