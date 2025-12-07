import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { IsString, IsOptional, IsEmail, IsBoolean, IsDateString } from 'class-validator';

class CreateTenantDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  unitId!: string;

  @IsOptional()
  @IsDateString()
  moveInDate?: string;

  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;
}

class UpdateTenantDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;
}

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant and assign to unit' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  async create(
    @Body() dto: CreateTenantDto,
    @OrganizationId() organizationId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const tenant = await this.tenantsService.create(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        unitId: dto.unitId,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : undefined,
        sendInvite: dto.sendInvite,
      },
      organizationId,
      req.user.sub,
    );
    return { success: true, data: tenant };
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants for the organization' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or phone' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by tenant status' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const tenants = await this.tenantsService.findAll(organizationId, { search, status });
    return { success: true, data: tenants };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tenant statistics' })
  @ApiResponse({ status: 200, description: 'Tenant statistics' })
  async getStats(@OrganizationId() organizationId: string) {
    const stats = await this.tenantsService.getStats(organizationId);
    return { success: true, data: stats };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const tenant = await this.tenantsService.findOne(id, organizationId);
    return { success: true, data: tenant };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant information' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @OrganizationId() organizationId: string,
  ) {
    const tenant = await this.tenantsService.update(id, dto, organizationId);
    return { success: true, data: tenant };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get tenant lease history' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant lease history' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getHistory(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const tenant = await this.tenantsService.findOne(id, organizationId);
    const history = await this.tenantsService.getLeaseHistory(tenant.email, organizationId);
    return { success: true, data: history };
  }

  @Post(':id/enable-portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable tenant portal access' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Portal access enabled' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async enablePortal(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const tenant = await this.tenantsService.enablePortalAccess(id, organizationId);
    return { success: true, data: tenant, message: 'Portal access enabled' };
  }

  @Post(':id/disable-portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable tenant portal access' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Portal access disabled' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async disablePortal(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const tenant = await this.tenantsService.disablePortalAccess(id, organizationId);
    return { success: true, data: tenant, message: 'Portal access disabled' };
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send tenant portal invitation' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 400, description: 'Tenant already has portal access' })
  async sendInvitation(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const result = await this.tenantsService.sendInvitation(id, organizationId, req.user.sub);
    return result;
  }

  @Post(':id/resend-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend tenant portal invitation' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 400, description: 'Tenant already has portal access' })
  async resendInvitation(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const result = await this.tenantsService.resendInvitation(id, organizationId, req.user.sub);
    return result;
  }
}
