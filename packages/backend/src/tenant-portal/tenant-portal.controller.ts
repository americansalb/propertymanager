import { Controller, Get, Post, Put, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantPortalService } from './tenant-portal.service';
import { TenantAuthService } from '../tenant-auth/tenant-auth.service';
import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, Min, Max } from 'class-validator';

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
    const result = await this.portalService.updateAutoPaySettings(
      tenantId,
      dto.enabled,
      dto.day,
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
  async sendMessage(
    @Headers('authorization') authHeader: string,
    @Body() dto: SendMessageDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.portalService.sendMessage(tenantId, dto);
    return { success: true, data: result };
  }

  @Put('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markMessageAsRead(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
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
