# Security Documentation

PropertyMaster implements enterprise-grade security measures to protect user data, prevent common web vulnerabilities, and ensure regulatory compliance.

## Security Features

### 1. HTTP Security Headers (Helmet)

**Status**: ✅ Implemented
**Location**: `packages/backend/src/main.ts` lines 36-81

#### Content Security Policy (CSP)
Prevents XSS attacks by controlling which resources can be loaded:
```typescript
defaultSrc: ["'self'"]
styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
fontSrc: ["'self'", 'https://fonts.gstatic.com']
imgSrc: ["'self'", 'data:', 'https:']
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
connectSrc: ["'self'", 'https://api.stripe.com']
frameSrc: ["'self'", 'https://js.stripe.com']
```

#### Other Helmet Protections
- **X-Frame-Options**: `DENY` (prevents clickjacking)
- **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing)
- **X-XSS-Protection**: Enabled (legacy XSS protection)
- **X-Powered-By**: Hidden (doesn't reveal tech stack)
- **HSTS**: 1 year max-age with subdomains (production only)
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Cross-Origin Policies**: Configured for third-party integrations

### 2. Authentication & Authorization

**Status**: ✅ Implemented

#### JWT Bearer Tokens
- Access tokens in `Authorization` header (not in cookies)
- Short-lived: 15 minutes (configurable via `JWT_EXPIRES_IN`)
- Signed with `JWT_SECRET` (must be 32+ characters in production)
- No JWT in localStorage (prevents XSS token theft)

#### Refresh Tokens
- Stored in httpOnly cookies (prevents JavaScript access)
- `sameSite: 'strict'` in production (prevents CSRF)
- `secure: true` in production (HTTPS only)
- Automatic rotation on use (prevents replay attacks)

#### Password Security
- bcrypt hashing with 12 rounds (configurable via `BCRYPT_ROUNDS`)
- Account lockout after failed login attempts
- Password reset tokens expire in 1 hour
- Email verification required

#### Role-Based Access Control (RBAC)
- 7 roles: SUPER_ADMIN, ORG_ADMIN, PM, ACCOUNTANT, LEASING_AGENT, MAINTENANCE_TECH, TENANT, VENDOR
- Row-level security via Prisma (every query scoped by `organizationId`)
- Decorator-based permission checks

### 3. Rate Limiting

**Status**: ✅ Implemented
**Location**: `packages/backend/src/app.module.ts`

#### Global Rate Limits
- Default: 100 requests per 60 seconds
- Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_TTL`

#### Endpoint-Specific Limits
- **Register**: 5 per minute
- **Login**: 10 per minute
- **Password reset request**: 3 per minute
- **Password reset confirm**: 5 per minute

#### Future: Redis-based Rate Limiting
For production at scale:
```typescript
ThrottlerModule.forRoot({
  storage: new ThrottlerStorageRedisService(new Redis({
    host: process.env.REDIS_HOST,
    port: 6379,
  })),
});
```

### 4. CORS (Cross-Origin Resource Sharing)

**Status**: ✅ Implemented
**Location**: `packages/backend/src/main.ts` lines 155-190

- Origin validation with whitelist
- Credentials support (for httpOnly cookies)
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Exposed headers: X-Total-Count, X-Page-Count
- Max age: 24 hours

### 5. Input Validation

**Status**: ✅ Implemented
**Location**: `packages/backend/src/main.ts` lines 136-153

- Global ValidationPipe with class-validator
- **Whitelist**: Only allowed properties pass through
- **Forbid non-whitelisted**: Rejects unknown properties
- **Transform**: Auto-converts types
- **Forbid unknown values**: Prevents deep object injection
- **Hide sensitive data**: Values not included in error responses

### 6. SQL Injection Prevention

**Status**: ✅ Implemented
**Method**: Prisma ORM

- Parameterized queries only (no raw SQL by default)
- Type-safe query builder
- Automatic SQL injection prevention
- Input sanitization via class-validator

### 7. XSS (Cross-Site Scripting) Prevention

**Status**: ✅ Implemented

#### Defense Layers
1. **CSP headers**: Restrict script sources
2. **Input validation**: Sanitize user input
3. **React auto-escaping**: Frontend escapes output by default
4. **No `dangerouslySetInnerHTML`**: Avoid in codebase
5. **X-XSS-Protection header**: Legacy browser protection

### 8. CSRF (Cross-Site Request Forgery) Prevention

**Status**: ✅ Implemented (via SameSite cookies)

- Refresh tokens use `sameSite: 'strict'` in production
- Modern browser protection (95%+ coverage)
- API uses Bearer tokens (not vulnerable to CSRF)
- No traditional CSRF tokens needed

**Why sameSite is better than CSRF tokens**:
- No token management complexity
- Can't be bypassed by subdomain attacks
- Works for API and web requests
- No performance overhead

### 9. File Upload Security

**Status**: ✅ Implemented
**Location**: `packages/backend/src/storage/storage.service.ts`

#### Validation
- **Max size**: 10MB (configurable via `UPLOAD_MAX_SIZE_MB`)
- **Allowed types**: PDF, Word, Excel, images only
- **MIME type verification**: Not just extension
- **Filename sanitization**: Removes special characters

#### Storage
- **S3 bucket**: Public access blocked
- **Pre-signed URLs**: Temporary access (1 hour)
- **Organization scoping**: Files isolated by org
- **Soft delete**: Recovery possible

### 10. Secrets Management

**Status**: ✅ Implemented

#### Environment Variables
- All secrets in `.env` (never committed)
- `.env.example` for reference (no real secrets)
- `.gitignore` includes `.env`

#### Production Secrets
- Render/Railway: Environment variables
- AWS: Secrets Manager (optional)
- Never hardcode secrets in code

#### Required Secrets
- `JWT_SECRET`: 32+ characters (generate with `openssl rand -base64 32`)
- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe API key
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: S3 access

### 11. Logging & Monitoring

**Status**: ✅ Implemented

#### Winston Logging
- Structured JSON logs
- Daily file rotation
- Different log levels (error, warn, info, debug)
- Sensitive data not logged (passwords, tokens)

#### Sentry Error Tracking (Production)
- Real-time error alerts
- Stack traces and context
- Performance profiling
- User feedback integration

### 12. Database Security

**Status**: ✅ Implemented

#### Multi-Tenant Isolation
- Every table has `organizationId`
- Every query scoped by organization
- Row-level security via Prisma

#### Connection Security
- TLS/SSL connections to database
- Connection pooling
- Minimal IAM permissions (least privilege)

#### Audit Trail
- `AuditLog` table tracks all actions
- Who, what, when, IP address, user agent
- Immutable logs (soft delete only)

### 13. Third-Party Integrations

#### Stripe (Payment Processing)
- PCI compliance handled by Stripe
- No card data stored (tokenization)
- Webhook signature verification
- Test mode for development

#### AWS S3 (File Storage)
- IAM user with minimal permissions
- Bucket not publicly accessible
- Encryption at rest (AES-256)
- Versioning enabled (optional)

## Security Audit Checklist

### Pre-Launch Security Review

**Before deploying to production, verify**:

#### Authentication & Authorization
- [ ] `JWT_SECRET` is 32+ random characters
- [ ] `JWT_EXPIRES_IN` is 15 minutes or less
- [ ] `BCRYPT_ROUNDS` is 12 or higher
- [ ] Account lockout after 5 failed login attempts
- [ ] Password reset tokens expire in 1 hour
- [ ] Email verification is required for new accounts
- [ ] All endpoints have proper authentication guards
- [ ] RBAC permissions are correctly assigned

#### HTTP Security
- [ ] Helmet is enabled in production
- [ ] HSTS max-age is 1 year
- [ ] CSP is configured for production domains
- [ ] CORS origins whitelist production URLs
- [ ] `sameSite: 'strict'` for production cookies
- [ ] `secure: true` for production cookies
- [ ] Trust proxy is enabled behind load balancer

#### Rate Limiting
- [ ] Global rate limit is configured (100/min)
- [ ] Auth endpoints have stricter limits
- [ ] Redis is configured for distributed rate limiting (optional)

#### Input Validation
- [ ] All DTOs use class-validator
- [ ] Whitelist mode is enabled
- [ ] File upload size limits are enforced
- [ ] File type validation is strict

#### Database Security
- [ ] Database uses TLS/SSL
- [ ] All queries are scoped by `organizationId`
- [ ] Audit logging is enabled
- [ ] No raw SQL queries (or properly parameterized)
- [ ] Database backups are automated

#### Secrets Management
- [ ] No secrets in git history
- [ ] `.env` is in `.gitignore`
- [ ] Production secrets are in Render/Railway environment variables
- [ ] Secrets rotation plan is documented

#### Error Handling
- [ ] Sentry DSN is configured for production
- [ ] Error responses don't leak sensitive data
- [ ] Stack traces are not exposed to clients
- [ ] Logs don't contain passwords or tokens

#### Third-Party Security
- [ ] Stripe webhook signatures are verified
- [ ] S3 bucket is not publicly accessible
- [ ] IAM permissions follow least privilege
- [ ] API keys are scoped to minimum permissions

### Security Testing

**Run these tests before launch**:

#### Automated Scans
```bash
# Dependencies vulnerability scan
npm audit

# Fix high/critical vulnerabilities
npm audit fix

# Check for secrets in code
git secrets --scan-history

# OWASP Dependency Check (optional)
dependency-check --scan .
```

#### Manual Testing
- [ ] Test SQL injection on all inputs
- [ ] Test XSS on all text fields
- [ ] Test CSRF on state-changing operations
- [ ] Test authentication bypass attempts
- [ ] Test authorization (user can't access other org's data)
- [ ] Test rate limiting (should block after limit)
- [ ] Test file upload (only allowed types, max size)
- [ ] Test password reset flow (token expiration, one-time use)

#### Penetration Testing
- [ ] OWASP Top 10 vulnerabilities tested
- [ ] SSL/TLS configuration verified (ssllabs.com)
- [ ] HTTP headers verified (securityheaders.com)
- [ ] Cookie security verified (browser dev tools)

## Common Vulnerabilities & Mitigation

### OWASP Top 10 (2021) Coverage

| Vulnerability | Status | Mitigation |
|--------------|--------|------------|
| **A01: Broken Access Control** | ✅ Mitigated | RBAC + row-level security via Prisma |
| **A02: Cryptographic Failures** | ✅ Mitigated | bcrypt (12 rounds) + HTTPS + encrypted DB |
| **A03: Injection** | ✅ Mitigated | Prisma ORM + input validation |
| **A04: Insecure Design** | ✅ Mitigated | Security by design (least privilege, defense in depth) |
| **A05: Security Misconfiguration** | ✅ Mitigated | Helmet + strict CORS + secure cookies |
| **A06: Vulnerable Components** | ⚠️ Ongoing | `npm audit` in CI/CD + Dependabot alerts |
| **A07: Authentication Failures** | ✅ Mitigated | JWT + bcrypt + account lockout + 2FA ready |
| **A08: Data Integrity Failures** | ✅ Mitigated | Webhook signature verification + audit logs |
| **A09: Logging Failures** | ✅ Mitigated | Winston + Sentry + audit trail |
| **A10: Server-Side Request Forgery** | ✅ Mitigated | No user-controlled URLs + input validation |

### Additional Security Measures

#### API Security
- [ ] API versioning (`/api/v1`)
- [ ] Swagger docs password-protected in production
- [ ] GraphQL depth limiting (if using GraphQL)
- [ ] No verbose error messages to clients

#### Infrastructure Security
- [ ] HTTPS only (HTTP redirects to HTTPS)
- [ ] Database not publicly accessible
- [ ] VPC isolation (optional for AWS)
- [ ] Automated security patching
- [ ] DDoS protection (Cloudflare/AWS Shield)

## Incident Response Plan

### If a security incident occurs:

1. **Immediate Response** (< 1 hour):
   - [ ] Identify affected systems
   - [ ] Contain the breach (disable accounts, rotate secrets)
   - [ ] Assess impact (what data was accessed?)
   - [ ] Notify team leads

2. **Investigation** (< 24 hours):
   - [ ] Review audit logs
   - [ ] Check Sentry errors
   - [ ] Identify root cause
   - [ ] Document timeline

3. **Remediation** (< 48 hours):
   - [ ] Fix vulnerability
   - [ ] Deploy patch
   - [ ] Rotate all affected secrets
   - [ ] Verify fix

4. **Communication** (< 72 hours):
   - [ ] Notify affected users (if applicable)
   - [ ] Comply with breach notification laws (GDPR, etc.)
   - [ ] Publish incident report (if public-facing)

5. **Post-Mortem** (< 1 week):
   - [ ] Conduct blameless post-mortem
   - [ ] Update security procedures
   - [ ] Add automated tests to prevent recurrence
   - [ ] Train team on lessons learned

## Security Contacts

**Report security vulnerabilities to**:
- Email: security@propertymaster.io
- Bug bounty program: (TBD)

**Response time**:
- Critical: < 4 hours
- High: < 24 hours
- Medium: < 7 days

## Compliance

### Data Protection Regulations

#### GDPR (EU)
- Right to access: API endpoint for data export
- Right to deletion: Soft delete + permanent delete after 30 days
- Data portability: JSON export available
- Consent management: TBD

#### CCPA (California)
- Consumer data rights: Same as GDPR
- Do not sell: No data selling
- Privacy policy: Required

### Payment Compliance

#### PCI DSS
- Level 4 merchant (handled by Stripe)
- No card data stored
- SAQ A compliance (simplest)

## Security Roadmap

### Phase 2 (Next 6 months)
- [ ] Two-factor authentication (TOTP)
- [ ] Passwordless login (email magic links)
- [ ] Security headers monitoring
- [ ] Automated security testing in CI/CD
- [ ] Bug bounty program

### Phase 3 (Next 12 months)
- [ ] SOC 2 Type II compliance
- [ ] Penetration testing (annual)
- [ ] Security training for team
- [ ] Incident response drills
- [ ] Third-party security audit

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/helmet)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
