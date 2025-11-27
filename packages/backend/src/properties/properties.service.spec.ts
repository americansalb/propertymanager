import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdatePropertyDto, PropertyType, PropertyStatus } from './dto/property.dto';

describe('PropertiesService - Logging', () => {
  let service: PropertiesService;
  let prisma: PrismaService;
  let logger: LoggerService;

  const mockProperty = {
    id: 'prop-123',
    organizationId: 'org-456',
    name: 'Old Name',
    address1: '123 Old St',
    address2: null,
    city: 'Oldtown',
    state: 'OT',
    zipCode: '00000',
    country: 'US',
    type: 'MULTIFAMILY',
    status: 'ACTIVE',
    totalUnits: 10,
    yearBuilt: null,
    squareFeet: null,
    acquisitionDate: null,
    acquisitionCost: null,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
              update: jest.fn(),
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

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get<PrismaService>(PrismaService);
    logger = module.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should log successful property update', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'New Name',
        address1: '123 Old St',
        address2: null,
        city: 'Newtown',
        state: 'OT',
        zipCode: '00000',
        country: 'US',
        type: PropertyType.MULTIFAMILY,
        status: PropertyStatus.ACTIVE,
        totalUnits: 10,
      };

      const updatedProperty = {
        ...mockProperty,
        name: 'New Name',
        city: 'Newtown',
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.property, 'update').mockResolvedValue(updatedProperty as any);

      await service.update('prop-123', updateDto, 'org-456', 'user-789');

      expect(logger.log).toHaveBeenCalledWith(
        {
          message: 'property.updated',
          propertyId: 'prop-123',
          organizationId: 'org-456',
          userId: 'user-789',
        },
        PropertiesService.name,
      );
    });

    it('should log warning when property not found', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);

      await expect(service.update('prop-999', {} as any, 'org-456', 'user-789')).rejects.toThrow(
        NotFoundException,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        {
          message: 'property.update_not_found',
          propertyId: 'prop-999',
          organizationId: 'org-456',
        },
        PropertiesService.name,
      );
    });

    it('should log warning when organization does not match', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);

      await expect(service.update('prop-123', {} as any, 'org-999', 'user-789')).rejects.toThrow(
        ForbiddenException,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        {
          message: 'property.update_forbidden',
          propertyId: 'prop-123',
          requestedOrgId: 'org-999',
          actualOrgId: 'org-456',
        },
        PropertiesService.name,
      );
    });

    it('should update property and return updated data', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'New Name',
        address1: '456 New Ave',
        address2: 'Suite 100',
        city: 'Newtown',
        state: 'NT',
        zipCode: '12345',
        country: 'CA',
        type: PropertyType.SINGLE_FAMILY,
        status: PropertyStatus.INACTIVE,
        totalUnits: 10,
      };

      const updatedProperty = {
        ...mockProperty,
        name: 'New Name',
        address1: '456 New Ave',
        address2: 'Suite 100',
        city: 'Newtown',
        state: 'NT',
        zipCode: '12345',
        country: 'CA',
        type: 'SINGLE_FAMILY',
        status: 'INACTIVE',
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.property, 'update').mockResolvedValue(updatedProperty as any);

      const result = await service.update('prop-123', updateDto, 'org-456', 'user-789');

      expect(result).toEqual(updatedProperty);
      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: 'prop-123' },
        data: {
          name: 'New Name',
          address1: '456 New Ave',
          address2: 'Suite 100',
          city: 'Newtown',
          state: 'NT',
          zipCode: '12345',
          country: 'CA',
          type: PropertyType.SINGLE_FAMILY,
          status: PropertyStatus.INACTIVE,
          totalUnits: 10,
          yearBuilt: undefined,
          squareFeet: undefined,
        },
        include: { units: true },
      });
    });
  });
});
