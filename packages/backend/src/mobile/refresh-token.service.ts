import { Injectable, UnauthorizedException, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  private readonly TOKEN_BYTES = 32;
  private readonly TOKEN_EXPIRY_DAYS = 30;
  private readonly MAX_TOKENS_PER_USER = 5;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createToken(userId: string, deviceId?: string, userAgent?: string, ipAddress?: string) {
    // Generate secure random token
    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.TOKEN_EXPIRY_DAYS);

    // Clean up old tokens if user has too many
    await this.cleanupUserTokens(userId);

    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        tokenHash,
        deviceId,
        userAgent,
        ipAddress,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(
      {
        message: 'refresh.token.created',
        userId,
        tokenId: refreshToken.id,
        deviceId,
      },
      RefreshTokenService.name,
    );

    // Return unhashed token to client (only time it's available)
    return {
      token,
      expiresAt,
      tokenId: refreshToken.id,
    };
  }

  async validateToken(token: string) {
    const tokenHash = this.hashToken(token);

    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user separately since there's no relation
    const user = await this.prisma.user.findUnique({
      where: { id: refreshToken.userId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      // Revoke token if user is inactive
      await this.revokeTokenById(refreshToken.id, 'User inactive');
      throw new UnauthorizedException('User account is inactive');
    }

    // Update last used timestamp and increment use count
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      },
    });

    return {
      ...refreshToken,
      user,
      userId: refreshToken.userId,
    };
  }

  async rotateToken(oldToken: string, userAgent?: string, ipAddress?: string) {
    const existingToken = await this.validateToken(oldToken);

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date(), revokedReason: 'Token rotated' },
    });

    // Create new token
    const newToken = await this.createToken(
      existingToken.userId,
      existingToken.deviceId ?? undefined,
      userAgent,
      ipAddress,
    );

    this.logger.log(
      {
        message: 'refresh.token.rotated',
        userId: existingToken.userId,
        oldTokenId: existingToken.id,
        newTokenId: newToken.tokenId,
      },
      RefreshTokenService.name,
    );

    return {
      ...newToken,
      user: existingToken.user,
    };
  }

  async revokeToken(token: string) {
    const tokenHash = this.hashToken(token);

    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (refreshToken) {
      await this.prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { revokedAt: new Date(), revokedReason: 'User logout' },
      });

      this.logger.log(
        {
          message: 'refresh.token.revoked',
          tokenId: refreshToken.id,
          userId: refreshToken.userId,
        },
        RefreshTokenService.name,
      );
    }

    return { success: true };
  }

  private async revokeTokenById(id: string, reason: string) {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllUserTokens(userId: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'Logout all devices' },
    });

    this.logger.log(
      {
        message: 'refresh.tokens.revoked.all',
        userId,
        count: result.count,
      },
      RefreshTokenService.name,
    );

    return { revoked: result.count };
  }

  async revokeDeviceTokens(userId: string, deviceId: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'Device removed' },
    });

    this.logger.log(
      {
        message: 'refresh.tokens.revoked.device',
        userId,
        deviceId,
        count: result.count,
      },
      RefreshTokenService.name,
    );

    return { revoked: result.count };
  }

  async getUserTokens(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async cleanupExpiredTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            AND: [
              { revokedAt: { not: null } },
              { revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
            ],
          },
        ],
      },
    });

    this.logger.log(
      {
        message: 'refresh.tokens.cleanup',
        deleted: result.count,
      },
      RefreshTokenService.name,
    );

    return { deleted: result.count };
  }

  private async cleanupUserTokens(userId: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
    });

    // Keep only the most recent tokens
    if (tokens.length >= this.MAX_TOKENS_PER_USER) {
      const tokensToRevoke = tokens.slice(this.MAX_TOKENS_PER_USER - 1);
      await this.prisma.refreshToken.updateMany({
        where: { id: { in: tokensToRevoke.map((t) => t.id) } },
        data: { revokedAt: new Date(), revokedReason: 'Max tokens exceeded' },
      });
    }
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_BYTES).toString('base64url');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
