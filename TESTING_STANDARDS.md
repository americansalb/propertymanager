# Testing Standards & Definition of Done

## Core Principle

**No feature is "done" until it has tests that prove it works.**

Code that compiles but has no verification is just expensive comments.

---

## Definition of Done (Per Feature)

Every vertical slice (Properties, Units, Tenants, Leases, etc.) must meet this contract:

### Backend ✅

**1. DTO Tests**
- [ ] All required fields validated
- [ ] Optional fields handled correctly
- [ ] Type validation works (enums, lengths, patterns)
- [ ] Error messages are user-friendly
- **Run:** `cd packages/backend && pnpm test dto`
- **Example:** `src/properties/dto/property.dto.spec.ts`

**2. Service Tests**
- [ ] Happy path returns expected data
- [ ] 404 when entity not found
- [ ] 403 when wrong organization
- [ ] Logs structured events (Winston)
- [ ] Change tracking works (before/after diffs)
- **Run:** `pnpm test service`
- **Example:** `src/properties/properties.service.spec.ts`

**3. Controller Tests**
- [ ] HTTP endpoints return correct status codes
- [ ] Request validation works
- [ ] Error responses match ApiResponse shape
- [ ] Event tracking called on success
- [ ] Events NOT called on errors
- **Run:** `pnpm test controller`
- **Example:** `src/properties/properties.controller.spec.ts`

**4. Integration Test (when environment allows)**
- [ ] Full HTTP request → database → response
- [ ] Real Prisma queries execute
- [ ] Events saved to database
- [ ] Correlation IDs in responses
- **Run:** `pnpm test:integration` (requires DB)
- **Example:** `src/properties/properties.integration.spec.ts`

**Minimum to merge:** Items 1-3 must pass. Item 4 can be "written but skipped" if Prisma engine unavailable.

---

### Frontend ✅

**1. Type Safety**
- [ ] API client types match backend DTOs
- [ ] Zod schema matches backend validation
- [ ] No `any` types in feature code
- **Verify:** `pnpm exec tsc --noEmit`

**2. Component Tests (React Testing Library)**
- [ ] Form renders with correct fields
- [ ] Validation errors display inline
- [ ] Submit disabled when form invalid
- [ ] Cancel closes modal without saving
- **Run:** `pnpm test`
- **Example:** `src/features/properties/PropertyEditModal.test.tsx`

**3. React Query Hooks**
- [ ] useQuery fetches data correctly
- [ ] useMutation calls API with right payload
- [ ] Cache invalidation works
- [ ] Error states handled
- **Verify:** Used in Playwright test

**4. E2E Test (Playwright)**
- [ ] Happy path: open → edit → save → verify
- [ ] Validation: required fields, format rules
- [ ] Error handling: 404, 403, 500
- [ ] Analytics: events tracked
- **Run:** `pnpm exec playwright test`
- **Example:** `e2e/properties/edit-property.spec.ts`

**Minimum to merge:** Items 1, 2, 4 must work. Item 3 verified by E2E.

---

## Environment-Specific Reality

### In This Sandbox (Limited)
**What works:**
- ✅ Backend unit tests (Jest)
- ✅ Type checking (tsc --noEmit)
- ✅ Linting (ESLint)
- ✅ DTO validation tests
- ✅ Service/controller mocking

**What's blocked:**
- ❌ Prisma client generation (403 on engine download)
- ❌ Integration tests (need real DB)
- ❌ Playwright E2E (need running app)

**Strategy:** Write tests that will run in real CI/dev, mark integration tests as `.skip()` or `.integration.spec.ts` pattern.

---

### In Real Dev/CI Environment
**Required setup:**
```bash
# 1. Database
docker-compose up -d postgres

# 2. Prisma
cd packages/database
pnpm exec prisma generate
pnpm exec prisma migrate dev

# 3. Backend
cd packages/backend
pnpm install
pnpm test              # All unit tests
pnpm test:integration  # Integration tests

# 4. Frontend
cd packages/frontend-admin
pnpm install
pnpm test              # Component tests
pnpm exec playwright test  # E2E tests
```

**All tests must pass before merge.**

---

## Test Commands (Standard Across Repo)

### Backend
```bash
# Unit tests only (works anywhere)
pnpm test

# Integration tests (requires DB)
pnpm test:integration

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

### Frontend
```bash
# Component tests
pnpm test

# E2E tests
pnpm exec playwright test

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

---

## Smoke Test Checklist (Manual)

Before declaring a feature "done", run this 5-minute manual test:

### Property Edit Modal Example
- [ ] **Open:** Navigate to /properties, click Edit on first property
- [ ] **Edit:** Change name, address, city
- [ ] **Save:** Click "Save changes"
- [ ] **Verify:** Name/address updated in list
- [ ] **Error:** Try invalid postal code (e.g., "!!!"), see validation error
- [ ] **Cancel:** Open modal, change field, click Cancel, verify no changes saved
- [ ] **Logs:** Check backend logs for `property.updated` event
- [ ] **Analytics:** Check database for `Event` row with `name: 'property_updated'`

**Time:** ~5 minutes per feature
**When:** After all automated tests pass
**Who:** Developer who wrote the feature

---

## Red Flags (When to Stop & Fix)

**🚨 Stop merging if:**
- Backend unit tests failing
- TypeScript errors on `tsc --noEmit`
- No tests written for new controller endpoints
- No Playwright spec for new modal/page
- Manual smoke test fails

**⚠️ Warning signs:**
- Coverage dropping below 70%
- Tests marked `.skip()` without issue tracking
- Mock data doesn't match real API responses
- Analytics events not appearing in logs

---

## Testing Anti-Patterns (Don't Do This)

### ❌ Testing Against Mocks Only
```typescript
// BAD: Only tests that mocks return what you tell them to
it('should return properties', () => {
  mockService.findAll.mockReturnValue([...]);
  expect(await controller.findAll()).toEqual([...]);
});
```

**Fix:** Add integration test that hits real database.

### ❌ No Validation on Real Data
```typescript
// BAD: Test uses any type, doesn't catch schema mismatches
const property: any = { id: '123', name: 'Test' };
```

**Fix:** Use real DTO types, let TypeScript catch mismatches.

### ❌ Silent Failures
```typescript
// BAD: Analytics failure breaks the whole request
await trackEvent('USER_ACTION'); // throws if API down
```

**Fix:** Wrap in try/catch, log but don't throw.

### ❌ Tests That Don't Fail
```typescript
// BAD: This test will always pass
it('should save property', async () => {
  await updateProperty(id, data);
  // No assertions!
});
```

**Fix:** Assert on return value, database state, or HTTP response.

---

## Coverage Targets

### Backend
- **Overall:** 80% lines, 70% branches
- **Critical paths:** 100% (auth, payment, financial)
- **DTOs:** 100% (validation is critical)
- **Services:** 90% (business logic)
- **Controllers:** 80% (mostly routing)

### Frontend
- **Overall:** 70% lines, 60% branches
- **Critical forms:** 90% (edit modals, payment forms)
- **API clients:** 80%
- **Hooks:** 70%
- **UI components:** 60% (focus on behavior, not markup)

**Run coverage:**
```bash
pnpm test -- --coverage
```

---

## When Tests Are Blocked (This Environment)

If you can't run integration/E2E tests due to environment constraints:

**1. Write the test anyway**
```typescript
// Mark as integration test
describe.skip('PropertyController (Integration)', () => {
  // Full test code here
});
```

**2. Document in test file**
```typescript
/**
 * Integration test - requires:
 * - PostgreSQL running
 * - Prisma client generated
 * - Backend server running
 *
 * Run in real environment with:
 *   pnpm test:integration
 */
```

**3. Track in issue**
```markdown
## Blocked Tests
- [ ] properties.integration.spec.ts - needs Prisma engine
- [ ] edit-property.spec.ts (E2E) - needs running app

**Next steps:** Run in CI once environment fixed
```

**4. Verify structure is correct**
- Test file exists in right location
- Test imports work (type-check passes)
- Assertions are written (not just `it.todo()`)

This ensures tests will work when environment is ready.

---

## Example: Property Edit Modal Test Matrix

### Backend (57 tests ✅)

| Category | Tests | Status |
|----------|-------|--------|
| DTO validation | 28 | ✅ Passing |
| Service logging | 6 | ✅ Passing |
| Controller | 8 | ✅ Passing |
| Exception filter | 15 | ✅ Passing |
| Integration | 4 | ⏸️ Written (blocked by Prisma) |

### Frontend (7 tests ⏸️)

| Category | Tests | Status |
|----------|-------|--------|
| Component | TBD | ⏳ Not written |
| E2E (Playwright) | 7 | ⏸️ Written (needs running app) |

### Manual Smoke Test
- ✅ Checked in local dev
- ⏳ Not verified in this environment

**Verdict:** Ready to merge for backend. Frontend needs component tests + E2E verification in real env.

---

## Next Feature: Units Edit Modal

Following this contract, Units should have:

**Backend:**
- [ ] `UpdateUnitDto` with tests (unitNumber, bedrooms, bathrooms, marketRent)
- [ ] `UnitsService.update()` with logging tests
- [ ] `UnitsController.update()` with HTTP tests
- [ ] Event tracking: `unit_updated`
- [ ] Integration test (written, skipped if needed)

**Frontend:**
- [ ] `UnitEditModal` component
- [ ] `useUpdateUnit()` React Query hook
- [ ] Playwright test (edit-unit.spec.ts)
- [ ] Manual smoke test checklist

**Don't merge until:**
- All backend unit tests pass
- Frontend types match backend
- Playwright test written (can be skipped if env blocked)
- Smoke test checklist completed

---

## Questions to Ask Before Merging

1. **Can I run the tests?** (`pnpm test` works)
2. **Do the tests actually verify behavior?** (Not just mocks)
3. **What happens if this breaks?** (Logs show it, Sentry captures it)
4. **Can someone else run this?** (Tests don't depend on my machine)
5. **Will this work in production?** (No hardcoded localhost, secrets, etc.)

If any answer is "no" or "I don't know", don't merge yet.

---

## Resources

- **Backend test examples:** `packages/backend/src/properties/`
- **Frontend test examples:** `packages/frontend-admin/e2e/properties/`
- **Jest docs:** https://jestjs.io/docs/getting-started
- **Playwright docs:** https://playwright.dev/docs/intro
- **React Testing Library:** https://testing-library.com/docs/react-testing-library/intro
