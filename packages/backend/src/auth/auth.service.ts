import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, LoginResponse, AuthUser, RegisterRequest } from '@propertymaster/shared';
import { UserRole, OrganizationType, SubscriptionPlan, Prisma } from '@propertymaster/database';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials (used by LocalStrategy)
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or deactivated');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  /**
   * Login and generate JWT tokens
   */
  async login(user: any): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      avatarUrl: user.avatarUrl,
    };

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  /**
   * Register new user and organization
   */
  async register(registerDto: RegisterRequest): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create organization and user in a transaction
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: registerDto.organizationName,
          slug: this.generateSlug(registerDto.organizationName),
          type: registerDto.organizationType as OrganizationType,
          plan: SubscriptionPlan.TRIAL,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          passwordHash,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone,
          role: UserRole.ORGANIZATION_ADMIN,
          organizationId: organization.id,
          emailVerified: false,
        },
        include: {
          organization: true,
        },
      });

      // Create default Chart of Accounts
      await this.createDefaultChartOfAccounts(tx, organization.id);

      return user;
    });

    this.logger.log(`New organization registered: ${result.organization.name}`);

    return this.login(result);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
      };

      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate JWT payload
   */
  async validateJwtPayload(payload: JwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  /**
   * Generate URL-friendly slug from organization name
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Add random suffix to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 7);
    return `${baseSlug}-${suffix}`;
  }

  /**
   * Create default Chart of Accounts for new organization
   */
  private async createDefaultChartOfAccounts(tx: Prisma.TransactionClient, organizationId: string) {
    const defaultAccounts = [
      // Assets
      { accountNumber: '1000', name: 'Operating Cash', type: 'ASSET', subType: 'CASH' },
      { accountNumber: '1100', name: 'Trust Account Cash', type: 'ASSET', subType: 'CASH' },
      { accountNumber: '1200', name: 'Accounts Receivable', type: 'ASSET', subType: 'ACCOUNTS_RECEIVABLE' },
      { accountNumber: '1300', name: 'Security Deposits Held', type: 'ASSET', subType: 'SECURITY_DEPOSITS_HELD' },

      // Liabilities
      { accountNumber: '2000', name: 'Accounts Payable', type: 'LIABILITY', subType: 'ACCOUNTS_PAYABLE' },
      { accountNumber: '2100', name: 'Security Deposits Liability', type: 'LIABILITY', subType: 'SECURITY_DEPOSITS_LIABILITY' },

      // Equity
      { accountNumber: '3000', name: 'Owner Equity', type: 'EQUITY', subType: 'OWNER_EQUITY' },

      // Revenue
      { accountNumber: '4000', name: 'Rental Income', type: 'REVENUE', subType: 'RENTAL_INCOME' },
      { accountNumber: '4100', name: 'Late Fees', type: 'REVENUE', subType: 'LATE_FEES' },

      // Expenses
      { accountNumber: '5000', name: 'Maintenance & Repairs', type: 'EXPENSE', subType: 'MAINTENANCE' },
      { accountNumber: '5100', name: 'Utilities', type: 'EXPENSE', subType: 'UTILITIES' },
      { accountNumber: '5200', name: 'Insurance', type: 'EXPENSE', subType: 'INSURANCE' },
      { accountNumber: '5300', name: 'Property Tax', type: 'EXPENSE', subType: 'PROPERTY_TAX' },
    ];

    await tx.chartOfAccounts.createMany({
      data: defaultAccounts.map((account) => ({
        ...account,
        organizationId,
      })),
    });
  }
}
