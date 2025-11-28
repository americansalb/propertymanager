import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LeasesService } from './leases.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseType } from './dto/create-lease.dto';

// Mock data
const mockOrganizationId = 'org-123';
const mockLeaseId = 'lease-123';
const mockUnitId = 'unit-123';
const mockPropertyId = 'prop-123';
const mockUserId = 'user-123';

const mockProperty = {
  id: mockPropertyId,
  name: 'Test Property',
  organizationId: mockOrganizationId,
};

const mockUnit = {
  id: mockUnitId,
  propertyId: mockPropertyId,
  unitNumber: '101',
  status: 'VACANT',
  property: mockProperty,
  leases: [],
};

const mockTenant = {
  id: 'tenant-123',
  leaseId: mockLeaseId,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  isPrimary: true,
};

const mockLease = {
  id: mockLeaseId,
  unitId: mockUnitId,
  type: 'FIXED_TERM',
  status: 'DRAFT',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  monthlyRent: 1500,
  securityDeposit: 1500,
  terms: {},
  unit: {
    ...mockUnit,
    property: mockProperty,
  },
  tenants: [mockTenant],
  charges: [],
};

const mockActiveLease = {
  ...mockLease,
  status: 'ACTIVE',
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('LeasesService', () => {
  let service: LeasesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      lease: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      unit: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeasesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<LeasesService>(LeasesService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all leases for organization', async () => {
      prisma.lease.findMany.mockResolvedValue([mockLease]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([mockLease]);
      expect(prisma.lease.findMany).toHaveBeenCalledWith({
        where: {
          unit: {
            property: {
              organizationId: mockOrganizationId,
            },
          },
        },
        include: expect.any(Object),
        orderBy: { startDate: 'desc' },
      });
    });

    it('should return empty array when no leases exist', async () => {
      prisma.lease.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return lease when found', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);

      const result = await service.findOne(mockLeaseId, mockOrganizationId);

      expect(result).toEqual(mockLease);
    });

    it('should throw NotFoundException when lease not found', async () => {
      prisma.lease.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not return lease from different organization', async () => {
      prisma.lease.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockLeaseId, 'different-org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createLeaseDto = {
      unitId: mockUnitId,
      type: LeaseType.FIXED_TERM,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      monthlyRent: 1500,
      securityDeposit: 1500,
      tenants: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          isPrimary: true,
        },
      ],
    };

    it('should create lease when unit is available', async () => {
      prisma.unit.findFirst.mockResolvedValue({ ...mockUnit, leases: [] });
      prisma.lease.findMany.mockResolvedValue([]); // No overlapping leases
      prisma.lease.create.mockResolvedValue(mockLease);
      prisma.lease.findFirst.mockResolvedValue(mockLease);

      const result = await service.create(createLeaseDto, mockOrganizationId, mockUserId);

      expect(result).toBeDefined();
      expect(prisma.unit.findFirst).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'lease.created',
        }),
      );
    });

    it('should throw NotFoundException when unit not found', async () => {
      prisma.unit.findFirst.mockResolvedValue(null);

      await expect(service.create(createLeaseDto, mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when unit has active lease', async () => {
      prisma.unit.findFirst.mockResolvedValue({
        ...mockUnit,
        leases: [{ status: 'ACTIVE' }],
      });

      await expect(service.create(createLeaseDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      prisma.unit.findFirst.mockResolvedValue({ ...mockUnit, leases: [] });

      const invalidDto = {
        ...createLeaseDto,
        startDate: '2025-12-31',
        endDate: '2025-01-01',
      };

      await expect(service.create(invalidDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when fixed-term lease has no end date', async () => {
      prisma.unit.findFirst.mockResolvedValue({ ...mockUnit, leases: [] });

      const invalidDto = {
        ...createLeaseDto,
        type: LeaseType.FIXED_TERM,
        endDate: undefined,
      };

      await expect(service.create(invalidDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when multiple primary tenants', async () => {
      prisma.unit.findFirst.mockResolvedValue({ ...mockUnit, leases: [] });

      const invalidDto = {
        ...createLeaseDto,
        tenants: [
          { firstName: 'John', lastName: 'Doe', email: 'john@example.com', isPrimary: true },
          { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', isPrimary: true },
        ],
      };

      await expect(service.create(invalidDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should auto-assign first tenant as primary if none specified', async () => {
      prisma.unit.findFirst.mockResolvedValue({ ...mockUnit, leases: [] });
      prisma.lease.findMany.mockResolvedValue([]);
      prisma.lease.create.mockResolvedValue(mockLease);
      prisma.lease.findFirst.mockResolvedValue(mockLease);

      const dtoWithoutPrimary = {
        ...createLeaseDto,
        tenants: [
          { firstName: 'John', lastName: 'Doe', email: 'john@example.com', isPrimary: false },
        ],
      };

      await service.create(dtoWithoutPrimary, mockOrganizationId);

      // The first tenant should be made primary
      expect(dtoWithoutPrimary.tenants[0].isPrimary).toBe(true);
    });
  });

  describe('update', () => {
    const updateLeaseDto = {
      monthlyRent: 1600,
    };

    it('should update DRAFT lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.lease.update.mockResolvedValue({ ...mockLease, monthlyRent: 1600 });

      const result = await service.update(mockLeaseId, updateLeaseDto, mockOrganizationId);

      expect(result.monthlyRent).toBe(1600);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'lease.updated',
        }),
      );
    });

    it('should update ACTIVE lease with allowed fields', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockActiveLease);
      prisma.lease.update.mockResolvedValue({ ...mockActiveLease, monthlyRent: 1600 });

      const result = await service.update(mockLeaseId, updateLeaseDto, mockOrganizationId);

      expect(result.monthlyRent).toBe(1600);
    });

    it('should throw BadRequestException when updating restricted fields on ACTIVE lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockActiveLease);

      const restrictedDto = {
        startDate: '2025-02-01',
      };

      await expect(service.update(mockLeaseId, restrictedDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when updating TERMINATED lease', async () => {
      prisma.lease.findFirst.mockResolvedValue({ ...mockLease, status: 'TERMINATED' });

      await expect(service.update(mockLeaseId, updateLeaseDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when end date before start date', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);

      const invalidDto = {
        endDate: '2024-01-01', // Before the existing start date
      };

      await expect(service.update(mockLeaseId, invalidDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('activate', () => {
    it('should activate DRAFT lease with tenants', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.lease.update.mockResolvedValue({ ...mockLease, status: 'ACTIVE' });

      const result = await service.activate(mockLeaseId, mockOrganizationId, mockUserId);

      expect(result.status).toBe('ACTIVE');
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: mockUnitId },
        data: { status: 'OCCUPIED' },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'lease.activated',
        }),
      );
    });

    it('should throw BadRequestException when activating non-DRAFT lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockActiveLease);

      await expect(service.activate(mockLeaseId, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lease has no tenants', async () => {
      prisma.lease.findFirst.mockResolvedValue({ ...mockLease, tenants: [] });

      await expect(service.activate(mockLeaseId, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lease has no primary tenant', async () => {
      prisma.lease.findFirst.mockResolvedValue({
        ...mockLease,
        tenants: [{ ...mockTenant, isPrimary: false }],
      });

      await expect(service.activate(mockLeaseId, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('terminate', () => {
    const terminateDto = {
      reason: 'End of lease term',
      noticeDate: '2025-11-01',
      moveOutDate: '2025-12-31',
    };

    it('should terminate ACTIVE lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockActiveLease);
      prisma.lease.update.mockResolvedValue({ ...mockActiveLease, status: 'TERMINATED' });

      const result = await service.terminate(
        mockLeaseId,
        terminateDto,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe('TERMINATED');
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: mockUnitId },
        data: { status: 'NOTICE' },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'lease.terminated',
        }),
      );
    });

    it('should throw BadRequestException when terminating non-ACTIVE lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease); // DRAFT status

      await expect(
        service.terminate(mockLeaseId, terminateDto, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel DRAFT lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.lease.update.mockResolvedValue({ ...mockLease, status: 'CANCELLED' });

      const result = await service.cancel(mockLeaseId, mockOrganizationId, mockUserId);

      expect(result.status).toBe('CANCELLED');
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: mockUnitId },
        data: { status: 'VACANT' },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'lease.cancelled',
        }),
      );
    });

    it('should throw BadRequestException when cancelling non-DRAFT lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockActiveLease);

      await expect(service.cancel(mockLeaseId, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('renew', () => {
    const renewDto = {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRent: 1600,
    };

    it('should renew ACTIVE lease', async () => {
      prisma.lease.findFirst
        .mockResolvedValueOnce(mockActiveLease) // First call - find current lease
        .mockResolvedValueOnce(null) // Second call - check overlap
        .mockResolvedValueOnce({ ...mockLease, id: 'new-lease-123' }); // Third call - return new lease

      prisma.lease.update.mockResolvedValue({ ...mockActiveLease, status: 'EXPIRED' });
      prisma.lease.create.mockResolvedValue({ ...mockLease, id: 'new-lease-123' });
      prisma.lease.findMany.mockResolvedValue([]);

      const result = await service.renew(mockLeaseId, renewDto, mockOrganizationId, mockUserId);

      expect(result).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'lease.renewed',
        }),
      );
    });

    it('should renew EXPIRED lease', async () => {
      const expiredLease = { ...mockLease, status: 'EXPIRED' };
      prisma.lease.findFirst
        .mockResolvedValueOnce(expiredLease)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockLease, id: 'new-lease-123' });

      prisma.lease.update.mockResolvedValue(expiredLease);
      prisma.lease.create.mockResolvedValue({ ...mockLease, id: 'new-lease-123' });
      prisma.lease.findMany.mockResolvedValue([]);

      const result = await service.renew(mockLeaseId, renewDto, mockOrganizationId);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when renewing DRAFT lease', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease); // DRAFT status

      await expect(service.renew(mockLeaseId, renewDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when new end date before start date', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockActiveLease);

      const invalidDto = {
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      };

      await expect(service.renew(mockLeaseId, invalidDto, mockOrganizationId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('status transition validation', () => {
    it('DRAFT can transition to ACTIVE or CANCELLED', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.lease.update.mockResolvedValue({ ...mockLease, status: 'ACTIVE' });

      await expect(service.activate(mockLeaseId, mockOrganizationId)).resolves.toBeDefined();
    });

    it('ACTIVE can transition to TERMINATED', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockActiveLease);
      prisma.lease.update.mockResolvedValue({ ...mockActiveLease, status: 'TERMINATED' });

      await expect(
        service.terminate(mockLeaseId, { reason: 'Test' }, mockOrganizationId),
      ).resolves.toBeDefined();
    });

    it('TERMINATED cannot be updated', async () => {
      prisma.lease.findFirst.mockResolvedValue({ ...mockLease, status: 'TERMINATED' });

      await expect(
        service.update(mockLeaseId, { monthlyRent: 1700 }, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });

    it('CANCELLED cannot be updated', async () => {
      prisma.lease.findFirst.mockResolvedValue({ ...mockLease, status: 'CANCELLED' });

      await expect(
        service.update(mockLeaseId, { monthlyRent: 1700 }, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
