# PropertyMaster: 10 Phases to Production Launch

> **Current State**: ~85% MVP-Ready
> **Critical Path**: Email → Testing → Security → Deployment → Monitoring

---

## Phase 1: Email Notification Integration (CRITICAL)

**Status**: 40% Complete (Framework exists, delivery placeholder)
**Priority**: P0 - Blocking production launch
**Effort**: 2-3 days

### Current State
- ✅ Notification model with 15+ types
- ✅ NotificationsService with full template framework
- ✅ Scheduled task processing (every 5 minutes)
- ✅ Event triggers from payments, leases, work orders
- ❌ **Actual email sending is console.log placeholder**

### Deliverables

#### 1.1 Email Provider Integration
```
File: packages/backend/src/notifications/notifications.service.ts (line 147+)
```
- [ ] Choose provider: **SendGrid** (recommended) or AWS SES
- [ ] Install SDK: `pnpm add @sendgrid/mail` in backend package
- [ ] Create EmailService abstraction for provider flexibility
- [ ] Configure environment variables:
  ```env
  SENDGRID_API_KEY=SG.xxx
  EMAIL_FROM=noreply@propertymaster.io
  EMAIL_FROM_NAME=PropertyMaster
  ```

#### 1.2 Email Templates (HTML)
- [ ] Payment received confirmation
- [ ] Payment failed notification
- [ ] Rent due reminder (5 days before)
- [ ] Late fee applied notice
- [ ] Lease expiration reminders (90/60/30/7 days)
- [ ] Auto-pay upcoming notification
- [ ] Auto-pay processed confirmation
- [ ] Work order status updates
- [ ] Password reset email
- [ ] Welcome/verification email

#### 1.3 Template Rendering
- [ ] Install template engine: `@nestjs/mailer` + `handlebars`
- [ ] Create HTML templates with company branding
- [ ] Plain text fallbacks for all emails
- [ ] Template preview endpoint for testing

#### 1.4 Testing
- [ ] Unit tests for EmailService
- [ ] Integration test with Mailhog (already in docker-compose)
- [ ] Manual test of each email type
- [ ] Verify email deliverability (SPF, DKIM setup guide)

### Acceptance Criteria
- [ ] All notification types send actual emails
- [ ] HTML emails render correctly in Gmail, Outlook, Apple Mail
- [ ] Unsubscribe link in all marketing emails
- [ ] Email delivery logs in database

---

## Phase 2: Document Management & File Uploads

**Status**: 50% Complete (Model exists, endpoints missing)
**Priority**: P0 - Required for lease documents, vendor compliance
**Effort**: 2-3 days

### Current State
- ✅ Document model in schema
- ✅ File URL storage fields throughout models
- ✅ S3 environment variables defined
- ❌ **No file upload endpoints**
- ❌ **No storage provider implementation**

### Deliverables

#### 2.1 Storage Service Abstraction
```
Create: packages/backend/src/common/storage/storage.service.ts
```
- [ ] Interface for upload, download, delete, getSignedUrl
- [ ] LocalStorageProvider (development)
- [ ] S3StorageProvider (production)
- [ ] Configuration via STORAGE_PROVIDER env var

#### 2.2 File Upload Endpoints
```
Create: packages/backend/src/documents/documents.controller.ts
```
- [ ] `POST /documents/upload` - Multipart form upload
- [ ] `GET /documents/:id` - Get document metadata
- [ ] `GET /documents/:id/download` - Signed URL redirect
- [ ] `DELETE /documents/:id` - Soft delete
- [ ] `GET /documents` - List by entity (property, lease, vendor)

#### 2.3 Entity-Specific Uploads
- [ ] Lease documents (signed leases, addendums)
- [ ] Vendor compliance docs (insurance certs, W-9s, licenses)
- [ ] Work order attachments (photos, invoices)
- [ ] Maintenance request photos
- [ ] Property photos

#### 2.4 Security
- [ ] File type validation (PDF, images, docs only)
- [ ] Max file size limits (10MB default)
- [ ] Virus scanning integration (optional, ClamAV)
- [ ] Signed URLs with expiration (1 hour default)
- [ ] Access control (org-scoped, role-based)

#### 2.5 Frontend Integration
- [ ] File upload component with drag-and-drop
- [ ] Progress indicator
- [ ] Preview for images/PDFs
- [ ] Delete confirmation

### Acceptance Criteria
- [ ] Files upload to S3 in production
- [ ] Files upload to local storage in development
- [ ] Signed URLs expire correctly
- [ ] Files scoped to organization

---

## Phase 3: Frontend Hardening & Form Validation

**Status**: 80% Complete
**Priority**: P1 - UX critical
**Effort**: 3-4 days

### Current State
- ✅ 20+ admin pages implemented
- ✅ 11 tenant portal pages
- ✅ React Query integration
- ⚠️ Form validation inconsistent
- ⚠️ Error handling varies by page
- ⚠️ Loading states missing in some areas

### Deliverables

#### 3.1 Form Validation (React Hook Form + Zod)
```
Files: packages/frontend-admin/src/components/forms/
```
- [ ] Install `react-hook-form` and `zod` if not present
- [ ] Create Zod schemas matching backend DTOs:
  - PropertySchema
  - UnitSchema
  - LeaseSchema
  - VendorSchema
  - WorkOrderSchema
  - ChargeSchema
  - PaymentSchema
- [ ] Form error messages below inputs
- [ ] Disable submit while invalid

#### 3.2 API Error Handling
- [ ] Global error boundary component
- [ ] Toast notifications for success/error
- [ ] Retry logic for transient failures
- [ ] Offline detection and messaging
- [ ] Session expiry handling (redirect to login)

#### 3.3 Loading States
- [ ] Skeleton loaders for data tables
- [ ] Button loading spinners
- [ ] Page-level loading indicators
- [ ] Optimistic updates for common actions

#### 3.4 Accessibility (A11y)
- [ ] Keyboard navigation for all modals
- [ ] ARIA labels on interactive elements
- [ ] Focus management after modal close
- [ ] Color contrast validation (WCAG AA)
- [ ] Screen reader testing

#### 3.5 Mobile Responsiveness
- [ ] Test all admin pages on tablet/mobile
- [ ] Collapsible sidebar on mobile
- [ ] Touch-friendly buttons (44px minimum)
- [ ] Horizontal scroll for data tables

### Acceptance Criteria
- [ ] All forms validate before submission
- [ ] All API errors show user-friendly messages
- [ ] All pages have proper loading states
- [ ] Lighthouse accessibility score > 90

---

## Phase 4: Complete Test Coverage

**Status**: ~30% Coverage
**Priority**: P1 - Required for confidence in production
**Effort**: 5-7 days

### Current State
- ✅ 57 backend tests (properties, work orders, exception filter)
- ✅ Jest + Supertest configured
- ✅ Testing standards documented
- ❌ **No frontend unit tests**
- ❌ **Integration tests blocked by Prisma engine**
- ❌ **E2E tests need live server**

### Deliverables

#### 4.1 Backend Unit Tests (Target: 80% coverage)
```
Pattern: packages/backend/src/**/*.spec.ts
```
High-priority services to test:
- [ ] `auth.service.ts` - Login, register, token refresh
- [ ] `payments.service.ts` - Payment creation, allocation
- [ ] `stripe.service.ts` - Intent creation, webhook handling
- [ ] `financial.service.ts` - Chart of accounts, transactions
- [ ] `charges.service.ts` - Charge creation, status updates
- [ ] `leases.service.ts` - Lifecycle, auto-pay config
- [ ] `notifications.service.ts` - Email template rendering
- [ ] `scheduled-tasks.service.ts` - Cron job logic

#### 4.2 Backend Integration Tests
```
Pattern: packages/backend/src/**/*.integration.spec.ts
```
- [ ] Fix Prisma engine download in CI (use binary targets)
- [ ] Auth flow: register → login → refresh → logout
- [ ] Payment flow: create charge → payment intent → webhook → allocation
- [ ] Lease flow: create → activate → expire
- [ ] Work order flow: create → assign → complete

#### 4.3 Frontend Unit Tests
```
Create: packages/frontend-admin/src/**/*.test.tsx
```
- [ ] Install React Testing Library
- [ ] Test authentication hooks
- [ ] Test form components
- [ ] Test data table components
- [ ] Test modal components

#### 4.4 E2E Tests (Playwright)
```
Expand: packages/frontend-admin/e2e/
```
- [ ] Login/logout flow
- [ ] Property CRUD
- [ ] Lease creation and activation
- [ ] Payment recording
- [ ] Work order lifecycle
- [ ] Tenant portal: login, pay rent, submit maintenance

#### 4.5 CI Integration
- [ ] Update GitHub Actions to run all test suites
- [ ] Add coverage reporting (Codecov)
- [ ] Fail PR if coverage drops
- [ ] Add test badge to README

### Acceptance Criteria
- [ ] Backend: 80% line coverage, 70% branch coverage
- [ ] Frontend: 70% line coverage, 60% branch coverage
- [ ] All tests pass in CI
- [ ] No test flakiness (retry mechanisms)

---

## Phase 5: Security Audit & Hardening

**Status**: 70% Secure (Basics in place)
**Priority**: P0 - Non-negotiable for production
**Effort**: 3-4 days

### Current State
- ✅ JWT authentication with refresh tokens
- ✅ bcrypt password hashing (10 rounds)
- ✅ Multi-tenant data isolation
- ✅ Input validation (class-validator)
- ✅ Rate limiting configured
- ⚠️ Helmet headers not enabled
- ⚠️ CSRF protection needed for tenant portal
- ⚠️ No security audit documentation

### Deliverables

#### 5.1 HTTP Security Headers
```
File: packages/backend/src/main.ts
```
- [ ] Enable Helmet.js middleware
- [ ] Configure Content Security Policy (CSP)
- [ ] Set X-Frame-Options: DENY
- [ ] Enable HSTS for production
- [ ] Configure CORS with specific origins

#### 5.2 Authentication Hardening
- [ ] Implement account lockout (5 failed attempts → 15 min lock)
- [ ] Add password complexity requirements
- [ ] Enable email verification for new accounts
- [ ] Session invalidation on password change
- [ ] IP-based rate limiting for auth endpoints

#### 5.3 API Security
- [ ] Audit all endpoints for authorization checks
- [ ] Verify organization scoping on all queries
- [ ] Add request signing for webhooks
- [ ] Implement API versioning headers
- [ ] Add deprecation warnings for old endpoints

#### 5.4 Data Protection
- [ ] Encrypt sensitive fields at rest (SSN, bank accounts)
- [ ] Audit logging for PII access
- [ ] Data retention policies
- [ ] Right to deletion (GDPR) implementation
- [ ] Backup encryption verification

#### 5.5 Dependency Audit
- [ ] Run `pnpm audit` and fix vulnerabilities
- [ ] Enable Dependabot for automated updates
- [ ] Review and remove unused dependencies
- [ ] Pin critical dependency versions

#### 5.6 Penetration Testing Prep
- [ ] Document all API endpoints
- [ ] Identify high-risk areas (payments, auth)
- [ ] Prepare for external pentest (or self-audit)
- [ ] Create security incident response plan

### Acceptance Criteria
- [ ] No critical/high vulnerabilities in dependencies
- [ ] All OWASP Top 10 mitigations in place
- [ ] Security headers pass securityheaders.com
- [ ] Penetration test completed (internal or external)

---

## Phase 6: Production Deployment Setup

**Status**: Configs exist, not deployed
**Priority**: P0 - Required for launch
**Effort**: 2-3 days

### Current State
- ✅ Dockerfile.backend configured
- ✅ Dockerfile.tenant configured
- ✅ Railway, Render, Vercel, AWS configs
- ✅ Terraform for AWS (6200 lines)
- ❌ **Not deployed anywhere yet**

### Deliverables

#### 6.1 Choose Deployment Platform
**Recommended for MVP**: Render.com (balance of ease + features)

| Option | Cost | Complexity | Best For |
|--------|------|------------|----------|
| Railway | $5-20/mo | Very Low | Quick MVP |
| **Render** | $25-50/mo | Low | **Production MVP** |
| Vercel + Railway | $20-30/mo | Medium | Separate scaling |
| AWS | $100-300/mo | High | Enterprise |

#### 6.2 Infrastructure Setup (Render)
- [ ] Create Render account and team
- [ ] Deploy PostgreSQL (managed)
- [ ] Deploy Redis (managed)
- [ ] Deploy backend web service
- [ ] Deploy frontend admin (static site)
- [ ] Deploy frontend tenant (Next.js service)
- [ ] Configure custom domains
- [ ] Enable auto-deploy from main branch

#### 6.3 Environment Configuration
- [ ] Create production .env with secure values
- [ ] Generate strong JWT_SECRET (256-bit random)
- [ ] Configure Stripe production keys
- [ ] Set up SendGrid production API key
- [ ] Configure production DATABASE_URL
- [ ] Set CORS allowed origins

#### 6.4 Database Setup
- [ ] Run migrations on production database
- [ ] Seed initial data (chart of accounts)
- [ ] Configure connection pooling
- [ ] Set up automated backups
- [ ] Test backup restoration

#### 6.5 SSL/TLS
- [ ] Configure SSL certificates (auto-provisioned on Render)
- [ ] Force HTTPS redirects
- [ ] Configure HSTS headers
- [ ] Test SSL Labs rating (target A+)

#### 6.6 DNS Configuration
- [ ] Register domain if needed
- [ ] Configure DNS records
- [ ] Set up subdomains:
  - `api.propertymaster.io` → Backend
  - `app.propertymaster.io` → Admin frontend
  - `portal.propertymaster.io` → Tenant frontend

### Acceptance Criteria
- [ ] All services accessible via HTTPS
- [ ] Automated deployments from main branch
- [ ] Database backups running daily
- [ ] SSL rating A or A+

---

## Phase 7: Monitoring, Logging & Alerting

**Status**: Framework exists, not configured
**Priority**: P1 - Required for production operations
**Effort**: 2-3 days

### Current State
- ✅ Sentry SDK installed
- ✅ Winston logging with rotation
- ✅ Health check endpoint
- ❌ **Sentry not configured**
- ❌ **No uptime monitoring**
- ❌ **No alerting rules**

### Deliverables

#### 7.1 Error Tracking (Sentry)
```
File: packages/backend/src/main.ts
```
- [ ] Create Sentry project
- [ ] Configure SENTRY_DSN environment variable
- [ ] Initialize Sentry in backend main.ts
- [ ] Initialize Sentry in frontend apps
- [ ] Set up source maps upload
- [ ] Configure release tracking
- [ ] Set up Slack/email alerts for new errors

#### 7.2 Application Logging
- [ ] Configure Winston for production (JSON format)
- [ ] Ship logs to centralized service:
  - Option A: CloudWatch (AWS)
  - Option B: Papertrail
  - Option C: Logtail
- [ ] Add correlation IDs to all requests
- [ ] Log audit events for compliance
- [ ] Set up log retention (30 days minimum)

#### 7.3 Uptime Monitoring
- [ ] Set up external monitoring:
  - Option A: UptimeRobot (free tier)
  - Option B: Pingdom
  - Option C: Better Uptime
- [ ] Monitor endpoints:
  - `GET /api/v1/health`
  - `GET /` (admin frontend)
  - `GET /` (tenant portal)
- [ ] Configure SMS/Slack alerts for downtime

#### 7.4 Performance Monitoring
- [ ] Configure APM (Application Performance Monitoring):
  - Option A: Sentry Performance
  - Option B: Datadog
  - Option C: New Relic
- [ ] Track API response times
- [ ] Track database query times
- [ ] Set up slow query alerts (>1s)
- [ ] Monitor memory usage

#### 7.5 Custom Dashboards
- [ ] Create operational dashboard:
  - API request rate
  - Error rate
  - Response times (p50, p95, p99)
  - Database connections
  - Payment processing success rate
- [ ] Set up alerting rules:
  - Error rate > 5% → Alert
  - Response time p95 > 2s → Alert
  - Payment failure rate > 10% → Critical alert

### Acceptance Criteria
- [ ] All errors captured in Sentry
- [ ] Logs searchable and retained 30+ days
- [ ] Uptime monitoring with SMS alerts
- [ ] Performance baseline established

---

## Phase 8: Financial Reporting Enhancement

**Status**: 50% Complete
**Priority**: P2 - Important for property managers
**Effort**: 4-5 days

### Current State
- ✅ Chart of Accounts implemented
- ✅ Transaction recording
- ✅ Journal entries (double-entry)
- ✅ Basic financial summary endpoint
- ❌ **No balance sheet**
- ❌ **No income statement**
- ❌ **No cash flow statement**
- ❌ **No custom report builder**

### Deliverables

#### 8.1 Standard Financial Reports
```
Create: packages/backend/src/reports/financial-reports.service.ts
```
- [ ] **Balance Sheet**
  - Assets (Cash, AR, Property)
  - Liabilities (AP, Security Deposits)
  - Equity (Owner's Equity, Retained Earnings)
  - As-of date parameter
- [ ] **Income Statement (P&L)**
  - Revenue (Rent, Fees, Other Income)
  - Expenses (Maintenance, Utilities, Insurance)
  - Net Operating Income
  - Date range parameter
- [ ] **Cash Flow Statement**
  - Operating activities
  - Investing activities
  - Financing activities
- [ ] **Rent Roll**
  - Active leases with rent amounts
  - Vacancy summary
  - Upcoming expirations
- [ ] **Aged Receivables**
  - Current (0-30 days)
  - 31-60 days
  - 61-90 days
  - 90+ days

#### 8.2 Property-Level Reports
- [ ] Per-property P&L
- [ ] Per-property occupancy rate
- [ ] Per-property maintenance costs
- [ ] Per-property NOI (Net Operating Income)

#### 8.3 Export Functionality
- [ ] PDF export (with company branding)
- [ ] Excel/CSV export
- [ ] Scheduled report delivery (email)

#### 8.4 Frontend Report Pages
```
Update: packages/frontend-admin/src/pages/ReportsPage.tsx
```
- [ ] Report selection interface
- [ ] Date range picker
- [ ] Property/portfolio filter
- [ ] Export buttons
- [ ] Print-friendly view

### Acceptance Criteria
- [ ] All standard reports generate accurately
- [ ] Reports export to PDF and Excel
- [ ] Property managers can run monthly reports
- [ ] Data matches underlying transactions

---

## Phase 9: Stripe Payment Flow Completion

**Status**: 95% Complete
**Priority**: P1 - Revenue critical
**Effort**: 2-3 days

### Current State
- ✅ Stripe SDK integrated
- ✅ Payment intent creation
- ✅ Customer management
- ✅ Webhook handling
- ✅ Auto-pay framework
- ⚠️ Frontend Stripe form partial
- ⚠️ ACH/bank account setup needed
- ⚠️ Receipt emails pending (Phase 1)

### Deliverables

#### 9.1 Payment Methods UI
```
Files: packages/frontend-tenant/src/app/payments/
```
- [ ] Stripe Elements card form
- [ ] ACH bank account setup (Stripe Financial Connections)
- [ ] Saved payment methods list
- [ ] Default payment method selection
- [ ] Payment method deletion

#### 9.2 Payment Flow
- [ ] One-time payment flow (tenant portal)
- [ ] Auto-pay enrollment flow
- [ ] Auto-pay modification
- [ ] Auto-pay cancellation
- [ ] Payment confirmation page

#### 9.3 Admin Payment Features
- [ ] Record manual payments (cash, check)
- [ ] Refund processing UI
- [ ] Payment history with filters
- [ ] Failed payment retry

#### 9.4 Webhook Reliability
- [ ] Stripe webhook signature verification
- [ ] Idempotency handling
- [ ] Failed webhook retry queue
- [ ] Webhook event logging

#### 9.5 Testing
- [ ] Test card numbers for various scenarios
- [ ] Test ACH success/failure
- [ ] Test webhook handling
- [ ] Test auto-pay processing

### Acceptance Criteria
- [ ] Tenants can pay rent online
- [ ] Tenants can enroll in auto-pay
- [ ] All payment methods supported (card, ACH)
- [ ] Payment receipts sent via email

---

## Phase 10: Launch Checklist & Go-Live

**Status**: Not Started
**Priority**: P0 - Final gate
**Effort**: 2-3 days

### Pre-Launch Verification

#### 10.1 Functional Testing
- [ ] Complete smoke test of all features:
  - [ ] User registration and login
  - [ ] Property CRUD
  - [ ] Unit CRUD
  - [ ] Lease creation and activation
  - [ ] Charge creation
  - [ ] Payment processing
  - [ ] Work order lifecycle
  - [ ] Vendor management
  - [ ] Tenant portal login
  - [ ] Tenant rent payment
  - [ ] Maintenance request submission
- [ ] Test all email notifications
- [ ] Test all scheduled tasks

#### 10.2 Performance Validation
- [ ] Load test API endpoints (Artillery or k6)
- [ ] Verify database query performance
- [ ] Check for N+1 queries
- [ ] Validate CDN caching
- [ ] Test under realistic load (100 concurrent users)

#### 10.3 Security Final Check
- [ ] Run dependency audit (`pnpm audit`)
- [ ] Verify all secrets are in environment variables
- [ ] Check no secrets in git history
- [ ] Verify HTTPS everywhere
- [ ] Test authentication edge cases

#### 10.4 Compliance & Legal
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Cookie consent (if applicable)
- [ ] Data processing agreement (for enterprise)
- [ ] SOC 2 readiness assessment (if needed)

#### 10.5 Support Readiness
- [ ] Help documentation / FAQ
- [ ] Support email configured
- [ ] Error pages customized (404, 500)
- [ ] Feedback collection mechanism

#### 10.6 Rollback Plan
- [ ] Document rollback procedure
- [ ] Test database rollback
- [ ] Keep previous deployment available
- [ ] Define rollback triggers

### Launch Day

#### 10.7 Final Deployment
- [ ] Deploy all services to production
- [ ] Run database migrations
- [ ] Verify health checks
- [ ] Test critical paths manually
- [ ] Enable monitoring alerts

#### 10.8 Soft Launch
- [ ] Invite beta users (5-10 properties)
- [ ] Monitor error rates closely
- [ ] Collect feedback
- [ ] Fix critical issues immediately

#### 10.9 General Availability
- [ ] Remove beta restrictions
- [ ] Announce launch
- [ ] Monitor for 48 hours
- [ ] Celebrate! 🎉

### Acceptance Criteria
- [ ] All smoke tests pass
- [ ] Error rate < 1%
- [ ] Response time p95 < 500ms
- [ ] Zero critical bugs
- [ ] Support processes in place

---

## Summary: Critical Path to Launch

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAUNCH CRITICAL PATH                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Phase 1: Email ──┬──► Phase 3: Frontend ──┬──► Phase 6: Deploy│
│                    │                        │         │         │
│   Phase 2: Docs ───┘                        │         ▼         │
│                                             │   Phase 7: Monitor│
│   Phase 4: Testing ─────────────────────────┘         │         │
│                                                       ▼         │
│   Phase 5: Security ──────────────────────────► Phase 10: Launch│
│                                                       ▲         │
│   Phase 8: Reports ───────────────────────────────────┤         │
│                                                       │         │
│   Phase 9: Payments ──────────────────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Priority Order

| Phase | Priority | Blocking? | Parallel? |
|-------|----------|-----------|-----------|
| 1. Email Notifications | P0 | Yes | No |
| 2. Document Management | P0 | Yes | Yes (with 1) |
| 3. Frontend Hardening | P1 | Partial | Yes (with 1,2) |
| 4. Test Coverage | P1 | No | Yes (ongoing) |
| 5. Security Audit | P0 | Yes | After 1-3 |
| 6. Deployment Setup | P0 | Yes | After 5 |
| 7. Monitoring | P1 | No | With 6 |
| 8. Financial Reports | P2 | No | Anytime |
| 9. Stripe Completion | P1 | Partial | Anytime |
| 10. Go-Live | P0 | Final | After all |

### Estimated Timeline

| Phase | Effort |
|-------|--------|
| Phase 1: Email | 2-3 days |
| Phase 2: Documents | 2-3 days |
| Phase 3: Frontend | 3-4 days |
| Phase 4: Testing | 5-7 days |
| Phase 5: Security | 3-4 days |
| Phase 6: Deployment | 2-3 days |
| Phase 7: Monitoring | 2-3 days |
| Phase 8: Reports | 4-5 days |
| Phase 9: Payments | 2-3 days |
| Phase 10: Launch | 2-3 days |
| **Total** | **28-38 days** |

*Note: Many phases can be parallelized. With 2 developers, launch could be achieved in 3-4 weeks.*

---

## Files Referenced

| Component | Path |
|-----------|------|
| Email Service | `packages/backend/src/notifications/notifications.service.ts` |
| Stripe Service | `packages/backend/src/payments/stripe.service.ts` |
| Main Bootstrap | `packages/backend/src/main.ts` |
| Prisma Schema | `packages/database/prisma/schema.prisma` |
| Admin Frontend | `packages/frontend-admin/src/` |
| Tenant Portal | `packages/frontend-tenant/src/` |
| Docker Backend | `Dockerfile.backend` |
| CI/CD | `.github/workflows/ci.yml` |
| Deployment | `render.yaml`, `railway.json`, `terraform/` |

---

*Document generated: 2025-11-29*
*Based on comprehensive codebase analysis*
