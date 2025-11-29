import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  Redirect,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

import { AuthService, type LoginResponse, type UserWithOrganization } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UserId } from '../common/decorators/user-id.decorator';
import { UserRole } from '@propertymaster/database';

// DTO Classes
class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, {
    message: 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  })
  newPassword: string;
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
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, {
    message: 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  })
  newPassword: string;
}

// Local type definitions
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Response type that excludes refreshToken (sent via cookie)
interface LoginResponseWithoutRefreshToken {
  accessToken: string;
  user: LoginResponse['user'];
}

// Augment Express Request with authenticated user
interface AuthenticatedRequest extends ExpressRequest {
  user: UserWithOrganization;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;
  private readonly cookieDomain: string | undefined;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
  }

  /**
   * Set refresh token as httpOnly cookie
   */
  private setRefreshTokenCookie(res: ExpressResponse, refreshToken: string) {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.isProduction, // HTTPS only in production
      sameSite: this.isProduction ? 'strict' : 'lax',
      maxAge,
      path: '/api/v1/auth', // Only sent to auth endpoints
      ...(this.cookieDomain && { domain: this.cookieDomain }),
    });
  }

  /**
   * Clear refresh token cookie
   */
  private clearRefreshTokenCookie(res: ExpressResponse) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
      ...(this.cookieDomain && { domain: this.cookieDomain }),
    });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new organization and admin user' })
  @ApiBody({ type: RegisterDto })
  @SwaggerResponse({ status: 201, description: 'Registration successful' })
  @SwaggerResponse({
    status: 400,
    description: 'Validation failed (weak password or invalid data)',
  })
  @SwaggerResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponse<LoginResponseWithoutRefreshToken>> {
    const result = await this.authService.register(registerDto);

    // Set refresh token as httpOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    // Return access token in body (refresh token is in cookie)
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Login with email and password' })
  @SwaggerResponse({ status: 200, description: 'Login successful' })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials or account locked' })
  async login(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponse<LoginResponseWithoutRefreshToken>> {
    const result = await this.authService.login(req.user);

    // Set refresh token as httpOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    // Return access token in body (refresh token is in cookie)
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @SwaggerResponse({ status: 200, description: 'Token refreshed successfully' })
  @SwaggerResponse({ status: 401, description: 'Invalid or missing refresh token' })
  async refresh(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponse<{ accessToken: string }>> {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      // Clear any existing cookie and return error
      this.clearRefreshTokenCookie(res);
      return {
        success: false,
        error: {
          message: 'No refresh token provided',
          code: 'NO_REFRESH_TOKEN',
        },
      };
    }

    try {
      const result = await this.authService.refreshToken(refreshToken);

      return {
        success: true,
        data: result,
      };
    } catch {
      // Clear invalid cookie
      this.clearRefreshTokenCookie(res);
      throw new Error('Invalid refresh token');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  @SwaggerResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponse<{ message: string }>> {
    // Revoke refresh token if present
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @SwaggerResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(
    @UserId() userId: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.logoutAllDevices(userId);

    // Clear current refresh token cookie
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      data: {
        message: 'Logged out from all devices successfully',
      },
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiBody({ type: ChangePasswordDto })
  @SwaggerResponse({ status: 200, description: 'Password changed successfully' })
  @SwaggerResponse({ status: 400, description: 'Password validation failed' })
  @SwaggerResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @UserId() userId: string,
    @Body() dto: ChangePasswordDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);

    // Clear refresh token cookie - user must re-login
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      data: {
        message: 'Password changed successfully. Please log in again.',
      },
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @SwaggerResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.requestPasswordReset(dto.email);

    // Always return success to prevent email enumeration
    return {
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent.',
      },
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @SwaggerResponse({ status: 200, description: 'Password reset successfully' })
  @SwaggerResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.resetPassword(dto.token, dto.newPassword);

    return {
      success: true,
      data: {
        message: 'Password has been reset successfully. You can now log in.',
      },
    };
  }

  @Post('unlock-account/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock a locked user account (admin only)' })
  @SwaggerResponse({ status: 200, description: 'Account unlocked' })
  @SwaggerResponse({ status: 403, description: 'Insufficient permissions' })
  async unlockAccount(
    @Param('userId') targetUserId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    // Only admins can unlock accounts
    const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN];
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenException('Only administrators can unlock accounts');
    }

    await this.authService.unlockAccount(targetUserId);

    return {
      success: true,
      data: {
        message: 'Account has been unlocked',
      },
    };
  }

  @Get('password-requirements')
  @ApiOperation({ summary: 'Get password requirements' })
  @SwaggerResponse({ status: 200, description: 'Password requirements' })
  getPasswordRequirements(): ApiResponse<{
    minLength: number;
    maxLength: number;
    requirements: string[];
  }> {
    return {
      success: true,
      data: {
        minLength: 8,
        maxLength: 128,
        requirements: [
          'At least one uppercase letter (A-Z)',
          'At least one lowercase letter (a-z)',
          'At least one number (0-9)',
          'At least one special character (!@#$%^&*()_+-=[]{};\'":|,.<>/?)',
          'Cannot contain common passwords (password, 12345678, qwerty, etc.)',
        ],
      },
    };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiQuery({ name: 'token', description: 'Email verification token', required: true })
  @SwaggerResponse({ status: 302, description: 'Redirects to login page on success' })
  @SwaggerResponse({ status: 400, description: 'Invalid or expired token' })
  @Redirect()
  async verifyEmail(@Query('token') token: string): Promise<{ url: string }> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    try {
      await this.authService.verifyEmail(token);
      // Redirect to login with success message
      return { url: `${frontendUrl}/login?verified=true` };
    } catch (error) {
      // Redirect to login with error message
      const message = encodeURIComponent((error as Error).message);
      return { url: `${frontendUrl}/login?error=${message}` };
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({
    schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
  })
  @SwaggerResponse({ status: 200, description: 'Verification email sent if account exists' })
  async resendVerification(
    @Body('email') email: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.authService.resendVerificationEmail(email);

    return {
      success: result.success,
      data: {
        message: result.message,
      },
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @SwaggerResponse({ status: 200, description: 'Current user info' })
  async me(
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    organizationName: string;
    avatarUrl: string | null;
    emailVerified: boolean;
  }>> {
    const user = req.user;
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
    };
  }

  @Get('validate-password')
  @ApiOperation({ summary: 'Validate password against requirements' })
  @ApiQuery({ name: 'password', description: 'Password to validate', required: true })
  @SwaggerResponse({ status: 200, description: 'Validation result' })
  validatePassword(
    @Query('password') password: string,
  ): ApiResponse<{ valid: boolean; errors: string[] }> {
    const result = this.authService.validatePasswordComplexity(password);
    return {
      success: true,
      data: result,
    };
  }
}
