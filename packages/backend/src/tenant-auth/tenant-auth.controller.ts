import { Controller, Post, Put, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { TenantAuthService } from './tenant-auth.service';

class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;
}

class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
  })
  password!: string;
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
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
  })
  newPassword!: string;
}

class ValidateInvitationDto {
  @IsString()
  token!: string;
}

class RegisterDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
  })
  password!: string;
}

@ApiTags('tenant-auth')
@Controller('tenant-auth')
export class TenantAuthController {
  constructor(private tenantAuthService: TenantAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Tenant portal login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const result = await this.tenantAuthService.login(dto.email, dto.password);
    return { success: true, data: result };
  }

  @Post('validate-invitation')
  @ApiOperation({ summary: 'Validate tenant invitation token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async validateInvitation(@Body() dto: ValidateInvitationDto) {
    const result = await this.tenantAuthService.validateInvitation(dto.token);
    return { success: true, data: result };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register tenant portal account using invitation token' })
  @ApiResponse({ status: 200, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token, or weak password' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.tenantAuthService.registerWithInvitation(dto.token, dto.password);
    return { success: true, data: result };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent (if email exists)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.tenantAuthService.requestPasswordReset(dto.email);
    return { success: true, data: result };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token, or weak password' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.tenantAuthService.resetPassword(dto.token, dto.password);
    return { success: true, data: result };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getProfile(@Headers('authorization') authHeader: string) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.tenantAuthService.getProfile(tenantId);
    return { success: true, data: result };
  }

  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async updateProfile(@Headers('authorization') authHeader: string, @Body() dto: UpdateProfileDto) {
    const tenantId = await this.extractTenantId(authHeader);
    const result = await this.tenantAuthService.updateProfile(tenantId, dto);
    return { success: true, data: result };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect or new password too weak' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
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
