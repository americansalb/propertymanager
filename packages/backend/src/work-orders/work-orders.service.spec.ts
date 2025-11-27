import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { NotFoundException, BadRequestException, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WorkOrderType, WorkOrderPriority, WorkOrderStatus } from './dto/create-work-order.dto';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let prisma: PrismaService;
  let eventsService: EventsService;
  let logger: LoggerService;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';

  const mockProperty = {
    id: 'prop-123',
    organizationId: mockOrganizationId,
    name: 'Test Property',
    address1: '123 Main St',
    city: 'Test City',
    state: 'TS',
  };

  const mockUnit = {
    id: 'unit-123',
    propertyId: 'prop-123',
    unitNumber: '101',
  };

  const mockVendor = {
    id: 'vendor-123',
    organizationId: mockOrganizationId,
    companyName: 'Test Vendor Co',
  };

  const mockUser = {
    id: 'user-789',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  const mockWorkOrder = {
    id: 'wo-123',
    organizationId: mockOrganizationId,
    title: 'Fix Leaky Faucet',
    description: 'Kitchen faucet is dripping',
    type: 'MAINTENANCE',
    priority: 'MEDIUM',
    status: 'SUBMITTED',
    propertyId: 'prop-123',
    unitId: 'unit-123',
    vendorId: null,
    assignedToId: null,
    estimatedCost: 100,
    actualCost: null,
    requestedDate: new Date(),
    completedDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    unit: mockUnit,
    vendor: null,
    assignedTo: null,
    attachments: [],
    statusHistory: [],
    completionNotes: null,
    _count: { statusHistory: 0 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        {
          provide: PrismaService,
          useValue: {
            workOrder: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              groupBy: jest.fn(),
            },
            property: {
              findFirst: jest.fn(),
            },
            unit: {
              findFirst: jest.fn(),
            },
            vendor: {
              findFirst: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            workOrderStatusHistory: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            workOrderAttachment: {
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: {
            track: jest.fn(),
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

    service = module.get<WorkOrdersService>(WorkOrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    eventsService = module.get<EventsService>(EventsService);
    logger = module.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated work orders', async () => {
      const mockWorkOrders = [mockWorkOrder];
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue(mockWorkOrders as any);
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(1);

      const result = await service.findAll(mockOrganizationId, {});

      expect(result.data).toEqual(mockWorkOrders);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should apply status filter', async () => {
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(0);

      await service.findAll(mockOrganizationId, { status: WorkOrderStatus.SUBMITTED });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            status: WorkOrderStatus.SUBMITTED,
          }),
        }),
      );
    });

    it('should apply priority filter', async () => {
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(0);

      await service.findAll(mockOrganizationId, { priority: WorkOrderPriority.HIGH });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: WorkOrderPriority.HIGH,
          }),
        }),
      );
    });

    it('should apply type filter', async () => {
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(0);

      await service.findAll(mockOrganizationId, { type: WorkOrderType.EMERGENCY });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: WorkOrderType.EMERGENCY,
          }),
        }),
      );
    });

    it('should apply propertyId filter', async () => {
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(0);

      await service.findAll(mockOrganizationId, { propertyId: 'prop-123' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            propertyId: 'prop-123',
          }),
        }),
      );
    });

    it('should apply vendorId filter', async () => {
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(0);

      await service.findAll(mockOrganizationId, { vendorId: 'vendor-123' });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vendorId: 'vendor-123',
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(50);

      const result = await service.findAll(mockOrganizationId, { page: 3, limit: 10 });

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.meta.totalPages).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return a work order by ID', async () => {
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(mockWorkOrder as any);

      const result = await service.findOne('wo-123', mockOrganizationId);

      expect(result).toEqual(mockWorkOrder);
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-123', organizationId: mockOrganizationId },
        }),
      );
    });

    it('should throw NotFoundException when work order not found', async () => {
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne('wo-999', mockOrganizationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      title: 'Fix Leaky Faucet',
      description: 'Kitchen faucet is dripping',
      type: WorkOrderType.MAINTENANCE,
      priority: WorkOrderPriority.MEDIUM,
      propertyId: 'prop-123',
    };

    it('should create a work order successfully', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.workOrder, 'create').mockResolvedValue(mockWorkOrder as any);

      const result = await service.create(createDto, mockOrganizationId, mockUserId);

      expect(result).toEqual(mockWorkOrder);
      expect(prisma.workOrder.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when property not found', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(null);

      await expect(service.create(createDto, mockOrganizationId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when unit not found', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue(null);

      const dtoWithUnit = { ...createDto, unitId: 'invalid-unit' };

      await expect(service.create(dtoWithUnit, mockOrganizationId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when vendor not found', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.vendor, 'findFirst').mockResolvedValue(null);

      const dtoWithVendor = { ...createDto, vendorId: 'invalid-vendor' };

      await expect(service.create(dtoWithVendor, mockOrganizationId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when assigned user not found', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const dtoWithUser = { ...createDto, assignedToId: 'invalid-user' };

      await expect(service.create(dtoWithUser, mockOrganizationId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set status to ASSIGNED when vendor is provided', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.vendor, 'findFirst').mockResolvedValue(mockVendor as any);
      jest.spyOn(prisma.workOrder, 'create').mockResolvedValue(mockWorkOrder as any);

      const dtoWithVendor = { ...createDto, vendorId: 'vendor-123' };
      await service.create(dtoWithVendor, mockOrganizationId, mockUserId);

      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ASSIGNED',
          }),
        }),
      );
    });

    it('should handle event tracking errors gracefully', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.workOrder, 'create').mockResolvedValue(mockWorkOrder as any);
      jest.spyOn(eventsService, 'track').mockRejectedValue(new Error('Event error'));

      const result = await service.create(createDto, mockOrganizationId, mockUserId);

      expect(result).toEqual(mockWorkOrder);
      expect(logger.log).toHaveBeenCalledWith('warn', 'Failed to track work order creation event', {
        error: 'Event error',
      });
    });

    it('should verify unit belongs to the property', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue(mockUnit as any);
      jest.spyOn(prisma.workOrder, 'create').mockResolvedValue(mockWorkOrder as any);

      const dtoWithUnit = { ...createDto, unitId: 'unit-123' };
      await service.create(dtoWithUnit, mockOrganizationId, mockUserId);

      expect(prisma.unit.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'unit-123',
          propertyId: 'prop-123',
        },
      });
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Title',
      description: 'Updated description',
    };

    it('should update a work order successfully', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...existingWorkOrder,
        ...updateDto,
      } as any);

      const result = await service.update('wo-123', updateDto, mockOrganizationId, mockUserId);

      expect(result.title).toBe('Updated Title');
    });

    it('should throw BadRequestException when updating completed work order', async () => {
      const completedWorkOrder = { ...mockWorkOrder, status: 'COMPLETED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(completedWorkOrder as any);

      await expect(
        service.update('wo-123', updateDto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating cancelled work order', async () => {
      const cancelledWorkOrder = { ...mockWorkOrder, status: 'CANCELLED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(cancelledWorkOrder as any);

      await expect(
        service.update('wo-123', updateDto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);

      const updateWithStatus = { ...updateDto, status: 'COMPLETED' };

      await expect(
        service.update('wo-123', updateWithStatus, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate vendor when updating vendorId', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.vendor, 'findFirst').mockResolvedValue(null);

      const updateWithVendor = { ...updateDto, vendorId: 'invalid-vendor' };

      await expect(
        service.update('wo-123', updateWithVendor, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate user when updating assignedToId', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const updateWithUser = { ...updateDto, assignedToId: 'invalid-user' };

      await expect(
        service.update('wo-123', updateWithUser, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set completedDate when status changes to COMPLETED', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...inProgressWorkOrder,
        status: 'COMPLETED',
        completedDate: new Date(),
      } as any);

      await service.update(
        'wo-123',
        { status: WorkOrderStatus.COMPLETED },
        mockOrganizationId,
        mockUserId,
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...existingWorkOrder,
        status: 'ASSIGNED',
      } as any);

      const result = await service.updateStatus(
        'wo-123',
        { status: WorkOrderStatus.ASSIGNED },
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe('ASSIGNED');
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'DRAFT' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);

      await expect(
        service.updateStatus(
          'wo-123',
          { status: WorkOrderStatus.COMPLETED },
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add status history entry', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'ASSIGNED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...existingWorkOrder,
        status: 'IN_PROGRESS',
      } as any);

      await service.updateStatus(
        'wo-123',
        { status: WorkOrderStatus.IN_PROGRESS, notes: 'Starting work' },
        mockOrganizationId,
        mockUserId,
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusHistory: {
              create: {
                fromStatus: 'ASSIGNED',
                toStatus: 'IN_PROGRESS',
                changedBy: mockUserId,
                notes: 'Starting work',
              },
            },
          }),
        }),
      );
    });

    it('should set completedDate when transitioning to COMPLETED', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...inProgressWorkOrder,
        status: 'COMPLETED',
        completedDate: new Date(),
      } as any);

      await service.updateStatus(
        'wo-123',
        { status: WorkOrderStatus.COMPLETED },
        mockOrganizationId,
        mockUserId,
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should not allow transition from COMPLETED', async () => {
      const completedWorkOrder = { ...mockWorkOrder, status: 'COMPLETED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(completedWorkOrder as any);

      await expect(
        service.updateStatus(
          'wo-123',
          { status: WorkOrderStatus.IN_PROGRESS },
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow transition from CANCELLED', async () => {
      const cancelledWorkOrder = { ...mockWorkOrder, status: 'CANCELLED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(cancelledWorkOrder as any);

      await expect(
        service.updateStatus(
          'wo-123',
          { status: WorkOrderStatus.SUBMITTED },
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assign', () => {
    it('should assign vendor to work order', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.vendor, 'findFirst').mockResolvedValue(mockVendor as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...existingWorkOrder,
        vendorId: 'vendor-123',
        status: 'ASSIGNED',
      } as any);

      const result = await service.assign(
        'wo-123',
        { vendorId: 'vendor-123' },
        mockOrganizationId,
        mockUserId,
      );

      expect(result.vendorId).toBe('vendor-123');
      expect(result.status).toBe('ASSIGNED');
    });

    it('should assign user to work order', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...existingWorkOrder,
        assignedToId: 'user-789',
        status: 'ASSIGNED',
      } as any);

      const result = await service.assign(
        'wo-123',
        { assignedToId: 'user-789' },
        mockOrganizationId,
        mockUserId,
      );

      expect(result.assignedToId).toBe('user-789');
    });

    it('should throw BadRequestException when neither vendor nor user provided', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);

      await expect(service.assign('wo-123', {}, mockOrganizationId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when assigning completed work order', async () => {
      const completedWorkOrder = { ...mockWorkOrder, status: 'COMPLETED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(completedWorkOrder as any);

      await expect(
        service.assign('wo-123', { vendorId: 'vendor-123' }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when assigning cancelled work order', async () => {
      const cancelledWorkOrder = { ...mockWorkOrder, status: 'CANCELLED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(cancelledWorkOrder as any);

      await expect(
        service.assign('wo-123', { vendorId: 'vendor-123' }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when vendor not found', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.vendor, 'findFirst').mockResolvedValue(null);

      await expect(
        service.assign('wo-123', { vendorId: 'invalid-vendor' }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when assigned user not found', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.assign('wo-123', { assignedToId: 'invalid-user' }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should keep current status if already ASSIGNED or beyond', async () => {
      const assignedWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(assignedWorkOrder as any);
      jest.spyOn(prisma.vendor, 'findFirst').mockResolvedValue(mockVendor as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...assignedWorkOrder,
        vendorId: 'vendor-123',
      } as any);

      await service.assign('wo-123', { vendorId: 'vendor-123' }, mockOrganizationId, mockUserId);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        }),
      );
    });

    it('should update scheduledDate if provided', async () => {
      const existingWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(existingWorkOrder as any);
      jest.spyOn(prisma.vendor, 'findFirst').mockResolvedValue(mockVendor as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue(existingWorkOrder as any);

      const scheduledDate = '2024-01-15T10:00:00Z';
      await service.assign(
        'wo-123',
        { vendorId: 'vendor-123', scheduledDate },
        mockOrganizationId,
        mockUserId,
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledDate: new Date(scheduledDate),
          }),
        }),
      );
    });
  });

  describe('complete', () => {
    it('should complete a work order in IN_PROGRESS status', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...inProgressWorkOrder,
        status: 'COMPLETED',
        completedDate: new Date(),
      } as any);

      const result = await service.complete(
        'wo-123',
        { completionNotes: 'Work completed successfully' },
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe('COMPLETED');
    });

    it('should complete a work order in ASSIGNED status', async () => {
      const assignedWorkOrder = { ...mockWorkOrder, status: 'ASSIGNED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(assignedWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...assignedWorkOrder,
        status: 'COMPLETED',
        completedDate: new Date(),
      } as any);

      const result = await service.complete('wo-123', {}, mockOrganizationId, mockUserId);

      expect(result.status).toBe('COMPLETED');
    });

    it('should set actualCost when provided', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...inProgressWorkOrder,
        status: 'COMPLETED',
        actualCost: 150,
      } as any);

      await service.complete(
        'wo-123',
        { actualCost: 150 },
        mockOrganizationId,
        mockUserId,
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualCost: 150,
          }),
        }),
      );
    });

    it('should throw BadRequestException when completing SUBMITTED work order', async () => {
      const submittedWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(submittedWorkOrder as any);

      await expect(
        service.complete('wo-123', {}, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when completing already COMPLETED work order', async () => {
      const completedWorkOrder = { ...mockWorkOrder, status: 'COMPLETED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(completedWorkOrder as any);

      await expect(
        service.complete('wo-123', {}, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when completing CANCELLED work order', async () => {
      const cancelledWorkOrder = { ...mockWorkOrder, status: 'CANCELLED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(cancelledWorkOrder as any);

      await expect(
        service.complete('wo-123', {}, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set completedDate to current date', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...inProgressWorkOrder,
        status: 'COMPLETED',
        completedDate: new Date(),
      } as any);

      await service.complete('wo-123', {}, mockOrganizationId, mockUserId);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should create status history entry', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...inProgressWorkOrder,
        status: 'COMPLETED',
      } as any);

      await service.complete(
        'wo-123',
        { completionNotes: 'Done' },
        mockOrganizationId,
        mockUserId,
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusHistory: {
              create: {
                fromStatus: 'IN_PROGRESS',
                toStatus: 'COMPLETED',
                changedBy: mockUserId,
                notes: 'Done',
              },
            },
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a SUBMITTED work order', async () => {
      const submittedWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(submittedWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...submittedWorkOrder,
        status: 'CANCELLED',
      } as any);

      const result = await service.cancel(
        'wo-123',
        'No longer needed',
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel an IN_PROGRESS work order', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...inProgressWorkOrder,
        status: 'CANCELLED',
      } as any);

      const result = await service.cancel(
        'wo-123',
        'Customer request',
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw BadRequestException when cancelling COMPLETED work order', async () => {
      const completedWorkOrder = { ...mockWorkOrder, status: 'COMPLETED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(completedWorkOrder as any);

      await expect(
        service.cancel('wo-123', 'reason', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cancelling already CANCELLED work order', async () => {
      const cancelledWorkOrder = { ...mockWorkOrder, status: 'CANCELLED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(cancelledWorkOrder as any);

      await expect(
        service.cancel('wo-123', 'reason', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create status history entry with reason', async () => {
      const submittedWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(submittedWorkOrder as any);
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
        ...submittedWorkOrder,
        status: 'CANCELLED',
      } as any);

      await service.cancel('wo-123', 'Budget cut', mockOrganizationId, mockUserId);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusHistory: {
              create: {
                fromStatus: 'SUBMITTED',
                toStatus: 'CANCELLED',
                changedBy: mockUserId,
                notes: 'Budget cut',
              },
            },
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT work order', async () => {
      const draftWorkOrder = { ...mockWorkOrder, status: 'DRAFT' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(draftWorkOrder as any);
      jest.spyOn(prisma, '$transaction').mockResolvedValue([{}, {}, {}] as any);

      const result = await service.remove('wo-123', mockOrganizationId, mockUserId);

      expect(result).toEqual({ success: true, id: 'wo-123' });
    });

    it('should delete a CANCELLED work order', async () => {
      const cancelledWorkOrder = { ...mockWorkOrder, status: 'CANCELLED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(cancelledWorkOrder as any);
      jest.spyOn(prisma, '$transaction').mockResolvedValue([{}, {}, {}] as any);

      const result = await service.remove('wo-123', mockOrganizationId, mockUserId);

      expect(result).toEqual({ success: true, id: 'wo-123' });
    });

    it('should throw BadRequestException when deleting SUBMITTED work order', async () => {
      const submittedWorkOrder = { ...mockWorkOrder, status: 'SUBMITTED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(submittedWorkOrder as any);

      await expect(
        service.remove('wo-123', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleting IN_PROGRESS work order', async () => {
      const inProgressWorkOrder = { ...mockWorkOrder, status: 'IN_PROGRESS' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(inProgressWorkOrder as any);

      await expect(
        service.remove('wo-123', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleting COMPLETED work order', async () => {
      const completedWorkOrder = { ...mockWorkOrder, status: 'COMPLETED' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(completedWorkOrder as any);

      await expect(
        service.remove('wo-123', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete attachments and status history in transaction', async () => {
      const draftWorkOrder = { ...mockWorkOrder, status: 'DRAFT' };
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(draftWorkOrder as any);
      jest.spyOn(prisma, '$transaction').mockResolvedValue([{}, {}, {}] as any);

      await service.remove('wo-123', mockOrganizationId, mockUserId);

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
        expect.anything(),
      ]);
    });
  });

  describe('getStatusHistory', () => {
    it('should return status history for a work order', async () => {
      const mockHistory = [
        { id: 'h1', fromStatus: null, toStatus: 'SUBMITTED', createdAt: new Date() },
        { id: 'h2', fromStatus: 'SUBMITTED', toStatus: 'ASSIGNED', createdAt: new Date() },
      ];
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(mockWorkOrder as any);
      jest.spyOn(prisma.workOrderStatusHistory, 'findMany').mockResolvedValue(mockHistory as any);

      const result = await service.getStatusHistory('wo-123', mockOrganizationId);

      expect(result).toEqual(mockHistory);
      expect(prisma.workOrderStatusHistory.findMany).toHaveBeenCalledWith({
        where: { workOrderId: 'wo-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when work order not found', async () => {
      jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(null);

      await expect(service.getStatusHistory('wo-999', mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return work order statistics', async () => {
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValueOnce(100); // total
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValueOnce(30); // open
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValueOnce(60); // completed
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValueOnce(5); // overdue
      jest.spyOn(prisma.workOrder, 'groupBy')
        .mockResolvedValueOnce([
          { status: 'SUBMITTED', _count: 10 },
          { status: 'ASSIGNED', _count: 10 },
          { status: 'IN_PROGRESS', _count: 10 },
          { status: 'COMPLETED', _count: 60 },
          { status: 'CANCELLED', _count: 10 },
        ] as any)
        .mockResolvedValueOnce([
          { priority: 'HIGH', _count: 5 },
          { priority: 'MEDIUM', _count: 15 },
          { priority: 'LOW', _count: 10 },
        ] as any);
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([
        { requestedDate: new Date('2024-01-01'), completedDate: new Date('2024-01-03') },
        { requestedDate: new Date('2024-01-05'), completedDate: new Date('2024-01-07') },
      ] as any);

      const result = await service.getStats(mockOrganizationId);

      expect(result.total).toBe(100);
      expect(result.open).toBe(30);
      expect(result.completed).toBe(60);
      expect(result.overdue).toBe(5);
      expect(result.byStatus).toEqual({
        SUBMITTED: 10,
        ASSIGNED: 10,
        IN_PROGRESS: 10,
        COMPLETED: 60,
        CANCELLED: 10,
      });
      expect(result.byPriority).toEqual({
        HIGH: 5,
        MEDIUM: 15,
        LOW: 10,
      });
    });

    it('should filter by propertyId when provided', async () => {
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(10);
      jest.spyOn(prisma.workOrder, 'groupBy').mockResolvedValue([] as any);
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);

      await service.getStats(mockOrganizationId, 'prop-123');

      expect(prisma.workOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            propertyId: 'prop-123',
          }),
        }),
      );
    });

    it('should calculate average completion days correctly', async () => {
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(10);
      jest.spyOn(prisma.workOrder, 'groupBy').mockResolvedValue([] as any);
      const now = new Date();
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([
        { requestedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), completedDate: now },
        { requestedDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), completedDate: now },
      ] as any);

      const result = await service.getStats(mockOrganizationId);

      expect(result.avgCompletionDays).toBeGreaterThan(0);
    });

    it('should return 0 for avgCompletionDays when no completed work orders', async () => {
      jest.spyOn(prisma.workOrder, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.workOrder, 'groupBy').mockResolvedValue([] as any);
      jest.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);

      const result = await service.getStats(mockOrganizationId);

      expect(result.avgCompletionDays).toBe(0);
    });
  });

  describe('status transition validation', () => {
    const testCases = [
      // DRAFT transitions
      { from: 'DRAFT', to: 'SUBMITTED', valid: true },
      { from: 'DRAFT', to: 'CANCELLED', valid: true },
      { from: 'DRAFT', to: 'ASSIGNED', valid: false },
      { from: 'DRAFT', to: 'IN_PROGRESS', valid: false },
      { from: 'DRAFT', to: 'COMPLETED', valid: false },
      // SUBMITTED transitions
      { from: 'SUBMITTED', to: 'ASSIGNED', valid: true },
      { from: 'SUBMITTED', to: 'IN_PROGRESS', valid: true },
      { from: 'SUBMITTED', to: 'CANCELLED', valid: true },
      { from: 'SUBMITTED', to: 'COMPLETED', valid: false },
      { from: 'SUBMITTED', to: 'ON_HOLD', valid: false },
      // ASSIGNED transitions
      { from: 'ASSIGNED', to: 'IN_PROGRESS', valid: true },
      { from: 'ASSIGNED', to: 'ON_HOLD', valid: true },
      { from: 'ASSIGNED', to: 'CANCELLED', valid: true },
      { from: 'ASSIGNED', to: 'COMPLETED', valid: false },
      // IN_PROGRESS transitions
      { from: 'IN_PROGRESS', to: 'ON_HOLD', valid: true },
      { from: 'IN_PROGRESS', to: 'COMPLETED', valid: true },
      { from: 'IN_PROGRESS', to: 'CANCELLED', valid: true },
      { from: 'IN_PROGRESS', to: 'ASSIGNED', valid: false },
      // ON_HOLD transitions
      { from: 'ON_HOLD', to: 'IN_PROGRESS', valid: true },
      { from: 'ON_HOLD', to: 'CANCELLED', valid: true },
      { from: 'ON_HOLD', to: 'COMPLETED', valid: false },
      // Terminal states
      { from: 'COMPLETED', to: 'IN_PROGRESS', valid: false },
      { from: 'COMPLETED', to: 'CANCELLED', valid: false },
      { from: 'CANCELLED', to: 'SUBMITTED', valid: false },
      { from: 'CANCELLED', to: 'IN_PROGRESS', valid: false },
    ];

    testCases.forEach(({ from, to, valid }) => {
      it(`should ${valid ? 'allow' : 'reject'} transition from ${from} to ${to}`, async () => {
        const workOrder = { ...mockWorkOrder, status: from };
        jest.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(workOrder as any);

        if (valid) {
          jest.spyOn(prisma.workOrder, 'update').mockResolvedValue({
            ...workOrder,
            status: to,
          } as any);

          const result = await service.updateStatus(
            'wo-123',
            { status: to as WorkOrderStatus },
            mockOrganizationId,
            mockUserId,
          );
          expect(result.status).toBe(to);
        } else {
          await expect(
            service.updateStatus(
              'wo-123',
              { status: to as WorkOrderStatus },
              mockOrganizationId,
              mockUserId,
            ),
          ).rejects.toThrow(BadRequestException);
        }
      });
    });
  });
});
