# Phase 0: Foundation - Task Breakdown

**Duration:** 1 week (40 hours)
**Goal:** Establish rock-solid development infrastructure with testing, logging, monitoring, and quality gates

---

## 📊 Task Overview

| Category                       | Tasks        | Estimated Hours |
| ------------------------------ | ------------ | --------------- |
| **Type Safety & Code Quality** | 3 tasks      | 8h              |
| **Logging Infrastructure**     | 4 tasks      | 8h              |
| **Error Handling**             | 3 tasks      | 6h              |
| **Testing Framework**          | 5 tasks      | 10h             |
| **Monitoring & Analytics**     | 3 tasks      | 4h              |
| **Documentation**              | 2 tasks      | 4h              |
| **Total**                      | **20 tasks** | **40h**         |

---

## 🎯 MUST-HAVE (MVP) - 32 hours

### **A. Type Safety & Code Quality (8h)**

#### **TASK-001: Enable Strict TypeScript**

**Priority:** P0 (Critical)
**Estimated:** 2h

**Description:**
Enable strict TypeScript mode across all packages and fix compilation errors.

**Acceptance Criteria:**

- [ ] `tsconfig.json` has `"strict": true` enabled in all packages
- [ ] All packages compile without errors (`pnpm type-check` passes)
- [ ] ESLint rule `@typescript-eslint/no-explicit-any` set to `error`
- [ ] CI fails if type-check fails

**Implementation:**

```json
// packages/backend/tsconfig.json
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

**Files to modify:**

- `packages/backend/tsconfig.json`
- `packages/admin/tsconfig.json`
- `packages/tenant/tsconfig.json`
- `.eslintrc.js` (add no-explicit-any rule)

---

#### **TASK-002: Fix Existing `any` Types in Critical Modules**

**Priority:** P0 (Critical)
**Estimated:** 4h

**Description:**
Replace `any` types in auth, properties, leases, and payments modules with proper DTOs.

**Acceptance Criteria:**

- [ ] All service methods in auth module have typed parameters
- [ ] All service methods in properties module have typed parameters
- [ ] All service methods in leases module have typed parameters
- [ ] All service methods in payments module have typed parameters
- [ ] DTOs created where needed
- [ ] No `any` types in these modules (except with explicit `// eslint-disable` + justification)

**Example:**

```typescript
// ❌ BEFORE
async create(data: any, organizationId: string) {
  return this.prisma.property.create({ data: { ...data, organizationId } });
}

// ✅ AFTER
async create(dto: CreatePropertyDto, organizationId: string): Promise<Property> {
  this.logger.log('Creating property', { organizationId, dto });
  return this.prisma.property.create({ data: { ...dto, organizationId } });
}
```

**Files to modify:**

- `packages/backend/src/modules/auth/*.service.ts`
- `packages/backend/src/modules/properties/*.service.ts`
- `packages/backend/src/modules/leases/*.service.ts`
- `packages/backend/src/modules/payments/*.service.ts`
- Create missing DTOs in `*/dto/` directories

---

#### **TASK-003: Set Up Pre-Commit Hooks**

**Priority:** P0 (Critical)
**Estimated:** 2h

**Description:**
Configure Husky + lint-staged to run linting, type-checking, and tests before commit.

**Acceptance Criteria:**

- [ ] Husky installed and configured
- [ ] Pre-commit hook runs ESLint on staged files
- [ ] Pre-commit hook runs Prettier on staged files
- [ ] Pre-commit hook runs type-check on affected packages
- [ ] Pre-commit hook runs affected tests
- [ ] Cannot commit if any check fails

**Implementation:**

```bash
# Install
pnpm add -D husky lint-staged

# Initialize
pnpm exec husky install
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname $0)/_/husky.sh"

pnpm lint-staged
pnpm type-check
pnpm test --since HEAD~1
```

**Files to create/modify:**

- `.husky/pre-commit`
- `package.json` (add lint-staged config)

---

### **B. Logging Infrastructure (8h)**

#### **TASK-004: Install and Configure Winston Logger**

**Priority:** P0 (Critical)
**Estimated:** 3h

**Description:**
Set up Winston logger with structured logging, correlation IDs, and file rotation.

**Acceptance Criteria:**

- [ ] Winston + winston-daily-rotate-file installed
- [ ] `AppLogger` service created with structured logging
- [ ] Logs output to console (colored, readable) in development
- [ ] Logs output to JSON files in production
- [ ] Daily log rotation (14-day retention for info, 30-day for errors)
- [ ] Log levels: error, warn, info, debug
- [ ] Correlation ID included in all log entries

**Implementation:**

```typescript
// packages/backend/src/common/logger/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

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
        winston.format.json(),
      ),
      defaultMeta: { service: 'propertymaster-api' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${context || 'App'}] ${level}: ${message} ${metaStr}`;
            }),
          ),
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
        }),
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
}
```

**Files to create:**

- `packages/backend/src/common/logger/logger.service.ts`
- `packages/backend/src/common/logger/logger.module.ts`

**Dependencies:**

```bash
pnpm add winston winston-daily-rotate-file
pnpm add -D @types/winston
```

---

#### **TASK-005: Add Correlation ID Middleware**

**Priority:** P0 (Critical)
**Estimated:** 2h

**Description:**
Create middleware to attach correlation ID to every request for tracing across logs.

**Acceptance Criteria:**

- [ ] Correlation ID middleware created
- [ ] Uses `x-correlation-id` header if present, otherwise generates UUID
- [ ] Attaches correlation ID to request object
- [ ] Returns correlation ID in response header
- [ ] All logs include correlation ID from request context

**Implementation:**

```typescript
// packages/backend/src/common/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

**Files to create:**

- `packages/backend/src/common/middleware/correlation-id.middleware.ts`

**Files to modify:**

- `packages/backend/src/app.module.ts` (register middleware globally)

---

#### **TASK-006: Add Logging to Auth & Properties Modules**

**Priority:** P1 (High)
**Estimated:** 2h

**Description:**
Add structured logging to auth and properties services as examples for other modules.

**Acceptance Criteria:**

- [ ] Auth service logs: user registration, login, logout, token refresh
- [ ] Properties service logs: create, update, delete, findAll
- [ ] All logs include organizationId and userId where available
- [ ] Error logs include stack traces
- [ ] No sensitive data (passwords, tokens) logged

**Example:**

```typescript
// packages/backend/src/modules/auth/auth.service.ts
import { AppLogger } from '@/common/logger/logger.service';

@Injectable()
export class AuthService {
  private readonly logger = new AppLogger(AuthService.name);

  async register(dto: RegisterDto): Promise<AuthResponse> {
    this.logger.log('User registration started', {
      email: dto.email,
      organizationName: dto.organizationName,
    });

    try {
      // ... registration logic
      this.logger.log('User registered successfully', {
        userId: user.id,
        organizationId: org.id,
      });
      return response;
    } catch (error) {
      this.logger.error('Registration failed', error.stack, {
        email: dto.email,
      });
      throw error;
    }
  }
}
```

**Files to modify:**

- `packages/backend/src/modules/auth/auth.service.ts`
- `packages/backend/src/modules/properties/properties.service.ts`

---

#### **TASK-007: Frontend Logging Utility**

**Priority:** P1 (High)
**Estimated:** 1h

**Description:**
Create lightweight logging utility for frontend with optional Sentry integration.

**Acceptance Criteria:**

- [ ] `logger.ts` utility created for frontend
- [ ] Supports log levels: error, warn, info, debug
- [ ] In development: logs to console
- [ ] In production: sends errors to Sentry (if configured)
- [ ] Structured log format with timestamp, level, message, context

**Implementation:**

```typescript
// packages/admin/src/lib/logger.ts
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDev = import.meta.env.DEV;

  log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    if (this.isDev) {
      console[level](message, context);
    } else {
      // Send to backend or Sentry in production
      if (level === LogLevel.ERROR && window.Sentry) {
        window.Sentry.captureException(new Error(message), { extra: context });
      }
    }
  }

  error(message: string, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }
}

export const logger = new Logger();
```

**Files to create:**

- `packages/admin/src/lib/logger.ts`
- `packages/tenant/src/lib/logger.ts`

---

### **C. Error Handling (6h)**

#### **TASK-008: Create Global Exception Filter**

**Priority:** P0 (Critical)
**Estimated:** 3h

**Description:**
Create NestJS global exception filter to handle all errors consistently.

**Acceptance Criteria:**

- [ ] Global exception filter created
- [ ] Maps all exceptions to proper HTTP status codes
- [ ] Logs errors with correlation ID, user context
- [ ] Returns structured error response (statusCode, message, timestamp, path)
- [ ] In development: includes stack trace
- [ ] In production: hides stack trace
- [ ] Registered globally in app module

**Implementation:**

```typescript
// packages/backend/src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
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
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      correlationId: request['correlationId'],
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        {
          userId: request['user']?.id,
          organizationId: request['user']?.organizationId,
          correlationId: request['correlationId'],
          body: request.body,
        },
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

**Files to create:**

- `packages/backend/src/common/filters/http-exception.filter.ts`

**Files to modify:**

- `packages/backend/src/main.ts` (register global filter)

---

#### **TASK-009: Create Custom Business Exceptions**

**Priority:** P1 (High)
**Estimated:** 2h

**Description:**
Create domain-specific exceptions for common business rule violations.

**Acceptance Criteria:**

- [ ] Custom exceptions created:
  - `PropertyHasUnitsException`
  - `LeaseOverlapException`
  - `InsufficientFundsException`
  - `TenantAlreadyExistsException`
- [ ] All extend `HttpException` with proper status code
- [ ] Include relevant context (IDs, amounts, etc.)

**Implementation:**

```typescript
// packages/backend/src/common/exceptions/business.exceptions.ts
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
      HttpStatus.BAD_REQUEST,
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
      HttpStatus.CONFLICT,
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
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

**Files to create:**

- `packages/backend/src/common/exceptions/business.exceptions.ts`

---

#### **TASK-010: Frontend Error Boundary**

**Priority:** P1 (High)
**Estimated:** 1h

**Description:**
Create React error boundary to catch unhandled errors and show fallback UI.

**Acceptance Criteria:**

- [ ] Error boundary component created
- [ ] Catches errors in child components
- [ ] Logs errors to Sentry (if configured)
- [ ] Shows user-friendly error message
- [ ] Provides "Reload Page" button
- [ ] Wraps app root

**Implementation:**

```typescript
// packages/admin/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
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
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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

**Files to create:**

- `packages/admin/src/components/ErrorBoundary.tsx`

**Files to modify:**

- `packages/admin/src/main.tsx` (wrap app with ErrorBoundary)

---

### **D. Testing Framework (10h)**

#### **TASK-011: Configure Jest for Backend**

**Priority:** P0 (Critical)
**Estimated:** 2h

**Description:**
Set up Jest for backend unit and integration testing with proper configuration.

**Acceptance Criteria:**

- [ ] Jest installed and configured
- [ ] `pnpm test` runs all tests
- [ ] `pnpm test:watch` runs in watch mode
- [ ] `pnpm test:cov` generates coverage report
- [ ] Coverage thresholds set (30% global for now)
- [ ] Test utilities created (mock Prisma, mock logger)

**Implementation:**

```json
// packages/backend/jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThresholds: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
};
```

```typescript
// packages/backend/src/test/test-utils.ts
import { Test, TestingModule } from '@nestjs/testing';

export const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

export const mockPrismaService = {
  property: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  // ... other models
};
```

**Files to create:**

- `packages/backend/jest.config.js`
- `packages/backend/src/test/test-utils.ts`

**Dependencies:**

```bash
pnpm add -D @nestjs/testing jest ts-jest @types/jest
```

---

#### **TASK-012: Write Sample Unit Tests**

**Priority:** P0 (Critical)
**Estimated:** 3h

**Description:**
Write unit tests for PropertiesService and AuthService as examples.

**Acceptance Criteria:**

- [ ] PropertiesService has tests for:
  - `create()` - success case
  - `create()` - error case
  - `update()` - success case
  - `update()` - not found case
  - `delete()` - success case
  - `delete()` - property has units case
- [ ] AuthService has tests for:
  - `register()` - success case
  - `login()` - success case
  - `login()` - invalid credentials case
- [ ] All tests pass
- [ ] Coverage >70% for these modules

**Files to create:**

- `packages/backend/src/modules/properties/properties.service.spec.ts`
- `packages/backend/src/modules/auth/auth.service.spec.ts`

---

#### **TASK-013: Configure Vitest for Frontend**

**Priority:** P0 (Critical)
**Estimated:** 2h

**Description:**
Set up Vitest for frontend testing with React Testing Library.

**Acceptance Criteria:**

- [ ] Vitest installed and configured
- [ ] `pnpm test` runs all tests
- [ ] `pnpm test:ui` opens Vitest UI
- [ ] `pnpm test:cov` generates coverage report
- [ ] Coverage thresholds set (30% global for now)
- [ ] Testing Library configured for React components

**Implementation:**

```typescript
// packages/admin/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// packages/admin/src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

**Files to create:**

- `packages/admin/vitest.config.ts`
- `packages/admin/src/test/setup.ts`

**Dependencies:**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

---

#### **TASK-014: Write Sample Frontend Tests**

**Priority:** P0 (Critical)
**Estimated:** 2h

**Description:**
Write tests for key frontend components and hooks.

**Acceptance Criteria:**

- [ ] Login page component test (renders form, submits credentials)
- [ ] Property card component test (displays property data)
- [ ] `useAuth` hook test (login, logout, token refresh)
- [ ] All tests pass

**Files to create:**

- `packages/admin/src/pages/Login.test.tsx`
- `packages/admin/src/components/PropertyCard.test.tsx`
- `packages/admin/src/hooks/useAuth.test.ts`

---

#### **TASK-015: Set Up Playwright for E2E Tests**

**Priority:** P1 (High)
**Estimated:** 1h

**Description:**
Configure Playwright and write one critical E2E test (login flow).

**Acceptance Criteria:**

- [ ] Playwright installed
- [ ] `playwright.config.ts` configured
- [ ] One E2E test: "User can login and reach dashboard"
- [ ] Test passes in headless mode
- [ ] `pnpm test:e2e` runs E2E tests

**Implementation:**

```typescript
// packages/e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login and reach dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.fill('input[name="email"]', 'admin@propertymaster.com');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*\/dashboard/);
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

**Files to create:**

- `packages/e2e/playwright.config.ts`
- `packages/e2e/tests/auth.spec.ts`

**Dependencies:**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

---

### **E. Monitoring & Analytics (4h)**

#### **TASK-016: Set Up Sentry**

**Priority:** P1 (High)
**Estimated:** 2h

**Description:**
Configure Sentry for error tracking in backend and frontend.

**Acceptance Criteria:**

- [ ] Sentry account created (free tier)
- [ ] Backend Sentry SDK installed and configured
- [ ] Frontend Sentry SDK installed and configured
- [ ] Test error sent to Sentry from backend
- [ ] Test error sent to Sentry from frontend
- [ ] Sentry only enabled in production (not dev)

**Implementation:**

```typescript
// packages/backend/src/main.ts
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
```

```typescript
// packages/admin/src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.1,
  });
}
```

**Dependencies:**

```bash
pnpm add @sentry/node @sentry/react
```

**Files to modify:**

- `packages/backend/src/main.ts`
- `packages/admin/src/main.tsx`
- `.env.example` (add SENTRY_DSN)

---

#### **TASK-017: Create Event Tracking Infrastructure**

**Priority:** P1 (High)
**Estimated:** 2h

**Description:**
Build simple event tracking system for analytics (custom events table + service).

**Acceptance Criteria:**

- [ ] `Event` model added to Prisma schema
- [ ] `EventsService` created to track events
- [ ] Frontend `trackEvent` utility created
- [ ] Backend emits events for:
  - User registration
  - User login
  - Property created
  - Lease created
- [ ] Frontend emits events for:
  - Page views
  - Button clicks (key actions)

**Implementation:**

```prisma
// packages/database/prisma/schema.prisma
model Event {
  id          String   @id @default(cuid())
  name        String   // e.g., "user.registered", "property.created"
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  properties  Json?    // Additional event properties
  createdAt   DateTime @default(now())

  @@index([name, createdAt])
  @@index([userId])
  @@index([organizationId])
}
```

```typescript
// packages/backend/src/modules/events/events.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async track(
    name: string,
    properties?: Record<string, any>,
    userId?: string,
    organizationId?: string,
  ) {
    await this.prisma.event.create({
      data: {
        name,
        properties,
        userId,
        organizationId,
      },
    });
  }
}
```

```typescript
// packages/admin/src/lib/analytics.ts
export function trackEvent(name: string, properties?: Record<string, any>) {
  // In production, send to backend
  if (import.meta.env.PROD) {
    fetch('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, properties }),
    });
  } else {
    console.log('📊 Event:', name, properties);
  }
}
```

**Files to create:**

- `packages/backend/src/modules/events/events.service.ts`
- `packages/backend/src/modules/events/events.module.ts`
- `packages/admin/src/lib/analytics.ts`

**Files to modify:**

- `packages/database/prisma/schema.prisma` (add Event model)

---

### **F. Documentation (4h)**

#### **TASK-018: Create Developer Setup Guide**

**Priority:** P0 (Critical)
**Estimated:** 2h

**Description:**
Write comprehensive developer setup guide for onboarding new developers.

**Acceptance Criteria:**

- [ ] `docs/DEVELOPER_SETUP.md` created
- [ ] Includes prerequisites, installation steps, common commands
- [ ] Includes troubleshooting section
- [ ] Includes architecture overview
- [ ] Tested by following it from scratch

**Files to create:**

- `docs/DEVELOPER_SETUP.md`

---

#### **TASK-019: Create First Feature Spec**

**Priority:** P1 (High)
**Estimated:** 2h

**Description:**
Write feature spec for "Property Edit Modal" using the template.

**Acceptance Criteria:**

- [ ] `docs/features/property-edit-modal.md` created
- [ ] Follows feature spec template
- [ ] Includes:
  - Problem statement
  - User stories
  - Acceptance criteria
  - Technical design (API, service, component)
  - Testing plan
  - Logging plan
- [ ] Reviewed and approved

**Files to create:**

- `docs/features/property-edit-modal.md`

---

## 🎯 NICE-TO-HAVE (Stretch) - 8 hours

### **G. CI/CD Pipeline**

#### **TASK-020: GitHub Actions Workflow**

**Priority:** P2 (Medium)
**Estimated:** 3h

**Description:**
Create GitHub Actions workflow for CI/CD with all quality checks.

**Acceptance Criteria:**

- [ ] `.github/workflows/ci.yml` created
- [ ] Runs on PR and push to main
- [ ] Jobs: lint, type-check, test, build
- [ ] Uses PostgreSQL service for integration tests
- [ ] Uploads coverage to Codecov
- [ ] Fails PR if any check fails

**Files to create:**

- `.github/workflows/ci.yml`

---

## ✅ Definition of Done

Phase 0 is complete when:

- [ ] All P0 tasks completed
- [ ] All P1 tasks completed
- [ ] CI/CD pipeline green (all checks pass)
- [ ] Pre-commit hooks working (cannot commit failing code)
- [ ] Coverage >30% on modified modules
- [ ] No `any` types in auth, properties, leases, payments modules
- [ ] Logging working (visible in console + files)
- [ ] Sentry catching errors
- [ ] 1 E2E test passing
- [ ] Documentation complete (developer setup + 1 feature spec)
- [ ] Code reviewed and approved

---

## 📊 Progress Tracking

Use this checklist to track progress:

```markdown
### Day 1 (8h)

- [ ] TASK-001: Enable Strict TypeScript (2h)
- [ ] TASK-002: Fix Existing `any` Types (4h)
- [ ] TASK-003: Set Up Pre-Commit Hooks (2h)

### Day 2 (8h)

- [ ] TASK-004: Install and Configure Winston Logger (3h)
- [ ] TASK-005: Add Correlation ID Middleware (2h)
- [ ] TASK-006: Add Logging to Auth & Properties Modules (2h)
- [ ] TASK-007: Frontend Logging Utility (1h)

### Day 3 (8h)

- [ ] TASK-008: Create Global Exception Filter (3h)
- [ ] TASK-009: Create Custom Business Exceptions (2h)
- [ ] TASK-010: Frontend Error Boundary (1h)
- [ ] TASK-016: Set Up Sentry (2h)

### Day 4 (8h)

- [ ] TASK-011: Configure Jest for Backend (2h)
- [ ] TASK-012: Write Sample Unit Tests (3h)
- [ ] TASK-013: Configure Vitest for Frontend (2h)
- [ ] TASK-015: Set Up Playwright for E2E Tests (1h)

### Day 5 (8h)

- [ ] TASK-014: Write Sample Frontend Tests (2h)
- [ ] TASK-017: Create Event Tracking Infrastructure (2h)
- [ ] TASK-018: Create Developer Setup Guide (2h)
- [ ] TASK-019: Create First Feature Spec (2h)
```

---

## 🚀 Next Phase

After Phase 0 is complete, you'll be ready to start **Phase 1: Seamless Landlord Experience** with:

- ✅ Solid foundation (logging, testing, monitoring)
- ✅ Quality gates in place (can't ship bad code)
- ✅ Clear process (feature spec → implement → test → deploy)
- ✅ Developer independence (anyone can follow the process)

**Phase 1 will focus on:**

1. Property edit modal (using feature spec from TASK-019)
2. Basic Stripe integration (backend payment creation)
3. Intelligent onboarding wizard (3-minute property setup)
