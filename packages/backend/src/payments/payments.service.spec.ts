import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;
  let stripeService: StripeService;
  let logger: any;

  const mockTenant = {
    id: 'tenant-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-555-5555',
    leaseId: 'lease-456',
    autoPayEnabled: false,
    autoPayDay: null,
    lease: {
      id: 'lease-456',
      unitId: 'unit-789',
      unit: {
        id: 'unit-789',
        property: {
          id: 'prop-111',
          organizationId: 'org-222',
        },
      },
    },
  };

  const mockPayment = {
    id: 'payment-123',
    tenantId: 'tenant-123',
    amount: 1500,
    method: 'CHECK',
    status: 'COMPLETED',
    paymentDate: new Date(),
    stripePaymentIntentId: null,
    tenant: mockTenant,
    allocations: [],
  };

  const mockCharge = {
    id: 'charge-123',
    leaseId: 'lease-456',
    amount: 1500,
    amountPaid: 0,
    type: 'RENT',
    status: 'POSTED',
    dueDate: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            payment: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            tenant: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            charge: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            lease: {
              findFirst: jest.fn(),
            },
            paymentAllocation: {
              create: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: StripeService,
          useValue: {
            createPaymentIntent: jest.fn(),
            createRefund: jest.fn(),
            getOrCreateCustomer: jest.fn(),
            setDefaultPaymentMethod: jest.fn(),
            getDefaultPaymentMethod: jest.fn(),
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

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    stripeService = module.get<StripeService>(StripeService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all payments for an organization', async () => {
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([mockPayment as any]);

      const result = await service.findAll('org-222');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('payment-123');
    });

    it('should filter by tenantId when provided', async () => {
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([mockPayment as any]);

      await service.findAll('org-222', { tenantId: 'tenant-123' });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-123',
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([mockPayment as any]);

      await service.findAll('org-222', { status: 'COMPLETED' });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a payment by ID', async () => {
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(mockPayment as any);

      const result = await service.findOne('payment-123', 'org-222');

      expect(result.id).toBe('payment-123');
    });

    it('should throw NotFoundException when payment not found', async () => {
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-222')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recordPayment', () => {
    const recordPaymentDto = {
      tenantId: 'tenant-123',
      amount: 1500,
      method: 'CHECK' as const,
      paymentDate: new Date().toISOString(),
      checkNumber: '12345',
      memo: 'Rent payment',
    };

    it('should record a manual payment', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue(mockPayment as any);
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);
      jest.spyOn(prisma.paymentAllocation, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.charge, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(mockPayment as any);

      const result = await service.recordPayment(recordPaymentDto, 'org-222', 'user-333');

      expect(result.id).toBe('payment-123');
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant not found', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(null);

      await expect(
        service.recordPayment(recordPaymentDto, 'org-222', 'user-333'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log the payment record', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue(mockPayment as any);
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(mockPayment as any);

      await service.recordPayment(recordPaymentDto, 'org-222', 'user-333');

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'payment.recorded',
          paymentId: 'payment-123',
        }),
      );
    });

    it('should auto-allocate payment to charges when no allocations provided', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue(mockPayment as any);
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);
      jest.spyOn(prisma.paymentAllocation, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.charge, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(mockPayment as any);

      await service.recordPayment(recordPaymentDto, 'org-222', 'user-333');

      expect(prisma.paymentAllocation.create).toHaveBeenCalled();
    });
  });

  describe('createPaymentIntent', () => {
    const createPaymentIntentDto = {
      tenantId: 'tenant-123',
      amount: 1500,
      chargeIds: ['charge-123'],
    };

    it('should create a Stripe payment intent', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([mockCharge as any]);
      jest.spyOn(stripeService, 'createPaymentIntent').mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123',
      } as any);

      const result = await service.createPaymentIntent(
        createPaymentIntentDto,
        'org-222',
        'user-333',
      );

      expect(result.clientSecret).toBe('secret_123');
      expect(result.paymentIntentId).toBe('pi_123');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(null);

      await expect(
        service.createPaymentIntent(createPaymentIntentDto, 'org-222', 'user-333'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when charges not found', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(prisma.charge, 'findMany').mockResolvedValue([]); // No charges found

      await expect(
        service.createPaymentIntent(createPaymentIntentDto, 'org-222', 'user-333'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundPayment', () => {
    it('should refund a completed payment', async () => {
      const completedPayment = { ...mockPayment, status: 'COMPLETED' };
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(completedPayment as any);
      jest.spyOn(prisma.paymentAllocation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.payment, 'update').mockResolvedValue({
        ...completedPayment,
        status: 'REFUNDED',
      } as any);

      const result = await service.refundPayment(
        'payment-123',
        { amount: 1500 },
        'org-222',
        'user-333',
      );

      expect(prisma.payment.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-completed payment', async () => {
      const pendingPayment = { ...mockPayment, status: 'PENDING' };
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(pendingPayment as any);

      await expect(
        service.refundPayment('payment-123', {}, 'org-222', 'user-333'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund amount exceeds payment', async () => {
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(mockPayment as any);

      await expect(
        service.refundPayment('payment-123', { amount: 9999 }, 'org-222', 'user-333'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process Stripe refund for Stripe payments', async () => {
      const stripePayment = {
        ...mockPayment,
        stripePaymentIntentId: 'pi_123',
      };
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(stripePayment as any);
      jest.spyOn(stripeService, 'createRefund').mockResolvedValue({} as any);
      jest.spyOn(prisma.paymentAllocation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.payment, 'update').mockResolvedValue({
        ...stripePayment,
        status: 'REFUNDED',
      } as any);

      await service.refundPayment('payment-123', {}, 'org-222', 'user-333');

      expect(stripeService.createRefund).toHaveBeenCalledWith('pi_123', undefined, undefined);
    });
  });

  describe('voidPayment', () => {
    it('should void a pending payment', async () => {
      const pendingPayment = { ...mockPayment, status: 'PENDING' };
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(pendingPayment as any);
      jest.spyOn(prisma.payment, 'update').mockResolvedValue({
        ...pendingPayment,
        status: 'FAILED',
      } as any);

      const result = await service.voidPayment('payment-123', 'org-222', 'user-333');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        data: {
          status: 'FAILED',
          memo: 'Voided',
        },
      });
    });

    it('should throw BadRequestException for non-pending payment', async () => {
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(mockPayment as any); // COMPLETED status

      await expect(service.voidPayment('payment-123', 'org-222', 'user-333')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLeasePaymentHistory', () => {
    it('should return payment history for a lease', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue({ id: 'lease-456' } as any);
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([mockPayment as any]);

      const result = await service.getLeasePaymentHistory('lease-456', 'org-222');

      expect(result.leaseId).toBe('lease-456');
      expect(result.payments).toHaveLength(1);
      expect(result.summary.totalPaid).toBe(1500);
    });

    it('should throw NotFoundException when lease not found', async () => {
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(null);

      await expect(
        service.getLeasePaymentHistory('nonexistent', 'org-222'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPaymentMethodsSummary', () => {
    it('should return payment methods breakdown', async () => {
      const payments = [
        { method: 'CHECK', amount: 1500 },
        { method: 'CHECK', amount: 1500 },
        { method: 'ACH', amount: 1000 },
        { method: 'CREDIT_CARD', amount: 500 },
      ];
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue(payments as any);

      const result = await service.getPaymentMethodsSummary('org-222');

      expect(result.CHECK.count).toBe(2);
      expect(result.CHECK.total).toBe(3000);
      expect(result.ACH.count).toBe(1);
      expect(result.ACH.total).toBe(1000);
    });

    it('should filter by date range when provided', async () => {
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getPaymentMethodsSummary('org-222', startDate, endDate);

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paymentDate: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });
  });

  describe('getOrCreateStripeCustomer', () => {
    it('should return Stripe customer for tenant', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(stripeService, 'getOrCreateCustomer').mockResolvedValue({
        id: 'cus_123',
        email: 'john@example.com',
      } as any);

      const result = await service.getOrCreateStripeCustomer('tenant-123', 'org-222');

      expect(result.id).toBe('cus_123');
      expect(stripeService.getOrCreateCustomer).toHaveBeenCalledWith(
        'tenant-123',
        'john@example.com',
        'John Doe',
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(null);

      await expect(
        service.getOrCreateStripeCustomer('nonexistent', 'org-222'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('enableAutoPay', () => {
    it('should enable auto-pay for tenant', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(stripeService, 'getOrCreateCustomer').mockResolvedValue({
        id: 'cus_123',
      } as any);
      jest.spyOn(stripeService, 'setDefaultPaymentMethod').mockResolvedValue({} as any);
      jest.spyOn(prisma.tenant, 'update').mockResolvedValue({
        ...mockTenant,
        autoPayEnabled: true,
        autoPayDay: 1,
      } as any);

      const result = await service.enableAutoPay(
        'tenant-123',
        'pm_123',
        1,
        'org-222',
      );

      expect(result.enabled).toBe(true);
      expect(result.dayOfMonth).toBe(1);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(null);

      await expect(
        service.enableAutoPay('nonexistent', 'pm_123', 1, 'org-222'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('disableAutoPay', () => {
    it('should disable auto-pay for tenant', async () => {
      const tenantWithAutoPay = { ...mockTenant, autoPayEnabled: true, autoPayDay: 1 };
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(tenantWithAutoPay as any);
      jest.spyOn(prisma.tenant, 'update').mockResolvedValue({
        ...mockTenant,
        autoPayEnabled: false,
        autoPayDay: null,
      } as any);

      const result = await service.disableAutoPay('tenant-123', 'org-222');

      expect(result.enabled).toBe(false);
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: {
          autoPayEnabled: false,
          autoPayDay: null,
        },
      });
    });
  });

  describe('getAutoPayStatus', () => {
    it('should return auto-pay status', async () => {
      const tenantWithAutoPay = { autoPayEnabled: true, autoPayDay: 5 };
      jest.spyOn(prisma.tenant, 'findFirst').mockResolvedValue(tenantWithAutoPay as any);
      jest.spyOn(stripeService, 'getOrCreateCustomer').mockResolvedValue({
        id: 'cus_123',
      } as any);
      jest.spyOn(stripeService, 'getDefaultPaymentMethod').mockResolvedValue({
        id: 'pm_123',
        type: 'card',
        card: { last4: '4242', brand: 'visa' },
      } as any);

      const result = await service.getAutoPayStatus('tenant-123', 'org-222');

      expect(result.enabled).toBe(true);
      expect(result.dayOfMonth).toBe(5);
      expect(result.defaultPaymentMethod).toBeDefined();
    });
  });
});
