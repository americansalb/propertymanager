import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let logger: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ORGANIZATION_ADMIN',
    organizationId: 'org-456',
    isActive: true,
    emailVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    avatarUrl: null,
    organization: {
      id: 'org-456',
      name: 'Test Org',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganization = {
    id: 'org-456',
    name: 'Test Org',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            organization: {
              create: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              updateMany: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn(prisma)),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '7d',
                FRONTEND_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.validateUser('notfound@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes from now
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(lockedUser as any);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(inactiveUser as any);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment failed login attempts on wrong password', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.validateUser('test@example.com', 'wrongpassword');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 1,
        }),
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      const userWithAttempts = { ...mockUser, failedLoginAttempts: 4 };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithAttempts as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.validateUser('test@example.com', 'wrongpassword');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('should reset failed attempts on successful login', async () => {
      const userWithAttempts = { ...mockUser, failedLoginAttempts: 3 };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithAttempts as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.validateUser('test@example.com', 'correctpassword');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
        },
      });
    });
  });

  describe('login', () => {
    it('should return tokens and user data on successful login', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('test-token');
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      const result = await service.login(mockUser as any);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should log successful login', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('test-token');
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      await service.login(mockUser as any);

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'auth.login_success',
          userId: mockUser.id,
        }),
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      organizationName: 'New Org',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'SecurePass123!',
    };

    it('should create organization and user on successful registration', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.organization, 'create').mockResolvedValue(mockOrganization as any);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({
        ...mockUser,
        email: 'jane@example.com',
        firstName: 'Jane',
        organization: mockOrganization,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('test-token');
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for weak password', async () => {
      const weakPasswordDto = { ...registerDto, password: 'weak' };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.register(weakPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should hash password before storing', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.organization, 'create').mockResolvedValue(mockOrganization as any);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({
        ...mockUser,
        organization: mockOrganization,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('test-token');
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });
  });

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      const mockRefreshToken = {
        id: 'refresh-123',
        token: 'valid-refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
        revoked: false,
        user: mockUser,
      };

      jest.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue(mockRefreshToken as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('new-access-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jest.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const expiredToken = {
        id: 'refresh-123',
        token: 'expired-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 1000), // Expired
        revoked: false,
        user: mockUser,
      };

      jest.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue(expiredToken as any);

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 1 });

      await service.logout('refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'refresh-token' },
        data: { revoked: true },
      });
    });
  });

  describe('logoutAllDevices', () => {
    it('should revoke all refresh tokens for user', async () => {
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 5 });

      await service.logoutAllDevices('user-123');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revoked: false },
        data: { revoked: true },
      });
    });

    it('should log logout all devices', async () => {
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 5 });

      await service.logoutAllDevices('user-123');

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'auth.logout_all_devices',
          userId: 'user-123',
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 1 });

      await service.changePassword('user-123', 'currentPassword', 'NewSecure123!');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: 'newHashedPassword' },
      });
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', 'wrongPassword', 'NewSecure123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke all refresh tokens after password change', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 1 });

      await service.changePassword('user-123', 'currentPassword', 'NewSecure123!');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { revoked: true },
      });
    });
  });

  describe('validatePasswordComplexity', () => {
    it('should return valid for strong password', () => {
      const result = service.validatePasswordComplexity('SecurePass123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for weak password', () => {
      const result = service.validatePasswordComplexity('weak');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject common passwords', () => {
      const result = service.validatePasswordComplexity('Password123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should require minimum length', () => {
      const result = service.validatePasswordComplexity('Aa1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should require uppercase letter', () => {
      const result = service.validatePasswordComplexity('lowercase123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = service.validatePasswordComplexity('UPPERCASE123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = service.validatePasswordComplexity('SecurePass!!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = service.validatePasswordComplexity('SecurePass123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('unlockAccount', () => {
    it('should unlock a locked account', async () => {
      const lockedUser = {
        ...mockUser,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 1000 * 60 * 15),
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(lockedUser as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      await service.unlockAccount('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });
});
