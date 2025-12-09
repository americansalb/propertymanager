# PROPERTYMASTER: 108-PHASE COMPREHENSIVE ROADMAP

**Version:** 2.0
**Created:** November 27, 2025
**Status:** DEFINITIVE - NO ASSUMPTIONS ALLOWED

---

## ROADMAP STRUCTURE

| Section                   | Phases  | Description                                       | MVP Status |
| ------------------------- | ------- | ------------------------------------------------- | ---------- |
| **FOUNDATION**            | 1-12    | Infrastructure, tooling, quality gates            | **MVP**    |
| **AUTH & SECURITY**       | 13-20   | Authentication, authorization, security hardening | **MVP**    |
| **PROPERTIES**            | 21-30   | Property CRUD, validation, organization scoping   | **MVP**    |
| **UNITS**                 | 31-38   | Unit management, status tracking, occupancy       | **MVP**    |
| **LEASES**                | 39-50   | Lease lifecycle, rent tracking, renewals          | **MVP**    |
| **FINANCIAL CORE**        | 51-62   | Chart of accounts, transactions, ledgers          | **MVP**    |
| **PAYMENTS**              | 63-72   | Payment processing, Stripe, auto-pay              | **MVP**    |
| **WORK ORDERS**           | 73-82   | Maintenance requests, assignment, completion      | Post-MVP   |
| **VENDORS**               | 83-88   | Vendor management, compliance, performance        | Post-MVP   |
| **TENANT PORTAL**         | 89-96   | Tenant-facing features, self-service              | Post-MVP   |
| **REPORTING**             | 97-102  | Analytics, dashboards, exports                    | Post-MVP   |
| **AI & AUTOMATION**       | 103-106 | Predictive features, document AI                  | Post-MVP   |
| **MOBILE & INTEGRATIONS** | 107-108 | PWA, third-party integrations                     | Post-MVP   |

---

## MVP DEFINITION

**MVP = Phases 1-72**

The MVP delivers a **fully functional property management system** where a landlord can:

1. Create and manage properties and units
2. Create and track leases with tenants
3. Record and collect rent payments via Stripe
4. View financial ledgers and basic reports
5. All with proper authentication, authorization, and audit logging

**MVP Completion = Production-Ready for Beta Launch**

---

# SECTION 1: FOUNDATION (Phases 1-12) [MVP]

---

## PHASE 1: Development Environment Verification

**Objective:** Ensure all developers can run the project locally with zero issues.

**Deliverables:**

1. Verify `pnpm install` completes without errors
2. Verify `docker-compose up -d` starts PostgreSQL + Redis + MailHog
3. Verify `pnpm db:push` applies schema without errors
4. Verify `pnpm db:seed` populates test data
5. Verify `pnpm dev` starts all services (backend:3001, admin:3000, tenant:3002)
6. Verify health check endpoint returns 200: `GET http://localhost:3001/api/v1/health`

**Acceptance Criteria:**

- [ ] Fresh clone + install takes < 5 minutes
- [ ] All 3 services start and respond
- [ ] Database has seed data visible in Prisma Studio (`pnpm db:studio`)
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in console

**Dependencies:** None
**Estimated Effort:** 2 hours

---

## PHASE 2: TypeScript Strict Mode Enforcement

**Objective:** Eliminate all implicit `any` types and enable strict type checking.

**Deliverables:**

1. Enable `"strict": true` in `packages/backend/tsconfig.json`
2. Enable `"strict": true` in `packages/frontend-admin/tsconfig.json`
3. Enable `"strict": true` in `packages/frontend-tenant/tsconfig.json`
4. Enable `"strict": true` in `packages/shared/tsconfig.json`
5. Fix all TypeScript errors resulting from strict mode
6. Add ESLint rule `"@typescript-eslint/no-explicit-any": "error"`

**Acceptance Criteria:**

- [ ] `pnpm type-check` passes with zero errors across all packages
- [ ] No `any` types in codebase (except with explicit `// @ts-expect-error` + justification)
- [ ] All function parameters have explicit types
- [ ] All function return types are declared

**Dependencies:** Phase 1
**Estimated Effort:** 6 hours

---

## PHASE 3: ESLint and Prettier Configuration

**Objective:** Enforce consistent code style across entire codebase.

**Deliverables:**

1. Create root `.eslintrc.js` with shared rules
2. Create root `.prettierrc` with formatting rules
3. Add package-specific ESLint configs that extend root
4. Configure ESLint for NestJS (backend)
5. Configure ESLint for React (frontend-admin, frontend-tenant)
6. Add `pnpm lint` script that runs ESLint on all packages
7. Add `pnpm format` script that runs Prettier on all packages
8. Add `pnpm lint:fix` script that auto-fixes issues

**Acceptance Criteria:**

- [ ] `pnpm lint` reports zero errors
- [ ] `pnpm format --check` passes (all files formatted)
- [ ] ESLint catches unused variables, unused imports
- [ ] ESLint enforces consistent import order
- [ ] Prettier enforces: 2-space indent, single quotes, trailing commas, 100 char line width

**Dependencies:** Phase 2
**Estimated Effort:** 3 hours

---

## PHASE 4: Pre-Commit Hooks with Husky

**Objective:** Prevent bad code from being committed.

**Deliverables:**

1. Install Husky: `pnpm add -D husky`
2. Install lint-staged: `pnpm add -D lint-staged`
3. Initialize Husky: `pnpm exec husky init`
4. Create `.husky/pre-commit` hook
5. Configure lint-staged in `package.json`
6. Hook runs: ESLint, Prettier, TypeScript type-check on staged files

**Pre-commit Hook Behavior:**

```bash
#!/bin/sh
pnpm lint-staged
```

**lint-staged Configuration:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

**Acceptance Criteria:**

- [ ] Cannot commit files with ESLint errors
- [ ] Cannot commit files with Prettier violations
- [ ] Staged files are auto-fixed where possible
- [ ] Commit fails with clear error message if issues remain
- [ ] Hook runs in < 10 seconds for typical commits

**Dependencies:** Phase 3
**Estimated Effort:** 2 hours

---

## PHASE 5: Winston Logger Setup (Backend)

**Objective:** Implement structured logging for all backend operations.

**Deliverables:**

1. Install Winston: `pnpm add winston winston-daily-rotate-file`
2. Create `packages/backend/src/common/logger/app-logger.service.ts`
3. Create `packages/backend/src/common/logger/logger.module.ts`
4. Configure log transports:
   - Console transport (colorized, human-readable in dev)
   - File transport (JSON format, daily rotation)
   - Error file transport (errors only, 30-day retention)
5. Define log levels: error, warn, info, http, debug
6. Include in all logs: timestamp, level, message, context, correlationId

**Logger Interface:**

```typescript
interface LogContext {
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  [key: string]: unknown;
}

log(message: string, context?: LogContext): void;
error(message: string, trace?: string, context?: LogContext): void;
warn(message: string, context?: LogContext): void;
debug(message: string, context?: LogContext): void;
```

**Acceptance Criteria:**

- [ ] Logger is injectable via NestJS DI
- [ ] Logs appear in console with colors in development
- [ ] Logs write to `logs/app-YYYY-MM-DD.log` in production
- [ ] Error logs write to `logs/error-YYYY-MM-DD.log`
- [ ] Log files rotate daily and delete after retention period
- [ ] No `console.log` statements in production code

**Dependencies:** Phase 1
**Estimated Effort:** 4 hours

---

## PHASE 6: Correlation ID Middleware

**Objective:** Enable request tracing across all logs.

**Deliverables:**

1. Create `packages/backend/src/common/middleware/correlation-id.middleware.ts`
2. Generate UUID if `x-correlation-id` header not present
3. Attach correlationId to request object: `req.correlationId`
4. Return correlationId in response header: `x-correlation-id`
5. Register middleware globally in `app.module.ts`
6. Update logger to read correlationId from request context

**Middleware Implementation:**

```typescript
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

**Acceptance Criteria:**

- [ ] Every request has a correlationId (provided or generated)
- [ ] CorrelationId appears in all log entries for that request
- [ ] CorrelationId returned in response header
- [ ] Frontend can read correlationId for error reporting

**Dependencies:** Phase 5
**Estimated Effort:** 2 hours

---

## PHASE 7: Global Exception Filter

**Objective:** Handle all errors consistently with proper HTTP status codes and logging.

**Deliverables:**

1. Create `packages/backend/src/common/filters/all-exceptions.filter.ts`
2. Catch all exceptions (HttpException and unknown)
3. Map exceptions to proper HTTP status codes
4. Return consistent error response structure
5. Log all errors with context (userId, correlationId, path, method)
6. Hide stack traces in production, show in development
7. Register filter globally in `main.ts`

**Error Response Structure:**

```typescript
{
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId: string;
  stack?: string; // Only in development
}
```

**Acceptance Criteria:**

- [ ] All exceptions return consistent JSON structure
- [ ] HTTP 4xx errors log as warnings
- [ ] HTTP 5xx errors log as errors with stack trace
- [ ] Unhandled exceptions become HTTP 500
- [ ] PrismaClientKnownRequestError maps to appropriate HTTP codes
- [ ] ValidationPipe errors return HTTP 400 with field details

**Dependencies:** Phase 6
**Estimated Effort:** 4 hours

---

## PHASE 8: Custom Business Exceptions

**Objective:** Create domain-specific exceptions for clear error handling.

**Deliverables:**

1. Create `packages/backend/src/common/exceptions/` directory
2. Create exception classes:
   - `EntityNotFoundException` (404)
   - `EntityConflictException` (409)
   - `ValidationException` (400)
   - `UnauthorizedException` (401)
   - `ForbiddenException` (403)
   - `PropertyHasUnitsException` (400)
   - `LeaseOverlapException` (409)
   - `InsufficientBalanceException` (400)
   - `PaymentFailedException` (402)
   - `TenantAlreadyExistsException` (409)
3. Each exception includes: error code, message, relevant IDs

**Exception Example:**

```typescript
export class PropertyHasUnitsException extends HttpException {
  constructor(propertyId: string, unitCount: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'PROPERTY_HAS_UNITS',
        message: `Cannot delete property because it has ${unitCount} active units`,
        propertyId,
        unitCount,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

**Acceptance Criteria:**

- [ ] All business rules have specific exception classes
- [ ] Each exception has unique error code
- [ ] Frontend can parse error codes for user-friendly messages
- [ ] Exceptions are used consistently in services

**Dependencies:** Phase 7
**Estimated Effort:** 3 hours

---

## PHASE 9: Jest Backend Testing Setup

**Objective:** Configure testing framework for backend unit and integration tests.

**Deliverables:**

1. Install Jest: `pnpm add -D jest ts-jest @types/jest @nestjs/testing`
2. Create `packages/backend/jest.config.js`
3. Create `packages/backend/src/test/test-utils.ts`
4. Create mock factories: mockPrismaService, mockLogger
5. Add scripts: `pnpm test`, `pnpm test:watch`, `pnpm test:cov`
6. Configure coverage thresholds (initially 20%)
7. Configure test file pattern: `*.spec.ts`

**Jest Configuration:**

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/test/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  coverageThreshold: { global: { branches: 20, functions: 20, lines: 20, statements: 20 } },
};
```

**Acceptance Criteria:**

- [ ] `pnpm test` runs and completes
- [ ] `pnpm test:cov` generates HTML coverage report
- [ ] Mock utilities are reusable across tests
- [ ] Tests run in isolation (no database required)
- [ ] Test timeout set to 10 seconds

**Dependencies:** Phase 2
**Estimated Effort:** 3 hours

---

## PHASE 10: Vitest Frontend Testing Setup

**Objective:** Configure testing framework for frontend component and hook tests.

**Deliverables:**

1. Install Vitest: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
2. Create `packages/frontend-admin/vitest.config.ts`
3. Create `packages/frontend-admin/src/test/setup.ts`
4. Create test utilities: renderWithProviders, mockRouter, mockApi
5. Add scripts: `pnpm test`, `pnpm test:ui`, `pnpm test:cov`
6. Configure coverage thresholds (initially 20%)

**Vitest Configuration:**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      threshold: { lines: 20, functions: 20, branches: 20, statements: 20 },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

**Acceptance Criteria:**

- [ ] `pnpm test` runs React component tests
- [ ] Testing Library renders components with providers
- [ ] Mock API responses work correctly
- [ ] Snapshot testing configured
- [ ] Coverage report generated

**Dependencies:** Phase 2
**Estimated Effort:** 3 hours

---

## PHASE 11: Sample Backend Tests

**Objective:** Write reference tests that demonstrate testing patterns.

**Deliverables:**

1. Create `packages/backend/src/modules/auth/auth.service.spec.ts`
   - Test: `register()` creates user and organization
   - Test: `register()` hashes password before storing
   - Test: `register()` throws if email exists
   - Test: `login()` returns tokens for valid credentials
   - Test: `login()` throws for invalid password
   - Test: `refreshToken()` returns new access token
2. Create `packages/backend/src/modules/properties/properties.service.spec.ts`
   - Test: `create()` creates property with organizationId
   - Test: `findAll()` returns only organization's properties
   - Test: `findOne()` throws if property not in organization
   - Test: `update()` updates property fields
   - Test: `remove()` throws if property has units
3. Document testing patterns in `docs/TESTING_PATTERNS.md`

**Acceptance Criteria:**

- [ ] All tests pass
- [ ] Tests use mocks, no actual database
- [ ] Tests cover success and error cases
- [ ] Test file follows naming convention: `*.service.spec.ts`
- [ ] Each test has descriptive name

**Dependencies:** Phase 9
**Estimated Effort:** 6 hours

---

## PHASE 12: Sample Frontend Tests

**Objective:** Write reference tests for React components and hooks.

**Deliverables:**

1. Create `packages/frontend-admin/src/pages/LoginPage.spec.tsx`
   - Test: Renders email and password inputs
   - Test: Submit button disabled when fields empty
   - Test: Shows error for invalid credentials
   - Test: Redirects to dashboard on success
2. Create `packages/frontend-admin/src/components/PropertyCard.spec.tsx`
   - Test: Displays property name and address
   - Test: Shows unit count
   - Test: Click navigates to property detail
3. Create `packages/frontend-admin/src/hooks/useAuth.spec.ts`
   - Test: `login()` stores tokens
   - Test: `logout()` clears tokens
   - Test: `isAuthenticated` reflects token state

**Acceptance Criteria:**

- [ ] All tests pass
- [ ] Tests use MSW for API mocking
- [ ] Tests verify user interactions
- [ ] Tests verify component rendering
- [ ] Tests cover loading and error states

**Dependencies:** Phase 10
**Estimated Effort:** 6 hours

---

# SECTION 2: AUTH & SECURITY (Phases 13-20) [MVP]

---

## PHASE 13: Password Hashing Verification

**Objective:** Ensure passwords are securely hashed using bcrypt.

**Deliverables:**

1. Verify bcrypt is used in AuthService.register()
2. Verify bcrypt cost factor is at least 12
3. Verify passwords are never logged
4. Verify passwords are never returned in API responses
5. Add password strength validation (min 8 chars, 1 uppercase, 1 number, 1 special)
6. Write tests verifying password security

**Password Validation Rules:**

```typescript
@IsStrongPassword({
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
})
password: string;
```

**Acceptance Criteria:**

- [ ] Passwords hashed with bcrypt cost 12+
- [ ] Password never appears in logs
- [ ] Password never returned in user objects
- [ ] Weak passwords rejected with clear error
- [ ] Password validation messages are helpful

**Dependencies:** Phase 2
**Estimated Effort:** 3 hours

---

## PHASE 14: JWT Token Configuration

**Objective:** Secure JWT implementation with proper configuration.

**Deliverables:**

1. Verify JWT secret is loaded from environment variable
2. Set access token expiry to 15 minutes
3. Set refresh token expiry to 7 days
4. Include in access token: userId, email, role, organizationId
5. Store refresh tokens in database (RefreshToken table)
6. Implement refresh token rotation (invalidate old token on use)
7. Add token blacklist for logout

**JWT Payload Structure:**

```typescript
interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  organizationId: string;
  iat: number;
  exp: number;
}
```

**Acceptance Criteria:**

- [ ] Access tokens expire in 15 minutes
- [ ] Refresh tokens expire in 7 days
- [ ] Refresh token rotation prevents reuse
- [ ] Logout invalidates refresh token
- [ ] Invalid tokens return 401

**Dependencies:** Phase 13
**Estimated Effort:** 4 hours

---

## PHASE 15: Role-Based Access Control (RBAC)

**Objective:** Implement fine-grained permissions based on user roles.

**Deliverables:**

1. Define roles: SUPER_ADMIN, ORGANIZATION_ADMIN, PROPERTY_MANAGER, ACCOUNTANT, LEASING_AGENT, MAINTENANCE_TECH, TENANT, VENDOR
2. Create `packages/backend/src/common/decorators/roles.decorator.ts`
3. Create `packages/backend/src/common/guards/roles.guard.ts`
4. Define permissions per role:
   - ORGANIZATION_ADMIN: all organization resources
   - PROPERTY_MANAGER: properties, units, leases, work orders
   - ACCOUNTANT: financial data, read-only operations
   - LEASING_AGENT: leases, tenants, applications
   - MAINTENANCE_TECH: work orders assigned to them
   - TENANT: their own lease, payments, work orders
   - VENDOR: work orders assigned to them
5. Apply RolesGuard to all controllers
6. Write tests for each role's permissions

**Role Decorator Usage:**

```typescript
@Roles(UserRole.ORGANIZATION_ADMIN, UserRole.PROPERTY_MANAGER)
@Get('properties')
findAll() { ... }
```

**Acceptance Criteria:**

- [ ] Each endpoint has explicit role requirements
- [ ] Unauthorized access returns 403 Forbidden
- [ ] Role hierarchy respected (ADMIN > MANAGER > AGENT)
- [ ] Tests cover all role combinations
- [ ] Error message does not reveal role requirements

**Dependencies:** Phase 14
**Estimated Effort:** 6 hours

---

## PHASE 16: Organization Data Isolation

**Objective:** Ensure users can only access their organization's data.

**Deliverables:**

1. Create `OrganizationGuard` that extracts organizationId from JWT
2. Add `@CurrentOrganization()` decorator for controllers
3. Verify ALL queries filter by organizationId
4. Verify ALL creates include organizationId
5. Verify cross-organization access returns 404 (not 403)
6. Add database indexes on organizationId columns
7. Write integration tests for data isolation

**Controller Pattern:**

```typescript
@Get('properties')
findAll(@CurrentOrganization() orgId: string) {
  return this.propertiesService.findAll(orgId);
}
```

**Service Pattern:**

```typescript
findAll(organizationId: string) {
  return this.prisma.property.findMany({
    where: { organizationId },
  });
}
```

**Acceptance Criteria:**

- [ ] User A cannot see User B's data (different orgs)
- [ ] All service methods require organizationId
- [ ] No service method accesses data without org filter
- [ ] Cross-org access attempt returns 404
- [ ] Database indexes exist on organizationId

**Dependencies:** Phase 15
**Estimated Effort:** 6 hours

---

## PHASE 17: Rate Limiting

**Objective:** Protect API from abuse and brute force attacks.

**Deliverables:**

1. Install throttler: `pnpm add @nestjs/throttler`
2. Configure global rate limit: 100 requests per 60 seconds per IP
3. Configure auth endpoints: 5 requests per 60 seconds per IP
4. Configure payment endpoints: 10 requests per 60 seconds per IP
5. Return HTTP 429 when limit exceeded
6. Include `Retry-After` header in 429 response
7. Skip rate limiting for health check endpoint

**Throttler Configuration:**

```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 3 },
  { name: 'medium', ttl: 10000, limit: 20 },
  { name: 'long', ttl: 60000, limit: 100 },
]);
```

**Acceptance Criteria:**

- [ ] Global rate limit enforced
- [ ] Auth endpoints have stricter limits
- [ ] Rate limit applies per IP address
- [ ] 429 response includes retry time
- [ ] Health check exempt from limits

**Dependencies:** Phase 7
**Estimated Effort:** 2 hours

---

## PHASE 18: CORS Configuration

**Objective:** Configure Cross-Origin Resource Sharing for frontend access.

**Deliverables:**

1. Define allowed origins in environment variable
2. Configure CORS in `main.ts`
3. Allow credentials for cookie-based auth
4. Specify allowed methods: GET, POST, PUT, PATCH, DELETE
5. Specify allowed headers: Content-Type, Authorization, x-correlation-id
6. Set max age for preflight cache: 86400 seconds

**CORS Configuration:**

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  maxAge: 86400,
});
```

**Acceptance Criteria:**

- [ ] Frontend can access API without CORS errors
- [ ] Only specified origins allowed
- [ ] Credentials (cookies) included in requests
- [ ] Preflight requests cached
- [ ] Invalid origins rejected

**Dependencies:** Phase 1
**Estimated Effort:** 1 hour

---

## PHASE 19: Input Validation

**Objective:** Validate all API inputs to prevent injection and data corruption.

**Deliverables:**

1. Install class-validator: `pnpm add class-validator class-transformer`
2. Enable ValidationPipe globally in `main.ts`
3. Create DTOs for all API endpoints
4. Add validation decorators to all DTO properties
5. Configure pipe options: whitelist, forbidNonWhitelisted, transform
6. Return detailed validation errors

**ValidationPipe Configuration:**

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => new BadRequestException(formatErrors(errors)),
  }),
);
```

**Acceptance Criteria:**

- [ ] All endpoints have DTOs
- [ ] Unknown properties stripped from requests
- [ ] Invalid data returns 400 with field-level errors
- [ ] Date strings transformed to Date objects
- [ ] Number strings transformed to numbers

**Dependencies:** Phase 2
**Estimated Effort:** 4 hours

---

## PHASE 20: Security Headers

**Objective:** Add HTTP security headers to prevent common attacks.

**Deliverables:**

1. Install helmet: `pnpm add helmet`
2. Configure Helmet middleware in `main.ts`
3. Set headers:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `Content-Security-Policy: default-src 'self'`
4. Disable `X-Powered-By` header
5. Configure CSP for frontend (allow Stripe, fonts, etc.)

**Acceptance Criteria:**

- [ ] Security headers present in all responses
- [ ] No server version information exposed
- [ ] Clickjacking prevented (X-Frame-Options)
- [ ] XSS mitigated (CSP + X-XSS-Protection)
- [ ] HTTPS enforced in production (HSTS)

**Dependencies:** Phase 18
**Estimated Effort:** 2 hours

---

# SECTION 3: PROPERTIES (Phases 21-30) [MVP]

---

## PHASE 21: Property Model Verification

**Objective:** Ensure Property database model meets all requirements.

**Deliverables:**

1. Verify Property model in Prisma schema has fields:
   - id (cuid)
   - organizationId (required, foreign key)
   - name (required, string)
   - type (enum: MULTIFAMILY, SINGLE_FAMILY, COMMERCIAL, MIXED_USE, STUDENT_HOUSING, SENIOR_LIVING)
   - address (required, string)
   - city (required, string)
   - state (required, string, 2 chars)
   - zipCode (required, string, 5 or 9 chars)
   - country (default: USA)
   - yearBuilt (optional, int)
   - totalUnits (int, default 0)
   - createdAt, updatedAt timestamps
2. Add database indexes on: organizationId, type, city, state
3. Run migration if schema changed

**Acceptance Criteria:**

- [ ] All fields exist with correct types
- [ ] Foreign key to Organization enforced
- [ ] Indexes exist for common queries
- [ ] Migration applied successfully

**Dependencies:** Phase 1
**Estimated Effort:** 2 hours

---

## PHASE 22: Property DTOs

**Objective:** Create Data Transfer Objects for Property API.

**Deliverables:**

1. Create `packages/backend/src/modules/properties/dto/create-property.dto.ts`
2. Create `packages/backend/src/modules/properties/dto/update-property.dto.ts`
3. Create `packages/backend/src/modules/properties/dto/property-response.dto.ts`
4. Create `packages/backend/src/modules/properties/dto/property-query.dto.ts`
5. Add validation decorators to all fields
6. Add Swagger decorators for API documentation

**CreatePropertyDto:**

```typescript
export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'Sunset Apartments' })
  name: string;

  @IsEnum(PropertyType)
  @ApiProperty({ enum: PropertyType })
  type: PropertyType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @IsString()
  @Length(2, 50)
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;

  @Matches(/^\d{5}(-\d{4})?$/)
  zipCode: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  yearBuilt?: number;
}
```

**Acceptance Criteria:**

- [ ] CreatePropertyDto validates all required fields
- [ ] UpdatePropertyDto makes all fields optional
- [ ] PropertyResponseDto includes computed fields
- [ ] PropertyQueryDto supports filtering and pagination
- [ ] Swagger documentation generated

**Dependencies:** Phase 21
**Estimated Effort:** 3 hours

---

## PHASE 23: Properties Service Implementation

**Objective:** Implement business logic for Property CRUD operations.

**Deliverables:**

1. Implement `create(dto: CreatePropertyDto, organizationId: string): Promise<Property>`
2. Implement `findAll(organizationId: string, query: PropertyQueryDto): Promise<PaginatedResponse<Property>>`
3. Implement `findOne(id: string, organizationId: string): Promise<Property>`
4. Implement `update(id: string, dto: UpdatePropertyDto, organizationId: string): Promise<Property>`
5. Implement `remove(id: string, organizationId: string): Promise<void>`
6. Add logging to all methods
7. Throw appropriate exceptions for errors

**Service Method Signatures:**

```typescript
@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {
    this.logger.setContext(PropertiesService.name);
  }

  async create(dto: CreatePropertyDto, organizationId: string): Promise<Property> {
    this.logger.log('Creating property', { organizationId, dto });
    // Implementation
  }

  async findAll(
    organizationId: string,
    query: PropertyQueryDto,
  ): Promise<PaginatedResponse<Property>> {
    // Include pagination, sorting, filtering
  }

  async findOne(id: string, organizationId: string): Promise<Property> {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId },
      include: { units: true },
    });
    if (!property) {
      throw new EntityNotFoundException('Property', id);
    }
    return property;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const property = await this.findOne(id, organizationId);
    if (property.units.length > 0) {
      throw new PropertyHasUnitsException(id, property.units.length);
    }
    await this.prisma.property.delete({ where: { id } });
  }
}
```

**Acceptance Criteria:**

- [ ] All CRUD operations work correctly
- [ ] Organization isolation enforced in all queries
- [ ] Pagination returns total count and page info
- [ ] Cannot delete property with units
- [ ] All operations logged

**Dependencies:** Phase 22, Phase 8
**Estimated Effort:** 6 hours

---

## PHASE 24: Properties Controller Implementation

**Objective:** Expose Property CRUD via REST API.

**Deliverables:**

1. Create `packages/backend/src/modules/properties/properties.controller.ts`
2. Implement endpoints:
   - `POST /api/v1/properties` - Create property
   - `GET /api/v1/properties` - List properties (paginated)
   - `GET /api/v1/properties/:id` - Get single property
   - `PUT /api/v1/properties/:id` - Update property
   - `DELETE /api/v1/properties/:id` - Delete property
3. Apply guards: JwtAuthGuard, RolesGuard, OrganizationGuard
4. Add Swagger decorators for API documentation
5. Return consistent response structure

**Controller Implementation:**

```typescript
@ApiTags('properties')
@Controller('api/v1/properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Post()
  @Roles(UserRole.ORGANIZATION_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({ status: 201, type: PropertyResponseDto })
  create(@Body() dto: CreatePropertyDto, @CurrentOrganization() orgId: string) {
    return this.propertiesService.create(dto, orgId);
  }

  @Get()
  @Roles(UserRole.ORGANIZATION_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List all properties' })
  @ApiResponse({ status: 200, type: PaginatedPropertyResponseDto })
  findAll(@Query() query: PropertyQueryDto, @CurrentOrganization() orgId: string) {
    return this.propertiesService.findAll(orgId, query);
  }

  // ... other endpoints
}
```

**Acceptance Criteria:**

- [ ] All endpoints return correct HTTP status codes
- [ ] Validation errors return 400 with details
- [ ] Not found returns 404
- [ ] Forbidden returns 403
- [ ] Swagger UI shows all endpoints

**Dependencies:** Phase 23, Phase 16
**Estimated Effort:** 4 hours

---

## PHASE 25: Properties Service Unit Tests

**Objective:** Achieve 80% test coverage for PropertiesService.

**Deliverables:**

1. Create `packages/backend/src/modules/properties/properties.service.spec.ts`
2. Write tests:
   - `create()`: success, validation error, duplicate handling
   - `findAll()`: empty list, with results, pagination, filtering
   - `findOne()`: success, not found, wrong organization
   - `update()`: success, not found, validation error
   - `remove()`: success, not found, has units error
3. Use mock PrismaService
4. Verify logging calls

**Test Structure:**

```typescript
describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppLogger, useValue: mockLogger },
      ],
    }).compile();
    service = module.get(PropertiesService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create property with organizationId', async () => {
      const dto: CreatePropertyDto = { name: 'Test', type: 'MULTIFAMILY', ... };
      prisma.property.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto, 'org-1');

      expect(prisma.property.create).toHaveBeenCalledWith({
        data: { ...dto, organizationId: 'org-1' },
      });
      expect(result.id).toBe('1');
    });
  });

  // ... more tests
});
```

**Acceptance Criteria:**

- [ ] All service methods have tests
- [ ] Coverage > 80% for properties.service.ts
- [ ] Tests cover success and error paths
- [ ] Tests run in < 5 seconds
- [ ] No actual database calls

**Dependencies:** Phase 23, Phase 11
**Estimated Effort:** 4 hours

---

## PHASE 26: Properties API Integration Tests

**Objective:** Test Property API endpoints with actual HTTP requests.

**Deliverables:**

1. Create `packages/backend/src/modules/properties/properties.e2e-spec.ts`
2. Set up test database (in-memory or test container)
3. Write tests:
   - POST creates property and returns 201
   - GET returns paginated list
   - GET /:id returns single property
   - PUT updates property
   - DELETE removes property
   - Unauthorized request returns 401
   - Wrong organization returns 404
4. Clean up test data after each test

**Integration Test Structure:**

```typescript
describe('Properties API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    // Login to get auth token
    authToken = await login(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/properties', () => {
    it('should create property', () => {
      return request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Property', type: 'MULTIFAMILY', ... })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('Test Property');
        });
    });
  });
});
```

**Acceptance Criteria:**

- [ ] Tests run against real HTTP endpoints
- [ ] Database state reset between tests
- [ ] All HTTP status codes verified
- [ ] Response body structure verified
- [ ] Tests run in < 30 seconds

**Dependencies:** Phase 24
**Estimated Effort:** 4 hours

---

## PHASE 27: Frontend Property List Page

**Objective:** Display list of properties with filtering and pagination.

**Deliverables:**

1. Verify `packages/frontend-admin/src/pages/PropertiesPage.tsx` exists
2. Implement features:
   - Display property cards in grid layout
   - Show: name, address, type, unit count, occupancy rate
   - Filter by: type, city, state
   - Search by: name, address
   - Pagination with page size selector
   - Loading skeleton while fetching
   - Empty state when no properties
3. Use TanStack Query for data fetching
4. Navigate to property detail on card click

**Component Structure:**

```typescript
export function PropertiesPage() {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['properties', filters, page, pageSize],
    queryFn: () => propertiesApi.getAll({ ...filters, page, pageSize }),
  });

  if (isLoading) return <PropertyListSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data?.items.length) return <EmptyState />;

  return (
    <div>
      <PropertyFilters filters={filters} onChange={setFilters} />
      <PropertyGrid properties={data.items} />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={data.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
```

**Acceptance Criteria:**

- [ ] Properties load and display correctly
- [ ] Filters work (type, city, state)
- [ ] Search works (name, address)
- [ ] Pagination shows correct total
- [ ] Loading state shown during fetch
- [ ] Error state shown on failure

**Dependencies:** Phase 24
**Estimated Effort:** 6 hours

---

## PHASE 28: Frontend Create Property Modal

**Objective:** Allow users to create new properties via modal form.

**Deliverables:**

1. Create `packages/frontend-admin/src/components/properties/CreatePropertyModal.tsx`
2. Implement form fields:
   - Name (required, text)
   - Type (required, select dropdown)
   - Address (required, text)
   - City (required, text)
   - State (required, select dropdown with US states)
   - Zip Code (required, text with format validation)
   - Year Built (optional, number)
3. Client-side validation matching server DTOs
4. Submit button disabled while submitting
5. Show success toast and close modal on success
6. Show error toast on failure
7. Use react-hook-form for form management

**Modal Component:**

```typescript
export function CreatePropertyModal({ open, onClose }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertySchema),
  });

  const createProperty = useMutation({
    mutationFn: propertiesApi.create,
    onSuccess: () => {
      toast.success('Property created successfully');
      queryClient.invalidateQueries(['properties']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit(data => createProperty.mutate(data))}>
          <Input label="Name" {...register('name')} error={errors.name?.message} />
          <Select label="Type" {...register('type')} options={PROPERTY_TYPES} />
          {/* ... other fields */}
          <Button type="submit" loading={isSubmitting}>Create Property</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**

- [ ] Modal opens from Properties page
- [ ] All fields render correctly
- [ ] Validation errors display inline
- [ ] Form submits successfully
- [ ] Property list refreshes after create
- [ ] Modal closes on success

**Dependencies:** Phase 27
**Estimated Effort:** 4 hours

---

## PHASE 29: Frontend Edit Property Modal

**Objective:** Allow users to edit existing properties via modal form.

**Deliverables:**

1. Create `packages/frontend-admin/src/components/properties/EditPropertyModal.tsx`
2. Pre-populate form with existing property data
3. Same fields and validation as Create modal
4. Show "Save Changes" button
5. Detect if form is dirty (has changes)
6. Warn user if closing with unsaved changes
7. Use optimistic updates for better UX

**Edit Modal Specifics:**

```typescript
export function EditPropertyModal({ property, open, onClose }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(updatePropertySchema),
    defaultValues: property,
  });

  const updateProperty = useMutation({
    mutationFn: (data) => propertiesApi.update(property.id, data),
    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries(['properties']);
      const previous = queryClient.getQueryData(['properties']);
      queryClient.setQueryData(['properties'], (old) =>
        old.map((p) => (p.id === property.id ? { ...p, ...newData } : p)),
      );
      return { previous };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(['properties'], context.previous);
      toast.error('Failed to update property');
    },
    onSuccess: () => {
      toast.success('Property updated');
      onClose();
    },
  });

  const handleClose = () => {
    if (isDirty && !confirm('Discard unsaved changes?')) return;
    onClose();
  };

  // ... render form
}
```

**Acceptance Criteria:**

- [ ] Form pre-populates with property data
- [ ] Only changed fields submitted
- [ ] Optimistic update shows immediately
- [ ] Rollback on error
- [ ] Unsaved changes warning works
- [ ] Property list updates after save

**Dependencies:** Phase 28
**Estimated Effort:** 4 hours

---

## PHASE 30: Frontend Delete Property Confirmation

**Objective:** Allow users to delete properties with confirmation.

**Deliverables:**

1. Create `packages/frontend-admin/src/components/properties/DeletePropertyDialog.tsx`
2. Show confirmation dialog before delete
3. Display property name in confirmation message
4. Show warning if property has units (disable delete)
5. Delete button shows loading state
6. Remove property from list on success
7. Handle error if delete fails

**Delete Dialog:**

```typescript
export function DeletePropertyDialog({ property, open, onClose }: Props) {
  const hasUnits = property.unitCount > 0;

  const deleteProperty = useMutation({
    mutationFn: () => propertiesApi.delete(property.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['properties']);
      toast.success('Property deleted');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete Property</AlertDialogTitle>
        <AlertDialogDescription>
          {hasUnits ? (
            <span className="text-red-600">
              Cannot delete "{property.name}" because it has {property.unitCount} units.
              Remove all units first.
            </span>
          ) : (
            <>Are you sure you want to delete "{property.name}"? This action cannot be undone.</>
          )}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteProperty.mutate()}
            disabled={hasUnits || deleteProperty.isPending}
            className="bg-red-600"
          >
            {deleteProperty.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Acceptance Criteria:**

- [ ] Confirmation dialog appears before delete
- [ ] Property name shown in dialog
- [ ] Cannot delete property with units
- [ ] Loading state during deletion
- [ ] Success removes from list
- [ ] Error shown if delete fails

**Dependencies:** Phase 29
**Estimated Effort:** 2 hours

---

# SECTION 4: UNITS (Phases 31-38) [MVP]

---

## PHASE 31: Unit Model Verification

**Objective:** Ensure Unit database model meets all requirements.

**Deliverables:**

1. Verify Unit model has fields:
   - id (cuid)
   - propertyId (required, foreign key)
   - organizationId (required, foreign key)
   - unitNumber (required, string)
   - type (enum: STUDIO, ONE_BED, TWO_BED, THREE_BED, FOUR_PLUS_BED)
   - bedrooms (int)
   - bathrooms (decimal)
   - squareFeet (int, optional)
   - marketRent (decimal, required)
   - status (enum: VACANT, OCCUPIED, NOTICE, MAINTENANCE)
   - floor (int, optional)
   - features (string array)
   - createdAt, updatedAt
2. Add indexes: propertyId, organizationId, status
3. Add unique constraint: (propertyId, unitNumber)

**Acceptance Criteria:**

- [ ] All fields exist with correct types
- [ ] Foreign keys enforced
- [ ] Unit number unique within property
- [ ] Indexes exist for queries

**Dependencies:** Phase 21
**Estimated Effort:** 2 hours

---

## PHASE 32: Unit DTOs

**Objective:** Create DTOs for Unit API.

**Deliverables:**

1. Create `create-unit.dto.ts`
2. Create `update-unit.dto.ts`
3. Create `unit-response.dto.ts`
4. Create `unit-query.dto.ts`
5. Add validation for all fields
6. marketRent must be positive number
7. squareFeet must be positive if provided

**Acceptance Criteria:**

- [ ] All DTOs created with validation
- [ ] Swagger documentation generated
- [ ] Type/status enums validated

**Dependencies:** Phase 31
**Estimated Effort:** 2 hours

---

## PHASE 33: Units Service Implementation

**Objective:** Implement business logic for Unit CRUD.

**Deliverables:**

1. Implement `create(dto, propertyId, organizationId)`
2. Implement `findAll(propertyId, organizationId, query)`
3. Implement `findOne(id, organizationId)`
4. Implement `update(id, dto, organizationId)`
5. Implement `remove(id, organizationId)`
6. Implement `updateStatus(id, status, organizationId)`
7. Verify property exists before creating unit
8. Cannot delete unit with active lease

**Business Rules:**

- Unit number must be unique within property
- Cannot change propertyId after creation
- Status changes logged for audit
- Deleting unit requires no active lease

**Acceptance Criteria:**

- [ ] All CRUD operations work
- [ ] Property existence verified
- [ ] Unique unit number enforced
- [ ] Status changes logged
- [ ] Cannot delete with active lease

**Dependencies:** Phase 32, Phase 23
**Estimated Effort:** 5 hours

---

## PHASE 34: Units Controller Implementation

**Objective:** Expose Unit CRUD via REST API.

**Deliverables:**

1. Create `units.controller.ts`
2. Implement endpoints:
   - `POST /api/v1/properties/:propertyId/units`
   - `GET /api/v1/properties/:propertyId/units`
   - `GET /api/v1/units/:id`
   - `PUT /api/v1/units/:id`
   - `DELETE /api/v1/units/:id`
   - `PATCH /api/v1/units/:id/status`
3. Apply guards
4. Swagger documentation

**Acceptance Criteria:**

- [ ] All endpoints work correctly
- [ ] Nested route for property units
- [ ] Status can be updated separately
- [ ] Guards applied

**Dependencies:** Phase 33
**Estimated Effort:** 3 hours

---

## PHASE 35: Units Service Tests

**Objective:** Test coverage for UnitsService.

**Deliverables:**

1. Create `units.service.spec.ts`
2. Test all CRUD operations
3. Test business rules:
   - Unique unit number
   - Property must exist
   - Cannot delete with lease
4. Coverage > 80%

**Acceptance Criteria:**

- [ ] All methods tested
- [ ] Business rules verified
- [ ] Edge cases covered

**Dependencies:** Phase 33
**Estimated Effort:** 4 hours

---

## PHASE 36: Frontend Unit List (Within Property)

**Objective:** Display units for a property.

**Deliverables:**

1. Create `UnitsTable.tsx` component
2. Display in Property Detail page
3. Show: unit number, type, bedrooms, bathrooms, sqft, rent, status
4. Status badges with colors (green=occupied, yellow=notice, red=vacant)
5. Filter by status
6. Sort by unit number, rent, status

**Acceptance Criteria:**

- [ ] Units display in table format
- [ ] Status badges colored correctly
- [ ] Filter and sort work
- [ ] Empty state shown

**Dependencies:** Phase 34, Phase 27
**Estimated Effort:** 4 hours

---

## PHASE 37: Frontend Create/Edit Unit Modal

**Objective:** CRUD modals for units.

**Deliverables:**

1. Create `CreateUnitModal.tsx`
2. Create `EditUnitModal.tsx`
3. Form fields match DTO
4. Validation matches server
5. Optimistic updates

**Acceptance Criteria:**

- [ ] Create adds unit to list
- [ ] Edit updates unit in place
- [ ] Validation errors shown
- [ ] Success toast displayed

**Dependencies:** Phase 36
**Estimated Effort:** 4 hours

---

## PHASE 38: Frontend Unit Status Update

**Objective:** Quick status update for units.

**Deliverables:**

1. Add status dropdown to unit row
2. Status changes immediately via PATCH
3. Confirmation for certain transitions (e.g., OCCUPIED → VACANT)
4. Disable invalid transitions

**Status Transition Rules:**

- VACANT → OCCUPIED (requires active lease)
- OCCUPIED → NOTICE (tenant gave notice)
- NOTICE → VACANT (tenant moved out)
- Any → MAINTENANCE (repair needed)
- MAINTENANCE → previous status

**Acceptance Criteria:**

- [ ] Dropdown updates status
- [ ] Invalid transitions disabled
- [ ] Confirmation for destructive changes
- [ ] UI updates immediately

**Dependencies:** Phase 37
**Estimated Effort:** 3 hours

---

# SECTION 5: LEASES (Phases 39-50) [MVP]

---

## PHASE 39: Lease Model Verification

**Objective:** Ensure Lease model is complete.

**Deliverables:**

1. Verify Lease model has:
   - id, organizationId, propertyId, unitId
   - status (DRAFT, PENDING, ACTIVE, EXPIRED, TERMINATED, CANCELLED)
   - startDate, endDate (required)
   - monthlyRent (decimal, required)
   - securityDeposit (decimal)
   - lateFeePct (decimal, default 5)
   - lateFeeGraceDays (int, default 5)
   - paymentDueDay (int, 1-28, default 1)
   - terms (text, lease terms)
   - createdAt, updatedAt
2. Relation to Tenants (many tenants per lease)
3. Indexes on: unitId, status, organizationId

**Acceptance Criteria:**

- [ ] All fields exist
- [ ] Relations correct
- [ ] Indexes created

**Dependencies:** Phase 31
**Estimated Effort:** 2 hours

---

## PHASE 40: Tenant Model Verification

**Objective:** Ensure Tenant model is complete.

**Deliverables:**

1. Verify Tenant model has:
   - id, organizationId, leaseId
   - userId (optional, for portal access)
   - firstName, lastName
   - email (required, unique within org)
   - phone (optional)
   - isPrimary (boolean, one per lease)
   - moveInDate, moveOutDate
   - emergencyContact (JSON)
   - createdAt, updatedAt
2. Tenant linked to User for portal login
3. Index on: leaseId, organizationId, email

**Acceptance Criteria:**

- [ ] All fields exist
- [ ] One primary tenant per lease enforced
- [ ] Email unique within organization

**Dependencies:** Phase 39
**Estimated Effort:** 2 hours

---

## PHASE 41: Lease DTOs

**Objective:** Create DTOs for Lease API.

**Deliverables:**

1. Create `create-lease.dto.ts`
   - unitId (required)
   - startDate, endDate (required, endDate > startDate)
   - monthlyRent (required, > 0)
   - securityDeposit (>= 0)
   - tenants array (at least one, one isPrimary)
2. Create `update-lease.dto.ts`
3. Create `lease-response.dto.ts`
4. Create `lease-query.dto.ts`

**Validation Rules:**

- End date must be after start date
- At least one tenant required
- Exactly one primary tenant
- Monthly rent > 0
- Security deposit >= 0
- Payment due day 1-28

**Acceptance Criteria:**

- [ ] All DTOs with validation
- [ ] Date validations work
- [ ] Tenant array validated

**Dependencies:** Phase 39, Phase 40
**Estimated Effort:** 3 hours

---

## PHASE 42: Leases Service Implementation

**Objective:** Business logic for lease management.

**Deliverables:**

1. `create(dto, organizationId)`:
   - Verify unit exists and is vacant
   - Create lease with DRAFT status
   - Create tenant records
   - Update unit status to OCCUPIED when activated
2. `findAll(organizationId, query)`:
   - Include tenants, unit, property
   - Filter by status, propertyId
3. `findOne(id, organizationId)`
4. `update(id, dto, organizationId)`:
   - Cannot change unitId
   - Cannot modify TERMINATED/CANCELLED leases
5. `activate(id, organizationId)`:
   - Change DRAFT/PENDING → ACTIVE
   - Update unit status
6. `terminate(id, organizationId, reason)`:
   - Change ACTIVE → TERMINATED
   - Update unit status to NOTICE
7. `renew(id, dto, organizationId)`:
   - Create new lease from existing
   - Link to same unit
   - Old lease status → EXPIRED

**Business Rules:**

- Cannot create lease for occupied unit
- Lease dates cannot overlap for same unit
- Termination requires reason
- Only DRAFT/PENDING leases editable

**Acceptance Criteria:**

- [ ] All operations work
- [ ] Unit status updates
- [ ] Overlap prevented
- [ ] Status transitions enforced

**Dependencies:** Phase 41, Phase 33
**Estimated Effort:** 8 hours

---

## PHASE 43: Leases Controller Implementation

**Objective:** REST API for leases.

**Deliverables:**

1. Endpoints:
   - `POST /api/v1/leases`
   - `GET /api/v1/leases`
   - `GET /api/v1/leases/:id`
   - `PUT /api/v1/leases/:id`
   - `DELETE /api/v1/leases/:id` (only DRAFT)
   - `POST /api/v1/leases/:id/activate`
   - `POST /api/v1/leases/:id/terminate`
   - `POST /api/v1/leases/:id/renew`
2. Query params: status, propertyId, unitId, tenantEmail

**Acceptance Criteria:**

- [ ] All endpoints documented
- [ ] Status transitions via POST
- [ ] Query filters work

**Dependencies:** Phase 42
**Estimated Effort:** 4 hours

---

## PHASE 44: Lease Service Tests

**Objective:** Test coverage for LeasesService.

**Deliverables:**

1. Test all CRUD operations
2. Test status transitions
3. Test overlap prevention
4. Test tenant management
5. Coverage > 80%

**Acceptance Criteria:**

- [ ] All methods tested
- [ ] Business rules verified
- [ ] Edge cases covered

**Dependencies:** Phase 42
**Estimated Effort:** 6 hours

---

## PHASE 45: Frontend Leases List Page

**Objective:** Display and manage leases.

**Deliverables:**

1. Create/update `LeasesPage.tsx`
2. Table columns: property, unit, tenant, dates, rent, status
3. Filters: status, property, date range
4. Status badges with colors
5. Quick actions: view, activate, terminate

**Acceptance Criteria:**

- [ ] Leases display correctly
- [ ] Filters work
- [ ] Status badges colored
- [ ] Quick actions work

**Dependencies:** Phase 43
**Estimated Effort:** 5 hours

---

## PHASE 46: Frontend Create Lease Wizard

**Objective:** Multi-step wizard for lease creation.

**Deliverables:**

1. Create `CreateLeaseWizard.tsx`
2. Step 1: Select property and unit
3. Step 2: Enter lease terms (dates, rent, deposit)
4. Step 3: Add tenants
5. Step 4: Review and create
6. Validation at each step
7. Back/Next navigation
8. Save as draft option

**Wizard Steps:**

```typescript
const steps = [
  { id: 'unit', title: 'Select Unit', component: UnitSelectionStep },
  { id: 'terms', title: 'Lease Terms', component: LeaseTermsStep },
  { id: 'tenants', title: 'Add Tenants', component: TenantsStep },
  { id: 'review', title: 'Review', component: ReviewStep },
];
```

**Acceptance Criteria:**

- [ ] Wizard navigates correctly
- [ ] Validation at each step
- [ ] Can go back without losing data
- [ ] Creates lease on final submit

**Dependencies:** Phase 45
**Estimated Effort:** 8 hours

---

## PHASE 47: Frontend Edit Lease Modal

**Objective:** Edit existing leases.

**Deliverables:**

1. Create `EditLeaseModal.tsx`
2. Cannot change unit
3. Can modify: dates, rent, deposit, tenants
4. Disabled for TERMINATED/CANCELLED
5. Changes require confirmation

**Acceptance Criteria:**

- [ ] Edit form pre-populated
- [ ] Unit not editable
- [ ] Disabled for final statuses

**Dependencies:** Phase 46
**Estimated Effort:** 4 hours

---

## PHASE 48: Frontend Lease Status Actions

**Objective:** UI for lease status transitions.

**Deliverables:**

1. "Activate" button for DRAFT/PENDING leases
2. "Terminate" button with reason modal for ACTIVE leases
3. "Renew" button opens renewal wizard
4. Status change confirmation dialogs
5. Audit log of status changes

**Status Actions UI:**

```typescript
function LeaseActions({ lease }: { lease: Lease }) {
  if (lease.status === 'DRAFT') {
    return <Button onClick={activate}>Activate Lease</Button>;
  }
  if (lease.status === 'ACTIVE') {
    return (
      <>
        <Button onClick={openTerminate} variant="destructive">Terminate</Button>
        <Button onClick={openRenew}>Renew Lease</Button>
      </>
    );
  }
  return null;
}
```

**Acceptance Criteria:**

- [ ] Correct actions shown per status
- [ ] Terminate requires reason
- [ ] Renew pre-fills from current lease
- [ ] Status updates immediately

**Dependencies:** Phase 47
**Estimated Effort:** 4 hours

---

## PHASE 49: Frontend Tenant Management

**Objective:** Manage tenants within lease.

**Deliverables:**

1. Tenant list within lease detail
2. Add tenant to existing lease
3. Remove tenant (if not primary)
4. Edit tenant details
5. Set primary tenant

**Acceptance Criteria:**

- [ ] Tenant list displays
- [ ] Can add/remove tenants
- [ ] Primary tenant enforced
- [ ] Contact info editable

**Dependencies:** Phase 48
**Estimated Effort:** 4 hours

---

## PHASE 50: Lease Expiration Tracking

**Objective:** Track and alert on expiring leases.

**Deliverables:**

1. Dashboard widget: "Leases Expiring Soon" (30/60/90 days)
2. Backend query for expiring leases
3. Lease list filter: "Expiring in X days"
4. Scheduled job to check expirations (daily)
5. Auto-update expired leases to EXPIRED status

**Acceptance Criteria:**

- [ ] Widget shows expiring count
- [ ] Filter returns correct leases
- [ ] Expired leases auto-update
- [ ] No manual intervention needed

**Dependencies:** Phase 49
**Estimated Effort:** 4 hours

---

# SECTION 6: FINANCIAL CORE (Phases 51-62) [MVP]

---

## PHASE 51: Chart of Accounts Model

**Objective:** Standard accounting chart of accounts.

**Deliverables:**

1. ChartOfAccounts model:
   - id, code (unique per org), name
   - type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
   - subtype (specific categories)
   - isSystemAccount (cannot delete)
   - parentId (for hierarchy)
   - organizationId
2. Seed standard accounts:
   - 1000-1999: Assets (Cash, AR, Security Deposits Held)
   - 2000-2999: Liabilities (AP, Security Deposits Owed)
   - 3000-3999: Equity
   - 4000-4999: Revenue (Rent, Late Fees, Other Income)
   - 5000-5999: Expenses (Repairs, Utilities, Insurance)

**Acceptance Criteria:**

- [ ] Standard accounts seeded
- [ ] Account codes unique per org
- [ ] Hierarchy supported
- [ ] System accounts protected

**Dependencies:** Phase 1
**Estimated Effort:** 4 hours

---

## PHASE 52: Transaction Model

**Objective:** Core transaction tracking.

**Deliverables:**

1. Transaction model:
   - id, organizationId, propertyId (optional), unitId (optional)
   - leaseId (optional), tenantId (optional)
   - type (CHARGE, PAYMENT, REFUND, ADJUSTMENT, TRANSFER)
   - accountId (chart of accounts reference)
   - amount (decimal, positive for debits, negative for credits)
   - date (transaction date)
   - description
   - reference (check number, receipt, etc.)
   - status (PENDING, POSTED, VOIDED)
   - createdAt, createdBy

**Acceptance Criteria:**

- [ ] All transaction types supported
- [ ] Proper references maintained
- [ ] Status tracking works

**Dependencies:** Phase 51
**Estimated Effort:** 3 hours

---

## PHASE 53: Charge Model

**Objective:** Track charges (what tenants owe).

**Deliverables:**

1. Charge model:
   - id, organizationId, leaseId, tenantId
   - type (RENT, LATE_FEE, PET_FEE, PARKING, UTILITY, OTHER)
   - amount, description
   - dueDate, paidDate
   - status (PENDING, PARTIAL, PAID, WAIVED, VOID)
   - transactionId (link to Transaction)
2. Auto-generate rent charges monthly
3. Auto-generate late fees after grace period

**Business Rules:**

- Rent charges generated on paymentDueDay
- Late fee added after lateFeeGraceDays
- Charges linked to transactions

**Acceptance Criteria:**

- [ ] Charge types defined
- [ ] Auto-generation works
- [ ] Late fees calculated correctly

**Dependencies:** Phase 52
**Estimated Effort:** 4 hours

---

## PHASE 54: Payment Model

**Objective:** Track payments received.

**Deliverables:**

1. Payment model:
   - id, organizationId, tenantId, leaseId
   - amount, date
   - method (ACH, CREDIT_CARD, CHECK, CASH, WIRE)
   - status (PENDING, COMPLETED, FAILED, REFUNDED)
   - stripePaymentIntentId (for Stripe payments)
   - checkNumber (for checks)
   - transactionId
2. PaymentAllocation model (many-to-many with Charge):
   - paymentId, chargeId, amount

**Business Rules:**

- Payment can cover multiple charges
- Overpayment creates credit
- Partial payment updates charge status

**Acceptance Criteria:**

- [ ] Payment methods supported
- [ ] Allocations track charge coverage
- [ ] Stripe integration fields ready

**Dependencies:** Phase 53
**Estimated Effort:** 4 hours

---

## PHASE 55: Financial Service - Charges

**Objective:** Service for charge management.

**Deliverables:**

1. `createCharge(dto, organizationId)`
2. `getCharges(leaseId/tenantId, organizationId, query)`
3. `getOutstandingBalance(leaseId/tenantId, organizationId)`
4. `waiveCharge(chargeId, organizationId, reason)`
5. `generateRentCharges(organizationId)` - monthly cron
6. `generateLateFees(organizationId)` - daily cron

**Acceptance Criteria:**

- [ ] Charge creation works
- [ ] Balance calculation correct
- [ ] Waive with audit trail
- [ ] Auto-generation reliable

**Dependencies:** Phase 53
**Estimated Effort:** 6 hours

---

## PHASE 56: Financial Service - Payments

**Objective:** Service for payment management.

**Deliverables:**

1. `recordPayment(dto, organizationId)`
2. `allocatePayment(paymentId, allocations[], organizationId)`
3. `autoAllocatePayment(paymentId, organizationId)` - oldest first
4. `refundPayment(paymentId, amount, reason, organizationId)`
5. `getPayments(leaseId/tenantId, organizationId, query)`
6. `getPaymentHistory(tenantId, organizationId)`

**Allocation Logic:**

```typescript
// Auto-allocate payment to oldest charges first
async autoAllocate(paymentId: string, orgId: string) {
  const payment = await this.findPayment(paymentId, orgId);
  const charges = await this.getOutstandingCharges(payment.leaseId, orgId);

  let remaining = payment.amount;
  const allocations = [];

  for (const charge of charges) {
    if (remaining <= 0) break;
    const allocAmount = Math.min(remaining, charge.outstandingAmount);
    allocations.push({ chargeId: charge.id, amount: allocAmount });
    remaining -= allocAmount;
  }

  await this.createAllocations(paymentId, allocations);
}
```

**Acceptance Criteria:**

- [ ] Manual and auto allocation work
- [ ] Refund creates proper entries
- [ ] History shows all transactions

**Dependencies:** Phase 55
**Estimated Effort:** 6 hours

---

## PHASE 57: Financial Controller

**Objective:** REST API for financial operations.

**Deliverables:**

1. Charge endpoints:
   - `GET /api/v1/financial/charges`
   - `POST /api/v1/financial/charges`
   - `POST /api/v1/financial/charges/:id/waive`
2. Payment endpoints:
   - `GET /api/v1/financial/payments`
   - `POST /api/v1/financial/payments`
   - `POST /api/v1/financial/payments/:id/allocate`
   - `POST /api/v1/financial/payments/:id/refund`
3. Ledger endpoint:
   - `GET /api/v1/financial/ledger/:leaseId`
4. Balance endpoint:
   - `GET /api/v1/financial/balance/:leaseId`

**Acceptance Criteria:**

- [ ] All endpoints documented
- [ ] Role-based access (ACCOUNTANT+)
- [ ] Proper error handling

**Dependencies:** Phase 56
**Estimated Effort:** 4 hours

---

## PHASE 58: Financial Service Tests

**Objective:** Test coverage for financial services.

**Deliverables:**

1. Test charge creation and calculation
2. Test payment recording and allocation
3. Test balance calculations
4. Test late fee generation
5. Test edge cases (partial payments, overpayments)

**Test Cases:**

- Create charge → balance increases
- Record payment → balance decreases
- Partial payment → correct remaining
- Overpayment → credit balance
- Late fee → added after grace days
- Waive charge → balance decreases, audit log created

**Acceptance Criteria:**

- [ ] All financial math verified
- [ ] Edge cases handled
- [ ] Coverage > 90%

**Dependencies:** Phase 57
**Estimated Effort:** 6 hours

---

## PHASE 59: Frontend Charges Page

**Objective:** View and manage charges.

**Deliverables:**

1. Create `ChargesPage.tsx` or add to Financial section
2. Table: lease, tenant, type, amount, due date, status
3. Filters: status, type, date range, property
4. Create manual charge button
5. Waive charge action

**Acceptance Criteria:**

- [ ] Charges display correctly
- [ ] Filters work
- [ ] Manual charge creates
- [ ] Waive with confirmation

**Dependencies:** Phase 57
**Estimated Effort:** 5 hours

---

## PHASE 60: Frontend Payments Page

**Objective:** View and record payments.

**Deliverables:**

1. Create `PaymentsPage.tsx`
2. Table: date, tenant, amount, method, status
3. Record manual payment modal
4. Payment detail with allocations
5. Refund action

**Acceptance Criteria:**

- [ ] Payments display correctly
- [ ] Record payment works
- [ ] Allocations visible
- [ ] Refund with confirmation

**Dependencies:** Phase 59
**Estimated Effort:** 5 hours

---

## PHASE 61: Frontend Tenant Ledger

**Objective:** Complete payment history for tenant/lease.

**Deliverables:**

1. Create `TenantLedger.tsx` component
2. Chronological list: charges and payments
3. Running balance column
4. Drill into charge/payment details
5. Export to PDF/CSV

**Ledger Display:**

```
Date       | Description      | Charge  | Payment | Balance
-----------+------------------+---------+---------+---------
2025-01-01 | January Rent     | $1,500  |         | $1,500
2025-01-03 | ACH Payment      |         | $1,500  | $0
2025-01-06 | Late Fee         | $75     |         | $75
2025-02-01 | February Rent    | $1,500  |         | $1,575
```

**Acceptance Criteria:**

- [ ] All transactions shown
- [ ] Running balance correct
- [ ] Export works

**Dependencies:** Phase 60
**Estimated Effort:** 4 hours

---

## PHASE 62: Dashboard Financial Widgets

**Objective:** Financial overview on dashboard.

**Deliverables:**

1. "Total Outstanding" widget with trend
2. "Payments This Month" widget
3. "Overdue Accounts" count and list
4. "Collection Rate" percentage
5. Quick link to full financial pages

**Widget Data:**

```typescript
interface FinancialSummary {
  totalOutstanding: number;
  totalCollectedMonth: number;
  overdueCount: number;
  overdueAmount: number;
  collectionRate: number; // (collected / billed) * 100
}
```

**Acceptance Criteria:**

- [ ] Widgets show real data
- [ ] Numbers update in real-time
- [ ] Click through to details

**Dependencies:** Phase 61
**Estimated Effort:** 4 hours

---

# SECTION 7: PAYMENTS (Phases 63-72) [MVP]

---

## PHASE 63: Stripe Account Setup (Cards Only)

**Objective:** Configure Stripe for credit/debit card processing only.

**Note:** Stripe is used ONLY for card payments (3.15% fee). ACH payments use Dwolla for lower fees ($0.25 vs $5).

**Deliverables:**

1. Document Stripe account creation process
2. Configure environment variables:
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
   - STRIPE_WEBHOOK_SECRET
3. Install Stripe SDK: `pnpm add stripe`
4. Create StripeModule with configuration
5. Verify connection with test API call

**Environment Variables:**

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2023-10-16
```

**Acceptance Criteria:**

- [ ] Stripe SDK installed
- [ ] Environment variables documented
- [ ] Test connection successful

**Dependencies:** Phase 1
**Estimated Effort:** 2 hours

---

## PHASE 63A: Dwolla Account Setup (ACH Payments)

**Objective:** Configure Dwolla for low-cost ACH payment processing.

**Why Dwolla over Stripe ACH:**
- Stripe ACH: 0.8% capped at $5 per transaction
- Dwolla ACH: ~$0.25 per transaction (custom pricing)
- **Savings: $4.75 per transaction** (95% cheaper)

**Deliverables:**

1. Create Dwolla sandbox account at dwolla.com
2. Apply for production access (requires business verification)
3. Configure environment variables:
   - DWOLLA_APP_KEY
   - DWOLLA_APP_SECRET
   - DWOLLA_ENVIRONMENT (sandbox/production)
4. Install Dwolla SDK: `pnpm add dwolla-v2`
5. Create DwollaModule with configuration
6. Verify connection with test API call

**Environment Variables:**

```env
DWOLLA_APP_KEY=your_app_key
DWOLLA_APP_SECRET=your_app_secret
DWOLLA_ENVIRONMENT=sandbox
DWOLLA_WEBHOOK_SECRET=your_webhook_secret
```

**Acceptance Criteria:**

- [ ] Dwolla SDK installed
- [ ] Sandbox account created
- [ ] Environment variables documented
- [ ] Test connection successful

**Dependencies:** Phase 1
**Estimated Effort:** 2 hours

---

## PHASE 63B: Dwolla Service Implementation

**Objective:** Core Dwolla ACH operations.

**Deliverables:**

1. Create `packages/backend/src/modules/payments/dwolla.service.ts`
2. `createCustomer(tenant)` - Create Dwolla customer for tenant
3. `createFundingSource(customerId, bankAccount)` - Link bank account
4. `verifyMicroDeposits(fundingSourceId, amounts)` - Verify bank account
5. `initiateTransfer(source, destination, amount, metadata)` - ACH transfer
6. `getTransferStatus(transferId)` - Check transfer status
7. `cancelTransfer(transferId)` - Cancel pending transfer

**Service Implementation:**

```typescript
@Injectable()
export class DwollaService {
  private client: Client;

  constructor(private configService: ConfigService) {
    this.client = new Client({
      key: this.configService.get('DWOLLA_APP_KEY'),
      secret: this.configService.get('DWOLLA_APP_SECRET'),
      environment: this.configService.get('DWOLLA_ENVIRONMENT'),
    });
  }

  async createCustomer(tenant: Tenant): Promise<string> {
    const response = await this.client.post('customers', {
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      type: 'personal',
    });
    return response.headers.get('location'); // Customer URL
  }

  async initiateTransfer(
    sourceUrl: string,
    destinationUrl: string,
    amount: number,
    metadata: object,
  ) {
    return this.client.post('transfers', {
      _links: {
        source: { href: sourceUrl },
        destination: { href: destinationUrl },
      },
      amount: {
        currency: 'USD',
        value: amount.toFixed(2),
      },
      metadata,
    });
  }
}
```

**Acceptance Criteria:**

- [ ] Customer creation works
- [ ] Bank account linking works
- [ ] Transfer initiation works
- [ ] Proper error handling

**Dependencies:** Phase 63A
**Estimated Effort:** 6 hours

---

## PHASE 63C: Dwolla Webhook Handler

**Objective:** Process Dwolla webhook events for transfer status updates.

**Deliverables:**

1. Create webhook endpoint: `POST /api/v1/webhooks/dwolla`
2. Verify webhook signature
3. Handle events:
   - `transfer_created` → Log transfer initiated
   - `transfer_completed` → Record payment, allocate to charges
   - `transfer_failed` → Mark payment failed, notify tenant
   - `transfer_cancelled` → Handle cancellation
   - `customer_funding_source_verified` → Enable bank account
4. Idempotent processing (handle retries)
5. Log all webhook events

**Webhook Handler:**

```typescript
@Post('webhooks/dwolla')
async handleWebhook(
  @Headers('x-request-signature-sha-256') signature: string,
  @Body() body: DwollaWebhookEvent,
) {
  // Verify signature
  this.dwollaService.verifyWebhook(body, signature);

  switch (body.topic) {
    case 'transfer_completed':
      await this.paymentsService.handleDwollaTransferComplete(body);
      break;
    case 'transfer_failed':
      await this.paymentsService.handleDwollaTransferFailed(body);
      break;
  }

  return { received: true };
}
```

**Acceptance Criteria:**

- [ ] Signature verification works
- [ ] Events processed correctly
- [ ] Idempotent (duplicate events ignored)
- [ ] Failures logged and tenant notified

**Dependencies:** Phase 63B
**Estimated Effort:** 4 hours

---

## PHASE 63D: ACH Payment Scheduler (Recurring Payments)

**Objective:** Build scheduler for recurring ACH payments via Dwolla.

**Note:** Dwolla does not have built-in recurring payments. We build our own scheduler that calls Dwolla API on schedule.

**Deliverables:**

1. Create `ScheduledPayment` database model:
   ```prisma
   model ScheduledPayment {
     id              String   @id @default(cuid())
     organizationId  String
     leaseId         String
     tenantId        String
     amount          Decimal
     dayOfMonth      Int      // 1-28
     fundingSourceId String   // Dwolla bank account
     isActive        Boolean  @default(true)
     nextPaymentDate DateTime
     lastPaymentDate DateTime?
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
   }
   ```

2. Create `ScheduledPaymentsService`:
   - `create(dto)` - Set up recurring payment
   - `cancel(id)` - Disable recurring payment
   - `processScheduledPayments()` - Daily cron job

3. Create daily cron job (`@Cron('0 8 * * *')`):
   ```typescript
   @Cron('0 8 * * *') // Run at 8 AM daily
   async processScheduledPayments() {
     const today = new Date();
     const duePayments = await this.prisma.scheduledPayment.findMany({
       where: {
         isActive: true,
         nextPaymentDate: { lte: today },
       },
       include: { tenant: true, lease: true },
     });

     for (const payment of duePayments) {
       try {
         // Initiate Dwolla transfer
         await this.dwollaService.initiateTransfer(
           payment.fundingSourceId,
           this.getOrgBankAccount(payment.organizationId),
           payment.amount,
           { leaseId: payment.leaseId, scheduledPaymentId: payment.id },
         );

         // Update next payment date
         await this.prisma.scheduledPayment.update({
           where: { id: payment.id },
           data: {
             nextPaymentDate: this.addMonths(payment.nextPaymentDate, 1),
             lastPaymentDate: today,
           },
         });

         this.logger.log('Scheduled payment initiated', { paymentId: payment.id });
       } catch (error) {
         this.logger.error('Scheduled payment failed', { paymentId: payment.id, error });
         // Notify tenant of failed auto-pay
         await this.notifyPaymentFailed(payment);
       }
     }
   }
   ```

4. API Endpoints:
   - `POST /api/v1/payments/scheduled` - Create recurring payment
   - `GET /api/v1/payments/scheduled` - List tenant's scheduled payments
   - `DELETE /api/v1/payments/scheduled/:id` - Cancel recurring payment

**Acceptance Criteria:**

- [ ] Scheduled payment model created
- [ ] Cron job runs daily at 8 AM
- [ ] Payments initiated via Dwolla
- [ ] Next payment date updated correctly
- [ ] Failed payments logged and tenant notified
- [ ] Tenant can enable/disable auto-pay

**Dependencies:** Phase 63C
**Estimated Effort:** 6 hours

---

## PHASE 64: Stripe Service Implementation

**Objective:** Core Stripe operations.

**Deliverables:**

1. Create `packages/backend/src/modules/payments/stripe.service.ts`
2. `createCustomer(tenant)` - Stripe customer for tenant
3. `createPaymentIntent(amount, customerId, metadata)`
4. `createSetupIntent(customerId)` - for saving cards
5. `attachPaymentMethod(customerId, paymentMethodId)`
6. `chargeCard(customerId, amount, paymentMethodId)`
7. `refund(paymentIntentId, amount)`

**Service Implementation:**

```typescript
@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(amount: number, customerId: string, metadata: object) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }
}
```

**Acceptance Criteria:**

- [ ] Customer creation works
- [ ] Payment intent creation works
- [ ] Refund works
- [ ] Proper error handling

**Dependencies:** Phase 63
**Estimated Effort:** 6 hours

---

## PHASE 65: Stripe Webhook Handler

**Objective:** Process Stripe webhook events.

**Deliverables:**

1. Create webhook endpoint: `POST /api/v1/webhooks/stripe`
2. Verify webhook signature
3. Handle events:
   - `payment_intent.succeeded` → record payment
   - `payment_intent.payment_failed` → mark failed
   - `charge.refunded` → record refund
   - `customer.subscription.deleted` → handle cancellation
4. Idempotent processing (handle retries)
5. Log all webhook events

**Webhook Handler:**

```typescript
@Post('webhooks/stripe')
async handleWebhook(
  @Headers('stripe-signature') signature: string,
  @Req() req: RawBodyRequest<Request>,
) {
  const event = this.stripeService.verifyWebhook(req.rawBody, signature);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.paymentsService.handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await this.paymentsService.handlePaymentFailure(event.data.object);
      break;
  }

  return { received: true };
}
```

**Acceptance Criteria:**

- [ ] Signature verification works
- [ ] Events processed correctly
- [ ] Idempotent (duplicate events ignored)
- [ ] Failures logged

**Dependencies:** Phase 64
**Estimated Effort:** 4 hours

---

## PHASE 66: Payment Intent API

**Objective:** API for creating payment intents.

**Deliverables:**

1. `POST /api/v1/payments/intent` - Create payment intent
2. `GET /api/v1/payments/intent/:id` - Get intent status
3. Request body: leaseId, amount, saveCard (boolean)
4. Response: clientSecret, intentId
5. Verify user owns the lease

**Endpoint:**

```typescript
@Post('payments/intent')
@Roles(UserRole.TENANT, UserRole.ORGANIZATION_ADMIN)
async createIntent(
  @Body() dto: CreatePaymentIntentDto,
  @CurrentUser() user: User,
) {
  // Verify user can pay this lease
  await this.verifyLeaseAccess(dto.leaseId, user);

  // Get or create Stripe customer
  const customer = await this.getOrCreateStripeCustomer(user);

  // Create payment intent
  const intent = await this.stripeService.createPaymentIntent(
    dto.amount,
    customer.stripeCustomerId,
    { leaseId: dto.leaseId, userId: user.id },
  );

  return { clientSecret: intent.client_secret, intentId: intent.id };
}
```

**Acceptance Criteria:**

- [ ] Intent created successfully
- [ ] Client secret returned
- [ ] Access verified
- [ ] Metadata attached

**Dependencies:** Phase 65
**Estimated Effort:** 4 hours

---

## PHASE 67: Frontend Payment Form (Stripe Elements)

**Objective:** Secure payment form using Stripe Elements.

**Deliverables:**

1. Install Stripe React: `pnpm add @stripe/react-stripe-js @stripe/stripe-js`
2. Create `PaymentForm.tsx` component
3. Use Stripe PaymentElement
4. Handle payment submission
5. Show success/failure states
6. Support saving card for future

**Payment Form:**

```typescript
export function PaymentForm({ leaseId, amount, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string>();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/payments/complete` },
      redirect: 'if_required',
    });

    if (error) {
      setError(error.message);
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent);
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button type="submit" disabled={!stripe || processing}>
        Pay ${amount.toFixed(2)}
      </Button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
```

**Acceptance Criteria:**

- [ ] Stripe Elements renders
- [ ] Payment completes successfully
- [ ] Error messages shown
- [ ] Processing state shown

**Dependencies:** Phase 66
**Estimated Effort:** 6 hours

---

## PHASE 68: Payment Success Flow

**Objective:** Complete flow after successful payment.

**Deliverables:**

1. Create payment record in database
2. Auto-allocate to outstanding charges
3. Update charge statuses
4. Send receipt email (or log for now)
5. Show success page with confirmation number
6. Invalidate/refresh relevant queries

**Success Flow:**

1. Webhook receives `payment_intent.succeeded`
2. Extract leaseId from metadata
3. Create Payment record with status COMPLETED
4. Call autoAllocatePayment()
5. Queue receipt email
6. Frontend polls intent status and shows success

**Acceptance Criteria:**

- [ ] Payment record created
- [ ] Charges allocated
- [ ] Success UI shown
- [ ] Receipt confirmation

**Dependencies:** Phase 67
**Estimated Effort:** 4 hours

---

## PHASE 69: Saved Payment Methods

**Objective:** Allow tenants to save cards for future use.

**Deliverables:**

1. Store Stripe customer ID on User/Tenant
2. `GET /api/v1/payments/methods` - List saved cards
3. `DELETE /api/v1/payments/methods/:id` - Remove card
4. Show saved cards in payment form
5. Option to pay with saved card or new card

**Saved Cards UI:**

```typescript
export function SavedPaymentMethods({ onSelect }: Props) {
  const { data: methods } = useQuery(['payment-methods'], getPaymentMethods);

  return (
    <div>
      {methods?.map(method => (
        <div key={method.id} className="flex items-center gap-2">
          <CreditCardIcon />
          <span>•••• {method.card.last4}</span>
          <span>{method.card.exp_month}/{method.card.exp_year}</span>
          <Button size="sm" onClick={() => onSelect(method.id)}>Use</Button>
          <Button size="sm" variant="ghost" onClick={() => removeMethod(method.id)}>
            <TrashIcon />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

**Acceptance Criteria:**

- [ ] Cards saved during payment
- [ ] Saved cards listed
- [ ] Can pay with saved card
- [ ] Can delete saved card

**Dependencies:** Phase 68
**Estimated Effort:** 4 hours

---

## PHASE 70: Auto-Pay Enrollment (Frontend)

**Objective:** Frontend UI for tenants to enroll in automatic rent payments via Dwolla ACH.

**Note:** The backend scheduler is implemented in Phase 63D. This phase focuses on the frontend enrollment UI.

**Deliverables:**

1. Create `AutoPayEnrollment.tsx` component in tenant portal
2. Bank account linking via Plaid (for Dwolla funding source)
3. Select payment day (1st-28th of month)
4. Confirmation of auto-pay terms
5. Email notification settings (notify X days before)
6. Cancel auto-pay option

**Frontend Auto-Pay Enrollment:**

```typescript
export function AutoPayEnrollment({ leaseId }: Props) {
  const [step, setStep] = useState<'link-bank' | 'select-day' | 'confirm'>('link-bank');
  const [fundingSourceId, setFundingSourceId] = useState<string>();
  const [paymentDay, setPaymentDay] = useState(1);

  const enrollAutoPay = useMutation({
    mutationFn: () => api.post(`/payments/scheduled`, {
      leaseId,
      fundingSourceId,
      dayOfMonth: paymentDay,
    }),
    onSuccess: () => {
      toast.success('Auto-pay enrolled successfully');
    },
  });

  return (
    <div>
      {step === 'link-bank' && (
        <PlaidLink
          onSuccess={(publicToken) => {
            // Exchange for Dwolla funding source
            exchangeForFundingSource(publicToken).then(setFundingSourceId);
            setStep('select-day');
          }}
        />
      )}
      {step === 'select-day' && (
        <Select
          label="Payment Day"
          value={paymentDay}
          onChange={setPaymentDay}
          options={Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))}
        />
      )}
      {step === 'confirm' && (
        <Button onClick={() => enrollAutoPay.mutate()}>
          Enable Auto-Pay
        </Button>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**

- [ ] Tenant can enable auto-pay
- [ ] Auto-pay runs on schedule
- [ ] Notification before charge
- [ ] Failures handled gracefully

**Dependencies:** Phase 69
**Estimated Effort:** 6 hours

---

## PHASE 71: Payment History UI

**Objective:** Complete payment history for tenants and admins.

**Deliverables:**

1. Tenant portal: "My Payments" page
2. Admin: Payment history in lease detail
3. Display: date, amount, method, status, charges covered
4. Filter by date range, status
5. Download receipt for any payment

**Acceptance Criteria:**

- [ ] Full history visible
- [ ] Filters work
- [ ] Receipt download works

**Dependencies:** Phase 70
**Estimated Effort:** 4 hours

---

## PHASE 72: Payment Notifications

**Objective:** Email notifications for payment events.

**Deliverables:**

1. Payment received confirmation
2. Payment failed notification
3. Auto-pay upcoming notification (3 days before)
4. Auto-pay processed confirmation
5. Rent due reminder (configurable days before)

**Email Templates:**

- `payment-received.hbs`
- `payment-failed.hbs`
- `autopay-reminder.hbs`
- `rent-due-reminder.hbs`

**Acceptance Criteria:**

- [ ] Emails sent for all events
- [ ] Templates render correctly
- [ ] Unsubscribe option included

**Dependencies:** Phase 71
**Estimated Effort:** 4 hours

---

# ═══════════════════════════════════════════════════════════════

# MVP COMPLETE AT PHASE 72

# Total MVP Phases: 72

# ═══════════════════════════════════════════════════════════════

---

# SECTION 8: WORK ORDERS (Phases 73-82) [POST-MVP]

---

## PHASE 73: Work Order Model Verification

**Objective:** Verify WorkOrder model completeness.

**Deliverables:**

1. Verify fields: id, organizationId, propertyId, unitId, tenantId
2. title, description, category, priority
3. status (SUBMITTED, ASSIGNED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED)
4. assignedVendorId, estimatedCost, actualCost
5. scheduledDate, completedDate
6. photos (array of URLs)
7. Indexes on: status, priority, propertyId

**Estimated Effort:** 2 hours

---

## PHASE 74: Work Order Service

**Objective:** Business logic for work orders.

**Deliverables:**

1. CRUD operations
2. Status transitions with validation
3. Vendor assignment
4. Photo upload handling
5. Cost tracking
6. Status history logging

**Estimated Effort:** 6 hours

---

## PHASE 75: Work Order Controller

**Objective:** REST API for work orders.

**Estimated Effort:** 4 hours

---

## PHASE 76: Work Order Tests

**Objective:** Test coverage > 80%.

**Estimated Effort:** 4 hours

---

## PHASE 77: Frontend Work Orders List

**Objective:** Display and filter work orders.

**Estimated Effort:** 5 hours

---

## PHASE 78: Frontend Create Work Order

**Objective:** Form for new work orders with photo upload.

**Estimated Effort:** 4 hours

---

## PHASE 79: Frontend Work Order Detail

**Objective:** Full detail view with status timeline.

**Estimated Effort:** 4 hours

---

## PHASE 80: Work Order Assignment

**Objective:** Assign work orders to vendors.

**Estimated Effort:** 4 hours

---

## PHASE 81: Work Order Status Updates

**Objective:** Status transition UI and notifications.

**Estimated Effort:** 4 hours

---

## PHASE 82: Work Order Completion

**Objective:** Complete work orders with costs and photos.

**Estimated Effort:** 4 hours

---

# SECTION 9: VENDORS (Phases 83-88) [POST-MVP]

---

## PHASE 83: Vendor Model Verification

**Deliverables:** Verify vendor fields, compliance tracking, specialty categories.

**Estimated Effort:** 2 hours

---

## PHASE 84: Vendor Service & Controller

**Deliverables:** CRUD operations, compliance alerts, performance metrics.

**Estimated Effort:** 6 hours

---

## PHASE 85: Frontend Vendor List

**Deliverables:** Vendor directory with filters, compliance badges.

**Estimated Effort:** 4 hours

---

## PHASE 86: Frontend Vendor Detail

**Deliverables:** Full profile, work history, performance stats.

**Estimated Effort:** 4 hours

---

## PHASE 87: Vendor Compliance Tracking

**Deliverables:** Insurance/license expiration alerts, document uploads.

**Estimated Effort:** 4 hours

---

## PHASE 88: Vendor Performance Dashboard

**Deliverables:** Response times, completion rates, ratings.

**Estimated Effort:** 4 hours

---

# SECTION 10: TENANT PORTAL (Phases 89-96) [POST-MVP]

---

## PHASE 89: Tenant Portal Authentication

**Deliverables:** Tenant login, password reset, portal access.

**Estimated Effort:** 4 hours

---

## PHASE 90: Tenant Dashboard

**Deliverables:** Balance, upcoming payments, recent activity.

**Estimated Effort:** 4 hours

---

## PHASE 91: Tenant Payment Page

**Deliverables:** Make payment, view history, enroll auto-pay.

**Estimated Effort:** 6 hours

---

## PHASE 92: Tenant Maintenance Requests

**Deliverables:** Submit request with photos, track status.

**Estimated Effort:** 4 hours

---

## PHASE 93: Tenant Lease View

**Deliverables:** View lease terms, download documents.

**Estimated Effort:** 3 hours

---

## PHASE 94: Tenant Profile

**Deliverables:** Update contact info, emergency contacts.

**Estimated Effort:** 3 hours

---

## PHASE 95: Tenant Communication

**Deliverables:** Message landlord, view announcements.

**Estimated Effort:** 4 hours

---

## PHASE 96: Tenant Mobile Optimization

**Deliverables:** Responsive design, touch-friendly UI.

**Estimated Effort:** 4 hours

---

# SECTION 11: REPORTING (Phases 97-102) [POST-MVP]

---

## PHASE 97: Rent Roll Report

**Deliverables:** All leases with rents, expiration dates, tenant info.

**Estimated Effort:** 4 hours

---

## PHASE 98: Occupancy Report

**Deliverables:** Vacancy rates, trends, property comparison.

**Estimated Effort:** 4 hours

---

## PHASE 99: Financial Reports

**Deliverables:** P&L by property, expense breakdown, revenue trends.

**Estimated Effort:** 6 hours

---

## PHASE 100: Aged Receivables Report

**Deliverables:** Outstanding balances by 30/60/90+ days.

**Estimated Effort:** 4 hours

---

## PHASE 101: Export to Excel/PDF

**Deliverables:** Download reports in multiple formats.

**Estimated Effort:** 4 hours

---

## PHASE 102: Scheduled Reports

**Deliverables:** Email reports on schedule (daily/weekly/monthly).

**Estimated Effort:** 4 hours

---

# SECTION 12: AI & AUTOMATION (Phases 103-106) [POST-MVP]

---

## PHASE 103: Late Fee Automation

**Deliverables:** Auto-generate late fees after grace period.

**Estimated Effort:** 3 hours

---

## PHASE 104: Rent Reminders

**Deliverables:** Automated email/SMS reminders before due date.

**Estimated Effort:** 4 hours

---

## PHASE 105: Lease Expiration Alerts

**Deliverables:** Notify landlord of expiring leases.

**Estimated Effort:** 3 hours

---

## PHASE 106: Document OCR (Lease Parsing)

**Deliverables:** Upload lease PDF, extract key terms automatically.

**Estimated Effort:** 8 hours

---

# SECTION 13: MOBILE & INTEGRATIONS (Phases 107-108) [POST-MVP]

---

## PHASE 107: Progressive Web App

**Deliverables:** Installable PWA, offline support, push notifications.

**Estimated Effort:** 8 hours

---

## PHASE 108: QuickBooks Integration

**Deliverables:** Sync transactions to QuickBooks Online.

**Estimated Effort:** 10 hours

---

# SUMMARY

## Phase Distribution

| Section               | Phases  | Status   |
| --------------------- | ------- | -------- |
| Foundation            | 1-12    | **MVP**  |
| Auth & Security       | 13-20   | **MVP**  |
| Properties            | 21-30   | **MVP**  |
| Units                 | 31-38   | **MVP**  |
| Leases                | 39-50   | **MVP**  |
| Financial Core        | 51-62   | **MVP**  |
| Payments              | 63-72   | **MVP**  |
| Work Orders           | 73-82   | Post-MVP |
| Vendors               | 83-88   | Post-MVP |
| Tenant Portal         | 89-96   | Post-MVP |
| Reporting             | 97-102  | Post-MVP |
| AI & Automation       | 103-106 | Post-MVP |
| Mobile & Integrations | 107-108 | Post-MVP |

## Total Phases: 108

## MVP Phases: 1-72 (72 phases)

## Post-MVP Phases: 73-108 (36 phases)

---

## Execution Guidelines

1. **Complete phases sequentially within each section**
2. **Do not skip phases - each builds on the previous**
3. **Mark phase complete only when ALL deliverables done**
4. **Write tests BEFORE marking phase complete**
5. **Document any deviations in commit messages**
6. **No assumptions - if unclear, add to phase requirements**

---

## Changelog

| Date       | Version | Changes                                              |
| ---------- | ------- | ---------------------------------------------------- |
| 2025-11-27 | 2.0     | Complete rewrite with 108 phases, clear MVP boundary |

---

**This roadmap is DEFINITIVE. Follow it exactly.**
