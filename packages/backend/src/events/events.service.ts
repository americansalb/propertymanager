import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Track an event with full request context
   */
  async track(dto: CreateEventDto, organizationId: string, userId?: string, req?: Request) {
    try {
      const event = await this.prisma.event.create({
        data: {
          name: dto.name,
          category: dto.category,
          properties: (dto.properties || {}) as any,
          sessionId: dto.sessionId,
          organizationId,
          userId: userId || null,
          ipAddress: req ? this.getIpAddress(req) : null,
          userAgent: req?.headers['user-agent'] || null,
          url: req?.url || null,
        },
      });

      this.logger.log(
        {
          message: 'event.tracked',
          eventId: event.id,
          eventName: event.name,
          category: event.category,
          organizationId,
          userId,
        },
        EventsService.name,
      );

      return event;
    } catch (error) {
      this.logger.error(
        {
          message: 'event.track_failed',
          eventName: dto.name,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        EventsService.name,
      );
      throw error;
    }
  }

  /**
   * Get events for an organization with optional filtering
   */
  async findAll(
    organizationId: string,
    options?: {
      userId?: string;
      name?: string;
      category?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { userId, name, category, limit = 100, offset = 0 } = options || {};

    return this.prisma.event.findMany({
      where: {
        organizationId,
        ...(userId && { userId }),
        ...(name && { name }),
        ...(category && { category }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get event analytics/aggregations
   */
  async getAnalytics(
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'name' | 'category' | 'userId';
    },
  ) {
    const { startDate, endDate, groupBy = 'name' } = options || {};

    // Build where clause
    const where: {
      organizationId: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      organizationId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Aggregate by the specified field
    return this.prisma.event.groupBy({
      by: [groupBy],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
  }

  /**
   * Extract IP address from request
   */
  private getIpAddress(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || null;
  }
}
