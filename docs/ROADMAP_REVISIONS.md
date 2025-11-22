# Roadmap Revisions Based on Feedback

**Date:** November 22, 2025
**Feedback Source:** User review of initial roadmap

---

## Summary of Changes

Based on excellent feedback, the following revisions have been made to align the roadmap with reality:

---

## 1. ✅ Timeline Realism

### **BEFORE:**
- Phases 0-8: 11 weeks, 440 hours
- All features treated as "must-have"
- No buffer for unknowns

### **AFTER:**
- **MVP Timeline:** 16-18 weeks (not 11)
- **1.5x buffer** applied to all estimates
- Each phase split into:
  - **MUST-HAVE** (MVP slice)
  - **NICE-TO-HAVE** (v1.0 enhancements)
  - **STRETCH** (if ahead of schedule)

### **Revised Estimates:**

| Phase | Original | Revised (MVP) | Revised (Full) |
|-------|----------|---------------|----------------|
| Phase 0 | 1 week (40h) | 1 week (40h) | 1 week (40h) |
| Phase 1 | 2 weeks (80h) | 3 weeks (120h) | 4 weeks (160h) |
| Phase 2 | 1 week (40h) | 2 weeks (80h) | 2 weeks (80h) |
| Phase 3 | 1 week (40h) | 2 weeks (80h) | 2 weeks (80h) |
| Phase 4 | 2 weeks (80h) | 3 weeks (120h) | 4 weeks (160h) |
| Phase 5 | 1 week (40h) | 2 weeks (80h) | 2 weeks (80h) |
| Phase 6 | 1 week (40h) | 1 week (40h) | 2 weeks (80h) |
| Phase 7 | 1 week (40h) | 1 week (40h) | 2 weeks (80h) |
| Phase 8 | 1 week (40h) | 2 weeks (80h) | 2 weeks (80h) |
| **Total** | **11 weeks (440h)** | **17 weeks (680h)** | **21 weeks (840h)** |

**Action Item:** Mark features in each phase as MVP/v1.0/Stretch in Phase 1 implementation plan.

---

## 2. ✅ Payments Pulled Earlier

### **BEFORE:**
- Phase 1: No payment work
- Phase 2: Tenant portal (but no payment UI wired)
- Phase 6: Payment processing

### **AFTER:**
- **Phase 1 (Weeks 2-4):**
  - ✅ Stripe backend integration (create payment intents, handle webhooks)
  - ✅ Basic payment creation for landlords (manual rent payment)
  - ✅ Payment status tracking

- **Phase 2 (Weeks 5-6):**
  - ✅ Tenant portal "Pay Rent" UI wired to Stripe
  - ✅ ACH payment flow (free for tenants)
  - ✅ Credit card payment flow (+2.9% fee)
  - ✅ Auto-pay enrollment
  - ✅ Payment history display

- **Phase 6 (Week 9):**
  - Alternative payment methods (PayPal, Square, Zelle)
  - Multi-currency support (if needed)

**Rationale:** Can't achieve Phase 2 success metrics (auto-pay adoption, one-click payment) without payments functional.

---

## 3. ✅ Analytics & Event Tracking in Phase 0

### **BEFORE:**
- No explicit analytics infrastructure
- Success metrics defined but no way to measure them

### **AFTER:**
- **Phase 0 includes:**
  - ✅ Event tracking infrastructure (custom `Event` table)
  - ✅ `EventsService` in backend
  - ✅ `trackEvent()` utility in frontend
  - ✅ Initial events instrumented:
    - User registration, login
    - Property created, lease created
    - Page views, key button clicks
  - ✅ Basic analytics dashboard (Metabase or Grafana on events table)

**Files Added:**
- `TASK-017: Create Event Tracking Infrastructure` in Phase 0 task list

---

## 4. ✅ Testing Coverage Progression

### **BEFORE:**
- Phase 0: Target 80% coverage immediately
- Unrealistic for greenfield/legacy codebase

### **AFTER:**
- **Phase 0:**
  - ✅ Set up testing infrastructure
  - ✅ Target 30-40% coverage on modified modules
  - ✅ Enforce coverage on new code (no decrease allowed)

- **Phases 1-7:**
  - ✅ Maintain 40%+ coverage
  - ✅ Gradually increase as new features tested

- **Phase 8:**
  - ✅ Push to 80% coverage globally
  - ✅ Fill gaps in untested legacy code
  - ✅ Visual regression tests
  - ✅ Load testing

**Updated `jest.config.js` threshold:**
```json
{
  "coverageThresholds": {
    "global": {
      "branches": 30,
      "functions": 30,
      "lines": 30,
      "statements": 30
    }
  }
}
```

---

## 5. ✅ Monitoring Earlier (Not Just Phase 8)

### **BEFORE:**
- Phase 8: Monitoring & observability (too late for beta launch)

### **AFTER:**
- **Phase 0 (Week 1):**
  - ✅ Sentry error tracking (backend + frontend)
  - ✅ Basic uptime monitoring (UptimeRobot free tier)
  - ✅ Health check endpoint (`/health`)
  - ✅ Performance monitoring middleware (log slow queries >1s)

- **Phases 1-7:**
  - ✅ Use monitoring actively during development
  - ✅ Fix issues caught by Sentry
  - ✅ Monitor uptime during beta launch

- **Phase 8 (Week 17-18):**
  - Advanced reliability work:
    - Load testing (simulate 10,000+ users)
    - Auto-scaling configuration
    - Disaster recovery drills
    - Database replication
    - Advanced alerting (PagerDuty)

**Rationale:** Need monitoring live for beta launch (after Phase 5), not waiting until Phase 8.

---

## 6. ✅ Financial Domain Model Documentation

### **BEFORE:**
- Financial module mentioned but no clear model

### **AFTER:**
- **Added: `docs/FINANCIAL_DOMAIN_MODEL.md`**

**Summary:**

```
┌──────────────────────────────────────────────────────┐
│           FINANCIAL DOMAIN MODEL                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  CHARGES (Accounts Receivable)                       │
│  ├─ Rent charge ($1,500/month)                       │
│  ├─ Late fee charge ($50)                            │
│  └─ Pet fee charge ($25)                             │
│                                                      │
│  PAYMENTS                                            │
│  ├─ Tenant pays $1,575 via Stripe                    │
│  └─ Payment status: PENDING → CLEARED               │
│                                                      │
│  PAYMENT ALLOCATIONS                                 │
│  ├─ $1,500 → Rent charge (clears charge)            │
│  ├─ $50 → Late fee (clears charge)                   │
│  └─ $25 → Pet fee (clears charge)                    │
│                                                      │
│  JOURNAL ENTRIES (Double-Entry Bookkeeping)          │
│  ├─ Debit: Bank Account +$1,575                      │
│  └─ Credit: Revenue -$1,575                          │
│                                                      │
│  TRUST ACCOUNTING                                    │
│  ├─ Security deposit ($1,500) → Separate account     │
│  ├─ Operating funds → Main account                   │
│  └─ Compliance: Never commingle                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Action Item:** Create `docs/FINANCIAL_DOMAIN_MODEL.md` with full accounting rules.

---

## 7. ✅ AI/Automation Split into 4A and 4B

### **BEFORE:**
- Phase 4: All AI features lumped together (high risk)

### **AFTER:**
- **Phase 4A (Week 10-11): Rule-Based Automation** (Lower Risk)
  - ✅ Market rent comparison (Zillow/Rentometer API)
  - ✅ Rule-based rent increase suggestions (CPI + market data)
  - ✅ Move-in/move-out workflow automation (triggers, emails)
  - ✅ Compliance checklist automation

- **Phase 4B (Week 12-13): ML & NLP** (Higher Risk, Can Be Delayed)
  - ✅ Lease parsing (OCR + NLP to extract fields)
  - ✅ Predictive maintenance (ML model on work order history)
  - ✅ Tenant risk scoring (payment pattern analysis)
  - ✅ Revenue forecasting (time-series ML)

**Rationale:** If ML/NLP takes longer, still ship meaningful automation in 4A.

---

## 8. ✅ Security & Compliance Specifics

### **ADDED:**
- PII handling & encryption (at rest + in transit)
- Log hygiene (no passwords, tokens, SSNs in logs)
- Fair housing compliance (Phase 9 screening features)
- FCRA compliance for credit checks
- Legal review checkpoint before public launch

**Added to Phase 0:**
```markdown
### Security Checklist
- [ ] PII encrypted at rest (database encryption)
- [ ] PII encrypted in transit (HTTPS only)
- [ ] Logs scrubbed of sensitive data (passwords, tokens, SSNs)
- [ ] OWASP top 10 verified
- [ ] CSRF protection enabled
- [ ] Rate limiting per user (not just IP)
```

**Added to Phase 9:**
```markdown
### Legal & Compliance Review
- [ ] Fair housing compliance verified (no discriminatory language/logic)
- [ ] FCRA compliance for tenant screening
- [ ] Terms of service + privacy policy reviewed by lawyer
- [ ] Data retention policy (GDPR-ready even if US-only)
```

---

## 9. ✅ Zero `any` Types - Enforcement Plan

### **BEFORE:**
- "No `any` types allowed" (aspirational)

### **AFTER:**
- **Phase 0: ESLint rule added**
  ```json
  {
    "rules": {
      "@typescript-eslint/no-explicit-any": "error"
    }
  }
  ```

- **Phase 0: Fix critical modules**
  - ✅ Auth module (TASK-002)
  - ✅ Properties module (TASK-002)
  - ✅ Leases module (TASK-002)
  - ✅ Payments module (TASK-002)

- **Tech Debt Tracking:**
  - Create `docs/TECH_DEBT.md` with list of remaining `any` types
  - Prioritize:
    - **P0**: Auth, payments, finance (fix in Phase 0-1)
    - **P1**: Core business logic (fix in Phase 2-3)
    - **P2**: Admin UI, low-risk screens (fix in Phase 7-8)

- **New Code:**
  - No `any` types allowed
  - CI fails if `any` added (ESLint enforces)
  - Exception: must use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with justification comment

---

## 10. ✅ Phase 0 Made Concrete

### **BEFORE:**
- Vague "infrastructure week"
- No clear tasks or daily breakdown

### **AFTER:**
- **Created: `docs/PHASE_0_TASKS.md`**
  - 20 tasks with clear acceptance criteria
  - Estimated hours per task
  - 5-day breakdown (8h/day)
  - Definition of Done checklist

**Day-by-Day Plan:**
```
Day 1: Type safety (strict TS, fix `any` types, pre-commit hooks)
Day 2: Logging (Winston, correlation IDs, structured logs)
Day 3: Error handling (global filter, custom exceptions, Sentry)
Day 4: Testing (Jest, Vitest, sample unit tests, E2E skeleton)
Day 5: Analytics + docs (event tracking, developer guide, feature spec)
```

---

## 11. ✅ Feature Spec Template - Concrete Example

### **ADDED:**
- `docs/features/property-edit-modal.md` (example feature spec)
- Follows template from `PHASE_IMPLEMENTATION_PLAN.md`
- Includes:
  - Problem statement
  - User stories
  - Acceptance criteria
  - API design (`PATCH /api/v1/properties/:id`)
  - Logging plan
  - Testing plan (unit, integration, E2E)
  - UI mockup
  - Rollout plan

**Action Item:** Use this as first implementation task in Phase 1.

---

## Summary of New/Modified Documents

### **Created:**
1. ✅ `docs/PHASE_0_TASKS.md` - 20 concrete tasks with daily breakdown
2. ✅ `docs/ROADMAP_REVISIONS.md` - This document
3. 🔄 `docs/FINANCIAL_DOMAIN_MODEL.md` - TODO
4. 🔄 `docs/TECH_DEBT.md` - TODO
5. 🔄 `docs/features/property-edit-modal.md` - TODO (TASK-019)

### **Modified:**
1. ✅ `ROADMAP.md` - Timeline, phase splits (MVP/v1.0/stretch)
2. ✅ `PHASE_IMPLEMENTATION_PLAN.md` - Testing thresholds, analytics section

---

## Next Actions

### **Immediate (Today):**
1. ✅ Review `docs/PHASE_0_TASKS.md`
2. ✅ Set up development environment (if not already done)
3. ✅ Start TASK-001 (Enable Strict TypeScript)

### **This Week (Phase 0):**
1. Complete all P0 and P1 tasks in `PHASE_0_TASKS.md`
2. Create `FINANCIAL_DOMAIN_MODEL.md`
3. Create `TECH_DEBT.md` (list remaining `any` types)
4. Write first feature spec (TASK-019)

### **Next Week (Phase 1 Start):**
1. Implement property edit modal (using feature spec from TASK-019)
2. Start Stripe backend integration
3. Begin intelligent onboarding wizard

---

## Feedback Incorporated

| Feedback Item | Status | Notes |
|--------------|--------|-------|
| Timeline too optimistic | ✅ Addressed | 11 weeks → 17 weeks MVP, 21 weeks full |
| Payments need to be earlier | ✅ Addressed | Moved to Phase 1-2 |
| Analytics missing | ✅ Addressed | Added TASK-017 in Phase 0 |
| Testing coverage unrealistic | ✅ Addressed | 30-40% Phase 0 → 80% Phase 8 |
| Monitoring too late | ✅ Addressed | Sentry + basic monitoring in Phase 0 |
| Financial model unclear | ✅ Addressed | Will create domain model doc |
| AI too risky | ✅ Addressed | Split into 4A (rules) + 4B (ML) |
| Security gaps | ✅ Addressed | Added PII, compliance checklists |
| `any` types not enforceable | ✅ Addressed | ESLint rule + tech debt tracking |
| Phase 0 too vague | ✅ Addressed | Created 20-task breakdown |

---

## Conclusion

The roadmap is now:
- ✅ **Realistic** (17-week MVP vs. 11-week wishful thinking)
- ✅ **Measurable** (analytics in Phase 0 tracks success metrics)
- ✅ **Testable** (coverage progression from 30% → 80%)
- ✅ **Monitorable** (Sentry live from day 1)
- ✅ **Actionable** (Phase 0 has 20 concrete tasks with daily breakdown)
- ✅ **Lower Risk** (payments early, AI split, monitoring early)

Ready to start Phase 0. 🚀
