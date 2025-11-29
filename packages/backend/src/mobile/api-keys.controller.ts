import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/mobile.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  async findAll(@Req() req: any, @Query('isActive') isActive?: string) {
    return this.apiKeyService.findAll(req.user.organizationId, {
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API key by ID' })
  async findById(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.findById(id, req.user.organizationId);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get API key usage statistics' })
  async getUsage(@Req() req: any, @Param('id') id: string, @Query('days') days?: string) {
    return this.apiKeyService.getUsageStats(
      id,
      req.user.organizationId,
      days ? parseInt(days) : 30,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  async create(@Req() req: any, @Body() data: CreateApiKeyDto) {
    return this.apiKeyService.create(data, req.user.organizationId, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update API key' })
  async update(@Req() req: any, @Param('id') id: string, @Body() data: UpdateApiKeyDto) {
    return this.apiKeyService.update(id, data, req.user.organizationId);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate API key' })
  async regenerate(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.regenerate(id, req.user.organizationId, req.user.id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke API key' })
  async revoke(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.revoke(id, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API key' })
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.delete(id, req.user.organizationId);
  }
}
