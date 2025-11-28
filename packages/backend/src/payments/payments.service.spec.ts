import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { PaymentStatus } from '../financial/dto/payment.dto';

// Mock data
const mockOrganizationId = 'org-123';
const mockTenantId = 'tenant-123';
const mockPaymentId = 'payment-123';
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
  id: 'lease-123',
  unitId: mockUnit.id,
  status: 'ACTIVE',
  unit: mockUnit,
};

const mockTenant = {
  id: mockTenantId,
  leaseId: mockLease.id,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  isPrimary: true,
  lease: mockLease,
};

const mockCharge = {
  id: mockChargeId,
  leaseId: mockLease.id,
  type: 'RENT',
  amount: 1500,
  amountPaid: 0,
  status: 'POSTED',
  dueDate: new Date('2025-01-01'),
};

const mockPayment = {
  id: mockPaymentId,
  tenantId: mockTenantId,
  method: 'CHECK',
  status: 'COMPLETED',
  amount: 1500,
  paymentDate: new Date('2025-01-01'),
  reference: 'CHK-12345',
  tenant: {
    ...mockTenant,
    lease: {
      ...mockLease,
      unit: mockUnit,
    },
  },
  allocations: [
    {
      id: 'alloc-123',
      paymentId: mockPaymentId,
      chargeId: mockChargeId,
      amount: 1500,
      charge: mockCharge,
    },
  ],
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockStripeService = {
  createPaymentIntent: jest.fn(),
  confirmPaymentIntent: jest.fn(),
  createRefund: jest.fn(),
  getOrCreateCustomer: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: jest.Mocked<PrismaService>;
  let stripeService: jest.Mocked<StripeService>;

  beforeEach(async () => {
    const mockPrismaService = {
      payment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findFirst: jest.fn(),
      },
      charge: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      paymentAllocation: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get(PrismaService);
    stripeService = module.get(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all payments for organization', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([mockPayment]);
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: {
          tenant: {
            lease: {
              unit: {
                property: {
                  organizationId: mockOrganizationId,
                },
              },
            },
          },
        },
        include: expect.any(Object),
        orderBy: { paymentDate: 'desc' },
      });
    });

    it('should filter by tenantId when provided', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment]);

      await service.findAll(mockOrganizationId, { tenantId: mockTenantId });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment]);

      await service.findAll(mockOrganizationId, { status: 'COMPLETED' });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      );
    });

    it('should filter by leaseId when provided', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment]);

      await service.findAll(mockOrganizationId, { leaseId: mockLease.id });

      expect(prisma.payment.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no payments exist', async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return payment when found', async () => {
      prisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.findOne(mockPaymentId, mockOrganizationId);

      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not return payment from different organization', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockPaymentId, 'different-org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recordPayment', () => {
    const recordPaymentDto = {
      tenantId: mockTenantId,
      method: 'CHECK' as const,
      amount: 1500,
      paymentDate: '2025-01-01',
      reference: 'CHK-12345',
      chargeIds: [mockChargeId],
    };

    it('should record payment when tenant exists', async () => {
      prisma.tenant.findFirst.mockResolvedValue(mockTenant);
      prisma.payment.create.mockResolvedValue(mockPayment);
      prisma.charge.findMany.mockResolvedValue([mockCharge]);
      prisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.recordPayment(recordPaymentDto, mockOrganizationId, mockUserId);

      expect(result).toBeDefined();
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'payment.recorded',
        }),
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(service.recordPayment(recordPaymentDto, mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant belongs to different organization', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(service.recordPayment(recordPaymentDto, 'different-org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('payment methods', () => {
    const baseDto = {
      tenantId: mockTenantId,
      amount: 1500,
      paymentDate: '2025-01-01',
      chargeIds: [mockChargeId],
    };

    it('should record CHECK payment', async () => {
      prisma.tenant.findFirst.mockResolvedValue(mockTenant);
      prisma.payment.create.mockResolvedValue({ ...mockPayment, method: 'CHECK' });
      prisma.charge.findMany.mockResolvedValue([mockCharge]);
      prisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.recordPayment(
        { ...baseDto, method: 'CHECK', reference: 'CHK-123' },
        mockOrganizationId,
      );

      expect(result).toBeDefined();
    });

    it('should record CASH payment', async () => {
      prisma.tenant.findFirst.mockResolvedValue(mockTenant);
      prisma.payment.create.mockResolvedValue({ ...mockPayment, method: 'CASH' });
      prisma.charge.findMany.mockResolvedValue([mockCharge]);
      prisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.recordPayment(
        { ...baseDto, method: 'CASH' },
        mockOrganizationId,
      );

      expect(result).toBeDefined();
    });

    it('should record MONEY_ORDER payment', async () => {
      prisma.tenant.findFirst.mockResolvedValue(mockTenant);
      prisma.payment.create.mockResolvedValue({ ...mockPayment, method: 'MONEY_ORDER' });
      prisma.charge.findMany.mockResolvedValue([mockCharge]);
      prisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.recordPayment(
        { ...baseDto, method: 'MONEY_ORDER', reference: 'MO-123' },
        mockOrganizationId,
      );

      expect(result).toBeDefined();
    });
  });

  describe('organization isolation', () => {
    it('should not find payments from other organizations', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockPaymentId, 'other-org')).rejects.toThrow(NotFoundException);
    });

    it('should filter findAll by organization', async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      await service.findAll('other-org');

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant: {
              lease: {
                unit: {
                  property: {
                    organizationId: 'other-org',
                  },
                },
              },
            },
          }),
        }),
      );
    });

    it('should not allow recording payment for tenant in other organization', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPayment(
          {
            tenantId: mockTenantId,
            method: 'CHECK',
            amount: 1500,
            paymentDate: '2025-01-01',
            chargeIds: [mockChargeId],
          },
          'other-org',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('payment status', () => {
    it('should create payment with COMPLETED status for manual payments', async () => {
      prisma.tenant.findFirst.mockResolvedValue(mockTenant);
      prisma.payment.create.mockResolvedValue(mockPayment);
      prisma.charge.findMany.mockResolvedValue([mockCharge]);
      prisma.payment.findFirst.mockResolvedValue(mockPayment);

      await service.recordPayment(
        {
          tenantId: mockTenantId,
          method: 'CHECK',
          amount: 1500,
          paymentDate: '2025-01-01',
          chargeIds: [mockChargeId],
        },
        mockOrganizationId,
      );

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.COMPLETED,
          }),
        }),
      );
    });
  });
});
