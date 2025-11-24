import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

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
        throw new BadRequestException('Unit not found or does not belong to the specified property');
      }
    }

    const workOrder = await this.prisma.workOrder.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority || 'MEDIUM',
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        location: dto.location,
        assignedToId: dto.assignedToId,
        vendorId: dto.vendorId,
        estimatedCost: dto.estimatedCost,
        tenantReportedBy: dto.tenantReportedBy,
        tenantPhone: dto.tenantPhone,
        permissionToEnter: dto.permissionToEnter || false,
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
      },
    });

    this.logger.info('work_order.created', {
      workOrderId: workOrder.id,
      propertyId: workOrder.propertyId,
      type: workOrder.type,
      priority: workOrder.priority,
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
      this.logger.error('Failed to track work order creation event', { error });
    }

    return workOrder;
  }

  async update(id: string, dto: UpdateWorkOrderDto, organizationId: string, userId: string) {
    // Verify work order exists and belongs to organization
    const existingWorkOrder = await this.findOne(id, organizationId);

    // Track status change if status is being updated
    const statusChanged = dto.status && dto.status !== existingWorkOrder.status;
    const oldStatus = existingWorkOrder.status;

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...dto,
        // Set completedDate when status changes to COMPLETED
        completedDate: dto.status === 'COMPLETED' ? new Date() : undefined,
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
      },
    });

    this.logger.info('work_order.updated', {
      workOrderId: workOrder.id,
      propertyId: workOrder.propertyId,
      statusChanged,
      oldStatus,
      newStatus: workOrder.status,
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
      this.logger.error('Failed to track work order update event', { error });
    }

    return workOrder;
  }
}
