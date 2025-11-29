import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateApiKeyDto, type UpdateApiKeyDto } from './dto/mobile.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly KEY_PREFIX = 'pm_';
  private readonly KEY_BYTES = 32;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async findAll(organizationId: string, filters?: { isActive?: boolean }) {
    const where: any = { organizationId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
      if (filters.isActive) {
        where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
      }
    }

    return this.prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        keyPreview: true,
        scopes: true,
        rateLimitPerMinute: true,
        rateLimitPerDay: true,
        allowedIps: true,
        allowedOrigins: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPreview: true,
        scopes: true,
        rateLimitPerMinute: true,
        rateLimitPerDay: true,
        allowedIps: true,
        allowedOrigins: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async create(data: CreateApiKeyDto, organizationId: string, userId: string) {
    // Generate API key
    const rawKey = this.generateApiKey();
    const keyHash = this.hashKey(rawKey);
    const keyPreview = this.getKeyPreview(rawKey);

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        keyHash,
        keyPreview,
        scopes: data.scopes || ['read'],
        rateLimitPerMinute: data.rateLimitPerMinute ?? 60,
        rateLimitPerDay: data.rateLimitPerDay ?? 10000,
        allowedIps: data.allowedIps || [],
        allowedOrigins: data.allowedOrigins || [],
        expiresAt,
        createdById: userId,
        isActive: true,
      },
    });

    this.logger.log(
      {
        message: 'api.key.created',
        keyId: apiKey.id,
        organizationId,
        createdBy: userId,
        scopes: data.scopes,
      },
      ApiKeyService.name,
    );

    // Return the raw key only once - it cannot be retrieved again
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPreview: apiKey.keyPreview,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      warning: 'Store this API key securely. It will not be shown again.',
    };
  }

  async update(id: string, data: UpdateApiKeyDto, organizationId: string) {
    await this.findById(id, organizationId);

    return this.prisma.apiKey.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        scopes: data.scopes,
        rateLimitPerMinute: data.rateLimitPerMinute,
        rateLimitPerDay: data.rateLimitPerDay,
        allowedIps: data.allowedIps,
        allowedOrigins: data.allowedOrigins,
        isActive: data.isActive,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPreview: true,
        scopes: true,
        rateLimitPerMinute: true,
        rateLimitPerDay: true,
        allowedIps: true,
        allowedOrigins: true,
        isActive: true,
        expiresAt: true,
      },
    });
  }

  async validateKey(
    rawKey: string,
    options?: {
      requiredScopes?: string[];
      ipAddress?: string;
      origin?: string;
    },
  ) {
    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new UnauthorizedException('API key is inactive');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Check IP whitelist
    if (apiKey.allowedIps.length > 0 && options?.ipAddress) {
      if (!this.isIpAllowed(options.ipAddress, apiKey.allowedIps)) {
        this.logger.warn(
          {
            message: 'api.key.ip.denied',
            keyId: apiKey.id,
            ip: options.ipAddress,
          },
          ApiKeyService.name,
        );
        throw new UnauthorizedException('IP address not allowed');
      }
    }

    // Check origin whitelist
    if (apiKey.allowedOrigins.length > 0 && options?.origin) {
      if (!apiKey.allowedOrigins.includes(options.origin)) {
        this.logger.warn(
          {
            message: 'api.key.origin.denied',
            keyId: apiKey.id,
            origin: options.origin,
          },
          ApiKeyService.name,
        );
        throw new UnauthorizedException('Origin not allowed');
      }
    }

    // Check required scopes
    if (options?.requiredScopes?.length) {
      const hasAllScopes = options.requiredScopes.every(
        (scope) => apiKey.scopes.includes(scope) || apiKey.scopes.includes('*'),
      );
      if (!hasAllScopes) {
        throw new UnauthorizedException('Insufficient permissions');
      }
    }

    // Update usage stats
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    return {
      keyId: apiKey.id,
      organizationId: apiKey.organizationId,
      scopes: apiKey.scopes,
      rateLimitPerMinute: apiKey.rateLimitPerMinute,
      rateLimitPerDay: apiKey.rateLimitPerDay,
    };
  }

  async checkRateLimit(
    keyId: string,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // In production, use Redis for rate limiting
    // This is a simplified in-memory check
    const now = new Date();
    const minuteStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    );

    // For demo purposes, always allow
    // In production, track requests per key in Redis
    return {
      allowed: true,
      remaining: apiKey.rateLimitPerMinute,
      resetAt: new Date(minuteStart.getTime() + 60000),
    };
  }

  async revoke(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(
      {
        message: 'api.key.revoked',
        keyId: id,
        organizationId,
      },
      ApiKeyService.name,
    );

    return { success: true };
  }

  async delete(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.apiKey.delete({ where: { id } });

    this.logger.log(
      {
        message: 'api.key.deleted',
        keyId: id,
        organizationId,
      },
      ApiKeyService.name,
    );

    return { success: true };
  }

  async regenerate(id: string, organizationId: string, userId: string) {
    const existing = await this.findById(id, organizationId);

    // Generate new key
    const rawKey = this.generateApiKey();
    const keyHash = this.hashKey(rawKey);
    const keyPreview = this.getKeyPreview(rawKey);

    await this.prisma.apiKey.update({
      where: { id },
      data: {
        keyHash,
        keyPreview,
        usageCount: 0,
        lastUsedAt: null,
      },
    });

    this.logger.log(
      {
        message: 'api.key.regenerated',
        keyId: id,
        organizationId,
        regeneratedBy: userId,
      },
      ApiKeyService.name,
    );

    return {
      id,
      name: existing.name,
      key: rawKey,
      keyPreview,
      warning: 'Store this API key securely. It will not be shown again.',
    };
  }

  async getUsageStats(id: string, organizationId: string, _days: number = 30) {
    const apiKey = await this.findById(id, organizationId);

    // In production, fetch from usage logs
    return {
      keyId: id,
      name: apiKey.name,
      totalRequests: apiKey.usageCount,
      lastUsedAt: apiKey.lastUsedAt,
      // Daily breakdown would come from logs
      daily: [],
    };
  }

  private generateApiKey(): string {
    const randomBytes = crypto.randomBytes(this.KEY_BYTES);
    return this.KEY_PREFIX + randomBytes.toString('base64url');
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private getKeyPreview(key: string): string {
    // Show prefix and last 4 characters
    return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
  }

  private isIpAllowed(ip: string, allowedIps: string[]): boolean {
    return allowedIps.some((allowed) => {
      if (allowed.includes('/')) {
        // CIDR notation
        return this.isIpInCidr(ip, allowed);
      }
      return ip === allowed;
    });
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  }
}
