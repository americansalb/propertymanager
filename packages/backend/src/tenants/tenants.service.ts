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
      lease: {
        unit: {
          property: {
            organizationId,
          },
        },
      },
    };

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    if (filters?.status) {
      where.lease = {
        ...where.lease,
        status: filters.status,
      };
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
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
      lease: tenant.lease
        ? {
            id: tenant.lease.id,
            status: tenant.lease.status,
            startDate: tenant.lease.startDate,
            endDate: tenant.lease.endDate,
            monthlyRent: tenant.lease.monthlyRent,
            unit: tenant.lease.unit
              ? {
                  id: tenant.lease.unit.id,
                  unitNumber: tenant.lease.unit.unitNumber,
                  property: tenant.lease.unit.property,
                }
              : null,
          }
        : null,
    }));
  }

  async findOne(id: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id,
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
    },
    organizationId: string,
  ) {
    // Verify tenant belongs to organization
    const existing = await this.prisma.tenant.findFirst({
      where: {
        id,
        lease: {
          unit: {
            property: {
              organizationId,
            },
          },
        },
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
    const [totalTenants, activeLeases, portalEnabled] = await Promise.all([
      this.prisma.tenant.count({
        where: {
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
      }),
      this.prisma.tenant.count({
        where: {
          lease: {
            status: 'ACTIVE',
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
      }),
      this.prisma.tenant.count({
        where: {
          portalEnabled: true,
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
      }),
    ]);

    return {
      totalTenants,
      activeLeases,
      portalEnabled,
      portalAdoptionRate: totalTenants > 0 ? Math.round((portalEnabled / totalTenants) * 100) : 0,
    };
  }

  async sendInvitation(tenantId: string, organizationId: string, invitedByUserId: string) {
    // Verify tenant belongs to organization
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
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

    // Send invitation email
    const tenantPortalUrl = this.configService.get<string>('FRONTEND_TENANT_URL') || '/tenant';
    await this.emailService.sendTenantInvitationEmail(
      tenant.email,
      `${tenant.firstName} ${tenant.lastName}`,
      tenant.lease?.unit?.property?.name || 'Your Property',
      tenant.lease?.unit?.unitNumber || '',
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
    // Get tenant
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
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

    // Send invitation email
    const tenantPortalUrl = this.configService.get<string>('FRONTEND_TENANT_URL') || '/tenant';
    await this.emailService.sendTenantInvitationEmail(
      tenant.email,
      `${tenant.firstName} ${tenant.lastName}`,
      tenant.lease?.unit?.property?.name || 'Your Property',
      tenant.lease?.unit?.unitNumber || '',
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
}
