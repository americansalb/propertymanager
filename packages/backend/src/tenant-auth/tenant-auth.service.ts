import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantAuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async setupTestTenant(email: string, password: string, firstName: string, lastName: string) {
    // Find the demo admin's organization
    const adminUser = await this.prisma.user.findFirst({
      where: { email: 'admin@aalb.org' },
      select: { organizationId: true },
    });

    if (!adminUser?.organizationId) {
      throw new BadRequestException(
        'Demo admin account not found. Please set up the demo account first.',
      );
    }

    // Find first available unit in the demo organization
    const unit = await this.prisma.unit.findFirst({
      where: {
        property: {
          organizationId: adminUser.organizationId,
        },
      },
      include: {
        property: true,
      },
    });

    if (!unit) {
      throw new BadRequestException(
        'No units available in demo organization. Please create a property and unit first.',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if tenant already exists
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingTenant) {
      // Update existing tenant
      const updated = await this.prisma.tenant.update({
        where: { id: existingTenant.id },
        data: {
          firstName,
          lastName,
          portalEnabled: true,
          portalPassword: hashedPassword,
          unitId: unit.id,
          status: 'ACTIVE',
          invitationStatus: 'ACCEPTED',
        },
      });

      return {
        message: 'Existing tenant updated with portal access',
        tenant: {
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
        },
        unit: {
          id: unit.id,
          unitNumber: unit.unitNumber,
          property: unit.property.name,
        },
      };
    }

    // Create new tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: '555-000-0000',
        unitId: unit.id,
        status: 'ACTIVE',
        portalEnabled: true,
        portalPassword: hashedPassword,
        isPrimary: true,
        invitationStatus: 'ACCEPTED',
        moveInDate: new Date(),
      },
    });

    return {
      message: 'Test tenant created successfully',
      tenant: {
        id: tenant.id,
        email: tenant.email,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
      },
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        property: unit.property.name,
      },
    };
  }

  async login(email: string, password: string) {
    // Find tenant by email
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        email: email.toLowerCase(),
        portalEnabled: true,
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
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (tenant.lockedUntil && tenant.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((tenant.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account is locked. Please try again in ${minutesRemaining} minute(s).`,
      );
    }

    if (!tenant.portalPassword) {
      throw new UnauthorizedException(
        'Portal access not set up. Please contact your property manager.',
      );
    }

    // Check password
    const isValid = await bcrypt.compare(password, tenant.portalPassword);
    if (!isValid) {
      // Increment failed login attempts
      const newFailedAttempts = (tenant.failedLoginAttempts || 0) + 1;
      const shouldLock = newFailedAttempts >= this.MAX_FAILED_ATTEMPTS;

      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lastFailedLoginAt: new Date(),
          ...(shouldLock && {
            lockedUntil: new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000),
          }),
        },
      });

      if (shouldLock) {
        throw new UnauthorizedException(
          `Too many failed login attempts. Account locked for ${this.LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on successful login
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        lastPortalLogin: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      },
    });

    // Generate JWT token
    const payload = {
      sub: tenant.id,
      email: tenant.email,
      type: 'tenant',
    };
    const token = this.jwtService.sign(payload);

    // Get unit and property from direct assignment or lease
    const unit = tenant.unit || tenant.lease?.unit || null;
    const property = tenant.unit?.property || tenant.lease?.unit?.property || null;

    return {
      tenant: {
        id: tenant.id,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone,
        leaseId: tenant.leaseId,
        unitId: tenant.unitId || tenant.lease?.unitId || null,
        unit,
        property,
      },
      token,
    };
  }

  async requestPasswordReset(email: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        email: email.toLowerCase(),
        portalEnabled: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!tenant) {
      return { success: true };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    const tenantPortalUrl =
      this.configService.get<string>('FRONTEND_TENANT_URL') || 'http://localhost:3002';
    await this.emailService.sendPasswordResetEmail(
      tenant.email,
      `${tenant.firstName} ${tenant.lastName}`,
      resetToken,
      tenantPortalUrl,
    );

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        portalPassword: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { success: true };
  }

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
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

    // Get unit and property from direct assignment or lease
    const unit = tenant.unit || tenant.lease?.unit || null;
    const property = tenant.unit?.property || tenant.lease?.unit?.property || null;

    return {
      id: tenant.id,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone,
      emergencyContact: tenant.emergencyContact,
      emergencyPhone: tenant.emergencyPhone,
      status: tenant.status,
      moveInDate: tenant.moveInDate,
      moveOutDate: tenant.moveOutDate,
      leaseId: tenant.leaseId,
      unitId: tenant.unitId || tenant.lease?.unitId || null,
      unit,
      property,
      lease: tenant.lease
        ? {
            id: tenant.lease.id,
            startDate: tenant.lease.startDate,
            endDate: tenant.lease.endDate,
            monthlyRent: tenant.lease.monthlyRent,
            securityDeposit: tenant.lease.securityDeposit,
            status: tenant.lease.status,
          }
        : null,
    };
  }

  async updateProfile(
    tenantId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      emergencyContact?: string;
      emergencyPhone?: string;
    },
  ) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
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

    return {
      id: tenant.id,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone,
      emergencyContact: tenant.emergencyContact,
      emergencyPhone: tenant.emergencyPhone,
      leaseId: tenant.leaseId,
      unitId: tenant.lease?.unitId || null,
    };
  }

  async changePassword(tenantId: string, currentPassword: string, newPassword: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.portalPassword) {
      throw new NotFoundException('Tenant not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, tenant.portalPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { portalPassword: hashedPassword },
    });

    return { success: true };
  }

  async setupPortalAccess(tenantId: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        portalEnabled: true,
        portalPassword: hashedPassword,
      },
    });

    return { success: true };
  }

  async validateTenantToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'tenant') {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  async validateInvitation(token: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        invitationToken: token,
        invitationStatus: 'PENDING',
        invitationExpiresAt: {
          gt: new Date(),
        },
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
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Get property and unit from direct assignment or lease
    const propertyName = tenant.unit?.property?.name || tenant.lease?.unit?.property?.name || null;
    const unitNumber = tenant.unit?.unitNumber || tenant.lease?.unit?.unitNumber || null;

    return {
      valid: true,
      tenant: {
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        property: propertyName,
        unit: unitNumber,
      },
    };
  }

  async registerWithInvitation(token: string, password: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        invitationToken: token,
        invitationStatus: 'PENDING',
        invitationExpiresAt: {
          gt: new Date(),
        },
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
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update tenant - enable portal access and mark invitation as accepted
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        portalEnabled: true,
        portalPassword: hashedPassword,
        invitationStatus: 'ACCEPTED',
        invitationToken: null, // Clear the token so it can't be reused
      },
    });

    // Generate JWT token for automatic login
    const payload = {
      sub: tenant.id,
      email: tenant.email,
      type: 'tenant',
    };
    const jwtToken = this.jwtService.sign(payload);

    // Get unit and property from direct assignment or lease
    const unit = tenant.unit || tenant.lease?.unit || null;
    const property = tenant.unit?.property || tenant.lease?.unit?.property || null;

    return {
      message: 'Registration successful',
      tenant: {
        id: tenant.id,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone,
        leaseId: tenant.leaseId,
        unitId: tenant.unitId || tenant.lease?.unitId || null,
        unit,
        property,
      },
      token: jwtToken,
    };
  }
}
