import { Injectable, NotFoundException, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { type RegisterDeviceDto, type UpdateDeviceDto } from './dto/mobile.dto';

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async findAll(organizationId: string, userId?: string) {
    const where: any = {};

    // Filter by organization through user relation
    if (organizationId) {
      where.user = { organizationId };
    }

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.deviceToken.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    const device = await this.prisma.deviceToken.findFirst({
      where: { id, user: { organizationId } },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  async findByUserId(userId: string) {
    return this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async register(data: RegisterDeviceDto, userId: string) {
    // Check if device already registered
    const existing = await this.prisma.deviceToken.findFirst({
      where: { deviceId: data.deviceId },
    });

    if (existing) {
      // Update existing device
      return this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          userId,
          token: data.token,
          platform: data.platform,
          deviceName: data.deviceName,
          deviceModel: data.deviceModel,
          osVersion: data.osVersion,
          appVersion: data.appVersion,
          lastUsedAt: new Date(),
          isActive: true,
        },
      });
    }

    // Register new device
    const device = await this.prisma.deviceToken.create({
      data: {
        userId,
        deviceId: data.deviceId,
        token: data.token,
        platform: data.platform,
        deviceName: data.deviceName,
        deviceModel: data.deviceModel,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        lastUsedAt: new Date(),
        isActive: true,
      },
    });

    this.logger.log(
      {
        message: 'device.registered',
        deviceId: device.id,
        userId,
        platform: data.platform,
      },
      DeviceService.name,
    );

    return device;
  }

  async update(id: string, data: UpdateDeviceDto, organizationId: string) {
    await this.findById(id, organizationId);

    return this.prisma.deviceToken.update({
      where: { id },
      data: {
        token: data.token,
        deviceName: data.deviceName,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        enablePush: data.notificationsEnabled,
        lastUsedAt: new Date(),
      },
    });
  }

  async updateActivity(id: string) {
    return this.prisma.deviceToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async deactivate(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    await this.prisma.deviceToken.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async delete(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.deviceToken.delete({ where: { id } });
    return { success: true };
  }

  async sendPushNotification(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
      badge?: number;
      sound?: string;
    },
  ) {
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
        enablePush: true,
      },
    });

    const results: { deviceId: string; success: boolean; error?: string }[] = [];

    for (const device of devices) {
      try {
        // Platform-specific push notification logic
        if (device.platform === 'IOS' || device.platform === 'ANDROID') {
          await this.sendFCMNotification(device, notification);
          results.push({ deviceId: device.id, success: true });
        } else if (device.platform === 'WEB') {
          await this.sendWebPushNotification(device, notification);
          results.push({ deviceId: device.id, success: true });
        }
      } catch (error: any) {
        this.logger.error(
          {
            message: 'push.notification.failed',
            deviceId: device.id,
            error: error.message,
          },
          DeviceService.name,
        );
        results.push({ deviceId: device.id, success: false, error: error.message });

        // Deactivate device if token is invalid
        if (error.message?.includes('invalid') || error.message?.includes('unregistered')) {
          await this.prisma.deviceToken.update({
            where: { id: device.id },
            data: { isActive: false },
          });
        }
      }
    }

    return {
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  private async sendFCMNotification(
    device: any,
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
      badge?: number;
      sound?: string;
    },
  ) {
    // Firebase Cloud Messaging integration
    // In production, use firebase-admin SDK
    const fcmPayload = {
      token: device.token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      android: {
        notification: {
          sound: notification.sound || 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: notification.badge,
            sound: notification.sound || 'default',
          },
        },
      },
    };

    this.logger.log(
      {
        message: 'fcm.notification.sent',
        deviceId: device.id,
        payload: fcmPayload,
      },
      DeviceService.name,
    );

    // In production: await admin.messaging().send(fcmPayload);
    return { success: true };
  }

  private async sendWebPushNotification(
    device: any,
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ) {
    // Web Push integration
    // In production, use web-push library
    const _pushPayload = {
      subscription: JSON.parse(device.token),
      payload: JSON.stringify({
        title: notification.title,
        body: notification.body,
        data: notification.data,
      }),
    };

    this.logger.log(
      {
        message: 'web.push.notification.sent',
        deviceId: device.id,
      },
      DeviceService.name,
    );

    // In production: await webpush.sendNotification(subscription, payload);
    return { success: true };
  }

  async getStats(organizationId: string) {
    const [total, active, byPlatform] = await Promise.all([
      this.prisma.deviceToken.count({
        where: { user: { organizationId } },
      }),
      this.prisma.deviceToken.count({
        where: { user: { organizationId }, isActive: true },
      }),
      this.prisma.deviceToken.groupBy({
        by: ['platform'],
        where: { user: { organizationId }, isActive: true },
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byPlatform: byPlatform.reduce(
        (acc, p) => {
          acc[p.platform] =
            typeof p._count === 'object' ? (p._count as any)._all || 0 : p._count || 0;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async cleanupInactiveDevices(daysInactive: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const deleted = await this.prisma.deviceToken.deleteMany({
      where: {
        OR: [
          { lastUsedAt: { lt: cutoffDate } },
          { isActive: false, lastUsedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    this.logger.log(
      {
        message: 'devices.cleanup',
        deleted: deleted.count,
        cutoffDate,
      },
      DeviceService.name,
    );

    return { deleted: deleted.count };
  }
}
