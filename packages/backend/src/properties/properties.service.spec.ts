import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdatePropertyDto } from './dto/property.dto';

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
    it('should log successful property update with changes', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'New Name',
        addressLine1: '123 Old St',
        addressLine2: null,
        city: 'Newtown',
        state: 'OT',
        postalCode: '00000',
        country: 'US',
        propertyType: 'MULTIFAMILY' as any,
        active: true,
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
          changes: {
            name: { before: 'Old Name', after: 'New Name' },
            city: { before: 'Oldtown', after: 'Newtown' },
          },
        },
        PropertiesService.name,
      );
    });

    it('should log warning when property not found', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.update('prop-999', {} as any, 'org-456', 'user-789'),
      ).rejects.toThrow(NotFoundException);

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

      await expect(
        service.update('prop-123', {} as any, 'org-999', 'user-789'),
      ).rejects.toThrow(ForbiddenException);

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

    it('should not log changes when no fields are modified', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'Old Name',
        addressLine1: '123 Old St',
        addressLine2: null,
        city: 'Oldtown',
        state: 'OT',
        postalCode: '00000',
        country: 'US',
        propertyType: 'MULTIFAMILY' as any,
        active: true,
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.property, 'update').mockResolvedValue(mockProperty as any);

      await service.update('prop-123', updateDto, 'org-456', 'user-789');

      expect(logger.log).toHaveBeenCalledWith(
        {
          message: 'property.updated',
          propertyId: 'prop-123',
          organizationId: 'org-456',
          userId: 'user-789',
          changes: {}, // No changes
        },
        PropertiesService.name,
      );
    });

    it('should correctly map active boolean to status enum in changes', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'Old Name',
        addressLine1: '123 Old St',
        addressLine2: null,
        city: 'Oldtown',
        state: 'OT',
        postalCode: '00000',
        country: 'US',
        propertyType: 'MULTIFAMILY' as any,
        active: false,
      };

      const updatedProperty = {
        ...mockProperty,
        status: 'INACTIVE',
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
          changes: {
            active: { before: 'ACTIVE', after: 'INACTIVE' },
          },
        },
        PropertiesService.name,
      );
    });

    it('should log all field changes when multiple fields are updated', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'New Name',
        addressLine1: '456 New Ave',
        addressLine2: 'Suite 100',
        city: 'Newtown',
        state: 'NT',
        postalCode: '12345',
        country: 'CA',
        propertyType: 'SINGLE_FAMILY' as any,
        active: false,
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

      await service.update('prop-123', updateDto, 'org-456', 'user-789');

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'property.updated',
          propertyId: 'prop-123',
          organizationId: 'org-456',
          userId: 'user-789',
          changes: expect.objectContaining({
            name: { before: 'Old Name', after: 'New Name' },
            addressLine1: { before: '123 Old St', after: '456 New Ave' },
            addressLine2: { before: null, after: 'Suite 100' },
            city: { before: 'Oldtown', after: 'Newtown' },
            state: { before: 'OT', after: 'NT' },
            postalCode: { before: '00000', after: '12345' },
            country: { before: 'US', after: 'CA' },
            propertyType: { before: 'MULTIFAMILY', after: 'SINGLE_FAMILY' },
            active: { before: 'ACTIVE', after: 'INACTIVE' },
          }),
        }),
        PropertiesService.name,
      );
    });
  });
});
