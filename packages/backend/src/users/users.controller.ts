import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { JwtPayload } from '../auth/auth.service';
import { type ApiResponse } from '../auth/auth.controller';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<ApiResponse> {
    const profile = await this.usersService.findById(user.sub);

    return {
      success: true,
      data: profile,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users in organization' })
  async getAllUsers(@OrganizationId() organizationId: string): Promise<ApiResponse> {
    const users = await this.usersService.findByOrganization(organizationId);

    return {
      success: true,
      data: users,
    };
  }
}
