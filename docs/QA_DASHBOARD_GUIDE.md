# QA Dashboard - Quick Reference Guide

## Access the Dashboard

**Route:** `/qa`

Once your app is deployed on Render, navigate to:

```
https://your-app.render.com/qa
```

You must be logged in (the route requires authentication).

---

## What It Does

The QA Dashboard lets you visually verify that your deployed backend APIs are working **without opening DevTools, running curl commands, or using the terminal.**

Click a button → See if it works (✅) or fails (❌) → Check response data.

---

## Test Sections

### 1. Backend Health Check

**Button:** "Run Test"
**What it does:** Calls `GET /api/health`
**Verifies:** Backend server is running and responding
**Success:** Shows "✅ Backend is healthy (Xms)"

### 2. Load Properties

**Button:** "Run Test"
**What it does:** Calls `GET /api/properties` with your test JWT
**Verifies:** Authentication works, properties endpoint works
**Success:** Shows "✅ Loaded N properties (Xms)"

### 3. Update Property

**Button:** "Run Test"
**What it does:** Calls `PUT /api/properties/:id` with a safe test payload
**Verifies:** Property updates work end-to-end
**Payload:** Updates the test property's name to include current timestamp
**Success:** Shows "✅ Updated property 'Name' (Xms)"
**⚠️ Warning:** This modifies the test property in your database (safe, just updates the name)

### 4. Track Event

**Button:** "Run Test"
**What it does:** Calls `POST /api/events` with a test analytics event
**Verifies:** Event tracking system is working
**Success:** Shows "✅ Event tracked (Xms)"

### "🚀 Run All Tests" Button

Runs Health Check + Load Properties + Track Event simultaneously.

---

## Updating Test Credentials

### Where to Find Them

**File:** `packages/frontend-admin/src/pages/QADashboard.tsx`
**Lines:** 25-38

```typescript
const TEST_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL || '/api',
  TEST_JWT: 'eyJhbGci...', // ⚠️ UPDATE THIS
  TEST_PROPERTY_ID: 'test-property-id-123', // ⚠️ UPDATE THIS
  TEST_ORG_ID: 'test-org-id', // ⚠️ UPDATE THIS
};
```

### How to Get Real Credentials

1. **Get JWT Token:**
   - Log in to your deployed app normally
   - Open DevTools (F12) → Network tab
   - Look at any API request (e.g., `/properties`)
   - Find the `Authorization` header: `Bearer eyJhbGci...`
   - Copy everything after "Bearer " and paste into `TEST_JWT`

2. **Get Property ID:**
   - In DevTools → Network tab, look at the response from `GET /properties`
   - Copy any property's `id` field
   - Paste into `TEST_PROPERTY_ID`

3. **Get Organization ID:**
   - Same as above, look at any property's `organizationId` field
   - Paste into `TEST_ORG_ID`

4. **Rebuild and redeploy:**
   ```bash
   cd packages/frontend-admin
   pnpm build
   # Push to trigger Render deployment
   ```

---

## Typical Workflow

### After Deploying a New Backend Change

1. Open `https://your-app.render.com/qa`
2. Click **"🚀 Run All Tests"**
3. Look for green ✅ on all sections
4. If you see red ❌:
   - Click the section to see error details
   - Check the response data (expandable section)
   - Look at the error message

### Updating Test Property

If you want to use a different test property:

1. Go to `/properties` in your app
2. Pick a property you're okay modifying (or create a "Test Property")
3. Copy its ID from the URL or from DevTools
4. Update `TEST_PROPERTY_ID` in `QADashboard.tsx`
5. Rebuild and redeploy

---

## Visual Status Indicators

| Icon | Status  | Meaning                         |
| ---- | ------- | ------------------------------- |
| ⚪   | IDLE    | Test not run yet                |
| ⏳   | LOADING | Test is running...              |
| ✅   | SUCCESS | Test passed                     |
| ❌   | ERROR   | Test failed (see error message) |

---

## Common Errors

### ❌ "Invalid JWT token"

**Fix:** Your test JWT expired or is incorrect. Get a fresh JWT from DevTools.

### ❌ "Property not found"

**Fix:** The `TEST_PROPERTY_ID` doesn't exist in your database. Update it to a real property ID.

### ❌ "You do not have access to this property"

**Fix:** The property belongs to a different organization. Make sure `TEST_ORG_ID` matches the property's organization.

### ❌ "Network error" / "Failed to fetch"

**Fix:** Backend is down or CORS is misconfigured. Check backend logs.

---

## What This Doesn't Replace

The QA Dashboard is a **visual smoke test** layer on top of your automated tests. It does NOT replace:

- ✅ Backend unit tests (`pnpm test` in packages/backend)
- ✅ Frontend E2E tests (Playwright)
- ✅ Manual smoke testing checklist (see `VALIDATION_CHECKLIST.md`)

**Use it for:** Quickly verifying deployed app works after a deploy.

---

## Next Steps

Once you've verified the basics work:

1. Add more test sections for new features (Units, Tenants, Leases)
2. Add a "Copy shareable link" button to send to QA testers
3. Add a test history log (last 10 test runs)

---

## File Locations

- **QA Dashboard component:** `packages/frontend-admin/src/pages/QADashboard.tsx`
- **Route config:** `packages/frontend-admin/src/App.tsx` (line 37)
- **This guide:** `docs/QA_DASHBOARD_GUIDE.md`
