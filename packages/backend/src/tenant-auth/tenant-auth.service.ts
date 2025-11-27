import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // Find tenant by email
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        email: email.toLowerCase(),
        portalEnabled: true,
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
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!tenant.portalPassword) {
      throw new UnauthorizedException('Portal access not set up. Please contact your property manager.');
    }

    // Check password
    const isValid = await bcrypt.compare(password, tenant.portalPassword);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { lastPortalLogin: new Date() },
    });

    // Generate JWT token
    const payload = {
      sub: tenant.id,
      email: tenant.email,
      type: 'tenant',
    };
    const token = this.jwtService.sign(payload);

    return {
      tenant: {
        id: tenant.id,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone,
        leaseId: tenant.leaseId,
        unitId: tenant.lease?.unitId || null,
        unit: tenant.lease?.unit || null,
        property: tenant.lease?.unit?.property || null,
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

    // TODO: Send email with reset link
    // For now, just log the token (in production, send email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

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
      unit: tenant.lease?.unit || null,
      property: tenant.lease?.unit?.property || null,
      lease: tenant.lease ? {
        id: tenant.lease.id,
        startDate: tenant.lease.startDate,
        endDate: tenant.lease.endDate,
        monthlyRent: tenant.lease.monthlyRent,
        securityDeposit: tenant.lease.securityDeposit,
        status: tenant.lease.status,
      } : null,
    };
  }

  async updateProfile(tenantId: string, data: { firstName?: string; lastName?: string; phone?: string; emergencyContact?: string; emergencyPhone?: string }) {
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
}
