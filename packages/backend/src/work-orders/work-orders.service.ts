import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { type CreateWorkOrderDto } from './dto/create-work-order.dto';
import { type UpdateWorkOrderDto } from './dto/update-work-order.dto';

@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.workOrder.findMany({
      where: {
        property: {
          organizationId,
        },
      },
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: {
        id,
        property: {
          organizationId,
        },
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
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

    // Verify vendor exists if provided
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: dto.vendorId },
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

    // Normalize numeric fields (convert null/undefined/NaN to null)
    const estimatedCost =
      dto.estimatedCost == null || isNaN(Number(dto.estimatedCost))
        ? null
        : Number(dto.estimatedCost);

    const workOrder = await this.prisma.workOrder.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority || 'MEDIUM',
        status: 'SUBMITTED',
        propertyId: dto.propertyId,
        unitId: dto.unitId || null,
        location: dto.location || null,
        assignedToId: dto.assignedToId || null,
        vendorId: dto.vendorId || null,
        estimatedCost,
        tenantReportedBy: dto.tenantReportedBy || null,
        tenantPhone: dto.tenantPhone || null,
        permissionToEnter: dto.permissionToEnter || false,
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
      },
    });

    // Use correct Winston logging API
    this.logger.log('info', 'work_order.created', {
      workOrderId: workOrder.id,
      propertyId: workOrder.propertyId,
      type: workOrder.type,
      priority: workOrder.priority,
      organizationId,
      userId,
    });

    // Track event - wrap in try/catch so analytics never breaks the request
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
      // Log but don't throw - analytics failures should not break the request
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.log('warn', 'Failed to track work order creation event', { error: errorMessage });
    }

    return workOrder;
  }

  async update(id: string, dto: UpdateWorkOrderDto, organizationId: string, userId: string) {
    // Verify work order exists and belongs to organization
    const existingWorkOrder = await this.findOne(id, organizationId);

    // Verify vendor exists if being updated
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: dto.vendorId },
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

    // Normalize numeric fields
    const estimatedCost =
      dto.estimatedCost == null || isNaN(Number(dto.estimatedCost))
        ? undefined
        : Number(dto.estimatedCost);
    const actualCost =
      dto.actualCost == null || isNaN(Number(dto.actualCost)) ? undefined : Number(dto.actualCost);

    // Track status change if status is being updated
    const statusChanged = dto.status && dto.status !== existingWorkOrder.status;
    const oldStatus = existingWorkOrder.status;

    // Prepare update data
    const updateData: any = {
      ...dto,
      estimatedCost,
      actualCost,
    };

    // Set completedDate when status changes to COMPLETED
    if (dto.status === 'COMPLETED' && !existingWorkOrder.completedDate) {
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
      },
    });

    // Use correct Winston logging API
    this.logger.log('info', 'work_order.updated', {
      workOrderId: workOrder.id,
      propertyId: workOrder.propertyId,
      statusChanged,
      oldStatus,
      newStatus: workOrder.status,
      organizationId,
      userId,
    });

    // Track event - wrap in try/catch so analytics never breaks the request
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
      // Log but don't throw - analytics failures should not break the request
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.log('warn', 'Failed to track work order update event', { error: errorMessage });
    }

    return workOrder;
  }
}
