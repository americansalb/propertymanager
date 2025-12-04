import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto';
import { UserRole } from '@propertymaster/database';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createVendorDto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
        ...createVendorDto,
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

  async findPendingVendors(organizationId: string) {
    return this.prisma.vendor.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: 'public-marketplace' },
        ],
        status: 'PENDING_APPROVAL',
      },
      orderBy: { createdAt: 'desc' },
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

  async findByUserId(userId: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        userId,
        organizationId,
      },
      include: {
        workOrders: {
          select: {
            id: true,
            status: true,
          },
        },
        marketplaceProfile: {
          include: {
            services: {
              include: {
                serviceCatalog: true,
              },
            },
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor not found for user ID ${userId}`);
    }

    return vendor;
  }

  async approveVendor(id: string, organizationId: string, notes?: string) {
    // First check if vendor exists in organization OR public marketplace
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        OR: [
          { organizationId },
          { organizationId: 'public-marketplace' },
        ],
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Check if vendor already has a user account
    if (vendor.userId) {
      this.logger.warn(`Vendor ${id} already has a user account`);
      return this.prisma.vendor.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          approvalNotes: notes,
          approvedAt: new Date(),
          // Claim vendor for this organization if they were in public marketplace
          organizationId: vendor.organizationId === 'public-marketplace' ? organizationId : vendor.organizationId,
        },
      });
    }

    // Check if vendor has an email
    if (!vendor.email) {
      throw new NotFoundException('Vendor must have an email address to create a user account');
    }

    // Generate a temporary password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create user account and update vendor in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user account for vendor
      const user = await tx.user.create({
        data: {
          email: vendor.email!,
          passwordHash,
          firstName: vendor.contactName?.split(' ')[0] || vendor.companyName,
          lastName: vendor.contactName?.split(' ').slice(1).join(' ') || 'Vendor',
          phone: vendor.phone || '',
          role: UserRole.VENDOR,
          organizationId,
          emailVerified: false, // They'll need to verify email
          passwordChangedAt: new Date(),
        },
      });

      // Update vendor with user link and approval status
      const updatedVendor = await tx.vendor.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          approvalNotes: notes,
          approvedAt: new Date(),
          userId: user.id,
          // Claim vendor for this organization if they were in public marketplace
          organizationId: vendor.organizationId === 'public-marketplace' ? organizationId : vendor.organizationId,
        },
      });

      return { vendor: updatedVendor, user, tempPassword };
    });

    this.logger.log(`Created user account for vendor ${id}: ${result.user.email}`);

    // TODO: Send email with login credentials
    // await this.emailService.sendVendorApprovalEmail(
    //   result.user.email,
    //   result.user.firstName,
    //   result.tempPassword,
    //   baseUrl
    // );

    // SECURITY: Never log passwords. Email integration required before production launch.
    this.logger.warn(
      `Vendor account created for ${result.user.email} - email delivery not yet implemented. Manual credential reset required.`,
    );

    return result.vendor;
  }

  /**
   * Generate a temporary password
   */
  private generateTempPassword(): string {
    // Generate a random password that meets complexity requirements
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%^&*';

    const password = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      special[Math.floor(Math.random() * special.length)],
      special[Math.floor(Math.random() * special.length)],
    ];

    // Shuffle the password
    return password.sort(() => Math.random() - 0.5).join('');
  }

  async rejectVendor(
    id: string,
    organizationId: string,
    reason: string,
    notes?: string,
  ) {
    // First check if vendor exists in organization OR public marketplace
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        OR: [
          { organizationId },
          { organizationId: 'public-marketplace' },
        ],
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return this.prisma.vendor.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        approvalNotes: notes,
        approvedAt: new Date(),
        // approvedByUserId: userId, // TODO: Get from request context
      },
    });
  }
}
