import { Controller, Post, Put, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAuthService } from './tenant-auth.service';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

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

class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

@ApiTags('tenant-auth')
@Controller('tenant-auth')
export class TenantAuthController {
  constructor(private tenantAuthService: TenantAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Tenant portal login' })
  async login(@Body() dto: LoginDto) {
    const result = await this.tenantAuthService.login(dto.email, dto.password);
    return { success: true, data: result };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.tenantAuthService.requestPasswordReset(dto.email);
    return { success: true, data: result };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.tenantAuthService.resetPassword(dto.token, dto.password);
    return { success: true, data: result };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant profile' })
  async getProfile(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.tenantAuthService.getProfile(tenantId);
    return { success: true, data: result };
  }

  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant profile' })
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.tenantAuthService.updateProfile(tenantId, dto);
    return { success: true, data: result };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @Headers('authorization') authHeader: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.tenantAuthService.changePassword(
      tenantId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true, data: result };
  }

  private async extractTenantId(authHeader: string): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    const token = authHeader.substring(7);
    const payload = await this.tenantAuthService.validateTenantToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }
    return payload.sub;
  }
}
