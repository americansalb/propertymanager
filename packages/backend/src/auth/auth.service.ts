import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  UserRole,
  type OrganizationType,
  SubscriptionPlan,
  type Prisma,
  AccountType,
  AccountSubType,
  type User,
  type Organization,
} from '@propertymaster/database';

// Security constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

// Password complexity requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const _PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// Local type definitions
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  avatarUrl: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName: string;
  organizationType: string;
}

// Type for user with organization relation (exported for use in strategies/controllers)
export type UserWithOrganization = User & { organization: Organization };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';
  }

  /**
   * Generate a cryptographically secure token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate password complexity
   */
  validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty123', 'letmein', 'welcome'];
    if (commonPasswords.some((p) => password.toLowerCase().includes(p))) {
      errors.push('Password is too common and easily guessable');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if account is locked
   */
  private isAccountLocked(user: { lockedUntil: Date | null }): boolean {
    if (!user.lockedUntil) return false;
    return new Date() < user.lockedUntil;
  }

  /**
   * Get remaining lockout time in minutes
   */
  private getRemainingLockoutMinutes(lockedUntil: Date): number {
    const remaining = lockedUntil.getTime() - Date.now();
    return Math.ceil(remaining / (60 * 1000));
  }

  /**
   * Record a failed login attempt
   */
  private async recordFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1;
    const data: Prisma.UserUpdateInput = {
      failedLoginAttempts: newAttempts,
      lastFailedLoginAt: new Date(),
    };

    // Lock account if max attempts exceeded
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      this.logger.warn(`Account locked due to ${newAttempts} failed login attempts: ${userId}`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Reset failed login attempts on successful login
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Validate user credentials (used by LocalStrategy)
   */
  async validateUser(email: string, password: string): Promise<UserWithOrganization> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      // Use constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, '$2a$12$dummyhashtopreventtimingattacks');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (this.isAccountLocked(user)) {
      const remainingMinutes = this.getRemainingLockoutMinutes(user.lockedUntil!);
      throw new UnauthorizedException(
        `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`,
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Record failed attempt
      await this.recordFailedLogin(user.id, user.failedLoginAttempts);

      const remainingAttempts = MAX_FAILED_ATTEMPTS - (user.failedLoginAttempts + 1);
      if (remainingAttempts > 0) {
        throw new UnauthorizedException(
          `Invalid credentials. ${remainingAttempts} attempt(s) remaining before account lockout.`,
        );
      } else {
        throw new UnauthorizedException(
          `Account locked due to too many failed login attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or deactivated');
    }

    // Reset failed attempts and update last login
    await this.resetFailedAttempts(user.id);

    return user;
  }

  /**
   * Login and generate JWT tokens
   */
  async login(user: UserWithOrganization): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Store refresh token for tracking
    await this.storeRefreshToken(user.id, refreshToken);

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
   * Store refresh token for tracking and revocation
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  }

  /**
   * Register new user and organization
   */
  async register(registerDto: RegisterRequest): Promise<LoginResponse> {
    // Validate password complexity
    const passwordValidation = this.validatePasswordComplexity(registerDto.password);
    if (!passwordValidation.valid) {
      throw new BadRequestException({
        message: 'Password does not meet complexity requirements',
        errors: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password with strong bcrypt
    const passwordHash = await bcrypt.hash(registerDto.password, BCRYPT_ROUNDS);

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

      // Generate email verification token
      const emailVerificationToken = this.generateToken();
      const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await tx.user.create({
        data: {
          email: registerDto.email.toLowerCase().trim(),
          passwordHash,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone,
          role: UserRole.ORGANIZATION_ADMIN,
          organizationId: organization.id,
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpiry,
          passwordChangedAt: new Date(),
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

    // Send verification email (non-blocking)
    const verificationToken = result.emailVerificationToken;
    if (verificationToken) {
      this.emailService
        .sendEmailVerificationEmail(result.email, result.firstName, verificationToken, this.baseUrl)
        .catch((error) => {
          this.logger.error(`Failed to send verification email: ${error.message}`);
        });
    }

    return this.login(result);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password complexity
    const passwordValidation = this.validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException({
        message: 'New password does not meet complexity requirements',
        errors: passwordValidation.errors,
      });
    }

    // Ensure new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Revoke all refresh tokens (force re-login on all devices)
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'password_change',
      },
    });

    this.logger.log(`Password changed for user: ${userId}`);

    return { success: true };
  }

  /**
   * Unlock a user account (admin function)
   */
  async unlockAccount(userId: string): Promise<{ success: boolean }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      },
    });

    this.logger.log(`Account unlocked: ${userId}`);

    return { success: true };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new verification email.',
      );
    }

    if (user.emailVerified) {
      return { success: true, message: 'Email already verified' };
    }

    // Mark email as verified and clear token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    this.logger.log(`Email verified for user: ${user.email}`);

    // Send welcome email (non-blocking)
    this.emailService
      .sendWelcomeEmail(user.email, user.firstName, `${this.baseUrl}/login`)
      .catch((error) => {
        this.logger.error(`Failed to send welcome email: ${error.message}`);
      });

    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = this.generateToken();
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpiry,
      },
    });

    // Send verification email
    await this.emailService.sendEmailVerificationEmail(
      user.email,
      user.firstName,
      emailVerificationToken,
      this.baseUrl,
    );

    this.logger.log(`Verification email resent to: ${user.email}`);

    return {
      success: true,
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify token
      const payload = this.jwtService.verify(refreshToken);

      // Check if token is revoked
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Token has been revoked');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Token has expired');
      }

      // Update token usage
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          lastUsedAt: new Date(),
          useCount: { increment: 1 },
        },
      });

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
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
        revokedReason: 'logout',
      },
    });

    return { success: true };
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices(userId: string): Promise<{ success: boolean }> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'logout_all_devices',
      },
    });

    this.logger.log(`User logged out from all devices: ${userId}`);

    return { success: true };
  }

  /**
   * Validate JWT payload
   */
  async validateJwtPayload(payload: JwtPayload): Promise<UserWithOrganization> {
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
   * Request password reset - send email with reset token
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Don't reveal if user exists - return success either way
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return { success: true };
    }

    // Generate reset token
    const resetToken = this.generateToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // Store hash of the token in emailVerificationToken field (or add passwordResetToken field)
        emailVerificationToken: resetTokenHash,
        emailVerificationExpiry: resetTokenExpiry,
      },
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken,
      this.baseUrl,
    );

    this.logger.log(`Password reset email sent to: ${user.email}`);

    return { success: true };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Password reset token has expired. Please request a new one.');
    }

    // Validate new password complexity
    const passwordValidation = this.validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException({
        message: 'New password does not meet complexity requirements',
        errors: passwordValidation.errors,
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'password_reset',
      },
    });

    this.logger.log(`Password reset completed for user: ${user.id}`);

    return { success: true };
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
      {
        accountNumber: '1000',
        name: 'Operating Cash',
        type: AccountType.ASSET,
        subType: AccountSubType.CASH,
      },
      {
        accountNumber: '1100',
        name: 'Trust Account Cash',
        type: AccountType.ASSET,
        subType: AccountSubType.CASH,
      },
      {
        accountNumber: '1200',
        name: 'Accounts Receivable',
        type: AccountType.ASSET,
        subType: AccountSubType.ACCOUNTS_RECEIVABLE,
      },
      {
        accountNumber: '1300',
        name: 'Security Deposits Held',
        type: AccountType.ASSET,
        subType: AccountSubType.SECURITY_DEPOSITS_HELD,
      },

      // Liabilities
      {
        accountNumber: '2000',
        name: 'Accounts Payable',
        type: AccountType.LIABILITY,
        subType: AccountSubType.ACCOUNTS_PAYABLE,
      },
      {
        accountNumber: '2100',
        name: 'Security Deposits Liability',
        type: AccountType.LIABILITY,
        subType: AccountSubType.SECURITY_DEPOSITS_LIABILITY,
      },

      // Equity
      {
        accountNumber: '3000',
        name: 'Owner Equity',
        type: AccountType.EQUITY,
        subType: AccountSubType.OWNER_EQUITY,
      },

      // Revenue
      {
        accountNumber: '4000',
        name: 'Rental Income',
        type: AccountType.REVENUE,
        subType: AccountSubType.RENTAL_INCOME,
      },
      {
        accountNumber: '4100',
        name: 'Late Fees',
        type: AccountType.REVENUE,
        subType: AccountSubType.LATE_FEES,
      },

      // Expenses
      {
        accountNumber: '5000',
        name: 'Maintenance & Repairs',
        type: AccountType.EXPENSE,
        subType: AccountSubType.MAINTENANCE,
      },
      {
        accountNumber: '5100',
        name: 'Utilities',
        type: AccountType.EXPENSE,
        subType: AccountSubType.UTILITIES,
      },
      {
        accountNumber: '5200',
        name: 'Insurance',
        type: AccountType.EXPENSE,
        subType: AccountSubType.INSURANCE,
      },
      {
        accountNumber: '5300',
        name: 'Property Tax',
        type: AccountType.EXPENSE,
        subType: AccountSubType.PROPERTY_TAX,
      },
    ];

    await tx.chartOfAccounts.createMany({
      data: defaultAccounts.map((account) => ({
        ...account,
        organizationId,
      })),
    });
  }
}
