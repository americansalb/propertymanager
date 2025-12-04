import { Controller, Get, Post, Body, Query, UseGuards, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { type Request } from 'express';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceService } from './device.service';
import { RefreshTokenService } from './refresh-token.service';
import { type AuthenticatedRequest } from '../common/types/authenticated-request';

@ApiTags('Mobile')
@Controller('mobile')
export class MobileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deviceService: DeviceService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.refreshTokenService.rotateToken(refreshToken, userAgent, ipAddress);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.refreshTokenService.revokeToken(refreshToken);
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@Req() req: AuthenticatedRequest) {
    return this.refreshTokenService.revokeAllUserTokens(req.user.id);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@Req() req: AuthenticatedRequest) {
    return this.refreshTokenService.getUserTokens(req.user.id);
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get mobile dashboard data (optimized)' })
  async getDashboard(@Req() req: AuthenticatedRequest) {
    const organizationId = req.user.organizationId;

    // Fetch all dashboard data in parallel for optimal mobile performance
    const [
      propertiesCount,
      unitsStats,
      openWorkOrders,
      pendingPayments,
      upcomingLeases,
      recentActivity,
    ] = await Promise.all([
      this.prisma.property.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.getUnitsStats(organizationId),
      this.getOpenWorkOrders(organizationId),
      this.getPendingPayments(organizationId),
      this.getUpcomingLeaseExpirations(organizationId),
      this.getRecentActivity(organizationId),
    ]);

    return {
      summary: {
        properties: propertiesCount,
        units: unitsStats,
        openWorkOrders,
        pendingPayments,
      },
      upcomingLeases,
      recentActivity,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('properties')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get properties list (optimized for mobile)' })
  async getProperties(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where: { organizationId: req.user.organizationId, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          type: true,
          address1: true,
          city: true,
          state: true,
          _count: { select: { units: true } },
          units: {
            select: { status: true },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
      }),
      this.prisma.property.count({
        where: { organizationId: req.user.organizationId, status: 'ACTIVE' },
      }),
    ]);

    return {
      data: properties.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        address: `${p.address1}, ${p.city}, ${p.state}`,
        unitCount: p._count.units,
        occupiedUnits: p.units.filter((u: { status: string }) => u.status === 'OCCUPIED').length,
        vacantUnits: p.units.filter((u: { status: string }) => u.status === 'VACANT').length,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  @Get('work-orders')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get work orders (optimized for mobile)' })
  async getWorkOrders(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const where: Prisma.WorkOrderWhereInput = { organizationId: req.user.organizationId };
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority as Prisma.EnumWorkOrderPriorityFilter;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [workOrders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          type: true,
          createdAt: true,
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, unitNumber: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: parseInt(limit),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      data: workOrders.map((wo) => ({
        id: wo.id,
        title: wo.title,
        description: wo.description?.substring(0, 100),
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        createdAt: wo.createdAt,
        location: wo.unit ? `${wo.property.name} - ${wo.unit.unitNumber}` : wo.property.name,
        assignee: wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : null,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  @Get('tenants')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get tenants list (optimized for mobile)' })
  async getTenants(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const where: Prisma.TenantWhereInput = {
      lease: { unit: { property: { organizationId: req.user.organizationId } } },
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isPrimary: true,
          lease: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              unit: {
                select: {
                  unitNumber: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants.map((t) => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
        phone: t.phone,
        isPrimary: t.isPrimary,
        unit: `${t.lease.unit.property.name} - ${t.lease.unit.unitNumber}`,
        leaseStatus: t.lease.status,
        leaseEnd: t.lease.endDate,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  @Get('notifications')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('unreadOnly') _unreadOnly?: string,
    @Query('page') _page: string = '1',
    @Query('limit') _limit: string = '20',
  ) {
    const organizationId = req.user.organizationId;

    // Get recent work orders assigned to or created by this user as notifications
    const workOrderNotifications = await this.prisma.workOrder.findMany({
      where: {
        organizationId,
        OR: [{ assignedToId: req.user.id }],
        status: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        createdAt: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const notifications = workOrderNotifications.map((wo) => ({
      id: wo.id,
      type: 'work_order',
      title: wo.title,
      message: wo.description?.substring(0, 100),
      date: wo.createdAt,
      priority: wo.priority,
    }));

    return {
      data: notifications,
      unreadCount: notifications.length,
    };
  }

  @Get('quick-actions')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get available quick actions' })
  async getQuickActions(@Req() req: AuthenticatedRequest) {
    const role = req.user.role;

    const actions = [
      { id: 'new-work-order', label: 'New Work Order', icon: 'wrench', route: '/work-orders/new' },
      { id: 'collect-rent', label: 'Collect Rent', icon: 'dollar', route: '/payments/new' },
      { id: 'add-tenant', label: 'Add Tenant', icon: 'user-plus', route: '/tenants/new' },
      {
        id: 'schedule-showing',
        label: 'Schedule Showing',
        icon: 'calendar',
        route: '/showings/new',
      },
      { id: 'send-notice', label: 'Send Notice', icon: 'mail', route: '/communications/new' },
      { id: 'run-report', label: 'Run Report', icon: 'chart', route: '/reports' },
    ];

    // Filter based on role
    if (role === 'MAINTENANCE_TECH') {
      return actions.filter((a) => ['new-work-order'].includes(a.id));
    }

    return actions;
  }

  // Helper method to send push notifications via device service
  async sendWorkOrderNotification(workOrderId: string, userIds: string[]) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { title: true, priority: true },
    });

    if (workOrder) {
      await this.deviceService.sendPushNotification(userIds, {
        title: 'New Work Order',
        body: workOrder.title,
        data: { workOrderId, type: 'work_order' },
      });
    }
  }

  private async getUnitsStats(organizationId: string) {
    const units = await this.prisma.unit.groupBy({
      by: ['status'],
      where: { property: { organizationId } },
      _count: true,
    });

    const stats = units.reduce(
      (acc, u) => {
        acc[u.status.toLowerCase()] = u._count;
        acc.total += u._count;
        return acc;
      },
      { total: 0, occupied: 0, vacant: 0, maintenance: 0 } as Record<string, number>,
    );

    return {
      ...stats,
      occupancyRate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0,
    };
  }

  private async getOpenWorkOrders(organizationId: string) {
    const counts = await this.prisma.workOrder.groupBy({
      by: ['priority'],
      where: {
        organizationId,
        status: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      _count: true,
    });

    return {
      total: counts.reduce((sum, c) => sum + c._count, 0),
      byPriority: counts.reduce(
        (acc, c) => {
          acc[c.priority.toLowerCase()] = c._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  private async getPendingPayments(organizationId: string) {
    const charges = await this.prisma.charge.aggregate({
      where: {
        lease: { unit: { property: { organizationId } } },
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      count: charges._count,
      amount: Number(charges._sum.amount ?? 0),
    };
  }

  private async getUpcomingLeaseExpirations(organizationId: string, days: number = 30) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    const leases = await this.prisma.lease.findMany({
      where: {
        unit: { property: { organizationId } },
        status: 'ACTIVE',
        endDate: { lte: expirationDate, gte: new Date() },
      },
      select: {
        id: true,
        endDate: true,
        unit: {
          select: {
            unitNumber: true,
            property: { select: { name: true } },
          },
        },
        tenants: {
          where: { isPrimary: true },
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { endDate: 'asc' },
      take: 5,
    });

    return leases.map((l) => ({
      id: l.id,
      unit: `${l.unit.property.name} - ${l.unit.unitNumber}`,
      tenant: l.tenants[0] ? `${l.tenants[0].firstName} ${l.tenants[0].lastName}` : 'N/A',
      expiresAt: l.endDate,
      daysRemaining: Math.ceil((l.endDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));
  }

  private async getRecentActivity(organizationId: string) {
    const [workOrders, payments] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { organizationId },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.payment.findMany({
        where: {
          tenant: { lease: { unit: { property: { organizationId } } } },
          status: 'COMPLETED',
        },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          tenant: { select: { firstName: true, lastName: true } },
        },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),
    ]);

    const activities = [
      ...workOrders.map((wo) => ({
        id: wo.id,
        type: 'work_order',
        title: wo.title,
        status: wo.status,
        date: wo.createdAt,
      })),
      ...payments.map((p) => ({
        id: p.id,
        type: 'payment',
        title: `Payment from ${p.tenant.firstName} ${p.tenant.lastName}`,
        amount: Number(p.amount),
        date: p.paymentDate,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return activities.slice(0, 10);
  }
}
