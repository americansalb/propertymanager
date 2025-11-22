import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { UpdatePropertyDto, PropertyType } from './dto/property.dto';
import { EventsService } from '../events/events.service';

describe('PropertiesController', () => {
  let controller: PropertiesController;
  let propertiesService: jest.Mocked<PropertiesService>;
  let eventsService: jest.Mocked<EventsService>;

  const mockProperty = {
    id: 'prop-123',
    name: 'Sunset Villas',
    address1: '123 Main St',
    address2: null,
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'US',
    type: 'MULTIFAMILY',
    status: 'ACTIVE',
    organizationId: 'org-456',
    totalUnits: 24,
    yearBuilt: null,
    squareFeet: null,
    acquisitionDate: null,
    acquisitionCost: null,
    settings: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        {
          provide: PropertiesService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: {
            track: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PropertiesController>(PropertiesController);
    propertiesService = module.get(PropertiesService);
    eventsService = module.get(EventsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('update', () => {
    const updateDto: UpdatePropertyDto = {
      name: 'Updated Villas',
      addressLine1: '456 Oak Ave',
      addressLine2: null,
      city: 'Austin',
      state: 'TX',
      postalCode: '78702',
      country: 'US',
      propertyType: PropertyType.MULTIFAMILY,
      active: true,
    };

    const mockRequest = {
      user: { id: 'user-789', organizationId: 'org-456' },
    } as any;

    it('should update a property and track event', async () => {
      const updatedProperty = { ...mockProperty, name: 'Updated Villas' };
      propertiesService.update.mockResolvedValue(updatedProperty as any);

      const result = await controller.update('prop-123', updateDto, 'org-456', mockRequest);

      expect(propertiesService.update).toHaveBeenCalledWith(
        'prop-123',
        updateDto,
        'org-456',
        'user-789',
      );
      expect(eventsService.track).toHaveBeenCalledWith(
        {
          name: 'property_updated',
          category: 'property_management',
          properties: { propertyId: 'prop-123' },
        },
        'org-456',
        'user-789',
        mockRequest,
      );
      expect(result).toEqual({
        success: true,
        data: updatedProperty,
      });
    });

    it('should handle property not found (404)', async () => {
      propertiesService.update.mockRejectedValue(new NotFoundException('Property not found'));

      await expect(
        controller.update('prop-999', updateDto, 'org-456', mockRequest),
      ).rejects.toThrow(NotFoundException);

      expect(eventsService.track).not.toHaveBeenCalled();
    });

    it('should handle organization mismatch (403)', async () => {
      propertiesService.update.mockRejectedValue(
        new ForbiddenException('You do not have access to this property'),
      );

      await expect(
        controller.update('prop-123', updateDto, 'org-999', mockRequest),
      ).rejects.toThrow(ForbiddenException);

      expect(eventsService.track).not.toHaveBeenCalled();
    });

    it('should work with no user in request (unauthenticated context)', async () => {
      const requestWithoutUser = {} as any;
      const updatedProperty = { ...mockProperty, name: 'Updated Villas' };
      propertiesService.update.mockResolvedValue(updatedProperty as any);

      const result = await controller.update(
        'prop-123',
        updateDto,
        'org-456',
        requestWithoutUser,
      );

      expect(propertiesService.update).toHaveBeenCalledWith(
        'prop-123',
        updateDto,
        'org-456',
        undefined,
      );
      expect(eventsService.track).toHaveBeenCalledWith(
        {
          name: 'property_updated',
          category: 'property_management',
          properties: { propertyId: 'prop-123' },
        },
        'org-456',
        undefined,
        requestWithoutUser,
      );
      expect(result).toEqual({
        success: true,
        data: updatedProperty,
      });
    });
  });

  describe('findAll', () => {
    it('should return all properties for an organization', async () => {
      const properties = [mockProperty];
      propertiesService.findAll.mockResolvedValue(properties as any);

      const result = await controller.findAll('org-456');

      expect(propertiesService.findAll).toHaveBeenCalledWith('org-456');
      expect(result).toEqual({
        success: true,
        data: properties,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single property', async () => {
      propertiesService.findById.mockResolvedValue(mockProperty as any);

      const result = await controller.findOne('prop-123', 'org-456');

      expect(propertiesService.findById).toHaveBeenCalledWith('prop-123', 'org-456');
      expect(result).toEqual({
        success: true,
        data: mockProperty,
      });
    });

    it('should throw NotFoundException when property does not exist', async () => {
      propertiesService.findById.mockRejectedValue(new NotFoundException('Property not found'));

      await expect(controller.findOne('prop-999', 'org-456')).rejects.toThrow(NotFoundException);
    });
  });
});
