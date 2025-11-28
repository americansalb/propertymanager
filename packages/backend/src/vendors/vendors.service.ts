import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createVendorDto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
        ...createVendorDto,
        insuranceExpiryDate: createVendorDto.insuranceExpiryDate
          ? new Date(createVendorDto.insuranceExpiryDate)
          : null,
        organizationId,
      },
      include: {
        workOrders: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.vendor.findMany({
      where: { organizationId },
      orderBy: { companyName: 'asc' },
      include: {
        workOrders: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        workOrders: {
          include: {
            unit: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async update(id: string, organizationId: string, updateVendorDto: UpdateVendorDto) {
    // First check if vendor exists and belongs to organization
    await this.findOne(id, organizationId);

    return this.prisma.vendor.update({
      where: { id },
      data: {
        ...updateVendorDto,
        insuranceExpiryDate: updateVendorDto.insuranceExpiryDate
          ? new Date(updateVendorDto.insuranceExpiryDate)
          : undefined,
      },
      include: {
        workOrders: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  async remove(id: string, organizationId: string) {
    // Validate vendor exists and belongs to organization
    await this.findOne(id, organizationId);

    // Check if vendor has any assigned work orders that are not completed/cancelled
    const activeWorkOrders = await this.prisma.workOrder.count({
      where: {
        vendorId: id,
        status: {
          in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeWorkOrders > 0) {
      throw new NotFoundException(
        `Cannot delete vendor with ${activeWorkOrders} active work orders. Please reassign or complete them first.`,
      );
    }

    // Soft delete by setting status to INACTIVE, or hard delete if no work orders
    const totalWorkOrders = await this.prisma.workOrder.count({
      where: { vendorId: id },
    });

    if (totalWorkOrders > 0) {
      // Soft delete - just mark as inactive
      return this.prisma.vendor.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
    }

    // Hard delete if no work order history
    return this.prisma.vendor.delete({
      where: { id },
    });
  }

  async getVendorStats(id: string, organizationId: string) {
    const vendor = await this.findOne(id, organizationId);

    const workOrders = await this.prisma.workOrder.findMany({
      where: { vendorId: id },
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const activeCount = workOrders.filter(
      (wo) => ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'].includes(wo.status),
    ).length;

    const completedWorkOrders = workOrders.filter((wo) => wo.status === 'COMPLETED');
    const completedCount = completedWorkOrders.length;

    // Calculate average completion time
    let avgCompletionDays = 0;
    if (completedCount > 0) {
      const totalDays = completedWorkOrders.reduce((sum, wo) => {
        const created = new Date(wo.createdAt);
        const completed = new Date(wo.updatedAt);
        const days = Math.ceil(
          (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );
        return sum + days;
      }, 0);
      avgCompletionDays = Math.round(totalDays / completedCount);
    }

    // Count overdue (active work orders older than 7 days)
    const now = new Date();
    const overdueCount = workOrders.filter((wo) => {
      if (!['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'].includes(wo.status)) return false;
      const created = new Date(wo.createdAt);
      const daysSinceCreated = Math.floor(
        (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysSinceCreated > 7;
    }).length;

    return {
      vendor,
      stats: {
        activeCount,
        completedCount,
        totalCount: workOrders.length,
        avgCompletionDays,
        overdueCount,
      },
    };
  }
}
