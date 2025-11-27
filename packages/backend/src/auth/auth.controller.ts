import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { type Request as ExpressRequest } from 'express';

import {
  AuthService,
  type LoginResponse,
  RegisterRequest,
  type UserWithOrganization,
} from './auth.service';

// Local type definitions
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Augment Express Request with authenticated user
interface AuthenticatedRequest extends ExpressRequest {
  user: UserWithOrganization;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new organization and admin user' })
  @SwaggerResponse({ status: 201, description: 'Registration successful' })
  @SwaggerResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    const result = await this.authService.register(registerDto);

    return {
      success: true,
      data: result,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Login with email and password' })
  @SwaggerResponse({ status: 200, description: 'Login successful' })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req: AuthenticatedRequest): Promise<ApiResponse<LoginResponse>> {
    const result = await this.authService.login(req.user);

    return {
      success: true,
      data: result,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @SwaggerResponse({ status: 200, description: 'Token refreshed successfully' })
  @SwaggerResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshDto: RefreshTokenRequest,
  ): Promise<ApiResponse<{ accessToken: string }>> {
    const result = await this.authService.refreshToken(refreshDto.refreshToken);

    return {
      success: true,
      data: result,
    };
  }
}
