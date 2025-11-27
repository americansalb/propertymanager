import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyType } from './dto/property.dto';

describe('PropertiesController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Mock authenticated user context
  const mockJwtGuard = {
    canActivate: (context: any) => {
      const request = context.switchToHttp().getRequest();
      request.user = {
        id: 'user-test-123',
        organizationId: 'org-test-456',
        email: 'test@example.com',
        role: 'ORGANIZATION_ADMIN',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard('JWT')
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PUT /properties/:id', () => {
    let testPropertyId: string;
    const testOrgId = 'org-test-456';

    beforeEach(async () => {
      // Create a test property
      const property = await prisma.property.create({
        data: {
          name: 'Test Property',
          address1: '123 Test St',
          city: 'Test City',
          state: 'TX',
          zipCode: '12345',
          country: 'US',
          type: 'MULTIFAMILY',
          status: 'ACTIVE',
          totalUnits: 10,
          organizationId: testOrgId,
        },
      });
      testPropertyId = property.id;
    });

    afterEach(async () => {
      // Clean up test data
      await prisma.event.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.property.deleteMany({ where: { organizationId: testOrgId } });
    });

    it('should update a property and return 200', async () => {
      const updateData = {
        name: 'Updated Test Property',
        addressLine1: '456 New Ave',
        addressLine2: null,
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'US',
        propertyType: PropertyType.MULTIFAMILY,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/properties/${testPropertyId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: testPropertyId,
          name: 'Updated Test Property',
          address1: '456 New Ave',
          city: 'Austin',
          organizationId: testOrgId,
        }),
      });

      // Verify property was updated in database
      const updated = await prisma.property.findUnique({
        where: { id: testPropertyId },
      });
      expect(updated?.name).toBe('Updated Test Property');
      expect(updated?.address1).toBe('456 New Ave');

      // Verify event was tracked
      const events = await prisma.event.findMany({
        where: {
          name: 'property_updated',
          organizationId: testOrgId,
        },
      });
      expect(events).toHaveLength(1);
      expect(events[0].properties).toEqual(expect.objectContaining({ propertyId: testPropertyId }));
    });

    it('should return 404 when property does not exist', async () => {
      const updateData = {
        name: 'Updated Name',
        addressLine1: '123 St',
        city: 'City',
        state: 'TX',
        postalCode: '12345',
        country: 'US',
        propertyType: PropertyType.MULTIFAMILY,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .put('/properties/non-existent-id')
        .send(updateData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Property not found',
          statusCode: 404,
        },
      });

      // Verify no event was tracked
      const events = await prisma.event.findMany({
        where: {
          name: 'property_updated',
          organizationId: testOrgId,
        },
      });
      expect(events).toHaveLength(0);
    });

    it('should return 403 when trying to update property from different organization', async () => {
      // Create property in different org
      const otherProperty = await prisma.property.create({
        data: {
          name: 'Other Org Property',
          address1: '789 Other St',
          city: 'Other City',
          state: 'CA',
          zipCode: '99999',
          country: 'US',
          type: 'SINGLE_FAMILY',
          status: 'ACTIVE',
          totalUnits: 1,
          organizationId: 'org-different-999',
        },
      });

      const updateData = {
        name: 'Hacked Name',
        addressLine1: '123 St',
        city: 'City',
        state: 'TX',
        postalCode: '12345',
        country: 'US',
        propertyType: PropertyType.MULTIFAMILY,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/properties/${otherProperty.id}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'You do not have access to this property',
          statusCode: 403,
        },
      });

      // Verify property was NOT updated
      const unchanged = await prisma.property.findUnique({
        where: { id: otherProperty.id },
      });
      expect(unchanged?.name).toBe('Other Org Property');

      // Clean up
      await prisma.property.delete({ where: { id: otherProperty.id } });
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = {
        name: 'Valid Name',
        addressLine1: '123 St',
        city: 'City',
        state: 'TX',
        postalCode: 'INVALID!@#$', // Invalid postal code
        country: 'US',
        propertyType: PropertyType.MULTIFAMILY,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/properties/${testPropertyId}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          statusCode: 400,
        },
      });

      // Verify property was NOT updated
      const unchanged = await prisma.property.findUnique({
        where: { id: testPropertyId },
      });
      expect(unchanged?.name).toBe('Test Property');
    });
  });
});
