# PropertyMaster Launch Checklist

## Overview
This document provides a comprehensive checklist for launching PropertyMaster to production.

---

## Phase 1: Pre-Launch Verification (T-7 days)

### Infrastructure
- [ ] Production server provisioned and configured
- [ ] SSL/TLS certificates obtained and installed
- [ ] Domain DNS configured (A records, CNAME for www)
- [ ] CDN configured (CloudFront/Cloudflare)
- [ ] Load balancer configured with health checks
- [ ] Database server provisioned (RDS/managed PostgreSQL)
- [ ] Redis cache configured
- [ ] S3/storage bucket configured with proper permissions

### Security
- [ ] All secrets stored in environment variables/secret manager
- [ ] JWT secrets are cryptographically secure (256+ bit)
- [ ] Database credentials rotated from development
- [ ] API rate limiting configured
- [ ] CORS configured for production domains only
- [ ] Helmet.js security headers enabled
- [ ] CSP (Content Security Policy) configured
- [ ] HSTS enabled
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled

### Environment Configuration
- [ ] `.env.production` configured with all required variables
- [ ] `NODE_ENV=production` set
- [ ] Debug logging disabled
- [ ] Error details hidden from clients
- [ ] Cookie settings secure (httpOnly, secure, sameSite)

---

## Phase 2: Database & Data (T-5 days)

### Database
- [ ] Production database created
- [ ] All migrations run successfully
- [ ] Database backups configured (daily)
- [ ] Point-in-time recovery enabled
- [ ] Connection pooling configured
- [ ] Read replicas configured (if needed)

### Data Seeding
- [ ] Super admin account created
- [ ] Default charge types seeded
- [ ] Sample organization created for demos (optional)

### Data Integrity
- [ ] Foreign key constraints verified
- [ ] Indexes created for common queries
- [ ] Query performance tested

---

## Phase 3: Application Build (T-3 days)

### Backend
- [ ] TypeScript compiles without errors
- [ ] All tests passing
- [ ] Linting passes
- [ ] Production build successful
- [ ] Docker image built and pushed

### Frontend (Admin)
- [ ] TypeScript compiles without errors
- [ ] Production build successful
- [ ] Bundle size optimized (< 500KB gzipped)
- [ ] All routes tested
- [ ] Mobile responsive verified

### Frontend (Tenant Portal)
- [ ] TypeScript compiles without errors
- [ ] Production build successful
- [ ] All routes tested
- [ ] Mobile responsive verified

---

## Phase 4: Integration Testing (T-2 days)

### Authentication
- [ ] User registration works
- [ ] Login with email/password works
- [ ] Password reset flow works
- [ ] Email verification works
- [ ] Token refresh works
- [ ] Account lockout works

### Core Features
- [ ] Create property
- [ ] Create unit
- [ ] Create lease
- [ ] Add tenant
- [ ] Post charge
- [ ] Record payment
- [ ] Create work order
- [ ] Upload document
- [ ] Generate report

### Payment Processing
- [ ] Stripe test mode payments work
- [ ] Stripe live mode configured
- [ ] Webhook endpoint accessible
- [ ] Payment confirmation emails sent

### Email
- [ ] SendGrid/SMTP configured
- [ ] Test emails sent successfully
- [ ] Email templates rendered correctly

---

## Phase 5: Monitoring & Alerting (T-1 day)

### Logging
- [ ] Application logs flowing to CloudWatch/LogDNA
- [ ] Log retention policy configured
- [ ] Log levels appropriate for production

### Monitoring
- [ ] Sentry configured and receiving errors
- [ ] Uptime monitoring configured (UptimeRobot/Pingdom)
- [ ] Health check endpoint accessible
- [ ] APM configured (if using)

### Alerting
- [ ] Critical error alerts configured
- [ ] Server down alerts configured
- [ ] High error rate alerts configured
- [ ] Disk space alerts configured
- [ ] Memory usage alerts configured

---

## Phase 6: Go-Live Day (T-0)

### Pre-Deployment
- [ ] Maintenance page ready (optional)
- [ ] Team notified of deployment window
- [ ] Customer support briefed
- [ ] Rollback plan documented

### Deployment
- [ ] Final database backup taken
- [ ] Deploy backend services
- [ ] Run database migrations
- [ ] Deploy frontend assets
- [ ] Clear CDN cache
- [ ] Verify health checks passing

### Post-Deployment Verification
- [ ] Can access login page
- [ ] Can create new account
- [ ] Can log in
- [ ] Can create property
- [ ] Can create lease
- [ ] Can process payment
- [ ] All critical paths working

### DNS Cutover
- [ ] Update DNS to point to production
- [ ] Verify SSL working on production domain
- [ ] Old infrastructure decommissioned (after verification)

---

## Phase 7: Post-Launch (T+1 to T+7)

### Day 1
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Address any critical issues
- [ ] Verify all scheduled jobs running

### Week 1
- [ ] Daily review of error logs
- [ ] User feedback collection
- [ ] Performance baseline established
- [ ] Backup restoration tested

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Technical Lead | TBD | TBD |
| DevOps | TBD | TBD |
| Product Owner | TBD | TBD |
| On-Call Engineer | TBD | TBD |

---

## Rollback Procedure

1. **Trigger Criteria**:
   - Critical feature completely broken
   - Data corruption detected
   - Security vulnerability discovered

2. **Rollback Steps**:
   ```bash
   # 1. Stop current containers
   docker-compose -f docker-compose.prod.yml down

   # 2. Restore database from backup
   pg_restore -h $DB_HOST -U $DB_USER -d propertymaster backup_YYYYMMDD.sql

   # 3. Deploy previous version
   git checkout v0.0.x
   docker-compose -f docker-compose.prod.yml up -d

   # 4. Verify rollback
   curl https://api.propertymaster.com/api/v1/health
   ```

3. **Communication**:
   - Notify team in Slack #incidents
   - Update status page
   - Notify affected customers

---

## Success Metrics (First 30 Days)

| Metric | Target |
|--------|--------|
| Uptime | > 99.9% |
| Error Rate | < 0.1% |
| P95 Response Time | < 500ms |
| New User Signups | Track |
| Active Properties | Track |
| Payment Volume | Track |

---

## Sign-Off

| Phase | Verified By | Date |
|-------|-------------|------|
| Infrastructure | | |
| Security | | |
| Database | | |
| Application Build | | |
| Integration Testing | | |
| Monitoring | | |
| Go-Live | | |

---

*Last Updated: November 2024*
