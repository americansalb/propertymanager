import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateLeaseDto, LeaseType } from './dto/create-lease.dto';
import {
  type UpdateLeaseDto,
  type TerminateLeaseDto,
  type RenewLeaseDto,
  type AddTenantDto,
} from './dto/update-lease.dto';

@Injectable()
export class LeasesService {
  constructor(
    private prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Find all leases for an organization
   */
  async findAll(organizationId: string) {
    return this.prisma.lease.findMany({
      where: {
        unit: {
          property: {
            organizationId,
          },
        },
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        tenants: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Find a single lease by ID
   */
  async findOne(id: string, organizationId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: {
        id,
        unit: {
          property: {
            organizationId,
          },
        },
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        tenants: true,
        charges: true,
      },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    return lease;
  }

  /**
   * Create a new lease with tenants
   */
  async create(dto: CreateLeaseDto, organizationId: string, userId?: string) {
    // 1. Verify unit exists and belongs to organization
    const unit = await this.prisma.unit.findFirst({
      where: {
        id: dto.unitId,
        property: {
          organizationId,
        },
      },
      include: {
        property: true,
        leases: {
          where: {
            status: {
              in: ['DRAFT', 'ACTIVE'],
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found or does not belong to your organization');
    }

    // 2. Check if unit already has an active lease
    const hasActiveLease = unit.leases.some((lease) => lease.status === 'ACTIVE');
    if (hasActiveLease) {
      throw new BadRequestException(
        `Unit ${unit.unitNumber} already has an active lease. Terminate the existing lease first.`,
      );
    }

    // 3. Validate lease dates
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('Lease end date must be after start date');
    }

    if (dto.type === LeaseType.FIXED_TERM && !endDate) {
      throw new BadRequestException('Fixed-term leases require an end date');
    }

    // 4. Check for date overlap with existing leases on same unit
    await this.checkLeaseOverlap(dto.unitId, startDate, endDate, null);

    // 5. Validate tenants - ensure exactly one primary tenant
    const primaryTenants = dto.tenants.filter((t) => t.isPrimary);
    if (primaryTenants.length === 0) {
      // If no primary specified, make the first tenant primary
      dto.tenants[0].isPrimary = true;
    } else if (primaryTenants.length > 1) {
      throw new BadRequestException('Exactly one tenant must be marked as primary');
    }

    // 6. Create lease with tenants in a transaction
    const lease = await this.prisma.$transaction(async (tx) => {
      // Create the lease
      const newLease = await tx.lease.create({
        data: {
          unitId: dto.unitId,
          type: dto.type,
          status: 'DRAFT',
          startDate,
          endDate,
          moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
          monthlyRent: dto.monthlyRent,
          securityDeposit: dto.securityDeposit,
          terms: dto.terms || {},
          documentUrl: dto.documentUrl,
        },
      });

      // Create tenants
      for (const tenantDto of dto.tenants) {
        await tx.tenant.create({
          data: {
            leaseId: newLease.id,
            firstName: tenantDto.firstName,
            lastName: tenantDto.lastName,
            email: tenantDto.email,
            phone: tenantDto.phone,
            isPrimary: tenantDto.isPrimary || false,
            emergencyContactName: tenantDto.emergencyContactName,
            emergencyContactPhone: tenantDto.emergencyContactPhone,
          },
        });
      }

      // Update unit status to VACANT_RENTED (rented but not moved in yet)
      await tx.unit.update({
        where: { id: dto.unitId },
        data: { status: 'VACANT_RENTED' },
      });

      return newLease;
    });

    this.logger.log({
      message: 'lease.created',
      leaseId: lease.id,
      unitId: dto.unitId,
      organizationId,
      userId,
    });

    // Return the lease with all relations
    return this.findOne(lease.id, organizationId);
  }

  /**
   * Update a lease (only DRAFT or ACTIVE leases can be updated)
   */
  async update(id: string, dto: UpdateLeaseDto, organizationId: string, userId?: string) {
    const lease = await this.findOne(id, organizationId);

    // Only DRAFT leases can be fully edited
    if (lease.status !== 'DRAFT' && lease.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot update a lease with status ${lease.status}. Only DRAFT or ACTIVE leases can be modified.`,
      );
    }

    // For ACTIVE leases, restrict what can be changed
    if (lease.status === 'ACTIVE') {
      const restrictedFields = ['startDate', 'type'];
      const attemptedRestrictedChanges = restrictedFields.filter(
        (field) => dto[field as keyof UpdateLeaseDto] !== undefined,
      );
      if (attemptedRestrictedChanges.length > 0) {
        throw new BadRequestException(
          `Cannot modify ${attemptedRestrictedChanges.join(', ')} on an ACTIVE lease`,
        );
      }
    }

    // Validate dates if being updated
    const startDate = dto.startDate ? new Date(dto.startDate) : lease.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : lease.endDate;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('Lease end date must be after start date');
    }

    // Check for overlap if dates changed
    if (dto.startDate || dto.endDate) {
      await this.checkLeaseOverlap(lease.unitId, startDate, endDate, id);
    }

    const updated = await this.prisma.lease.update({
      where: { id },
      data: {
        type: dto.type,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : undefined,
        monthlyRent: dto.monthlyRent,
        securityDeposit: dto.securityDeposit,
        terms: dto.terms,
        documentUrl: dto.documentUrl,
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        tenants: true,
      },
    });

    this.logger.log({
      message: 'lease.updated',
      leaseId: id,
      organizationId,
      userId,
      updatedFields: Object.keys(dto),
    });

    return updated;
  }

  /**
   * Activate a DRAFT lease
   */
  async activate(id: string, organizationId: string, userId?: string) {
    const lease = await this.findOne(id, organizationId);

    if (lease.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot activate a lease with status ${lease.status}. Only DRAFT leases can be activated.`,
      );
    }

    // Verify the lease has at least one tenant
    if (lease.tenants.length === 0) {
      throw new BadRequestException('Cannot activate a lease without tenants');
    }

    // Verify there's a primary tenant
    const hasPrimary = lease.tenants.some((t) => t.isPrimary);
    if (!hasPrimary) {
      throw new BadRequestException('Cannot activate a lease without a primary tenant');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update lease status
      const activatedLease = await tx.lease.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          moveInDate: lease.moveInDate || new Date(),
        },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenants: true,
        },
      });

      // Update unit status to OCCUPIED
      await tx.unit.update({
        where: { id: lease.unitId },
        data: { status: 'OCCUPIED' },
      });

      return activatedLease;
    });

    this.logger.log({
      message: 'lease.activated',
      leaseId: id,
      unitId: lease.unitId,
      organizationId,
      userId,
    });

    return updated;
  }

  /**
   * Terminate an ACTIVE lease
   */
  async terminate(id: string, dto: TerminateLeaseDto, organizationId: string, userId?: string) {
    const lease = await this.findOne(id, organizationId);

    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot terminate a lease with status ${lease.status}. Only ACTIVE leases can be terminated.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update lease status
      const terminatedLease = await tx.lease.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          noticeDate: dto.noticeDate ? new Date(dto.noticeDate) : new Date(),
          moveOutDate: dto.moveOutDate ? new Date(dto.moveOutDate) : null,
          terms: {
            ...(lease.terms as object),
            terminationReason: dto.reason,
            terminatedAt: new Date().toISOString(),
            terminatedBy: userId,
          },
        },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenants: true,
        },
      });

      // Update unit status to NOTICE (tenant is leaving)
      await tx.unit.update({
        where: { id: lease.unitId },
        data: { status: 'NOTICE' },
      });

      return terminatedLease;
    });

    this.logger.log({
      message: 'lease.terminated',
      leaseId: id,
      unitId: lease.unitId,
      reason: dto.reason,
      organizationId,
      userId,
    });

    return updated;
  }

  /**
   * Cancel a DRAFT lease
   */
  async cancel(id: string, organizationId: string, userId?: string) {
    const lease = await this.findOne(id, organizationId);

    if (lease.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot cancel a lease with status ${lease.status}. Only DRAFT leases can be cancelled.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelledLease = await tx.lease.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenants: true,
        },
      });

      // Revert unit status to VACANT
      await tx.unit.update({
        where: { id: lease.unitId },
        data: { status: 'VACANT' },
      });

      return cancelledLease;
    });

    this.logger.log({
      message: 'lease.cancelled',
      leaseId: id,
      unitId: lease.unitId,
      organizationId,
      userId,
    });

    return updated;
  }

  /**
   * Renew a lease - creates a new lease based on the current one
   */
  async renew(id: string, dto: RenewLeaseDto, organizationId: string, userId?: string) {
    const currentLease = await this.findOne(id, organizationId);

    if (currentLease.status !== 'ACTIVE' && currentLease.status !== 'EXPIRED') {
      throw new BadRequestException(
        `Cannot renew a lease with status ${currentLease.status}. Only ACTIVE or EXPIRED leases can be renewed.`,
      );
    }

    // Calculate new dates
    const newStartDate = dto.startDate
      ? new Date(dto.startDate)
      : currentLease.endDate
        ? new Date(currentLease.endDate.getTime() + 24 * 60 * 60 * 1000) // Day after current end
        : new Date();

    const newEndDate = dto.endDate ? new Date(dto.endDate) : null;

    if (newEndDate && newEndDate <= newStartDate) {
      throw new BadRequestException('New lease end date must be after start date');
    }

    // Check for overlap
    await this.checkLeaseOverlap(currentLease.unitId, newStartDate, newEndDate, null);

    const newLease = await this.prisma.$transaction(async (tx) => {
      // Mark current lease as expired
      await tx.lease.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });

      // Create new lease
      const renewedLease = await tx.lease.create({
        data: {
          unitId: currentLease.unitId,
          type: dto.type || currentLease.type,
          status: 'DRAFT',
          startDate: newStartDate,
          endDate: newEndDate,
          monthlyRent: dto.monthlyRent ?? Number(currentLease.monthlyRent),
          securityDeposit: Number(currentLease.securityDeposit),
          terms: {
            ...(currentLease.terms as object),
            renewedFrom: id,
            renewedAt: new Date().toISOString(),
          },
        },
      });

      // Copy tenants to new lease
      for (const tenant of currentLease.tenants) {
        await tx.tenant.create({
          data: {
            leaseId: renewedLease.id,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            email: tenant.email,
            phone: tenant.phone,
            isPrimary: tenant.isPrimary,
            emergencyContactName: tenant.emergencyContactName,
            emergencyContactPhone: tenant.emergencyContactPhone,
          },
        });
      }

      return renewedLease;
    });

    this.logger.log({
      message: 'lease.renewed',
      oldLeaseId: id,
      newLeaseId: newLease.id,
      unitId: currentLease.unitId,
      organizationId,
      userId,
    });

    return this.findOne(newLease.id, organizationId);
  }

  /**
   * Add a tenant to an existing lease
   */
  async addTenant(leaseId: string, dto: AddTenantDto, organizationId: string, userId?: string) {
    const lease = await this.findOne(leaseId, organizationId);

    if (lease.status !== 'DRAFT' && lease.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot add tenants to a lease with status ${lease.status}`);
    }

    // If this tenant is marked as primary, unset other primaries
    if (dto.isPrimary) {
      await this.prisma.tenant.updateMany({
        where: { leaseId },
        data: { isPrimary: false },
      });
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        leaseId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        isPrimary: dto.isPrimary || false,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
      },
    });

    this.logger.log({
      message: 'lease.tenant_added',
      leaseId,
      tenantId: tenant.id,
      organizationId,
      userId,
    });

    return this.findOne(leaseId, organizationId);
  }

  /**
   * Remove a tenant from a lease
   */
  async removeTenant(leaseId: string, tenantId: string, organizationId: string, userId?: string) {
    const lease = await this.findOne(leaseId, organizationId);

    if (lease.status !== 'DRAFT' && lease.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot remove tenants from a lease with status ${lease.status}`,
      );
    }

    const tenant = lease.tenants.find((t) => t.id === tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found on this lease`);
    }

    if (tenant.isPrimary) {
      throw new BadRequestException(
        'Cannot remove the primary tenant. Set another tenant as primary first.',
      );
    }

    // Ensure at least one tenant remains
    if (lease.tenants.length <= 1) {
      throw new BadRequestException('Cannot remove the last tenant from a lease');
    }

    await this.prisma.tenant.delete({
      where: { id: tenantId },
    });

    this.logger.log({
      message: 'lease.tenant_removed',
      leaseId,
      tenantId,
      organizationId,
      userId,
    });

    return this.findOne(leaseId, organizationId);
  }

  /**
   * Set a tenant as the primary tenant
   */
  async setPrimaryTenant(
    leaseId: string,
    tenantId: string,
    organizationId: string,
    userId?: string,
  ) {
    const lease = await this.findOne(leaseId, organizationId);

    const tenant = lease.tenants.find((t) => t.id === tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found on this lease`);
    }

    await this.prisma.$transaction([
      // Unset all primaries
      this.prisma.tenant.updateMany({
        where: { leaseId },
        data: { isPrimary: false },
      }),
      // Set new primary
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isPrimary: true },
      }),
    ]);

    this.logger.log({
      message: 'lease.primary_tenant_changed',
      leaseId,
      tenantId,
      organizationId,
      userId,
    });

    return this.findOne(leaseId, organizationId);
  }

  /**
   * Delete a DRAFT or CANCELLED lease
   */
  async delete(id: string, organizationId: string, userId?: string) {
    const lease = await this.findOne(id, organizationId);

    if (lease.status !== 'DRAFT' && lease.status !== 'CANCELLED') {
      throw new BadRequestException(
        `Cannot delete a lease with status ${lease.status}. Only DRAFT or CANCELLED leases can be deleted.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete tenants first (cascade should handle this, but being explicit)
      await tx.tenant.deleteMany({
        where: { leaseId: id },
      });

      // Delete the lease
      await tx.lease.delete({
        where: { id },
      });

      // If unit was VACANT_RENTED, revert to VACANT
      if (lease.unit.status === 'VACANT_RENTED') {
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { status: 'VACANT' },
        });
      }
    });

    this.logger.log({
      message: 'lease.deleted',
      leaseId: id,
      unitId: lease.unitId,
      organizationId,
      userId,
    });

    return { success: true, message: 'Lease deleted successfully' };
  }

  /**
   * Check for lease date overlap on a unit
   */
  private async checkLeaseOverlap(
    unitId: string,
    startDate: Date,
    endDate: Date | null,
    excludeLeaseId: string | null,
  ) {
    // Find any overlapping leases
    const overlappingLeases = await this.prisma.lease.findMany({
      where: {
        unitId,
        id: excludeLeaseId ? { not: excludeLeaseId } : undefined,
        status: { in: ['DRAFT', 'ACTIVE'] },
        OR: [
          // New lease starts during existing lease
          {
            startDate: { lte: startDate },
            OR: [{ endDate: { gte: startDate } }, { endDate: null }],
          },
          // New lease ends during existing lease
          ...(endDate
            ? [
                {
                  startDate: { lte: endDate },
                  OR: [{ endDate: { gte: endDate } }, { endDate: null }],
                },
              ]
            : []),
          // New lease completely contains existing lease
          {
            startDate: { gte: startDate },
            ...(endDate ? { startDate: { lte: endDate } } : {}),
          },
        ],
      },
    });

    if (overlappingLeases.length > 0) {
      throw new BadRequestException(
        `Lease dates overlap with existing lease(s). Cannot have multiple active leases for the same unit during the same period.`,
      );
    }
  }
}
