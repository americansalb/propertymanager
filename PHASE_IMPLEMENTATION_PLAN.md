# 🏗️ PHASE IMPLEMENTATION PLAN

## **Mission: Build a Self-Sustaining, Production-Ready Development Process**

This document defines the **development standards, logging infrastructure, testing strategy, and quality gates** required to implement each phase without constant oversight. Every feature must be **self-documenting, thoroughly tested, and debuggable**.

---

## **📐 DEVELOPMENT STANDARDS**

### **1. Code Quality Requirements**

#### **TypeScript Strictness**
```json
// tsconfig.json - ENFORCE THESE RULES
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Rule:** NO `any` types allowed. Use `unknown` if type is truly unknown, then type guard.

```typescript
// ❌ BAD
async create(data: any, organizationId: string) { }

// ✅ GOOD
async create(data: CreatePropertyDto, organizationId: string): Promise<Property> {
  this.logger.log(`Creating property for org ${organizationId}`, { data });
  // ...
}
```

#### **Naming Conventions**
- **Variables/Functions:** `camelCase` (e.g., `calculateMonthlyRent`)
- **Classes/Interfaces:** `PascalCase` (e.g., `PropertyService`, `CreateLeaseDto`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_UPLOAD_SIZE_MB`)
- **Files:** `kebab-case.ts` (e.g., `property-service.ts`)
- **Test files:** `*.spec.ts` or `*.test.ts`

#### **File Structure Standard**
```
packages/backend/src/
├── modules/
│   ├── properties/
│   │   ├── properties.controller.ts       # API endpoints
│   │   ├── properties.service.ts          # Business logic
│   │   ├── properties.service.spec.ts     # Unit tests
│   │   ├── dto/
│   │   │   ├── create-property.dto.ts     # Input validation
│   │   │   ├── update-property.dto.ts
│   │   │   └── property-response.dto.ts   # Response shape
│   │   ├── entities/
│   │   │   └── property.entity.ts         # Database model
│   │   └── properties.module.ts           # Module definition
```

---

## **📝 LOGGING INFRASTRUCTURE**

### **2. Structured Logging with Winston**

#### **Install & Configure**
```bash
pnpm add winston winston-daily-rotate-file
pnpm add -D @types/winston
```

#### **Logger Service (`packages/backend/src/common/logger/logger.service.ts`)**
```typescript
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

export interface LogContext {
  userId?: string;
  organizationId?: string;
  correlationId?: string;
  [key: string]: any;
}

@Injectable()
export class AppLogger implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private context?: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'propertymaster-api' },
      transports: [
        // Console output (pretty in dev)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${context || 'App'}] ${level}: ${message} ${metaStr}`;
            })
          ),
        }),
        // Rotate daily log files
        new winston.transports.DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
        }),
        // Error logs separate
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
    });
  }

  log(message: string, context?: LogContext) {
    this.logger.info(message, { context: this.context, ...context });
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.logger.error(message, { trace, context: this.context, ...context });
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(message, { context: this.context, ...context });
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(message, { context: this.context, ...context });
  }

  verbose(message: string, context?: LogContext) {
    this.logger.http(message, { context: this.context, ...context });
  }
}
```

#### **Usage in Services**
```typescript
import { Injectable } from '@nestjs/common';
import { AppLogger } from '@/common/logger/logger.service';

@Injectable()
export class PropertiesService {
  private readonly logger = new AppLogger(PropertiesService.name);

  async create(dto: CreatePropertyDto, organizationId: string): Promise<Property> {
    this.logger.log('Creating property', {
      organizationId,
      address: dto.address,
      type: dto.type
    });

    try {
      const property = await this.prisma.property.create({
        data: { ...dto, organizationId }
      });

      this.logger.log('Property created successfully', {
        propertyId: property.id,
        organizationId
      });

      return property;
    } catch (error) {
      this.logger.error('Failed to create property', error.stack, {
        organizationId,
        dto
      });
      throw new InternalServerErrorException('Failed to create property');
    }
  }

  async update(id: string, dto: UpdatePropertyDto, organizationId: string): Promise<Property> {
    this.logger.log('Updating property', { propertyId: id, organizationId, changes: dto });

    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      this.logger.warn('Property not found for update', { propertyId: id, organizationId });
      throw new NotFoundException(`Property ${id} not found`);
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: dto
    });

    this.logger.log('Property updated successfully', { propertyId: id, organizationId });
    return updated;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    this.logger.warn('Deleting property', { propertyId: id, organizationId });

    const property = await this.findOne(id, organizationId);
    const unitCount = await this.prisma.unit.count({ where: { propertyId: id } });

    if (unitCount > 0) {
      this.logger.error('Cannot delete property with units', null, {
        propertyId: id,
        unitCount
      });
      throw new BadRequestException(`Cannot delete property with ${unitCount} units`);
    }

    await this.prisma.property.delete({ where: { id } });
    this.logger.log('Property deleted successfully', { propertyId: id, organizationId });
  }
}
```

### **3. Logging Best Practices**

#### **Log Levels Guide**
| Level | Use Case | Example |
|-------|----------|---------|
| **error** | Application errors, exceptions | Database connection failed, payment processing error |
| **warn** | Unexpected but recoverable situations | User not found, invalid input caught by validation |
| **info** | Important business events | User logged in, property created, payment received |
| **http** | HTTP requests/responses | API calls, response times |
| **debug** | Detailed diagnostic info | Variable values, function entry/exit |

#### **What to Log**
```typescript
// ✅ DO LOG
- User actions (login, create, update, delete)
- External API calls (Stripe, Plaid, SendGrid)
- Database operations (especially writes)
- Authentication/authorization events
- Payment processing steps
- File uploads/downloads
- Background job execution
- Performance metrics (slow queries >100ms)
- Business rule validations
- State transitions (lease status changes)

// ❌ DON'T LOG
- Passwords or API keys
- Credit card numbers
- Social security numbers
- Full request/response bodies (use selective fields)
```

#### **Correlation IDs for Request Tracing**
```typescript
// middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}

// Then in controllers
@Post()
async create(@Body() dto: CreatePropertyDto, @Req() req: Request) {
  this.logger.log('API: Create property', {
    correlationId: req['correlationId'],
    organizationId: req.user.organizationId
  });
  // ...
}
```

---

## **🧪 TESTING STRATEGY**

### **4. Test Coverage Requirements**

**Minimum Coverage:**
- **Backend:** 80% coverage
- **Frontend:** 70% coverage
- **Critical paths:** 100% coverage (auth, payments, data integrity)

#### **Test Pyramid**
```
           /\
          /  \  E2E Tests (10%)
         /____\  - Happy paths
        /      \  - Critical workflows
       / Integration Tests (30%)
      /________\  - API endpoints
     /          \  - Database operations
    /   Unit Tests (60%)
   /______________\ - Business logic
                     - Utilities
                     - Validators
```

### **5. Unit Tests (60% of tests)**

#### **Setup (`packages/backend/src/test-utils/test-setup.ts`)**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { AppLogger } from '@/common/logger/logger.service';

export const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

export const mockPrismaService = {
  property: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  unit: { /* ... */ },
  lease: { /* ... */ },
  // ... other models
};

export async function createTestingModule(providers: any[]): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      ...providers,
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: AppLogger, useValue: mockLogger },
    ],
  }).compile();
}
```

#### **Service Test Example (`properties.service.spec.ts`)**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppLogger } from '@/common/logger/logger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PropertyType } from '@prisma/client';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: PrismaService;
  let logger: AppLogger;

  const mockOrgId = 'org-123';
  const mockPropertyId = 'prop-456';
  const mockProperty = {
    id: mockPropertyId,
    name: 'Test Property',
    address: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    type: PropertyType.MULTIFAMILY,
    organizationId: mockOrgId,
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
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            unit: {
              count: jest.fn(),
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

  describe('create', () => {
    it('should create a property successfully', async () => {
      const dto = {
        name: 'Test Property',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        type: PropertyType.MULTIFAMILY,
      };

      jest.spyOn(prisma.property, 'create').mockResolvedValue(mockProperty);

      const result = await service.create(dto, mockOrgId);

      expect(result).toEqual(mockProperty);
      expect(prisma.property.create).toHaveBeenCalledWith({
        data: { ...dto, organizationId: mockOrgId },
      });
      expect(logger.log).toHaveBeenCalledWith('Creating property', expect.any(Object));
      expect(logger.log).toHaveBeenCalledWith('Property created successfully', expect.any(Object));
    });

    it('should log error and throw on database failure', async () => {
      const dto = { name: 'Test', address: '123 Main' };
      const error = new Error('Database error');

      jest.spyOn(prisma.property, 'create').mockRejectedValue(error);

      await expect(service.create(dto, mockOrgId)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create property',
        error.stack,
        expect.any(Object)
      );
    });
  });

  describe('update', () => {
    it('should update property successfully', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedProperty = { ...mockProperty, name: 'Updated Name' };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty);
      jest.spyOn(prisma.property, 'update').mockResolvedValue(updatedProperty);

      const result = await service.update(mockPropertyId, updateDto, mockOrgId);

      expect(result.name).toBe('Updated Name');
      expect(logger.log).toHaveBeenCalledWith('Updating property', expect.any(Object));
    });

    it('should throw NotFoundException if property does not exist', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);

      await expect(service.update(mockPropertyId, {}, mockOrgId)).rejects.toThrow(
        NotFoundException
      );
      expect(logger.warn).toHaveBeenCalledWith('Property not found for update', expect.any(Object));
    });
  });

  describe('delete', () => {
    it('should delete property without units', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty);
      jest.spyOn(prisma.unit, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.property, 'delete').mockResolvedValue(mockProperty);

      await service.delete(mockPropertyId, mockOrgId);

      expect(prisma.property.delete).toHaveBeenCalledWith({ where: { id: mockPropertyId } });
      expect(logger.log).toHaveBeenCalledWith('Property deleted successfully', expect.any(Object));
    });

    it('should throw BadRequestException if property has units', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty);
      jest.spyOn(prisma.unit, 'count').mockResolvedValue(5);

      await expect(service.delete(mockPropertyId, mockOrgId)).rejects.toThrow(
        BadRequestException
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Cannot delete property with units',
        null,
        expect.objectContaining({ unitCount: 5 })
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated properties', async () => {
      const properties = [mockProperty];
      jest.spyOn(prisma.property, 'findMany').mockResolvedValue(properties);
      jest.spyOn(prisma.property, 'count').mockResolvedValue(1);

      const result = await service.findAll(mockOrgId, { page: 1, limit: 10 });

      expect(result.data).toEqual(properties);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });
});
```

### **6. Integration Tests (30% of tests)**

#### **API Endpoint Test (`properties.controller.e2e-spec.ts`)**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('PropertiesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let organizationId: string;

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

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.property.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await app.close();
  });

  describe('POST /api/v1/properties', () => {
    it('should create a new property', async () => {
      const dto = {
        name: 'Test Property',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        type: 'MULTIFAMILY',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject(dto);
      expect(response.body.id).toBeDefined();
      expect(response.body.organizationId).toBe(organizationId);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' }) // Missing required fields
        .expect(400);

      expect(response.body.message).toContain('validation failed');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/properties')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v1/properties', () => {
    it('should return paginated properties', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/properties?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by property type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/properties?type=MULTIFAMILY')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((property: any) => {
        expect(property.type).toBe('MULTIFAMILY');
      });
    });
  });

  describe('PATCH /api/v1/properties/:id', () => {
    it('should update property', async () => {
      // First create a property
      const created = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original', address: '123 Main' });

      const propertyId = created.body.id;

      // Update it
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/properties/${propertyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.address).toBe('123 Main'); // Unchanged
    });

    it('should return 404 for non-existent property', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/properties/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/properties/:id', () => {
    it('should delete property without units', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Delete', address: '456 Oak' });

      await request(app.getHttpServer())
        .delete(`/api/v1/properties/${created.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/api/v1/properties/${created.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should not delete property with units', async () => {
      const property = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'With Units', address: '789 Pine' });

      // Create a unit
      await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ propertyId: property.body.id, unitNumber: '101' });

      // Try to delete
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/properties/${property.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('Cannot delete property with');
    });
  });
});
```

### **7. E2E Tests (10% of tests)**

#### **Critical User Flow (`auth-flow.e2e-spec.ts`)**
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test('complete signup to dashboard flow', async ({ page }) => {
    // 1. Registration
    await page.goto('http://localhost:3000/register');
    await page.fill('input[name="email"]', 'newuser@test.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="organizationName"]', 'Test Property Co');
    await page.click('button[type="submit"]');

    // 2. Verify redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');

    // 3. Check welcome state (no properties)
    await expect(page.locator('text=Add your first property')).toBeVisible();

    // 4. Add first property
    await page.click('button:has-text("Add Property")');
    await page.fill('input[name="name"]', 'Sunset Gardens');
    await page.fill('input[name="address"]', '123 Main St');
    await page.fill('input[name="city"]', 'Austin');
    await page.selectOption('select[name="state"]', 'TX');
    await page.fill('input[name="zipCode"]', '78701');
    await page.click('button:has-text("Create Property")');

    // 5. Verify property appears in list
    await expect(page.locator('text=Sunset Gardens')).toBeVisible();

    // 6. Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Logout');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('login with existing account', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('token refresh on 401', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Simulate expired token (mock API to return 401)
    await page.route('**/api/v1/properties', route => {
      route.fulfill({ status: 401, body: '{"message":"Unauthorized"}' });
    }, { times: 1 });

    // Navigate to properties (should trigger token refresh)
    await page.click('text=Properties');

    // Should still be logged in (not redirected to login)
    await expect(page).toHaveURL(/.*\/properties/);
  });
});
```

### **8. Test Automation & CI/CD**

#### **GitHub Actions Workflow (`.github/workflows/test.yml`)**
```yaml
name: Test Suite

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: propertymaster_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations
        run: pnpm --filter database prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/propertymaster_test

      - name: Run unit tests
        run: pnpm --filter backend test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/propertymaster_test

      - name: Run integration tests
        run: pnpm --filter backend test:e2e
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/propertymaster_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/backend/coverage/lcov.info

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm --filter admin test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/admin/coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Run migrations
        run: pnpm --filter database prisma migrate deploy

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  type-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
```

---

## **🚨 ERROR HANDLING**

### **9. Comprehensive Error Handling**

#### **Global Exception Filter (`common/filters/http-exception.filter.ts`)**
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '@/common/logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Log based on severity
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        {
          userId: request['user']?.id,
          organizationId: request['user']?.organizationId,
          correlationId: request['correlationId'],
          body: request.body,
        }
      );
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url} - ${message}`, {
        userId: request['user']?.id,
        statusCode: status,
      });
    }

    response.status(status).json(errorResponse);
  }
}
```

#### **Custom Business Exceptions**
```typescript
// common/exceptions/business.exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class PropertyHasUnitsException extends HttpException {
  constructor(propertyId: string, unitCount: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Cannot delete property ${propertyId} because it has ${unitCount} units`,
        error: 'PropertyHasUnits',
        propertyId,
        unitCount,
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class LeaseOverlapException extends HttpException {
  constructor(unitId: string, existingLeaseId: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Unit already has an active lease',
        error: 'LeaseOverlap',
        unitId,
        existingLeaseId,
      },
      HttpStatus.CONFLICT
    );
  }
}

export class InsufficientFundsException extends HttpException {
  constructor(accountId: string, required: number, available: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Insufficient funds in account ${accountId}`,
        error: 'InsufficientFunds',
        accountId,
        required,
        available,
      },
      HttpStatus.BAD_REQUEST
    );
  }
}
```

#### **Frontend Error Boundary**
```typescript
// packages/admin/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppLogger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  private logger = new AppLogger('ErrorBoundary');

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Send to error tracking service (Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="mt-2 text-gray-600">
              We've been notified and are working on a fix.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## **📚 DOCUMENTATION STANDARDS**

### **10. Self-Documenting Code**

#### **JSDoc Comments for Public APIs**
```typescript
/**
 * Creates a new property within an organization
 *
 * @param dto - Property creation data including name, address, and type
 * @param organizationId - UUID of the organization that owns this property
 * @returns The created property with all fields populated
 * @throws {BadRequestException} If required fields are missing or invalid
 *
 * @example
 * ```typescript
 * const property = await service.create({
 *   name: 'Sunset Gardens',
 *   address: '123 Main St',
 *   city: 'Austin',
 *   state: 'TX',
 *   zipCode: '78701',
 *   type: PropertyType.MULTIFAMILY
 * }, 'org-123');
 * ```
 */
async create(dto: CreatePropertyDto, organizationId: string): Promise<Property> {
  // Implementation
}
```

#### **README per Module**
```markdown
# Properties Module

## Overview
Manages property entities including CRUD operations, validation, and business rules.

## Responsibilities
- Create, read, update, delete properties
- Enforce organization-level data isolation
- Validate property data (address, type, etc.)
- Prevent deletion of properties with active units

## API Endpoints

### `POST /api/v1/properties`
Create a new property.

**Request:**
```json
{
  "name": "Sunset Gardens",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "type": "MULTIFAMILY",
  "units": 24
}
```

**Response:** `201 Created`
```json
{
  "id": "prop-123",
  "name": "Sunset Gardens",
  ...
  "createdAt": "2025-11-22T10:00:00Z"
}
```

**Errors:**
- `400` - Validation failed
- `401` - Unauthorized
- `409` - Property already exists at this address

## Business Rules
1. Property name must be unique within organization
2. Cannot delete property with existing units (must delete units first)
3. Address must be valid US address (validated via Google Maps API in future)

## Database Schema
See `packages/database/prisma/schema.prisma` - `Property` model

## Related Modules
- **Units** - Properties contain multiple units
- **Leases** - Leases are tied to specific units within properties
- **WorkOrders** - Work orders can be property-wide or unit-specific

## Testing
- Unit tests: `properties.service.spec.ts`
- E2E tests: `properties.controller.e2e-spec.ts`
- Coverage: 85%
```

### **11. Feature Specification Template**

Every feature must have a spec document **before implementation**.

#### **Template: `docs/features/FEATURE_NAME.md`**
```markdown
# Feature: [Feature Name]

**Status:** Draft | In Progress | Completed
**Owner:** [Developer Name]
**Phase:** [Phase Number]
**Jira Ticket:** [PROP-123]
**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)

---

## Problem Statement
[What problem does this solve? Why does the user need this?]

**Example:** Landlords currently cannot edit properties after creation, forcing them to delete and recreate, losing historical data.

---

## User Stories

### Primary User Story
**As a** [user type]
**I want** [capability]
**So that** [benefit]

**Example:**
**As a** property manager
**I want** to edit property details (name, address, units)
**So that** I can correct mistakes without losing leases and work order history

### Additional User Stories
- [Secondary story 1]
- [Secondary story 2]

---

## Acceptance Criteria

**Must Have:**
- [ ] User can click "Edit" button on property detail page
- [ ] Edit modal displays with pre-filled current values
- [ ] User can modify name, address, city, state, zip, type
- [ ] Changes are saved to database on submit
- [ ] UI updates immediately after save (optimistic update)
- [ ] Error handling if save fails (rollback UI)
- [ ] Audit log records property edit with old/new values

**Should Have:**
- [ ] "Cancel" button discards changes
- [ ] Validation prevents empty required fields
- [ ] Toast notification confirms success

**Nice to Have:**
- [ ] Show diff of changed fields before saving
- [ ] Keyboard shortcut (Cmd+S) to save

---

## Technical Design

### Database Changes
```prisma
// No schema changes needed - using existing Property model
```

### API Endpoints

#### `PATCH /api/v1/properties/:id`
**Request:**
```json
{
  "name": "Updated Name",
  "address": "456 New St"
}
```

**Response:** `200 OK`
```json
{
  "id": "prop-123",
  "name": "Updated Name",
  "address": "456 New St",
  "updatedAt": "2025-11-22T12:00:00Z"
}
```

**Errors:**
- `400` - Validation failed
- `404` - Property not found
- `403` - Not authorized to edit this property

### Service Layer
```typescript
// properties.service.ts
async update(id: string, dto: UpdatePropertyDto, orgId: string): Promise<Property> {
  // 1. Verify property exists and belongs to org
  // 2. Validate dto
  // 3. Update database
  // 4. Create audit log entry
  // 5. Return updated property
}
```

### Frontend Components
- **PropertyEditModal.tsx** - Modal form with validation
- **PropertyDetailPage.tsx** - Add "Edit" button
- **useUpdateProperty hook** - React Query mutation

### State Management
```typescript
// React Query mutation
const updateProperty = useMutation({
  mutationFn: (data) => api.patch(`/properties/${id}`, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['properties']);
    toast.success('Property updated');
  },
  onError: (error) => {
    toast.error(error.message);
  }
});
```

---

## UI/UX Design

### Wireframes
[Link to Figma or inline images]

### User Flow
1. User clicks "Edit" button on property card
2. Modal opens with form pre-filled
3. User changes fields
4. User clicks "Save"
5. Loading spinner shows
6. On success: modal closes, toast shows, property card updates
7. On error: modal stays open, error message shows

---

## Testing Plan

### Unit Tests
- [ ] Service method validates org ownership
- [ ] Service method throws 404 if property not found
- [ ] Service method updates only provided fields
- [ ] Audit log entry created

### Integration Tests
- [ ] API endpoint returns 200 on success
- [ ] API endpoint returns 404 for non-existent property
- [ ] API endpoint returns 403 for wrong organization
- [ ] Database record is updated correctly

### E2E Tests
- [ ] User can edit property name via UI
- [ ] Changes persist after page reload
- [ ] Cancel button discards changes
- [ ] Error message shows if network fails

---

## Logging & Monitoring

### Logs to Add
```typescript
logger.log('Updating property', { propertyId, organizationId, changes: dto });
logger.log('Property updated successfully', { propertyId });
logger.warn('Property not found for update', { propertyId, organizationId });
logger.error('Failed to update property', error.stack, { propertyId, dto });
```

### Metrics to Track
- Count of property updates per day
- Average time to update
- Error rate for update operations

---

## Rollout Plan

### Phase 1: Internal Testing (Day 1-2)
- Deploy to staging
- Test with 10 internal properties
- Fix critical bugs

### Phase 2: Beta Users (Day 3-5)
- Enable for 50 beta users
- Monitor error rates
- Gather feedback

### Phase 3: Full Launch (Day 6)
- Enable for all users
- Monitor closely for 48 hours

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Race condition if multiple users edit same property | Medium | Low | Add optimistic locking (version field) |
| User accidentally changes critical field | High | Medium | Require confirmation for address changes |
| Database update fails but audit log succeeds | Low | Low | Use database transaction |

---

## Open Questions
- [ ] Should we allow changing property type if units exist?
- [ ] Should we validate address via Google Maps API?
- [ ] Do we need approval workflow for certain field changes?

---

## Dependencies
- None

## Follow-up Features
- Bulk edit multiple properties
- Property change history view
- Undo last edit
```

---

## **🔐 SECURITY STANDARDS**

### **12. Security Checklist**

Every feature must pass:

- [ ] **Input Validation** - All DTOs use `class-validator`
- [ ] **SQL Injection** - Using Prisma (parameterized queries)
- [ ] **XSS Prevention** - React auto-escapes, but sanitize HTML inputs
- [ ] **CSRF Protection** - SameSite cookies + CSRF tokens
- [ ] **Authentication** - JWT verified on all protected routes
- [ ] **Authorization** - Org-scoped queries prevent cross-tenant access
- [ ] **Rate Limiting** - Throttle guard on auth endpoints
- [ ] **Secrets Management** - No secrets in code, use env vars
- [ ] **Password Security** - bcrypt with 10+ rounds
- [ ] **Sensitive Data Logging** - Never log passwords, tokens, SSNs
- [ ] **HTTPS Only** - Enforce in production
- [ ] **Dependency Scanning** - `pnpm audit` before every deploy

---

## **🚀 DEPLOYMENT CHECKLIST**

### **13. Pre-Deploy Validation**

Before deploying **any** feature:

#### **Code Quality**
- [ ] All tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Code coverage ≥80%
- [ ] No `console.log` statements (use logger)
- [ ] No `TODO` comments (convert to Jira tickets)
- [ ] No `any` types

#### **Documentation**
- [ ] Feature spec document completed
- [ ] API endpoints documented in Swagger
- [ ] README updated if public API changed
- [ ] CHANGELOG.md entry added

#### **Database**
- [ ] Migration tested on staging
- [ ] Rollback migration exists
- [ ] No breaking schema changes (or backward-compatible)
- [ ] Indexes added for new queries

#### **Security**
- [ ] Security checklist (above) completed
- [ ] OWASP top 10 verified
- [ ] Secrets not committed
- [ ] Dependencies updated (`pnpm update`)

#### **Performance**
- [ ] No N+1 queries (check with Prisma query logs)
- [ ] Large lists paginated
- [ ] Images optimized
- [ ] Bundle size checked (`pnpm build --analyze`)

#### **Monitoring**
- [ ] Logging added (see section 2)
- [ ] Error tracking configured (Sentry)
- [ ] Performance metrics captured
- [ ] Alerts configured for critical errors

---

## **📊 FEATURE DEVELOPMENT WORKFLOW**

### **14. Standard Process**

```
┌─────────────────┐
│ 1. PLAN         │  Create feature spec from template
│ - Write spec    │  Get stakeholder approval
│ - Get approval  │  Break into tasks
└────────┬────────┘
         │
┌────────▼────────┐
│ 2. DESIGN       │  Database schema changes
│ - Schema        │  API endpoint design
│ - API design    │  UI mockups
│ - UI mockups    │
└────────┬────────┘
         │
┌────────▼────────┐
│ 3. IMPLEMENT    │  Backend (service → controller → tests)
│ - Backend       │  Frontend (components → hooks → tests)
│ - Frontend      │  Integration
│ - Tests         │
└────────┬────────┘
         │
┌────────▼────────┐
│ 4. REVIEW       │  Self-review checklist
│ - Code review   │  Peer review
│ - QA testing    │  QA manual testing
└────────┬────────┘
         │
┌────────▼────────┐
│ 5. DEPLOY       │  Staging deployment
│ - Staging       │  Smoke tests
│ - Production    │  Production deployment
│ - Monitor       │  Monitor for 24 hours
└─────────────────┘
```

### **15. Git Workflow**

#### **Branch Naming**
```
feature/PROP-123-property-edit-modal
bugfix/PROP-456-fix-lease-overlap
hotfix/security-patch-csrf
refactor/improve-logging
```

#### **Commit Messages**
```
type(scope): short description

Longer description if needed

- Bullet point details
- Closes PROP-123

Types: feat, fix, docs, style, refactor, test, chore
Scopes: auth, properties, leases, payments, ui, api
```

**Examples:**
```
feat(properties): add edit modal for property details

- Created PropertyEditModal component
- Added PATCH endpoint to properties controller
- Implemented optimistic updates in React Query
- Added validation for required fields

Closes PROP-123
```

```
fix(leases): prevent overlapping lease creation

- Added validation to check for active leases before creating new one
- Throws LeaseOverlapException with existing lease ID
- Added unit tests for overlap scenarios

Closes PROP-234
```

#### **Pull Request Template**
```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes PROP-123

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or migration guide provided)
- [ ] Logging added
- [ ] Error handling implemented
- [ ] Security review completed
- [ ] Performance tested

## Screenshots (if UI change)
[Add screenshots]

## Testing Instructions
1. Checkout this branch
2. Run `pnpm install`
3. Run `pnpm dev`
4. Navigate to Properties page
5. Click "Edit" on any property
6. Verify modal opens and saves correctly

## Deployment Notes
[Any special deployment instructions]
```

---

## **🎯 QUALITY GATES**

### **16. Automated Quality Checks**

#### **Pre-Commit Hooks (Husky + lint-staged)**
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting and formatting
pnpm lint-staged

# Run type checking
pnpm type-check

# Run affected tests
pnpm test --since HEAD~1
```

#### **Pre-Push Hooks**
```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run full test suite
pnpm test

# Check for security vulnerabilities
pnpm audit --audit-level moderate
```

#### **CI/CD Quality Gates**
All checks must pass before merge:
- ✅ Linting (ESLint)
- ✅ Formatting (Prettier)
- ✅ Type checking (TypeScript)
- ✅ Unit tests (Jest)
- ✅ Integration tests (Supertest)
- ✅ E2E tests (Playwright)
- ✅ Code coverage ≥80%
- ✅ Security audit (no high/critical vulnerabilities)
- ✅ Build succeeds

---

## **📈 MONITORING & OBSERVABILITY**

### **17. Production Monitoring**

#### **Sentry Integration**
```typescript
// packages/backend/src/main.ts
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of transactions
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.['authorization'];
      }
      return event;
    },
  });
}
```

#### **Performance Monitoring**
```typescript
// middleware/performance.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '@/common/logger/logger.service';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private logger = new AppLogger(PerformanceMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { method, originalUrl } = req;
      const { statusCode } = res;

      if (duration > 1000) {
        this.logger.warn('Slow request detected', {
          method,
          url: originalUrl,
          statusCode,
          duration: `${duration}ms`,
          correlationId: req['correlationId'],
        });
      }

      // Log all requests
      this.logger.verbose(`${method} ${originalUrl}`, {
        statusCode,
        duration: `${duration}ms`,
        correlationId: req['correlationId'],
      });
    });

    next();
  }
}
```

#### **Health Check Endpoint**
```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.checkRedis(),
      () => this.checkStripe(),
    ]);
  }

  async checkRedis() {
    // Implement Redis health check
    return { redis: { status: 'up' } };
  }

  async checkStripe() {
    // Implement Stripe API check
    return { stripe: { status: 'up' } };
  }
}
```

---

## **🎓 DEVELOPER ONBOARDING**

### **18. New Developer Setup Guide**

Create `docs/DEVELOPER_SETUP.md`:

```markdown
# Developer Setup Guide

## Prerequisites
- Node.js 18+
- pnpm 8+
- Docker Desktop
- PostgreSQL 15 (or use Docker)
- Git

## First-Time Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/yourorg/propertymaster.git
   cd propertymaster
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start database**
   ```bash
   docker-compose up -d postgres
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

5. **Run migrations**
   ```bash
   pnpm --filter database prisma migrate dev
   ```

6. **Seed database**
   ```bash
   pnpm --filter database prisma db seed
   ```

7. **Start dev servers**
   ```bash
   pnpm dev
   ```

   This starts:
   - Backend API: http://localhost:3001
   - Admin portal: http://localhost:3000
   - Tenant portal: http://localhost:3002

8. **Login**
   - Email: `admin@propertymaster.com`
   - Password: `Admin123!`

## Development Workflow

See [PHASE_IMPLEMENTATION_PLAN.md](./PHASE_IMPLEMENTATION_PLAN.md) for:
- Code standards
- Testing requirements
- Git workflow
- Deployment process

## Useful Commands

```bash
# Run tests
pnpm test                  # All tests
pnpm test:watch            # Watch mode
pnpm test:cov              # With coverage

# Database
pnpm db:studio             # Open Prisma Studio
pnpm db:reset              # Reset and reseed

# Code quality
pnpm lint                  # Run ESLint
pnpm format                # Format with Prettier
pnpm type-check            # TypeScript check

# Build
pnpm build                 # Build all packages
pnpm build --filter backend  # Build specific package
```

## Troubleshooting

**Database connection fails:**
```bash
# Reset Docker containers
docker-compose down -v
docker-compose up -d
pnpm db:reset
```

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Prisma schema out of sync:**
```bash
pnpm --filter database prisma generate
pnpm --filter database prisma migrate dev
```

## Architecture Overview

```
packages/
├── backend/        # NestJS API
├── admin/          # React admin portal
├── tenant/         # Next.js tenant portal
├── database/       # Prisma schema and migrations
└── shared/         # Shared types and utilities
```

## Learning Resources
- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Query Docs](https://tanstack.com/query)
- [Internal Wiki](https://wiki.yourcompany.com/propertymaster)
```

---

## **✅ PHASE 0 IMPLEMENTATION CHECKLIST**

Before starting Phase 1, ensure these are in place:

### **Infrastructure**
- [ ] Winston logger configured
- [ ] Sentry error tracking set up
- [ ] Health check endpoint created
- [ ] Performance monitoring middleware added
- [ ] Correlation ID middleware added

### **Testing**
- [ ] Jest configured for backend
- [ ] Vitest configured for frontend
- [ ] Playwright E2E tests set up
- [ ] CI/CD pipeline (GitHub Actions) created
- [ ] Code coverage reporting to Codecov

### **Documentation**
- [ ] Feature spec template created
- [ ] Developer setup guide written
- [ ] README per module started
- [ ] API documentation (Swagger) configured

### **Code Quality**
- [ ] ESLint rules enforced
- [ ] Prettier configured
- [ ] Husky pre-commit hooks set up
- [ ] TypeScript strict mode enabled
- [ ] No `any` types (or plan to eliminate)

### **Security**
- [ ] Security checklist created
- [ ] OWASP top 10 verified
- [ ] Secrets in environment variables only
- [ ] Rate limiting configured
- [ ] CSRF protection added

---

## **📝 SUMMARY**

This implementation plan provides:

1. ✅ **Structured logging** - Winston with file rotation, correlation IDs
2. ✅ **Comprehensive testing** - Unit, integration, E2E with 80% coverage target
3. ✅ **Error handling** - Global exception filter, custom business exceptions
4. ✅ **Documentation** - Feature specs, JSDoc, module READMEs
5. ✅ **Quality gates** - Automated CI/CD checks, pre-commit hooks
6. ✅ **Monitoring** - Sentry, performance tracking, health checks
7. ✅ **Developer workflow** - Clear process from spec to deployment

**Next Steps:**
1. Implement Phase 0 infrastructure (logging, testing, docs)
2. Create first feature using this template (e.g., property edit modal)
3. Refine process based on learnings
4. Scale to full team

This makes the project **self-sustaining** - any developer can pick up a feature spec and implement it to production quality without constant oversight.
