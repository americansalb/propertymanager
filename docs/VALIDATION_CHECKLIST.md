# Feature Validation Checklist

**Use this before marking any feature as "complete".**

Copy this template for each feature and check off items as you go.

---

## Feature: \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***

**Developer:** \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***
**Date Started:** \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***
**Target Merge:** \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***

---

## Phase 1: Code Complete

### Backend

- [ ] DTO created with all required fields
- [ ] DTO tests written (validation rules)
- [ ] Service method implemented (create/update/delete)
- [ ] Service tests written (happy path + errors)
- [ ] Controller endpoint added
- [ ] Controller tests written (HTTP status codes)
- [ ] Event tracking integrated
- [ ] Error handling verified (404, 403, 400, 500)
- [ ] Winston logging added
- [ ] TypeScript strict mode passes (`tsc --noEmit`)

### Frontend

- [ ] Component created (modal/page)
- [ ] Form validation added (Zod schema)
- [ ] API client function added
- [ ] React Query hook created
- [ ] Analytics tracking integrated
- [ ] Error display working (inline + toast)
- [ ] TypeScript passes (`tsc --noEmit`)

---

## Phase 2: Automated Tests

### Backend Tests

```bash
cd packages/backend && pnpm test
```

- [ ] All tests pass
- [ ] New DTO tests: **_/_** passing
- [ ] New service tests: **_/_** passing
- [ ] New controller tests: **_/_** passing
- [ ] Coverage >70% on new code

### Frontend Tests

```bash
cd packages/frontend-admin && pnpm test
```

- [ ] Component tests written
- [ ] Component tests passing: **_/_**
- [ ] E2E test written (Playwright)
- [ ] E2E test verified (or marked skip with reason)

### Integration Tests (if DB available)

```bash
pnpm test:integration
```

- [ ] Integration test written
- [ ] Test passes OR documented reason for skip

---

## Phase 3: Manual Verification

### Smoke Test (5 minutes)

**Test in real browser:**

1. **Open the feature**
   - [ ] Navigate to page/modal
   - [ ] UI renders correctly
   - [ ] No console errors

2. **Happy path**
   - [ ] Fill out form with valid data
   - [ ] Click save/submit
   - [ ] Success message appears
   - [ ] Data persists (refresh page, still there)

3. **Validation**
   - [ ] Leave required field empty → see error
   - [ ] Enter invalid format → see error
   - [ ] Fix errors → save works

4. **Error handling**
   - [ ] Test 404 scenario (if applicable)
   - [ ] Test 403 scenario (wrong org access)
   - [ ] Errors show user-friendly messages

5. **Cancel/close**
   - [ ] Make changes
   - [ ] Click cancel
   - [ ] Changes NOT saved

### Backend Verification

**Check logs:**

```bash
tail -f packages/backend/logs/app-info-*.log
```

- [ ] Structured log entry appears on action
- [ ] Includes correlationId
- [ ] Includes userId/organizationId
- [ ] Change diff logged (for updates)

**Check analytics:**

```sql
SELECT * FROM "Event"
WHERE name LIKE '%_OPENED' OR name LIKE '%_SAVED'
ORDER BY "createdAt" DESC LIMIT 10;
```

- [ ] OPENED event tracked
- [ ] SAVED event tracked (on success)
- [ ] FAILED event tracked (on error)
- [ ] Event properties include relevant IDs

---

## Phase 4: Code Review Checklist

### Code Quality

- [ ] No `any` types in new code (check with grep)
- [ ] No `console.log` (use Winston)
- [ ] No hardcoded secrets/URLs
- [ ] Error messages user-friendly (not stack traces)
- [ ] Functions < 50 lines
- [ ] Files < 300 lines

### Security

- [ ] Multi-tenant: organizationId check enforced
- [ ] Auth: JWT guard on sensitive endpoints
- [ ] Validation: all user input validated
- [ ] SQL injection: using Prisma (not raw queries)
- [ ] XSS: not using dangerouslySetInnerHTML

### Performance

- [ ] Queries use indexes (check Prisma schema)
- [ ] No N+1 queries (use `include` or `select`)
- [ ] React Query cache configured (staleTime)
- [ ] No infinite re-renders (useEffect dependencies)

---

## Phase 5: Documentation

- [ ] API endpoint documented (request/response)
- [ ] README updated (if new feature area)
- [ ] Migration guide (if breaking change)
- [ ] Environment variables documented (if new)

---

## Phase 6: Merge Readiness

### Pre-Merge Checks

```bash
# Backend
cd packages/backend
pnpm test                    # ✅ Must pass
pnpm exec tsc --noEmit       # ✅ Must pass
pnpm lint                    # ✅ Must pass

# Frontend
cd packages/frontend-admin
pnpm test                    # ✅ Must pass
pnpm exec tsc --noEmit       # ✅ Must pass
pnpm lint                    # ✅ Must pass
```

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Pre-commit hooks work
- [ ] Branch up to date with main

### Deployment Checklist

- [ ] Database migration written (if schema change)
- [ ] Migration tested locally
- [ ] Rollback plan documented
- [ ] Feature flag added (if needed)

---

## Blockers / Known Issues

**List anything preventing merge:**

1.
2.
3.

**Workarounds or next steps:**

---

## Sign-Off

**Developer:** I have verified all checkboxes and this feature is ready to merge.

**Signature:** \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\*** **Date:** \***\*\_\*\***

**Reviewer:** Code review complete, tests verified.

**Signature:** \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\*** **Date:** \***\*\_\*\***

---

## Example: Property Edit Modal

✅ **Status:** COMPLETE

### Tests

- Backend: 57/57 passing ✅
- Frontend: 7 E2E written (pending env) ⏸️

### Smoke Test

- ✅ Edit modal opens from list
- ✅ Save updates property
- ✅ Validation shows errors
- ✅ Cancel doesn't save

### Logs

- ✅ `property.updated` logged
- ✅ Correlation ID present
- ✅ Change diff captured

### Analytics

- ✅ `PROPERTY_EDIT_OPENED` tracked
- ✅ `PROPERTY_EDIT_SAVED` tracked

### Blockers

- Integration test blocked by Prisma engine (documented)
- E2E test needs running app (written, ready for CI)

**Verdict:** ✅ Ready to merge (with documented test skips)
