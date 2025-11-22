# Implementation Tasks: Property Edit Modal

**Feature Spec:** `docs/features/property-edit-modal.md`
**Status:** Ready for Implementation
**Last Updated:** November 22, 2025

---

## Overview

This document breaks down the Property Edit Modal feature into concrete, assignable tasks. Each task includes estimates, acceptance criteria, and implementation guidance.

**Total Estimated Effort:** 28-33 hours (3.5-4 days for 1 developer)

---

## Task Summary

| Category | Tasks | Estimated Hours |
|----------|-------|-----------------|
| **Backend** | 5 tasks | 14-17h |
| **Frontend** | 5 tasks | 13-17h |
| **E2E** | 1 task | 3-4h |
| **Total** | **11 tasks** | **30-38h** |

---

## Backend Tasks

### TASK-020: Create `UpdatePropertyDto` with Validation

**Area:** Backend (NestJS)
**Estimate:** 2-3h
**Priority:** P0 (Blocking)
**Dependencies:** None

#### Description

Define `UpdatePropertyDto` implementing the fields and validation rules from the feature spec. This DTO enforces data integrity at the API boundary.

#### Implementation Steps

1. **Create DTO file:**
   ```typescript
   // packages/backend/src/modules/properties/dto/update-property.dto.ts
   import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, MaxLength, Matches } from 'class-validator';
   import { PropertyType } from '@prisma/client';

   export class UpdatePropertyDto {
     @IsString()
     @IsNotEmpty()
     @MaxLength(120)
     name: string;

     @IsString()
     @IsNotEmpty()
     @MaxLength(200)
     addressLine1: string;

     @IsString()
     @IsOptional()
     @MaxLength(200)
     addressLine2?: string | null;

     @IsString()
     @IsNotEmpty()
     @MaxLength(100)
     city: string;

     @IsString()
     @IsNotEmpty()
     @Matches(/^[A-Z]{2}$/, { message: 'State must be a valid 2-letter code' })
     state: string;

     @IsString()
     @IsNotEmpty()
     @Matches(/^\d{5}(-\d{4})?$/, { message: 'Postal code must be 5 or 9 digits' })
     postalCode: string;

     @IsString()
     @IsNotEmpty()
     @MaxLength(2)
     country: string;

     @IsEnum(PropertyType)
     propertyType: PropertyType;

     @IsString()
     @IsOptional()
     @MaxLength(2000)
     notes?: string | null;

     @IsBoolean()
     active: boolean;
   }
   ```

2. **Export from barrel file:**
   ```typescript
   // packages/backend/src/modules/properties/dto/index.ts
   export * from './create-property.dto';
   export * from './update-property.dto'; // Add this
   ```

3. **Add validation pipe to controller:**
   ```typescript
   // Ensure ValidationPipe is applied globally in main.ts
   app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
   ```

#### Acceptance Criteria

- [ ] DTO file created at correct path
- [ ] All fields from spec included with correct types
- [ ] Validation decorators applied (required, optional, max lengths)
- [ ] State validation (2-letter code)
- [ ] Postal code validation (5 or 9 digits)
- [ ] PropertyType enum validation
- [ ] Invalid payloads return 400 with clear error messages
- [ ] No `any` types used
- [ ] TypeScript strict mode passes

#### Testing

```typescript
// packages/backend/src/modules/properties/dto/update-property.dto.spec.ts
import { validate } from 'class-validator';
import { UpdatePropertyDto } from './update-property.dto';

describe('UpdatePropertyDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = new UpdatePropertyDto();
    Object.assign(dto, {
      name: 'Test Property',
      addressLine1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'US',
      propertyType: 'MULTIFAMILY',
      active: true,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with invalid postal code', async () => {
    const dto = new UpdatePropertyDto();
    Object.assign(dto, {
      name: 'Test',
      addressLine1: '123 Main',
      city: 'Austin',
      state: 'TX',
      postalCode: 'INVALID', // Bad postal code
      country: 'US',
      propertyType: 'MULTIFAMILY',
      active: true,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('postalCode');
  });
});
```

---

### TASK-021: Implement `PUT /api/properties/:id` Endpoint

**Area:** Backend (NestJS)
**Estimate:** 4h
**Priority:** P0 (Blocking)
**Dependencies:** TASK-020

#### Description

Implement the controller and service logic to update properties with organization scoping and permission checks.

#### Implementation Steps

1. **Add controller method:**
   ```typescript
   // packages/backend/src/modules/properties/properties.controller.ts
   import { Put, Param, Body } from '@nestjs/common';
   import { UpdatePropertyDto } from './dto/update-property.dto';
   import { CurrentUser } from '@/common/decorators/current-user.decorator';
   import { OrganizationId } from '@/common/decorators/organization-id.decorator';

   @Put(':id')
   @UseGuards(AuthGuard('jwt'))
   @Roles('ORGANIZATION_ADMIN', 'PROPERTY_MANAGER')
   async update(
     @Param('id') id: string,
     @Body() dto: UpdatePropertyDto,
     @OrganizationId() organizationId: string,
     @CurrentUser() user: User,
   ): Promise<Property> {
     return this.propertiesService.update(id, dto, organizationId, user.id);
   }
   ```

2. **Implement service method:**
   ```typescript
   // packages/backend/src/modules/properties/properties.service.ts
   import { NotFoundException, ForbiddenException } from '@nestjs/common';
   import { AppLogger } from '@/common/logger/logger.service';

   async update(
     id: string,
     dto: UpdatePropertyDto,
     organizationId: string,
     userId: string,
   ): Promise<Property> {
     this.logger.log('Updating property', {
       propertyId: id,
       organizationId,
       userId,
     });

     // Fetch existing property
     const existing = await this.prisma.property.findUnique({
       where: { id },
     });

     if (!existing) {
       this.logger.warn('Property not found', { propertyId: id, organizationId });
       throw new NotFoundException(`Property ${id} not found`);
     }

     // Verify organization ownership
     if (existing.organizationId !== organizationId) {
       this.logger.error('Property belongs to different organization', {
         propertyId: id,
         requestedOrgId: organizationId,
         actualOrgId: existing.organizationId,
       });
       throw new ForbiddenException('You do not have access to this property');
     }

     // Compute changes for logging (TASK-022)
     const changes = this.computeChanges(existing, dto);

     // Update property
     const updated = await this.prisma.property.update({
       where: { id },
       data: dto,
     });

     this.logger.log('Property updated successfully', {
       propertyId: id,
       organizationId,
       changes,
     });

     return updated;
   }

   private computeChanges(before: Property, after: UpdatePropertyDto): Record<string, any> {
     const changes: Record<string, any> = {};
     Object.keys(after).forEach((key) => {
       if (before[key] !== after[key]) {
         changes[key] = { before: before[key], after: after[key] };
       }
     });
     return changes;
   }
   ```

#### Acceptance Criteria

- [ ] PUT endpoint created and accessible at `/api/v1/properties/:id`
- [ ] Returns 200 OK with updated property on success
- [ ] Returns 404 Not Found when property doesn't exist
- [ ] Returns 403 Forbidden when user's org doesn't match property's org
- [ ] Returns 400 Bad Request for validation errors (handled by DTO)
- [ ] Only allows updates from ORGANIZATION_ADMIN or PROPERTY_MANAGER roles
- [ ] Updates only the fields provided in DTO (partial updates)
- [ ] Logging implemented (see TASK-022)

#### Testing

Covered by TASK-024 (Integration Tests).

---

### TASK-022: Add Winston Logging for Property Updates

**Area:** Backend (NestJS)
**Estimate:** 2-3h
**Priority:** P1 (High)
**Dependencies:** TASK-021, Phase 0 Winston setup

#### Description

Add structured logging for successful and failed property updates per Phase 0 logging standards. Logs should include before/after diffs and correlation IDs.

#### Implementation Steps

1. **Update service to log changes:**
   ```typescript
   // Already partially implemented in TASK-021, enhance here:

   async update(id: string, dto: UpdatePropertyDto, organizationId: string, userId: string): Promise<Property> {
     const correlationId = this.getCorrelationId(); // From request context

     this.logger.log('property.update_started', {
       propertyId: id,
       organizationId,
       userId,
       correlationId,
     });

     try {
       const existing = await this.findOne(id, organizationId);
       const changes = this.computeChanges(existing, dto);

       const updated = await this.prisma.property.update({
         where: { id },
         data: dto,
       });

       this.logger.log('property.updated', {
         propertyId: id,
         organizationId,
         userId,
         changes,
         correlationId,
       });

       return updated;
     } catch (error) {
       this.logger.error('property.update_failed', error.stack, {
         propertyId: id,
         organizationId,
         userId,
         error: {
           name: error.name,
           message: error.message,
         },
         correlationId,
       });
       throw error;
     }
   }
   ```

2. **Log format examples:**

   **Success:**
   ```json
   {
     "level": "info",
     "message": "property.updated",
     "timestamp": "2025-11-22T10:30:00.000Z",
     "context": "PropertiesService",
     "propertyId": "prop-123",
     "organizationId": "org-456",
     "userId": "user-789",
     "changes": {
       "name": { "before": "Old Name", "after": "New Name" },
       "city": { "before": "Old City", "after": "New City" }
     },
     "correlationId": "uuid-here"
   }
   ```

   **Failure:**
   ```json
   {
     "level": "error",
     "message": "property.update_failed",
     "timestamp": "2025-11-22T10:31:00.000Z",
     "context": "PropertiesService",
     "propertyId": "prop-123",
     "organizationId": "org-456",
     "userId": "user-789",
     "error": {
       "name": "NotFoundException",
       "message": "Property prop-123 not found"
     },
     "trace": "Error: Property prop-123 not found\n    at ...",
     "correlationId": "uuid-here"
   }
   ```

#### Acceptance Criteria

- [ ] Log entry created on every property update attempt
- [ ] Success logs include before/after diff (not full payload)
- [ ] Error logs include exception name, message, stack trace
- [ ] All logs include correlationId from request middleware
- [ ] No sensitive data logged (passwords, tokens, etc.)
- [ ] Logs visible in Winston output (console + file)
- [ ] Log level appropriate (info for success, error for failures, warn for 404s)

#### Testing

```typescript
// packages/backend/src/modules/properties/properties.service.spec.ts
describe('PropertiesService - Logging', () => {
  let logger: AppLogger;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;
  });

  it('should log successful property update', async () => {
    const service = new PropertiesService(prisma, logger);
    await service.update('prop-123', updateDto, 'org-456', 'user-789');

    expect(logger.log).toHaveBeenCalledWith(
      'property.updated',
      expect.objectContaining({
        propertyId: 'prop-123',
        organizationId: 'org-456',
        changes: expect.any(Object),
      })
    );
  });

  it('should log errors on update failure', async () => {
    const service = new PropertiesService(prisma, logger);
    jest.spyOn(prisma.property, 'update').mockRejectedValue(new Error('DB Error'));

    await expect(service.update('prop-123', updateDto, 'org-456', 'user-789')).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      'property.update_failed',
      expect.any(String), // Stack trace
      expect.objectContaining({
        propertyId: 'prop-123',
        error: expect.objectContaining({ message: 'DB Error' }),
      })
    );
  });
});
```

---

### TASK-023: Backend Unit Tests for Property Update

**Area:** Backend (Jest)
**Estimate:** 3h
**Priority:** P0 (Blocking for CI)
**Dependencies:** TASK-021

#### Description

Add comprehensive unit tests for `PropertiesService.update` covering happy path and error scenarios.

#### Implementation Steps

1. **Create test file:**
   ```typescript
   // packages/backend/src/modules/properties/properties.service.spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import { PropertiesService } from './properties.service';
   import { PrismaService } from '@/prisma/prisma.service';
   import { AppLogger } from '@/common/logger/logger.service';
   import { NotFoundException, ForbiddenException } from '@nestjs/common';
   import { PropertyType } from '@prisma/client';

   describe('PropertiesService - Update', () => {
     let service: PropertiesService;
     let prisma: PrismaService;
     let logger: AppLogger;

     const mockProperty = {
       id: 'prop-123',
       organizationId: 'org-456',
       name: 'Old Name',
       addressLine1: '123 Main St',
       city: 'Austin',
       state: 'TX',
       postalCode: '78701',
       country: 'US',
       propertyType: PropertyType.MULTIFAMILY,
       active: true,
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
             provide: AppLogger,
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
       logger = module.get<AppLogger>(AppLogger);
     });

     afterEach(() => {
       jest.clearAllMocks();
     });

     describe('update', () => {
       it('should update property successfully', async () => {
         const updateDto = {
           name: 'New Name',
           addressLine1: '123 Main St',
           city: 'Dallas',
           state: 'TX',
           postalCode: '75201',
           country: 'US',
           propertyType: PropertyType.MULTIFAMILY,
           active: true,
         };

         const updatedProperty = { ...mockProperty, ...updateDto };

         jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty);
         jest.spyOn(prisma.property, 'update').mockResolvedValue(updatedProperty);

         const result = await service.update('prop-123', updateDto, 'org-456', 'user-789');

         expect(result).toEqual(updatedProperty);
         expect(prisma.property.update).toHaveBeenCalledWith({
           where: { id: 'prop-123' },
           data: updateDto,
         });
         expect(logger.log).toHaveBeenCalledWith('property.updated', expect.any(Object));
       });

       it('should throw NotFoundException when property does not exist', async () => {
         jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);

         await expect(
           service.update('prop-999', {} as any, 'org-456', 'user-789')
         ).rejects.toThrow(NotFoundException);

         expect(logger.warn).toHaveBeenCalled();
       });

       it('should throw ForbiddenException when organization does not match', async () => {
         jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty);

         await expect(
           service.update('prop-123', {} as any, 'org-999', 'user-789') // Different org
         ).rejects.toThrow(ForbiddenException);

         expect(logger.error).toHaveBeenCalledWith(
           'Property belongs to different organization',
           undefined,
           expect.any(Object)
         );
       });

       it('should only update allowed fields', async () => {
         const updateDto = {
           name: 'New Name',
           addressLine1: '456 Oak Ave',
           city: 'Austin',
           state: 'TX',
           postalCode: '78701',
           country: 'US',
           propertyType: PropertyType.SINGLE_FAMILY,
           active: false,
         };

         jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty);
         jest.spyOn(prisma.property, 'update').mockResolvedValue({ ...mockProperty, ...updateDto });

         await service.update('prop-123', updateDto, 'org-456', 'user-789');

         expect(prisma.property.update).toHaveBeenCalledWith({
           where: { id: 'prop-123' },
           data: updateDto,
         });
       });

       it('should log changes between old and new values', async () => {
         const updateDto = {
           name: 'New Name',
           addressLine1: '123 Main St',
           city: 'Dallas', // Changed
           state: 'TX',
           postalCode: '78701',
           country: 'US',
           propertyType: PropertyType.MULTIFAMILY,
           active: true,
         };

         jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty);
         jest.spyOn(prisma.property, 'update').mockResolvedValue({ ...mockProperty, ...updateDto });

         await service.update('prop-123', updateDto, 'org-456', 'user-789');

         expect(logger.log).toHaveBeenCalledWith(
           'property.updated',
           expect.objectContaining({
             changes: expect.objectContaining({
               name: { before: 'Old Name', after: 'New Name' },
               city: { before: 'Austin', after: 'Dallas' },
             }),
           })
         );
       });
     });
   });
   ```

#### Acceptance Criteria

- [ ] Tests pass in local Jest runner
- [ ] Tests pass in CI pipeline
- [ ] Coverage includes:
  - Happy path (successful update)
  - Property not found (404)
  - Wrong organization (403)
  - Field update verification
  - Change logging verification
- [ ] No test flakiness
- [ ] Tests use proper mocking (PrismaService, Logger)

---

### TASK-024: Integration Tests for `PUT /properties/:id`

**Area:** Backend (Jest + Supertest)
**Estimate:** 3-4h
**Priority:** P0 (Blocking for CI)
**Dependencies:** TASK-021

#### Description

Add API-level integration tests covering the full request/response cycle with a test database.

#### Implementation Steps

1. **Create integration test file:**
   ```typescript
   // packages/backend/test/properties.e2e-spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import { INestApplication, ValidationPipe } from '@nestjs/common';
   import * as request from 'supertest';
   import { AppModule } from '@/app.module';
   import { PrismaService } from '@/prisma/prisma.service';
   import { PropertyType } from '@prisma/client';

   describe('PropertiesController (e2e) - PUT /properties/:id', () => {
     let app: INestApplication;
     let prisma: PrismaService;
     let authToken: string;
     let organizationId: string;
     let propertyId: string;

     beforeAll(async () => {
       const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();

       app = moduleFixture.createNestApplication();
       app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
       await app.init();

       prisma = app.get<PrismaService>(PrismaService);

       // Create test organization and user
       const org = await prisma.organization.create({
         data: { name: 'Test Org', slug: 'test-org' },
       });
       organizationId = org.id;

       const user = await prisma.user.create({
         data: {
           email: 'test@example.com',
           password: 'hashed_password',
           firstName: 'Test',
           lastName: 'User',
           role: 'ORGANIZATION_ADMIN',
           organizationId: org.id,
         },
       });

       // Get auth token (assume login endpoint exists)
       const loginResponse = await request(app.getHttpServer())
         .post('/api/v1/auth/login')
         .send({ email: 'test@example.com', password: 'password' });

       authToken = loginResponse.body.accessToken;

       // Create a test property
       const property = await prisma.property.create({
         data: {
           organizationId: org.id,
           name: 'Test Property',
           addressLine1: '123 Main St',
           city: 'Austin',
           state: 'TX',
           postalCode: '78701',
           country: 'US',
           propertyType: PropertyType.MULTIFAMILY,
           active: true,
         },
       });
       propertyId = property.id;
     });

     afterAll(async () => {
       await prisma.property.deleteMany({ where: { organizationId } });
       await prisma.user.deleteMany({ where: { organizationId } });
       await prisma.organization.delete({ where: { id: organizationId } });
       await app.close();
     });

     describe('PUT /api/v1/properties/:id', () => {
       it('should update property successfully (200)', async () => {
         const updateDto = {
           name: 'Updated Name',
           addressLine1: '456 Oak Ave',
           city: 'Dallas',
           state: 'TX',
           postalCode: '75201',
           country: 'US',
           propertyType: 'SINGLE_FAMILY',
           active: true,
         };

         const response = await request(app.getHttpServer())
           .put(`/api/v1/properties/${propertyId}`)
           .set('Authorization', `Bearer ${authToken}`)
           .send(updateDto)
           .expect(200);

         expect(response.body).toMatchObject(updateDto);
         expect(response.body.id).toBe(propertyId);

         // Verify in database
         const updated = await prisma.property.findUnique({ where: { id: propertyId } });
         expect(updated.name).toBe('Updated Name');
         expect(updated.city).toBe('Dallas');
       });

       it('should return 400 for invalid data', async () => {
         const invalidDto = {
           name: '', // Empty name (invalid)
           addressLine1: '123 Main',
           city: 'Austin',
           state: 'TX',
           postalCode: 'INVALID', // Bad postal code
           country: 'US',
           propertyType: 'MULTIFAMILY',
           active: true,
         };

         const response = await request(app.getHttpServer())
           .put(`/api/v1/properties/${propertyId}`)
           .set('Authorization', `Bearer ${authToken}`)
           .send(invalidDto)
           .expect(400);

         expect(response.body.message).toContain('validation failed');
       });

       it('should return 401 without auth token', async () => {
         const updateDto = {
           name: 'Test',
           addressLine1: '123 Main',
           city: 'Austin',
           state: 'TX',
           postalCode: '78701',
           country: 'US',
           propertyType: 'MULTIFAMILY',
           active: true,
         };

         await request(app.getHttpServer())
           .put(`/api/v1/properties/${propertyId}`)
           .send(updateDto)
           .expect(401);
       });

       it('should return 404 for non-existent property', async () => {
         const updateDto = {
           name: 'Test',
           addressLine1: '123 Main',
           city: 'Austin',
           state: 'TX',
           postalCode: '78701',
           country: 'US',
           propertyType: 'MULTIFAMILY',
           active: true,
         };

         await request(app.getHttpServer())
           .put('/api/v1/properties/non-existent-id')
           .set('Authorization', `Bearer ${authToken}`)
           .send(updateDto)
           .expect(404);
       });

       it('should return 403 when updating property from different organization', async () => {
         // Create another organization and property
         const otherOrg = await prisma.organization.create({
           data: { name: 'Other Org', slug: 'other-org' },
         });

         const otherProperty = await prisma.property.create({
           data: {
             organizationId: otherOrg.id,
             name: 'Other Property',
             addressLine1: '789 Pine St',
             city: 'Houston',
             state: 'TX',
             postalCode: '77001',
             country: 'US',
             propertyType: PropertyType.COMMERCIAL,
             active: true,
           },
         });

         const updateDto = {
           name: 'Hacked Name',
           addressLine1: '789 Pine St',
           city: 'Houston',
           state: 'TX',
           postalCode: '77001',
           country: 'US',
           propertyType: 'COMMERCIAL',
           active: true,
         };

         // Try to update with current user's token (different org)
         await request(app.getHttpServer())
           .put(`/api/v1/properties/${otherProperty.id}`)
           .set('Authorization', `Bearer ${authToken}`)
           .send(updateDto)
           .expect(403);

         // Cleanup
         await prisma.property.delete({ where: { id: otherProperty.id } });
         await prisma.organization.delete({ where: { id: otherOrg.id } });
       });
     });
   });
   ```

#### Acceptance Criteria

- [ ] All scenarios pass in local test runner
- [ ] All scenarios pass in CI with test database
- [ ] Coverage includes:
  - 200 OK on successful update
  - 400 Bad Request for validation errors
  - 401 Unauthorized without token
  - 403 Forbidden for cross-org access
  - 404 Not Found for non-existent property
- [ ] Tests clean up data (no test pollution)
- [ ] Tests use realistic test data
- [ ] Database state verified after updates

---

## Frontend Tasks

### TASK-025: Create `PropertyEditModal` Component

**Area:** Frontend (React, shadcn/ui)
**Estimate:** 4-5h
**Priority:** P0 (Blocking)
**Dependencies:** None

#### Description

Implement the modal component with all fields and layout from the feature spec. This establishes the reusable pattern for other edit modals.

#### Implementation Steps

1. **Create component file:**
   ```tsx
   // packages/admin/src/features/properties/components/PropertyEditModal.tsx
   import { useState } from 'react';
   import { Property } from '@/types/property';
   import {
     Dialog,
     DialogContent,
     DialogHeader,
     DialogTitle,
     DialogFooter,
   } from '@/components/ui/dialog';
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';
   import { Textarea } from '@/components/ui/textarea';
   import {
     Select,
     SelectContent,
     SelectItem,
     SelectTrigger,
     SelectValue,
   } from '@/components/ui/select';
   import { Switch } from '@/components/ui/switch';

   interface PropertyEditModalProps {
     property: Property;
     isOpen: boolean;
     onClose: () => void;
     onUpdated: (updated: Property) => void;
   }

   export function PropertyEditModal({
     property,
     isOpen,
     onClose,
     onUpdated,
   }: PropertyEditModalProps) {
     const [formData, setFormData] = useState({
       name: property.name,
       addressLine1: property.addressLine1,
       addressLine2: property.addressLine2 || '',
       city: property.city,
       state: property.state,
       postalCode: property.postalCode,
       country: property.country || 'US',
       propertyType: property.propertyType,
       notes: property.notes || '',
       active: property.active,
     });

     const [isSubmitting, setIsSubmitting] = useState(false);
     const [errors, setErrors] = useState<Record<string, string>>({});

     const handleChange = (field: string, value: any) => {
       setFormData((prev) => ({ ...prev, [field]: value }));
       // Clear error for this field
       if (errors[field]) {
         setErrors((prev) => ({ ...prev, [field]: '' }));
       }
     };

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       // TODO: Wire to API (TASK-027)
       console.log('Submitting:', formData);
     };

     return (
       <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Edit Property</DialogTitle>
           </DialogHeader>

           <form onSubmit={handleSubmit} className="space-y-6">
             {/* Basic Info Section */}
             <div className="space-y-4">
               <h3 className="text-sm font-semibold text-gray-700">Basic Info</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="name">Property Name *</Label>
                   <Input
                     id="name"
                     value={formData.name}
                     onChange={(e) => handleChange('name', e.target.value)}
                     maxLength={120}
                     required
                   />
                   {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                 </div>

                 <div>
                   <Label htmlFor="propertyType">Property Type *</Label>
                   <Select
                     value={formData.propertyType}
                     onValueChange={(value) => handleChange('propertyType', value)}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
                       <SelectItem value="MULTI_FAMILY">Multi-Family</SelectItem>
                       <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                       <SelectItem value="MIXED_USE">Mixed Use</SelectItem>
                       <SelectItem value="OTHER">Other</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="flex items-center space-x-2">
                   <Switch
                     id="active"
                     checked={formData.active}
                     onCheckedChange={(checked) => handleChange('active', checked)}
                   />
                   <Label htmlFor="active">Active</Label>
                 </div>
               </div>
             </div>

             {/* Address Section */}
             <div className="space-y-4">
               <h3 className="text-sm font-semibold text-gray-700">Address</h3>
               <div className="grid grid-cols-1 gap-4">
                 <div>
                   <Label htmlFor="addressLine1">Address Line 1 *</Label>
                   <Input
                     id="addressLine1"
                     value={formData.addressLine1}
                     onChange={(e) => handleChange('addressLine1', e.target.value)}
                     maxLength={200}
                     required
                   />
                 </div>

                 <div>
                   <Label htmlFor="addressLine2">Address Line 2</Label>
                   <Input
                     id="addressLine2"
                     value={formData.addressLine2}
                     onChange={(e) => handleChange('addressLine2', e.target.value)}
                     maxLength={200}
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                     <Label htmlFor="city">City *</Label>
                     <Input
                       id="city"
                       value={formData.city}
                       onChange={(e) => handleChange('city', e.target.value)}
                       maxLength={100}
                       required
                     />
                   </div>

                   <div>
                     <Label htmlFor="state">State *</Label>
                     <Input
                       id="state"
                       value={formData.state}
                       onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                       maxLength={2}
                       pattern="[A-Z]{2}"
                       required
                     />
                   </div>

                   <div>
                     <Label htmlFor="postalCode">Postal Code *</Label>
                     <Input
                       id="postalCode"
                       value={formData.postalCode}
                       onChange={(e) => handleChange('postalCode', e.target.value)}
                       pattern="^\d{5}(-\d{4})?$"
                       required
                     />
                   </div>
                 </div>
               </div>
             </div>

             {/* Notes Section */}
             <div>
               <Label htmlFor="notes">Notes</Label>
               <Textarea
                 id="notes"
                 value={formData.notes}
                 onChange={(e) => handleChange('notes', e.target.value)}
                 maxLength={2000}
                 rows={4}
               />
             </div>

             <DialogFooter>
               <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                 Cancel
               </Button>
               <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting ? 'Saving...' : 'Save changes'}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>
     );
   }
   ```

2. **Create types file:**
   ```typescript
   // packages/admin/src/types/property.ts
   export interface Property {
     id: string;
     organizationId: string;
     name: string;
     addressLine1: string;
     addressLine2?: string | null;
     city: string;
     state: string;
     postalCode: string;
     country: string;
     propertyType: PropertyType;
     notes?: string | null;
     active: boolean;
     createdAt: string;
     updatedAt: string;
   }

   export enum PropertyType {
     SINGLE_FAMILY = 'SINGLE_FAMILY',
     MULTI_FAMILY = 'MULTI_FAMILY',
     COMMERCIAL = 'COMMERCIAL',
     MIXED_USE = 'MIXED_USE',
     OTHER = 'OTHER',
   }
   ```

#### Acceptance Criteria

- [ ] Modal component renders correctly
- [ ] All fields from spec included
- [ ] Two-column layout on desktop, single-column on mobile
- [ ] Fields grouped logically (Basic Info, Address, Notes)
- [ ] Required fields marked with asterisk
- [ ] Form pre-populated with property data
- [ ] Cancel button closes modal
- [ ] Save button shows loading state when submitting
- [ ] No TypeScript errors
- [ ] No `any` types used

---

### TASK-026: Add Client-Side Validation

**Area:** Frontend (React)
**Estimate:** 2-3h
**Priority:** P1 (High)
**Dependencies:** TASK-025

#### Description

Add validation rules matching backend DTO using Zod schema and React Hook Form (or manual validation if preferred).

#### Implementation Steps

1. **Install dependencies (if not already installed):**
   ```bash
   pnpm add react-hook-form @hookform/resolvers zod
   ```

2. **Create validation schema:**
   ```typescript
   // packages/admin/src/features/properties/schemas/property-edit.schema.ts
   import { z } from 'zod';

   export const propertyEditSchema = z.object({
     name: z.string().min(1, 'Name is required').max(120, 'Name too long'),
     addressLine1: z.string().min(1, 'Address is required').max(200, 'Address too long'),
     addressLine2: z.string().max(200).optional().nullable(),
     city: z.string().min(1, 'City is required').max(100, 'City name too long'),
     state: z.string().regex(/^[A-Z]{2}$/, 'State must be 2 letters'),
     postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code'),
     country: z.string().length(2, 'Country must be 2 letters'),
     propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_FAMILY', 'COMMERCIAL', 'MIXED_USE', 'OTHER']),
     notes: z.string().max(2000).optional().nullable(),
     active: z.boolean(),
   });

   export type PropertyEditFormData = z.infer<typeof propertyEditSchema>;
   ```

3. **Update component to use React Hook Form:**
   ```tsx
   // packages/admin/src/features/properties/components/PropertyEditModal.tsx
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   import { propertyEditSchema, PropertyEditFormData } from '../schemas/property-edit.schema';

   export function PropertyEditModal({ property, isOpen, onClose, onUpdated }: PropertyEditModalProps) {
     const {
       register,
       handleSubmit,
       formState: { errors, isSubmitting },
       setValue,
       watch,
     } = useForm<PropertyEditFormData>({
       resolver: zodResolver(propertyEditSchema),
       defaultValues: {
         name: property.name,
         addressLine1: property.addressLine1,
         addressLine2: property.addressLine2 || '',
         city: property.city,
         state: property.state,
         postalCode: property.postalCode,
         country: property.country || 'US',
         propertyType: property.propertyType,
         notes: property.notes || '',
         active: property.active,
       },
     });

     const onSubmit = async (data: PropertyEditFormData) => {
       // TODO: Wire to API (TASK-027)
       console.log('Validated data:', data);
     };

     return (
       <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent>
           <form onSubmit={handleSubmit(onSubmit)}>
             {/* Name field with validation */}
             <div>
               <Label htmlFor="name">Property Name *</Label>
               <Input id="name" {...register('name')} />
               {errors.name && (
                 <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
               )}
             </div>

             {/* Other fields similar pattern... */}
           </form>
         </DialogContent>
       </Dialog>
     );
   }
   ```

#### Acceptance Criteria

- [ ] Zod schema matches backend validation rules
- [ ] React Hook Form integrated
- [ ] Real-time validation on field blur
- [ ] Field-level error messages displayed
- [ ] Submit button disabled until form valid
- [ ] Required fields enforced
- [ ] Max length enforced
- [ ] Postal code regex validation
- [ ] State regex validation (2-letter code)
- [ ] Form cannot be submitted with invalid data

---

### TASK-027: Wire Modal to API

**Area:** Frontend (React Query / API Integration)
**Estimate:** 3-4h
**Priority:** P0 (Blocking)
**Dependencies:** TASK-025, TASK-026, TASK-021 (backend)

#### Description

Connect the modal to the backend API using React Query (or existing data fetching layer). Implement optimistic updates and error handling.

#### Implementation Steps

1. **Create API service:**
   ```typescript
   // packages/admin/src/services/api/properties.ts
   import { apiClient } from './client';
   import { Property } from '@/types/property';
   import { PropertyEditFormData } from '@/features/properties/schemas/property-edit.schema';

   export const propertiesApi = {
     update: async (id: string, data: PropertyEditFormData): Promise<Property> => {
       const response = await apiClient.put(`/properties/${id}`, data);
       return response.data;
     },
   };
   ```

2. **Create React Query hook:**
   ```typescript
   // packages/admin/src/features/properties/hooks/useUpdateProperty.ts
   import { useMutation, useQueryClient } from '@tanstack/react-query';
   import { propertiesApi } from '@/services/api/properties';
   import { Property } from '@/types/property';
   import { PropertyEditFormData } from '../schemas/property-edit.schema';
   import { toast } from '@/components/ui/use-toast';
   import { trackEvent } from '@/lib/analytics';

   export function useUpdateProperty() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: ({ id, data }: { id: string; data: PropertyEditFormData }) =>
         propertiesApi.update(id, data),

       onMutate: async ({ id, data }) => {
         // Cancel outgoing queries
         await queryClient.cancelQueries({ queryKey: ['properties'] });

         // Snapshot previous value
         const previousProperties = queryClient.getQueryData<Property[]>(['properties']);

         // Optimistically update cache
         queryClient.setQueryData<Property[]>(['properties'], (old) =>
           old?.map((p) => (p.id === id ? { ...p, ...data } : p))
         );

         return { previousProperties };
       },

       onSuccess: (updatedProperty) => {
         // Invalidate and refetch
         queryClient.invalidateQueries({ queryKey: ['properties'] });
         queryClient.invalidateQueries({ queryKey: ['property', updatedProperty.id] });

         toast({
           title: 'Property updated',
           description: 'Your changes have been saved.',
         });

         trackEvent('PROPERTY_EDIT_SAVED', {
           propertyId: updatedProperty.id,
           source: 'list', // or 'detail'
         });
       },

       onError: (error, variables, context) => {
         // Rollback on error
         if (context?.previousProperties) {
           queryClient.setQueryData(['properties'], context.previousProperties);
         }

         const errorType = error.response?.status === 400 ? 'validation' :
                          error.response?.status >= 500 ? 'server' : 'network';

         toast({
           title: 'Error updating property',
           description: error.response?.data?.message || 'Please try again.',
           variant: 'destructive',
         });

         trackEvent('PROPERTY_EDIT_SAVE_FAILED', {
           propertyId: variables.id,
           errorType,
         });
       },
     });
   }
   ```

3. **Update modal component:**
   ```tsx
   // packages/admin/src/features/properties/components/PropertyEditModal.tsx
   import { useUpdateProperty } from '../hooks/useUpdateProperty';
   import { trackEvent } from '@/lib/analytics';

   export function PropertyEditModal({ property, isOpen, onClose, onUpdated }: PropertyEditModalProps) {
     const updateProperty = useUpdateProperty();

     const onSubmit = async (data: PropertyEditFormData) => {
       trackEvent('PROPERTY_EDIT_OPENED', {
         propertyId: property.id,
         source: 'list', // Could be passed as prop
       });

       try {
         const updated = await updateProperty.mutateAsync({
           id: property.id,
           data,
         });

         onUpdated(updated);
         onClose();
       } catch (error) {
         // Error already handled in mutation
       }
     };

     // ... rest of component
   }
   ```

#### Acceptance Criteria

- [ ] API call made to `PUT /api/v1/properties/:id`
- [ ] Optimistic UI update (immediate feedback)
- [ ] Success: modal closes, toast shown, cache invalidated
- [ ] Error: modal stays open, error message shown, cache rolled back
- [ ] Network errors handled gracefully
- [ ] Validation errors displayed in form
- [ ] Loading state shown during submission
- [ ] React Query cache properly managed

---

### TASK-028: Add Analytics Events

**Area:** Frontend (Analytics)
**Estimate:** 1-2h
**Priority:** P2 (Medium)
**Dependencies:** TASK-027, Phase 0 analytics setup

#### Description

Instrument the modal with analytics events using the `trackEvent` utility from Phase 0.

#### Implementation Steps

**Events already added in TASK-027 code above:**

1. **PROPERTY_EDIT_OPENED** - When modal opens
2. **PROPERTY_EDIT_SAVED** - On successful save
3. **PROPERTY_EDIT_SAVE_FAILED** - On save error

**Additional implementation:**

```typescript
// Track fields changed count
const calculateFieldsChanged = (before: Property, after: PropertyEditFormData): number => {
  return Object.keys(after).filter((key) => before[key] !== after[key]).length;
};

// In onSubmit:
const fieldsChangedCount = calculateFieldsChanged(property, data);

trackEvent('PROPERTY_EDIT_SAVED', {
  propertyId: property.id,
  source: 'list',
  fieldsChangedCount, // Added
});
```

#### Acceptance Criteria

- [ ] `PROPERTY_EDIT_OPENED` event sent when modal opens
- [ ] Event includes `propertyId` and `source`
- [ ] `PROPERTY_EDIT_SAVED` event sent on success
- [ ] Event includes `fieldsChangedCount`
- [ ] `PROPERTY_EDIT_SAVE_FAILED` event sent on error
- [ ] Event includes `errorType` (validation, network, server)
- [ ] Events visible in dev console (Phase 0 setup)
- [ ] Events sent to backend events API in production

---

### TASK-029: Component Tests for PropertyEditModal

**Area:** Frontend (Vitest + React Testing Library)
**Estimate:** 3h
**Priority:** P1 (High)
**Dependencies:** TASK-025, TASK-026, TASK-027

#### Description

Add comprehensive component tests covering rendering, validation, API interaction, and error handling.

#### Implementation Steps

```typescript
// packages/admin/src/features/properties/components/PropertyEditModal.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropertyEditModal } from './PropertyEditModal';
import { propertiesApi } from '@/services/api/properties';

// Mock API
vi.mock('@/services/api/properties');

const mockProperty = {
  id: 'prop-123',
  organizationId: 'org-456',
  name: 'Test Property',
  addressLine1: '123 Main St',
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'US',
  propertyType: 'MULTIFAMILY',
  active: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('PropertyEditModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      property: mockProperty,
      isOpen: true,
      onClose: vi.fn(),
      onUpdated: vi.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <PropertyEditModal {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('should render with initial property data', () => {
    renderModal();

    expect(screen.getByLabelText(/property name/i)).toHaveValue('Test Property');
    expect(screen.getByLabelText(/address line 1/i)).toHaveValue('123 Main St');
    expect(screen.getByLabelText(/city/i)).toHaveValue('Austin');
    expect(screen.getByLabelText(/state/i)).toHaveValue('TX');
    expect(screen.getByLabelText(/postal code/i)).toHaveValue('78701');
  });

  it('should show validation errors for empty required fields', async () => {
    renderModal();
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/property name/i);
    await user.clear(nameInput);
    await user.tab(); // Blur to trigger validation

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid postal code', async () => {
    renderModal();
    const user = userEvent.setup();

    const postalCodeInput = screen.getByLabelText(/postal code/i);
    await user.clear(postalCodeInput);
    await user.type(postalCodeInput, 'INVALID');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/invalid postal code/i)).toBeInTheDocument();
    });
  });

  it('should call API and onUpdated on successful save', async () => {
    const onUpdated = vi.fn();
    const updatedProperty = { ...mockProperty, name: 'Updated Name' };

    vi.mocked(propertiesApi.update).mockResolvedValue(updatedProperty);

    renderModal({ onUpdated });
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/property name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(propertiesApi.update).toHaveBeenCalledWith('prop-123', expect.objectContaining({
        name: 'Updated Name',
      }));
      expect(onUpdated).toHaveBeenCalledWith(updatedProperty);
    });
  });

  it('should display error message on API failure without closing modal', async () => {
    vi.mocked(propertiesApi.update).mockRejectedValue(new Error('Network error'));

    const onClose = vi.fn();
    renderModal({ onClose });
    const user = userEvent.setup();

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/error updating property/i)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled(); // Modal should stay open
    });
  });

  it('should close modal when cancel button clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const user = userEvent.setup();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });
});
```

#### Acceptance Criteria

- [ ] Tests render component without errors
- [ ] Test: initial values populated from property prop
- [ ] Test: validation errors shown for empty required fields
- [ ] Test: validation errors shown for invalid formats
- [ ] Test: successful API call invokes onUpdated and closes modal
- [ ] Test: API failure shows error and keeps modal open
- [ ] Test: cancel button closes modal
- [ ] All tests pass locally and in CI
- [ ] No flaky tests

---

## E2E Task

### TASK-030: Playwright Test - Property Edit Flow

**Area:** E2E (Playwright)
**Estimate:** 3-4h
**Priority:** P1 (High)
**Dependencies:** All backend + frontend tasks

#### Description

Add end-to-end test covering the complete user journey from login to property edit in a real browser.

#### Implementation Steps

```typescript
// packages/e2e/tests/property-edit.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Property Edit Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Seed database with test property
    // (Assume seeded via test setup or API)
  });

  test('landlord can edit property name and city', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@propertymaster.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // 2. Navigate to Properties
    await expect(page).toHaveURL(/.*\/dashboard/);
    await page.click('a[href="/properties"]');
    await expect(page).toHaveURL(/.*\/properties/);

    // 3. Open edit modal
    const firstProperty = page.locator('[data-testid="property-row"]').first();
    await firstProperty.locator('button[aria-label="Edit"]').click();

    // 4. Verify modal opened
    await expect(page.locator('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /edit property/i })).toBeVisible();

    // 5. Change name and city
    const nameInput = page.getByLabel(/property name/i);
    await nameInput.fill('Updated Property Name');

    const cityInput = page.getByLabel(/city/i);
    await cityInput.fill('Dallas');

    // 6. Save changes
    await page.getByRole('button', { name: /save changes/i }).click();

    // 7. Verify modal closed
    await expect(page.locator('dialog')).not.toBeVisible();

    // 8. Verify table shows updated values
    await expect(firstProperty).toContainText('Updated Property Name');
    await expect(firstProperty).toContainText('Dallas');

    // 9. Refresh page and verify persistence
    await page.reload();
    await expect(page.locator('[data-testid="property-row"]').first()).toContainText(
      'Updated Property Name'
    );
  });

  test('should show error for invalid postal code', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@propertymaster.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    await page.click('a[href="/properties"]');
    await page.locator('[data-testid="property-row"]').first().locator('button[aria-label="Edit"]').click();

    const postalCodeInput = page.getByLabel(/postal code/i);
    await postalCodeInput.fill('INVALID');

    await page.getByRole('button', { name: /save changes/i }).click();

    // Should show validation error
    await expect(page.getByText(/invalid postal code/i)).toBeVisible();

    // Modal should still be open
    await expect(page.locator('dialog')).toBeVisible();
  });
});
```

#### Acceptance Criteria

- [ ] Test runs in headless mode (CI compatible)
- [ ] Test uses seeded demo data
- [ ] Test covers happy path (login → navigate → edit → save → verify)
- [ ] Test verifies modal closes on success
- [ ] Test verifies table updates immediately
- [ ] Test verifies changes persist after page refresh
- [ ] Test covers validation error scenario
- [ ] Stable selectors used (data-testid or semantic)
- [ ] No hardcoded delays (use Playwright's auto-waiting)
- [ ] Screenshots captured on failure

---

## Implementation Sequence

### Week 1 (Backend Focus)

**Day 1-2:** TASK-020, TASK-021 (DTO + Endpoint)
**Day 3:** TASK-022 (Logging)
**Day 4:** TASK-023, TASK-024 (Tests)

### Week 2 (Frontend Focus)

**Day 1:** TASK-025 (Modal Component)
**Day 2:** TASK-026 (Validation)
**Day 3:** TASK-027 (API Integration)
**Day 4:** TASK-028, TASK-029 (Analytics + Tests)
**Day 5:** TASK-030 (E2E Test)

---

## Definition of Done (Recap)

All tasks complete when:

- [ ] All 11 tasks have passing acceptance criteria
- [ ] Unit tests passing (backend + frontend)
- [ ] Integration tests passing
- [ ] E2E test passing
- [ ] Code reviewed and approved
- [ ] No new `any` types introduced
- [ ] TypeScript strict mode passes
- [ ] Documentation updated (if needed)
- [ ] Feature spec marked as "Implemented"
- [ ] Deployed to staging environment
- [ ] QA verified in staging

---

## Related Documents

- **Feature Spec:** `docs/features/property-edit-modal.md`
- **Financial Model:** `docs/FINANCIAL_DOMAIN_MODEL.md`
- **Schema Mapping:** `docs/schema/FINANCIAL_SCHEMA_MAPPING.md`
- **Phase 0 Tasks:** `docs/PHASE_0_TASKS.md`
- **Roadmap:** `ROADMAP.md`
