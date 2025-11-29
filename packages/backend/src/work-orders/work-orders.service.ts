import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { type CreateWorkOrderDto } from './dto/create-work-order.dto';
import { type UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { type AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { type CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { type UpdateWorkOrderStatusDto } from './dto/update-status.dto';
import { type WorkOrderQueryDto } from './dto/work-order-query.dto';

// Valid status transitions map
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [], // Cannot transition from COMPLETED
  CANCELLED: [], // Cannot transition from CANCELLED
};

@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private notificationsService: NotificationsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  private validateStatusTransition(fromStatus: string, toStatus: string): boolean {
    const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus] || [];
    return validTransitions.includes(toStatus);
  }

  async findAll(organizationId: string, query?: WorkOrderQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    // Apply filters
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.priority) {
      where.priority = query.priority;
    }
    if (query?.type) {
      where.type = query.type;
    }
    if (query?.propertyId) {
      where.propertyId = query.propertyId;
    }
    if (query?.unitId) {
      where.unitId = query.unitId;
    }
    if (query?.vendorId) {
      where.vendorId = query.vendorId;
    }
    if (query?.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    const [workOrders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address1: true,
              city: true,
              state: true,
            },
          },
          unit: {
            select: {
              id: true,
              unitNumber: true,
            },
          },
          vendor: {
            select: {
              id: true,
              companyName: true,
              phone: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          attachments: true,
          _count: {
            select: {
              statusHistory: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      data: workOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attachments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found`);
    }

    return workOrder;
  }

  async create(dto: CreateWorkOrderDto, organizationId: string, userId: string) {
    // Verify property belongs to organization
    const property = await this.prisma.property.findFirst({
      where: {
        id: dto.propertyId,
        organizationId,
      },
    });

    if (!property) {
      throw new BadRequestException('Property not found or does not belong to your organization');
    }

    // Verify unit belongs to property if provided
    if (dto.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: {
          id: dto.unitId,
          propertyId: dto.propertyId,
        },
      });

      if (!unit) {
        throw new BadRequestException(
          'Unit not found or does not belong to the specified property',
        );
      }
    }

    // Verify vendor exists and is active if provided
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId },
      });

      if (!vendor) {
        throw new BadRequestException('Vendor not found');
      }
    }

    // Verify assigned user exists if provided
    if (dto.assignedToId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
      });

      if (!user) {
        throw new BadRequestException('Assigned user not found');
      }
    }

    // Normalize numeric fields
    const estimatedCost =
      dto.estimatedCost == null || isNaN(Number(dto.estimatedCost))
        ? null
        : Number(dto.estimatedCost);

    // Determine initial status
    const initialStatus = dto.vendorId || dto.assignedToId ? 'ASSIGNED' : 'SUBMITTED';

    const workOrder = await this.prisma.workOrder.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority || 'MEDIUM',
        status: initialStatus,
        propertyId: dto.propertyId,
        unitId: dto.unitId || null,
        location: dto.location || null,
        assignedToId: dto.assignedToId || null,
        vendorId: dto.vendorId || null,
        estimatedCost,
        tenantReportedBy: dto.tenantReportedBy || null,
        tenantPhone: dto.tenantPhone || null,
        permissionToEnter: dto.permissionToEnter || false,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: initialStatus,
            changedBy: userId,
            notes: 'Work order created',
          },
        },
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
        statusHistory: true,
      },
    });

    this.logger.log('info', 'work_order.created', {
      workOrderId: workOrder.id,
      propertyId: workOrder.propertyId,
      type: workOrder.type,
      priority: workOrder.priority,
      organizationId,
      userId,
    });

    // Track event
    try {
      await this.eventsService.track(
        {
          name: 'WORK_ORDER_CREATED',
          category: 'maintenance',
          properties: {
            workOrderId: workOrder.id,
            propertyId: workOrder.propertyId,
            type: workOrder.type,
            priority: workOrder.priority,
            title: workOrder.title,
          },
        },
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.log('warn', 'Failed to track work order creation event', { error: errorMessage });
    }

    return workOrder;
  }

  async update(id: string, dto: UpdateWorkOrderDto, organizationId: string, userId: string) {
    const existingWorkOrder = await this.findOne(id, organizationId);

    // Cannot update completed or cancelled work orders
    if (['COMPLETED', 'CANCELLED'].includes(existingWorkOrder.status)) {
      throw new BadRequestException(
        `Cannot update a ${existingWorkOrder.status.toLowerCase()} work order`,
      );
    }

    // Verify vendor exists if being updated
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId },
      });

      if (!vendor) {
        throw new BadRequestException('Vendor not found');
      }
    }

    // Verify assigned user exists if being updated
    if (dto.assignedToId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
      });

      if (!user) {
        throw new BadRequestException('Assigned user not found');
      }
    }

    // Verify unit belongs to property if being updated
    if (dto.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: {
          id: dto.unitId,
          propertyId: existingWorkOrder.propertyId,
        },
      });

      if (!unit) {
        throw new BadRequestException('Unit not found or does not belong to the property');
      }
    }

    // Validate status transition if status is being updated
    if (dto.status && dto.status !== existingWorkOrder.status) {
      if (!this.validateStatusTransition(existingWorkOrder.status, dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${existingWorkOrder.status} to ${dto.status}`,
        );
      }
    }

    // Normalize numeric fields
    const estimatedCost =
      dto.estimatedCost == null || isNaN(Number(dto.estimatedCost))
        ? undefined
        : Number(dto.estimatedCost);
    const actualCost =
      dto.actualCost == null || isNaN(Number(dto.actualCost)) ? undefined : Number(dto.actualCost);

    const statusChanged = dto.status && dto.status !== existingWorkOrder.status;
    const oldStatus = existingWorkOrder.status;

    const updateData: any = {
      ...dto,
      estimatedCost,
      actualCost,
    };

    // Set completedDate when status changes to COMPLETED
    if (dto.status === 'COMPLETED' && !existingWorkOrder.completedDate) {
      updateData.completedDate = new Date();
    }

    // Create status history entry if status changed
    if (statusChanged) {
      updateData.statusHistory = {
        create: {
          fromStatus: oldStatus,
          toStatus: dto.status,
          changedBy: userId,
          notes: null,
        },
      };
    }

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    this.logger.log('info', 'work_order.updated', {
      workOrderId: workOrder.id,
      propertyId: workOrder.propertyId,
      statusChanged,
      oldStatus,
      newStatus: workOrder.status,
      organizationId,
      userId,
    });

    // Track event
    try {
      await this.eventsService.track(
        {
          name: statusChanged ? 'WORK_ORDER_STATUS_CHANGED' : 'WORK_ORDER_UPDATED',
          category: 'maintenance',
          properties: {
            workOrderId: workOrder.id,
            propertyId: workOrder.propertyId,
            ...(statusChanged && { oldStatus, newStatus: workOrder.status }),
            updatedFields: Object.keys(dto),
          },
        },
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.log('warn', 'Failed to track work order update event', { error: errorMessage });
    }

    return workOrder;
  }

  async updateStatus(
    id: string,
    dto: UpdateWorkOrderStatusDto,
    organizationId: string,
    userId: string,
  ) {
    const existingWorkOrder = await this.findOne(id, organizationId);

    if (!this.validateStatusTransition(existingWorkOrder.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${existingWorkOrder.status} to ${dto.status}`,
      );
    }

    const updateData: any = {
      status: dto.status,
      statusHistory: {
        create: {
          fromStatus: existingWorkOrder.status,
          toStatus: dto.status,
          changedBy: userId,
          notes: dto.notes || null,
        },
      },
    };

    // Set completedDate when status changes to COMPLETED
    if (dto.status === 'COMPLETED') {
      updateData.completedDate = new Date();
    }

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    this.logger.log('info', 'work_order.status_changed', {
      workOrderId: workOrder.id,
      fromStatus: existingWorkOrder.status,
      toStatus: dto.status,
      organizationId,
      userId,
    });

    // Send notification to tenant if work order was tenant-reported
    if (existingWorkOrder.unitId) {
      try {
        // Get the tenant for this unit
        const tenant = await this.prisma.tenant.findFirst({
          where: {
            lease: {
              unitId: existingWorkOrder.unitId,
              status: 'ACTIVE',
            },
          },
        });

        if (tenant) {
          await this.notificationsService.sendWorkOrderUpdateNotification(
            tenant.email,
            `${tenant.firstName} ${tenant.lastName}`,
            workOrder.title,
            dto.status,
            dto.notes || null,
            workOrder.property.name,
            workOrder.unit?.unitNumber || '',
            workOrder.id,
            organizationId,
          );
          this.logger.log('info', 'work_order.notification_sent', {
            workOrderId: workOrder.id,
            tenantEmail: tenant.email,
          });
        }
      } catch (error) {
        this.logger.log('error', 'work_order.notification_failed', {
          workOrderId: workOrder.id,
          error: (error as Error).message,
        });
      }
    }

    return workOrder;
  }

  async assign(id: string, dto: AssignWorkOrderDto, organizationId: string, userId: string) {
    const existingWorkOrder = await this.findOne(id, organizationId);

    // Cannot assign completed or cancelled work orders
    if (['COMPLETED', 'CANCELLED'].includes(existingWorkOrder.status)) {
      throw new BadRequestException(
        `Cannot assign a ${existingWorkOrder.status.toLowerCase()} work order`,
      );
    }

    // Must provide at least vendor or assignedTo
    if (!dto.vendorId && !dto.assignedToId) {
      throw new BadRequestException('Must provide either a vendor or user to assign');
    }

    // Verify vendor exists if provided
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId },
      });

      if (!vendor) {
        throw new BadRequestException('Vendor not found');
      }
    }

    // Verify assigned user exists if provided
    if (dto.assignedToId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
      });

      if (!user) {
        throw new BadRequestException('Assigned user not found');
      }
    }

    // Transition to ASSIGNED status if currently SUBMITTED
    const newStatus =
      existingWorkOrder.status === 'SUBMITTED' ? 'ASSIGNED' : existingWorkOrder.status;

    const updateData: any = {
      vendorId: dto.vendorId || existingWorkOrder.vendorId,
      assignedToId: dto.assignedToId || existingWorkOrder.assignedToId,
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : existingWorkOrder.scheduledDate,
      status: newStatus,
    };

    // Add status history if status changed
    if (newStatus !== existingWorkOrder.status) {
      updateData.statusHistory = {
        create: {
          fromStatus: existingWorkOrder.status,
          toStatus: newStatus,
          changedBy: userId,
          notes: dto.notes || 'Work order assigned',
        },
      };
    }

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    this.logger.log('info', 'work_order.assigned', {
      workOrderId: workOrder.id,
      vendorId: dto.vendorId,
      assignedToId: dto.assignedToId,
      organizationId,
      userId,
    });

    return workOrder;
  }

  async complete(id: string, dto: CompleteWorkOrderDto, organizationId: string, userId: string) {
    const existingWorkOrder = await this.findOne(id, organizationId);

    // Can only complete work orders that are IN_PROGRESS or ASSIGNED
    if (!['IN_PROGRESS', 'ASSIGNED'].includes(existingWorkOrder.status)) {
      throw new BadRequestException(
        `Cannot complete a work order with status ${existingWorkOrder.status}`,
      );
    }

    const updateData: any = {
      status: 'COMPLETED',
      completedDate: new Date(),
      completionNotes: dto.completionNotes || existingWorkOrder.completionNotes,
      statusHistory: {
        create: {
          fromStatus: existingWorkOrder.status,
          toStatus: 'COMPLETED',
          changedBy: userId,
          notes: dto.completionNotes || 'Work order completed',
        },
      },
    };

    if (dto.actualCost != null && !isNaN(Number(dto.actualCost))) {
      updateData.actualCost = Number(dto.actualCost);
    }

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    this.logger.log('info', 'work_order.completed', {
      workOrderId: workOrder.id,
      actualCost: dto.actualCost,
      organizationId,
      userId,
    });

    // Track event
    try {
      await this.eventsService.track(
        {
          name: 'WORK_ORDER_COMPLETED',
          category: 'maintenance',
          properties: {
            workOrderId: workOrder.id,
            propertyId: workOrder.propertyId,
            actualCost: dto.actualCost,
            daysToComplete: workOrder.completedDate
              ? Math.ceil(
                  (workOrder.completedDate.getTime() - workOrder.requestedDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : null,
          },
        },
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.log('warn', 'Failed to track work order completion event', {
        error: errorMessage,
      });
    }

    return workOrder;
  }

  async cancel(id: string, reason: string, organizationId: string, userId: string) {
    const existingWorkOrder = await this.findOne(id, organizationId);

    // Cannot cancel already completed or cancelled work orders
    if (['COMPLETED', 'CANCELLED'].includes(existingWorkOrder.status)) {
      throw new BadRequestException(
        `Cannot cancel a ${existingWorkOrder.status.toLowerCase()} work order`,
      );
    }

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusHistory: {
          create: {
            fromStatus: existingWorkOrder.status,
            toStatus: 'CANCELLED',
            changedBy: userId,
            notes: reason || 'Work order cancelled',
          },
        },
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    this.logger.log('info', 'work_order.cancelled', {
      workOrderId: workOrder.id,
      reason,
      organizationId,
      userId,
    });

    return workOrder;
  }

  async remove(id: string, organizationId: string, userId: string) {
    const existingWorkOrder = await this.findOne(id, organizationId);

    // Can only delete DRAFT or CANCELLED work orders
    if (!['DRAFT', 'CANCELLED'].includes(existingWorkOrder.status)) {
      throw new BadRequestException(
        `Cannot delete a work order with status ${existingWorkOrder.status}. Cancel it first.`,
      );
    }

    // Delete attachments, status history, then work order
    await this.prisma.$transaction([
      this.prisma.workOrderAttachment.deleteMany({ where: { workOrderId: id } }),
      this.prisma.workOrderStatusHistory.deleteMany({ where: { workOrderId: id } }),
      this.prisma.workOrder.delete({ where: { id } }),
    ]);

    this.logger.log('info', 'work_order.deleted', {
      workOrderId: id,
      organizationId,
      userId,
    });

    return { success: true, id };
  }

  async getStatusHistory(id: string, organizationId: string) {
    // Validate work order exists and belongs to organization
    await this.findOne(id, organizationId);

    const history = await this.prisma.workOrderStatusHistory.findMany({
      where: { workOrderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return history;
  }

  async getStats(organizationId: string, propertyId?: string) {
    const where: any = { organizationId };
    if (propertyId) {
      where.propertyId = propertyId;
    }

    const [
      totalCount,
      openCount,
      completedCount,
      overdueCount,
      byStatus,
      byPriority,
      avgCompletionTime,
    ] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.count({
        where: {
          ...where,
          status: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] },
        },
      }),
      this.prisma.workOrder.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      this.prisma.workOrder.count({
        where: {
          ...where,
          status: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] },
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // More than 7 days old
        },
      }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.workOrder.groupBy({
        by: ['priority'],
        where: { ...where, status: { not: 'COMPLETED' } },
        _count: true,
      }),
      this.prisma.workOrder.findMany({
        where: { ...where, status: 'COMPLETED', completedDate: { not: null } },
        select: { requestedDate: true, completedDate: true },
        take: 100,
        orderBy: { completedDate: 'desc' },
      }),
    ]);

    // Calculate average completion time
    let avgDays = 0;
    if (avgCompletionTime.length > 0) {
      const totalDays = avgCompletionTime.reduce((sum, wo) => {
        if (wo.completedDate) {
          const days = Math.ceil(
            (wo.completedDate.getTime() - wo.requestedDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }
        return sum;
      }, 0);
      avgDays = Math.round(totalDays / avgCompletionTime.length);
    }

    return {
      total: totalCount,
      open: openCount,
      completed: completedCount,
      overdue: overdueCount,
      avgCompletionDays: avgDays,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byPriority: byPriority.reduce(
        (acc, item) => {
          acc[item.priority] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
