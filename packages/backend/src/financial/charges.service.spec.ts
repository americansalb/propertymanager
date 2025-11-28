import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChargesService } from './charges.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock data
const mockOrganizationId = 'org-123';
const mockLeaseId = 'lease-123';
const mockChargeId = 'charge-123';
const mockUserId = 'user-123';

const mockProperty = {
  id: 'prop-123',
  name: 'Test Property',
  organizationId: mockOrganizationId,
};

const mockUnit = {
  id: 'unit-123',
  propertyId: mockProperty.id,
  unitNumber: '101',
  property: mockProperty,
};

const mockLease = {
  id: mockLeaseId,
  unitId: mockUnit.id,
  status: 'ACTIVE',
  monthlyRent: 1500,
  unit: mockUnit,
  tenants: [{ id: 'tenant-123', firstName: 'John', lastName: 'Doe', isPrimary: true }],
};

const mockCharge = {
  id: mockChargeId,
  leaseId: mockLeaseId,
  type: 'RENT',
  amount: 1500,
  amountPaid: 0,
  description: 'Monthly Rent - January 2025',
  dueDate: new Date('2025-01-01'),
  postDate: new Date('2025-01-01'),
  status: 'POSTED',
  isRecurring: false,
  lease: mockLease,
  payments: [],
};

const mockPendingCharge = {
  ...mockCharge,
  id: 'charge-pending',
  status: 'PENDING',
  postDate: null,
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('ChargesService', () => {
  let service: ChargesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      charge: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      lease: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChargesService,
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

    service = module.get<ChargesService>(ChargesService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all charges for organization', async () => {
      prisma.charge.findMany.mockResolvedValue([mockCharge]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([mockCharge]);
      expect(prisma.charge.findMany).toHaveBeenCalledWith({
        where: {
          lease: {
            unit: {
              property: {
                organizationId: mockOrganizationId,
              },
            },
          },
        },
        include: expect.any(Object),
        orderBy: { dueDate: 'desc' },
      });
    });

    it('should filter by leaseId when provided', async () => {
      prisma.charge.findMany.mockResolvedValue([mockCharge]);

      await service.findAll(mockOrganizationId, { leaseId: mockLeaseId });

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leaseId: mockLeaseId,
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      prisma.charge.findMany.mockResolvedValue([mockCharge]);

      await service.findAll(mockOrganizationId, { status: 'POSTED' });

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'POSTED',
          }),
        }),
      );
    });

    it('should return empty array when no charges exist', async () => {
      prisma.charge.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return charge when found', async () => {
      prisma.charge.findFirst.mockResolvedValue(mockCharge);

      const result = await service.findOne(mockChargeId, mockOrganizationId);

      expect(result).toEqual(mockCharge);
    });

    it('should throw NotFoundException when charge not found', async () => {
      prisma.charge.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not return charge from different organization', async () => {
      prisma.charge.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockChargeId, 'different-org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createChargeDto = {
      leaseId: mockLeaseId,
      type: 'RENT' as const,
      amount: 1500,
      description: 'Monthly Rent - February 2025',
      dueDate: '2025-02-01',
    };

    it('should create charge when lease exists', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockResolvedValue(mockCharge);

      const result = await service.create(createChargeDto, mockOrganizationId, mockUserId);

      expect(result).toBeDefined();
      expect(prisma.charge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leaseId: mockLeaseId,
          type: 'RENT',
          amount: 1500,
          status: 'PENDING', // No postDate provided
        }),
        include: expect.any(Object),
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'charge.created',
        }),
      );
    });

    it('should create POSTED charge when postDate provided', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockResolvedValue(mockCharge);

      const dtoWithPostDate = {
        ...createChargeDto,
        postDate: '2025-02-01',
      };

      await service.create(dtoWithPostDate, mockOrganizationId);

      expect(prisma.charge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'POSTED',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when lease not found', async () => {
      prisma.lease.findFirst.mockResolvedValue(null);

      await expect(service.create(createChargeDto, mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.charge.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when lease belongs to different organization', async () => {
      prisma.lease.findFirst.mockResolvedValue(null);

      await expect(service.create(createChargeDto, 'different-org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateChargeDto = {
      amount: 1600,
      description: 'Updated Monthly Rent',
    };

    it('should update PENDING charge', async () => {
      prisma.charge.findFirst.mockResolvedValue(mockPendingCharge);
      prisma.charge.update.mockResolvedValue({ ...mockPendingCharge, ...updateChargeDto });

      const result = await service.update(
        mockPendingCharge.id,
        updateChargeDto,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.amount).toBe(1600);
      expect(prisma.charge.update).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'charge.updated',
        }),
      );
    });

    it('should throw BadRequestException when updating POSTED charge', async () => {
      prisma.charge.findFirst.mockResolvedValue(mockCharge); // POSTED status

      await expect(
        service.update(mockChargeId, updateChargeDto, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.charge.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when updating PAID charge', async () => {
      prisma.charge.findFirst.mockResolvedValue({ ...mockCharge, status: 'PAID' });

      await expect(
        service.update(mockChargeId, updateChargeDto, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when charge not found', async () => {
      prisma.charge.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateChargeDto, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('charge status flow', () => {
    it('should have correct initial status based on postDate', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockImplementation(async ({ data }) => ({
        ...mockCharge,
        status: data.status,
      }));

      // Without postDate -> PENDING
      await service.create(
        {
          leaseId: mockLeaseId,
          type: 'RENT',
          amount: 1500,
          description: 'Test',
          dueDate: '2025-02-01',
        },
        mockOrganizationId,
      );

      expect(prisma.charge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      );

      // With postDate -> POSTED
      await service.create(
        {
          leaseId: mockLeaseId,
          type: 'RENT',
          amount: 1500,
          description: 'Test',
          dueDate: '2025-02-01',
          postDate: '2025-02-01',
        },
        mockOrganizationId,
      );

      expect(prisma.charge.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'POSTED',
          }),
        }),
      );
    });
  });

  describe('charge types', () => {
    it('should create RENT charge', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockResolvedValue({ ...mockCharge, type: 'RENT' });

      const result = await service.create(
        {
          leaseId: mockLeaseId,
          type: 'RENT',
          amount: 1500,
          description: 'Monthly Rent',
          dueDate: '2025-02-01',
        },
        mockOrganizationId,
      );

      expect(result.type).toBe('RENT');
    });

    it('should create LATE_FEE charge', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockResolvedValue({ ...mockCharge, type: 'LATE_FEE' });

      const result = await service.create(
        {
          leaseId: mockLeaseId,
          type: 'LATE_FEE',
          amount: 50,
          description: 'Late Fee',
          dueDate: '2025-02-01',
        },
        mockOrganizationId,
      );

      expect(result.type).toBe('LATE_FEE');
    });

    it('should create UTILITY charge', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockResolvedValue({ ...mockCharge, type: 'UTILITY' });

      const result = await service.create(
        {
          leaseId: mockLeaseId,
          type: 'UTILITY',
          amount: 100,
          description: 'Water Utility',
          dueDate: '2025-02-01',
        },
        mockOrganizationId,
      );

      expect(result.type).toBe('UTILITY');
    });
  });

  describe('recurring charges', () => {
    it('should create recurring charge', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockResolvedValue({ ...mockCharge, isRecurring: true });

      const result = await service.create(
        {
          leaseId: mockLeaseId,
          type: 'RENT',
          amount: 1500,
          description: 'Monthly Rent',
          dueDate: '2025-02-01',
          isRecurring: true,
        },
        mockOrganizationId,
      );

      expect(result.isRecurring).toBe(true);
    });

    it('should default isRecurring to false', async () => {
      prisma.lease.findFirst.mockResolvedValue(mockLease);
      prisma.charge.create.mockResolvedValue(mockCharge);

      await service.create(
        {
          leaseId: mockLeaseId,
          type: 'RENT',
          amount: 1500,
          description: 'Monthly Rent',
          dueDate: '2025-02-01',
        },
        mockOrganizationId,
      );

      expect(prisma.charge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isRecurring: false,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('organization isolation', () => {
    it('should not find charges from other organizations', async () => {
      prisma.charge.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockChargeId, 'other-org')).rejects.toThrow(NotFoundException);
    });

    it('should filter findAll by organization', async () => {
      prisma.charge.findMany.mockResolvedValue([]);

      await service.findAll('other-org');

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lease: {
              unit: {
                property: {
                  organizationId: 'other-org',
                },
              },
            },
          }),
        }),
      );
    });
  });
});
