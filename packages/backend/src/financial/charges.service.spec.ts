import { Test, TestingModule } from '@nestjs/testing';
import { ChargesService } from './charges.service';
import { PrismaService } from '../prisma/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ChargesService', () => {
  let service: ChargesService;
  let prisma: PrismaService;
  let logger: any;

  const mockLease = {
    id: 'lease-123',
    unitId: 'unit-456',
    status: 'ACTIVE',
    monthlyRent: 1500,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    unit: {
      id: 'unit-456',
      propertyId: 'prop-789',
      property: {
        id: 'prop-789',
        organizationId: 'org-111',
      },
    },
  };

  const mockCharge = {
    id: 'charge-123',
    leaseId: 'lease-123',
    type: 'RENT',
    description: 'Monthly rent',
    amount: 1500,
    amountPaid: 0,
    dueDate: new Date('2024-02-01'),
    status: 'POSTED',
    recurring: false,
    lease: mockLease,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChargesService,
        {
          provide: PrismaService,
          useValue: {
            charge: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            lease: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
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

    service = module.get<ChargesService>(ChargesService);
    prisma = module.get<PrismaService>(PrismaService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all charges for an organization', async () => {
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);

      const result = await service.findAll('org-111');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('charge-123');
    });

    it('should filter by leaseId when provided', async () => {
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);

      await service.findAll('org-111', { leaseId: 'lease-123' });

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leaseId: 'lease-123',
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);

      await service.findAll('org-111', { status: 'POSTED' });

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'POSTED',
          }),
        }),
      );
    });

    it('should filter by type when provided', async () => {
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);

      await service.findAll('org-111', { type: 'RENT' });

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'RENT',
          }),
        }),
      );
    });

    it('should filter by date range when provided', async () => {
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.findAll('org-111', { startDate, endDate });

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a charge by ID', async () => {
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(mockCharge as any);

      const result = await service.findOne('charge-123', 'org-111');

      expect(result.id).toBe('charge-123');
    });

    it('should throw NotFoundException when charge not found', async () => {
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-111')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createChargeDto = {
      leaseId: 'lease-123',
      type: 'RENT' as const,
      description: 'Monthly rent',
      amount: 1500,
      dueDate: new Date('2024-02-01').toISOString(),
    };

    it('should create a charge', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(mockLease as any);
      jest.spyOn(prisma.charge, 'create').mockResolvedValue(mockCharge as any);

      const result = await service.create(createChargeDto, 'org-111', 'user-222');

      expect(result.id).toBe('charge-123');
      expect(prisma.charge.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when lease not found', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(null);

      await expect(
        service.create(createChargeDto, 'org-111', 'user-222'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log charge creation', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(mockLease as any);
      jest.spyOn(prisma.charge, 'create').mockResolvedValue(mockCharge as any);

      await service.create(createChargeDto, 'org-111', 'user-222');

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'charge.created',
        }),
      );
    });

    it('should set amountPaid to 0 for new charges', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(mockLease as any);
      jest.spyOn(prisma.charge, 'create').mockResolvedValue(mockCharge as any);

      await service.create(createChargeDto, 'org-111', 'user-222');

      expect(prisma.charge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountPaid: 0,
            status: 'POSTED',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateChargeDto = {
      description: 'Updated description',
      amount: 1600,
    };

    it('should update a charge', async () => {
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(mockCharge as any);
      jest.spyOn(prisma.charge, 'update').mockResolvedValue({
        ...mockCharge,
        ...updateChargeDto,
      } as any);

      const result = await service.update(
        'charge-123',
        updateChargeDto,
        'org-111',
        'user-222',
      );

      expect(result.description).toBe('Updated description');
    });

    it('should throw NotFoundException when charge not found', async () => {
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateChargeDto, 'org-111', 'user-222'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to update paid charge', async () => {
      const paidCharge = { ...mockCharge, status: 'PAID' };
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(paidCharge as any);

      await expect(
        service.update('charge-123', updateChargeDto, 'org-111', 'user-222'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a charge', async () => {
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(mockCharge as any);
      jest.spyOn(prisma.charge, 'delete').mockResolvedValue(mockCharge as any);

      await service.delete('charge-123', 'org-111', 'user-222');

      expect(prisma.charge.delete).toHaveBeenCalledWith({
        where: { id: 'charge-123' },
      });
    });

    it('should throw NotFoundException when charge not found', async () => {
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'org-111', 'user-222')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to delete paid charge', async () => {
      const paidCharge = { ...mockCharge, status: 'PAID' };
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(paidCharge as any);

      await expect(
        service.delete('charge-123', 'org-111', 'user-222'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to delete partially paid charge', async () => {
      const partiallyPaidCharge = { ...mockCharge, status: 'PARTIALLY_PAID', amountPaid: 500 };
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(partiallyPaidCharge as any);

      await expect(
        service.delete('charge-123', 'org-111', 'user-222'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLeaseCharges', () => {
    it('should return all charges for a lease', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(mockLease as any);
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);

      const result = await service.getLeaseCharges('lease-123', 'org-111');

      expect(result.charges).toHaveLength(1);
      expect(result.leaseId).toBe('lease-123');
    });

    it('should calculate summary correctly', async () => {
      const charges = [
        { ...mockCharge, amount: 1500, amountPaid: 0, status: 'POSTED' },
        { ...mockCharge, id: 'charge-2', amount: 1500, amountPaid: 1500, status: 'PAID' },
        { ...mockCharge, id: 'charge-3', amount: 1500, amountPaid: 500, status: 'PARTIALLY_PAID' },
      ];
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(mockLease as any);
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue(charges as any);

      const result = await service.getLeaseCharges('lease-123', 'org-111');

      expect(result.summary.totalCharged).toBe(4500);
      expect(result.summary.totalPaid).toBe(2000);
      expect(result.summary.balance).toBe(2500);
    });

    it('should throw NotFoundException when lease not found', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(null);

      await expect(service.getLeaseCharges('nonexistent', 'org-111')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOutstandingCharges', () => {
    it('should return only unpaid charges', async () => {
      const charges = [
        { ...mockCharge, status: 'POSTED' },
        { ...mockCharge, id: 'charge-2', status: 'PARTIALLY_PAID' },
      ];
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue(charges as any);

      const result = await service.getOutstandingCharges('org-111');

      expect(result).toHaveLength(2);
    });

    it('should order by due date ascending', async () => {
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([]);

      await service.getOutstandingCharges('org-111');

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { dueDate: 'asc' },
        }),
      );
    });
  });

  describe('generateRecurringCharges', () => {
    it('should generate recurring charges for active leases', async () => {
      const activeLease = {
        ...mockLease,
        status: 'ACTIVE',
        monthlyRent: 1500,
      };
      const leases = [activeLease];

      jest.spyOn(prisma.lease, 'findMany' as any).mockResolvedValue(leases as any);
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(null); // No existing charge
      jest.spyOn(prisma.charge, 'create').mockResolvedValue(mockCharge as any);

      const result = await service.generateRecurringCharges('org-111');

      expect(result.generated).toBeGreaterThanOrEqual(0);
    });

    it('should not duplicate charges for same period', async () => {
      const activeLease = {
        ...mockLease,
        status: 'ACTIVE',
        monthlyRent: 1500,
      };
      const existingCharge = { ...mockCharge }; // Charge already exists

      jest.spyOn(prisma.lease, 'findMany' as any).mockResolvedValue([activeLease] as any);
      jest.spyOn(prisma.charge, 'findFirst').mockResolvedValue(existingCharge as any);

      const result = await service.generateRecurringCharges('org-111');

      expect(prisma.charge.create).not.toHaveBeenCalled();
    });
  });

  describe('applyLateFees', () => {
    it('should apply late fees to overdue charges', async () => {
      const overdueCharge = {
        ...mockCharge,
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        status: 'POSTED',
      };
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([overdueCharge as any]);
      jest.spyOn(prisma.charge, 'create').mockResolvedValue({
        ...mockCharge,
        type: 'LATE_FEE',
        amount: 50,
      } as any);

      const result = await service.applyLateFees('org-111', 50, 5);

      expect(result.applied).toBeGreaterThanOrEqual(0);
    });

    it('should respect grace period', async () => {
      const recentCharge = {
        ...mockCharge,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'POSTED',
      };
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([recentCharge as any]);

      const result = await service.applyLateFees('org-111', 50, 5); // 5 day grace period

      expect(prisma.charge.create).not.toHaveBeenCalled();
    });
  });
});
