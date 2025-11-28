import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService, type LoginResponse, type UserWithOrganization } from './auth.service';
import { RegisterDto } from './dto/register.dto';

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
  @SwaggerResponse({ status: 401, description: 'Invalid credentials' })
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
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponse<{ message: string }>> {
    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      data: {
        message: 'Logged out successfully',
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
}
