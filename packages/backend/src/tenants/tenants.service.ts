import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async findAll(organizationId: string, filters?: { search?: string; status?: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      OR: [
        // Tenants with direct unit assignment
        {
          unit: {
            property: {
              organizationId,
            },
          },
        },
        // Tenants with lease (legacy support)
        {
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
        // Orphan tenants (no unit assigned yet, but linked to organization)
        {
          organizationId,
          unitId: null,
          leaseId: null,
        },
      ],
    };

    if (filters?.search) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
          ],
        },
      ];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      include: {
        unit: {
          include: {
            property: {
              select: { id: true, name: true },
            },
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone,
      emergencyContact: tenant.emergencyContact,
      emergencyPhone: tenant.emergencyPhone,
      portalEnabled: tenant.portalEnabled,
      isPrimary: tenant.isPrimary,
      status: tenant.status,
      invitationStatus: tenant.invitationStatus,
      invitationSentAt: tenant.invitationSentAt,
      moveInDate: tenant.moveInDate,
      moveOutDate: tenant.moveOutDate,
      // Direct unit assignment
      unit: tenant.unit
        ? {
            id: tenant.unit.id,
            unitNumber: tenant.unit.unitNumber,
            property: tenant.unit.property,
          }
        : tenant.lease?.unit
          ? {
              id: tenant.lease.unit.id,
              unitNumber: tenant.lease.unit.unitNumber,
              property: tenant.lease.unit.property,
            }
          : null,
      lease: tenant.lease
        ? {
            id: tenant.lease.id,
            status: tenant.lease.status,
            startDate: tenant.lease.startDate,
            endDate: tenant.lease.endDate,
            monthlyRent: tenant.lease.monthlyRent,
          }
        : null,
    }));
  }

  async create(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      unitId: string;
      moveInDate?: Date;
      sendInvite?: boolean;
    },
    organizationId: string,
    invitedByUserId: string,
  ) {
    // Check for duplicate email within the organization
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        email: data.email.toLowerCase().trim(),
        organizationId,
      },
    });

    if (existingTenant) {
      throw new BadRequestException(
        `A tenant with email "${data.email}" already exists in this organization`,
      );
    }

    // Verify unit belongs to organization
    const unit = await this.prisma.unit.findFirst({
      where: {
        id: data.unitId,
        property: {
          organizationId,
        },
      },
      include: {
        property: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Generate invitation token if sending invite
    const invitationToken = data.sendInvite ? randomBytes(32).toString('hex') : null;
    const invitationExpiresAt = data.sendInvite
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null;

    // Create tenant (normalize email to lowercase)
    const tenant = await this.prisma.tenant.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone,
        unitId: data.unitId,
        moveInDate: data.moveInDate || new Date(),
        status: 'ACTIVE',
        invitationStatus: data.sendInvite ? 'PENDING' : 'NOT_INVITED',
        invitationToken,
        invitationSentAt: data.sendInvite ? new Date() : null,
        invitationExpiresAt,
        invitedByUserId: data.sendInvite ? invitedByUserId : null,
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    // Send invitation email if requested
    if (data.sendInvite && invitationToken) {
      const tenantPortalUrl = this.configService.get<string>('FRONTEND_TENANT_URL') || '/tenant';
      await this.emailService.sendTenantInvitationEmail(
        tenant.email,
        `${tenant.firstName} ${tenant.lastName}`,
        unit.property.name,
        unit.unitNumber,
        invitationToken,
        tenantPortalUrl,
      );
    }

    return tenant;
  }

  async findOne(id: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id,
        OR: [
          {
            unit: {
              property: {
                organizationId,
              },
            },
          },
          {
            lease: {
              unit: {
                property: {
                  organizationId,
                },
              },
            },
          },
          // Orphan tenant with organization link
          {
            organizationId,
            unitId: null,
            leaseId: null,
          },
        ],
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            charges: {
              orderBy: { dueDate: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      emergencyContact?: string;
      emergencyPhone?: string;
      status?: string;
      moveOutDate?: Date;
    },
    organizationId: string,
  ) {
    // Verify tenant belongs to organization (via unit, lease, or direct org link)
    const existing = await this.prisma.tenant.findFirst({
      where: {
        id,
        OR: [
          {
            unit: {
              property: {
                organizationId,
              },
            },
          },
          {
            lease: {
              unit: {
                property: {
                  organizationId,
                },
              },
            },
          },
          // Orphan tenant with organization link
          {
            organizationId,
            unitId: null,
            leaseId: null,
          },
        ],
      },
    });

    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        status: data.status as 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT' | undefined,
        moveOutDate: data.moveOutDate,
      },
      include: {
        unit: {
          include: {
            property: {
              select: { id: true, name: true },
            },
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async getLeaseHistory(tenantEmail: string, organizationId: string) {
    // Find all tenants with this email across all leases in the organization
    const tenants = await this.prisma.tenant.findMany({
      where: {
        email: tenantEmail,
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
      },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        lease: {
          startDate: 'desc',
        },
      },
    });

    return tenants.map((t) => ({
      leaseId: t.lease?.id,
      status: t.lease?.status,
      startDate: t.lease?.startDate,
      endDate: t.lease?.endDate,
      monthlyRent: t.lease?.monthlyRent,
      property: t.lease?.unit?.property?.name,
      unit: t.lease?.unit?.unitNumber,
      isPrimary: t.isPrimary,
    }));
  }

  async enablePortalAccess(id: string, organizationId: string) {
    const tenant = await this.findOne(id, organizationId);

    return this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { portalEnabled: true },
    });
  }

  async disablePortalAccess(id: string, organizationId: string) {
    const tenant = await this.findOne(id, organizationId);

    return this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { portalEnabled: false },
    });
  }

  async getStats(organizationId: string) {
    const orgFilter = {
      OR: [
        {
          unit: {
            property: {
              organizationId,
            },
          },
        },
        {
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
        // Include orphan tenants with organization link
        {
          organizationId,
          unitId: null,
          leaseId: null,
        },
      ],
    };

    const [totalTenants, activeTenants, portalEnabled, pendingInvites] = await Promise.all([
      this.prisma.tenant.count({
        where: orgFilter,
      }),
      this.prisma.tenant.count({
        where: {
          ...orgFilter,
          status: 'ACTIVE',
        },
      }),
      this.prisma.tenant.count({
        where: {
          ...orgFilter,
          portalEnabled: true,
        },
      }),
      this.prisma.tenant.count({
        where: {
          ...orgFilter,
          invitationStatus: 'PENDING',
        },
      }),
    ]);

    return {
      totalTenants,
      activeTenants,
      portalEnabled,
      pendingInvites,
      portalAdoptionRate: totalTenants > 0 ? Math.round((portalEnabled / totalTenants) * 100) : 0,
    };
  }

  async sendInvitation(tenantId: string, organizationId: string, invitedByUserId: string) {
    // Verify tenant belongs to organization (via unit or lease)
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
        OR: [
          {
            unit: {
              property: {
                organizationId,
              },
            },
          },
          {
            lease: {
              unit: {
                property: {
                  organizationId,
                },
              },
            },
          },
        ],
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.portalEnabled) {
      throw new BadRequestException('Tenant already has portal access');
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update tenant with invitation
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        invitationStatus: 'PENDING',
        invitationToken,
        invitationSentAt: new Date(),
        invitationExpiresAt,
        invitedByUserId,
      },
    });

    // Get property and unit info from direct assignment or lease
    const propertyName =
      tenant.unit?.property?.name || tenant.lease?.unit?.property?.name || 'Your Property';
    const unitNumber = tenant.unit?.unitNumber || tenant.lease?.unit?.unitNumber || '';

    // Send invitation email
    const tenantPortalUrl = this.configService.get<string>('FRONTEND_TENANT_URL') || '/tenant';
    await this.emailService.sendTenantInvitationEmail(
      tenant.email,
      `${tenant.firstName} ${tenant.lastName}`,
      propertyName,
      unitNumber,
      invitationToken,
      tenantPortalUrl,
    );

    return {
      success: true,
      message: 'Invitation sent successfully',
      invitationSentAt: new Date(),
      invitationExpiresAt,
    };
  }

  async resendInvitation(tenantId: string, organizationId: string, invitedByUserId: string) {
    // Get tenant (via unit or lease)
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
        OR: [
          {
            unit: {
              property: {
                organizationId,
              },
            },
          },
          {
            lease: {
              unit: {
                property: {
                  organizationId,
                },
              },
            },
          },
        ],
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.portalEnabled) {
      throw new BadRequestException('Tenant already has portal access');
    }

    // Generate new invitation token
    const invitationToken = randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update tenant with new invitation
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        invitationStatus: 'PENDING',
        invitationToken,
        invitationSentAt: new Date(),
        invitationExpiresAt,
        invitedByUserId,
      },
    });

    // Get property and unit info from direct assignment or lease
    const propertyName =
      tenant.unit?.property?.name || tenant.lease?.unit?.property?.name || 'Your Property';
    const unitNumber = tenant.unit?.unitNumber || tenant.lease?.unit?.unitNumber || '';

    // Send invitation email
    const tenantPortalUrl = this.configService.get<string>('FRONTEND_TENANT_URL') || '/tenant';
    await this.emailService.sendTenantInvitationEmail(
      tenant.email,
      `${tenant.firstName} ${tenant.lastName}`,
      propertyName,
      unitNumber,
      invitationToken,
      tenantPortalUrl,
    );

    return {
      success: true,
      message: 'Invitation resent successfully',
      invitationSentAt: new Date(),
      invitationExpiresAt,
    };
  }

  async assignToUnit(tenantId: string, unitId: string, organizationId: string) {
    // Verify tenant belongs to organization
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
        OR: [
          {
            unit: {
              property: {
                organizationId,
              },
            },
          },
          {
            lease: {
              unit: {
                property: {
                  organizationId,
                },
              },
            },
          },
          // Orphan tenant with organization link
          {
            organizationId,
          },
        ],
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Verify unit belongs to organization
    const unit = await this.prisma.unit.findFirst({
      where: {
        id: unitId,
        property: {
          organizationId,
        },
      },
      include: {
        property: {
          select: { id: true, name: true },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Assign tenant to unit
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        unitId,
        // Clear the organization link since tenant is now linked via unit
        organizationId: null,
      },
      include: {
        unit: {
          include: {
            property: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      unit: {
        id: updated.unit!.id,
        unitNumber: updated.unit!.unitNumber,
        property: updated.unit!.property,
      },
    };
  }
}
