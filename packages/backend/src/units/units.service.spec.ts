import { Test, TestingModule } from '@nestjs/testing';
import { UnitsService } from './units.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock data
const mockOrganizationId = 'org-123';
const mockPropertyId = 'prop-123';
const mockUnitId = 'unit-123';

const mockProperty = {
  id: mockPropertyId,
  name: 'Test Property',
  organizationId: mockOrganizationId,
};

const mockUnit = {
  id: mockUnitId,
  propertyId: mockPropertyId,
  unitNumber: '101',
  type: 'ONE_BED',
  bedrooms: 1,
  bathrooms: 1,
  squareFeet: 750,
  marketRent: 1500,
  status: 'VACANT',
  property: mockProperty,
};

const mockUnits = [
  mockUnit,
  {
    id: 'unit-124',
    propertyId: mockPropertyId,
    unitNumber: '102',
    type: 'TWO_BED',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1000,
    marketRent: 2000,
    status: 'OCCUPIED',
    property: mockProperty,
  },
];

describe('UnitsService', () => {
  let service: UnitsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      unit: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all units for organization', async () => {
      prisma.unit.findMany.mockResolvedValue(mockUnits);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual(mockUnits);
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: {
          property: {
            organizationId: mockOrganizationId,
          },
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
      });
    });

    it('should return empty array when no units exist', async () => {
      prisma.unit.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([]);
    });
  });

  describe('findByProperty', () => {
    it('should return units for a specific property', async () => {
      prisma.unit.findMany.mockResolvedValue(mockUnits);

      const result = await service.findByProperty(mockPropertyId);

      expect(result).toEqual(mockUnits);
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: { propertyId: mockPropertyId },
        orderBy: { unitNumber: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should return unit when found', async () => {
      prisma.unit.findFirst.mockResolvedValue(mockUnit);

      const result = await service.findById(mockUnitId, mockOrganizationId);

      expect(result).toEqual(mockUnit);
      expect(prisma.unit.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUnitId,
          property: {
            organizationId: mockOrganizationId,
          },
        },
        include: {
          property: true,
        },
      });
    });

    it('should return null when unit not found', async () => {
      prisma.unit.findFirst.mockResolvedValue(null);

      const result = await service.findById('non-existent', mockOrganizationId);

      expect(result).toBeNull();
    });

    it('should not return unit from different organization', async () => {
      prisma.unit.findFirst.mockResolvedValue(null);

      const result = await service.findById(mockUnitId, 'different-org');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createUnitDto = {
      propertyId: mockPropertyId,
      unitNumber: '103',
      type: 'STUDIO',
      bedrooms: 0,
      bathrooms: 1,
      squareFeet: 500,
      marketRent: 1200,
      status: 'VACANT',
    };

    it('should create unit when property belongs to organization', async () => {
      prisma.property.findFirst.mockResolvedValue(mockProperty);
      prisma.unit.create.mockResolvedValue({ ...mockUnit, ...createUnitDto });

      const result = await service.create(createUnitDto, mockOrganizationId);

      expect(result).toBeDefined();
      expect(prisma.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockPropertyId,
          organizationId: mockOrganizationId,
        },
      });
      expect(prisma.unit.create).toHaveBeenCalled();
    });

    it('should throw error when property not found', async () => {
      prisma.property.findFirst.mockResolvedValue(null);

      await expect(service.create(createUnitDto, mockOrganizationId)).rejects.toThrow(
        'Property not found',
      );
      expect(prisma.unit.create).not.toHaveBeenCalled();
    });

    it('should throw error when property belongs to different organization', async () => {
      prisma.property.findFirst.mockResolvedValue(null);

      await expect(service.create(createUnitDto, 'different-org')).rejects.toThrow(
        'Property not found',
      );
    });

    it('should normalize numeric data correctly', async () => {
      prisma.property.findFirst.mockResolvedValue(mockProperty);
      prisma.unit.create.mockResolvedValue(mockUnit);

      const dataWithStrings = {
        ...createUnitDto,
        bedrooms: '2',
        bathrooms: '1.5',
        marketRent: '1500.00',
        squareFeet: '800',
      };

      await service.create(dataWithStrings, mockOrganizationId);

      expect(prisma.unit.create).toHaveBeenCalled();
      const createCall = prisma.unit.create.mock.calls[0][0];
      expect(createCall.data.bedrooms).toBe(2);
    });
  });

  describe('update', () => {
    const updateUnitDto = {
      unitNumber: '101A',
      marketRent: 1600,
    };

    it('should update unit when it exists and belongs to organization', async () => {
      prisma.unit.findFirst.mockResolvedValue(mockUnit);
      prisma.unit.update.mockResolvedValue({ ...mockUnit, ...updateUnitDto });

      const result = await service.update(mockUnitId, updateUnitDto, mockOrganizationId);

      expect(result.unitNumber).toBe('101A');
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: mockUnitId },
        data: expect.any(Object),
        include: {
          property: true,
        },
      });
    });

    it('should throw error when unit not found', async () => {
      prisma.unit.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateUnitDto, mockOrganizationId),
      ).rejects.toThrow('Unit not found');
      expect(prisma.unit.update).not.toHaveBeenCalled();
    });

    it('should verify new property when changing propertyId', async () => {
      const newPropertyId = 'prop-456';
      const newProperty = { ...mockProperty, id: newPropertyId };

      prisma.unit.findFirst.mockResolvedValue(mockUnit);
      prisma.property.findFirst.mockResolvedValue(newProperty);
      prisma.unit.update.mockResolvedValue({ ...mockUnit, propertyId: newPropertyId });

      await service.update(mockUnitId, { propertyId: newPropertyId }, mockOrganizationId);

      expect(prisma.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: newPropertyId,
          organizationId: mockOrganizationId,
        },
      });
    });

    it('should throw error when changing to invalid property', async () => {
      prisma.unit.findFirst.mockResolvedValue(mockUnit);
      prisma.property.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUnitId, { propertyId: 'invalid-prop' }, mockOrganizationId),
      ).rejects.toThrow('Property not found');
    });
  });

  describe('delete', () => {
    it('should delete unit when it exists and belongs to organization', async () => {
      prisma.unit.findFirst.mockResolvedValue(mockUnit);
      prisma.unit.delete.mockResolvedValue(mockUnit);

      const result = await service.delete(mockUnitId, mockOrganizationId);

      expect(result).toEqual(mockUnit);
      expect(prisma.unit.delete).toHaveBeenCalledWith({
        where: { id: mockUnitId },
      });
    });

    it('should throw error when unit not found', async () => {
      prisma.unit.findFirst.mockResolvedValue(null);

      await expect(service.delete('non-existent', mockOrganizationId)).rejects.toThrow(
        'Unit not found',
      );
      expect(prisma.unit.delete).not.toHaveBeenCalled();
    });

    it('should throw error when unit belongs to different organization', async () => {
      prisma.unit.findFirst.mockResolvedValue(null);

      await expect(service.delete(mockUnitId, 'different-org')).rejects.toThrow('Unit not found');
      expect(prisma.unit.delete).not.toHaveBeenCalled();
    });
  });

  describe('normalizeUnitData (private method behavior)', () => {
    it('should handle negative values by converting to 0', async () => {
      prisma.property.findFirst.mockResolvedValue(mockProperty);
      prisma.unit.create.mockResolvedValue(mockUnit);

      const dataWithNegatives = {
        propertyId: mockPropertyId,
        unitNumber: '101',
        bedrooms: -1,
        bathrooms: -1,
        marketRent: -100,
        squareFeet: -50,
      };

      await service.create(dataWithNegatives, mockOrganizationId);

      const createCall = prisma.unit.create.mock.calls[0][0];
      expect(createCall.data.bedrooms).toBe(0);
    });

    it('should round decimal bedrooms to integers', async () => {
      prisma.property.findFirst.mockResolvedValue(mockProperty);
      prisma.unit.create.mockResolvedValue(mockUnit);

      const dataWithDecimals = {
        propertyId: mockPropertyId,
        unitNumber: '101',
        bedrooms: 2.7,
      };

      await service.create(dataWithDecimals, mockOrganizationId);

      const createCall = prisma.unit.create.mock.calls[0][0];
      expect(createCall.data.bedrooms).toBe(3);
    });
  });
});
