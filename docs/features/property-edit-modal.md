# Feature Spec: Property Edit Modal

**Status:** Draft
**Owner:** Product + Engineering
**Last Updated:** November 22, 2025

## 0. Summary

Add an editable modal for properties in the admin portal so landlords can quickly update property details (name, address, tags, defaults) without leaving the main properties list. This feature also establishes the **standard pattern for CRUD edit modals** (units, tenants, leases, vendors).

> **Assumption (financial impact):**
> Property-level rent defaults are **templates only**. Editing them does **not** retroactively update existing leases or posted charges. Financial truth lives on **leases and charges**, per `FINANCIAL_DOMAIN_MODEL.md`.

---

## 1. Problem Statement

Currently, PropertyMaster supports **creating** properties but not **editing** them via the UI. Any changes to property details require direct DB manipulation or API calls. This creates:

- Friction for landlords onboarding their portfolio (typos, changing naming conventions).
- No quick way to fix address errors (impacting mapping, onboarding, reporting).
- No consistent pattern for edit experiences across entities (properties, units, tenants, etc.).

We need a fast, intuitive way to **edit properties inline** while aligning with our Phase 0 standards (logging, testing, analytics, strict typing).

---

## 2. Goals & Non-Goals

### 2.1 Goals

1. Allow a landlord/admin to **edit property details** from the properties list or property detail page.
2. Provide a **non-disruptive UX** via a modal (no full-page navigation).
3. Enforce **validation** (client + server) to prevent broken data.
4. Implement **structured logging** & **analytics events** for edits.
5. Establish a **reusable pattern** (component + API + tests) for other edit modals.

### 2.2 Non-Goals (Explicit)

- No creation or editing of **financial ledger entries** (charges, payments, journal entries).
- No editing of **lease-level financial terms**.
- No bulk edit of multiple properties (will be defined in a separate spec).
- No change to the underlying property schema (assume it's already adequate for these fields).

---

## 3. User Stories

1. **As a property manager**, I can open a property edit modal from the properties table to fix typos in name or address without losing my place.
2. **As a property manager**, I can update property contact info (e.g., management company name, email, phone) so tenants see correct details.
3. **As an admin**, I can see an error state if saving fails, with a clear message and no data loss in the form.
4. **As an admin**, I can view audit logs later (Phase 1+) to see who changed a property and when (logging foundation starts here).

---

## 4. Scope & Fields

### 4.1 Editable Fields (MVP)

Exact field names may differ slightly from Prisma schema; map accordingly.

- `name` (string, required)
- `addressLine1` (string, required)
- `addressLine2` (string, optional)
- `city` (string, required)
- `state` (string, required; US state dropdown for now)
- `postalCode` (string, required; basic format check)
- `country` (string, required; default = `US`)
- `propertyType` (enum: `SINGLE_FAMILY`, `MULTI_FAMILY`, `COMMERCIAL`, `MIXED_USE`, `OTHER`)
- `notes` (string, optional, multiline)
- `active` (boolean; whether property is active in system)

### 4.2 Non-MVP / v1.0 Enhancements

- Property-level **defaults**:
  - `defaultRentAmount`
  - `defaultDepositAmount`
  - `defaultLateFeePolicyId`
- Property-level **tags** / labels (e.g., "High priority", "Under renovation").
- Property manager contact details (email, phone) for tenant-facing comms.

---

## 5. UX & Interaction Design

### 5.1 Entry Points

- From **Properties List**:
  - Each row has a `...` menu and/or an inline "Edit" icon/button.
  - Clicking opens `PropertyEditModal` centered on screen.

- From **Property Detail Page** (if exists):
  - "Edit" button in top-right of property header opens same modal.

### 5.2 Modal Layout

- **Title:** `Edit Property`
- **Content:**
  - Two-column layout on desktop, single-column stacked on mobile.
  - Group fields logically:
    - "Basic Info": name, propertyType, active toggle.
    - "Address": address lines, city, state, postalCode, country.
    - "Notes": multiline text area.
- **Actions:**
  - Primary button: `Save changes`
  - Secondary: `Cancel` (closes modal, discards changes)
- **State:**
  - While saving:
    - Buttons disabled
    - Spinner in primary button
  - On success:
    - Modal closes
    - Parent list/detail updates via optimistic UI, confirmed by server response.

### 5.3 Validation & Errors

- **Client-side:**
  - Required fields: name, addressLine1, city, state, postalCode, country.
  - Basic postal code validation (length/character check; not fully country-aware yet).
  - Reasonable max lengths (name <= 120 chars, address <= 200 chars, notes <= 2000 chars).

- **Server-side:**
  - Same as client, plus:
    - Organization/tenant ownership check.
    - Attempt to update only within user's allowed organizationId.

- **Error UX:**
  - Field-level errors under each invalid input.
  - Top-level error alert for server/unknown errors: "We couldn't save your changes. Please try again. If this continues, contact support."

---

## 6. Backend/API Design

### 6.1 Endpoints

Assuming existing NestJS modules:

- `GET /api/properties/:id`
- `PUT /api/properties/:id`

**PUT Request Body (MVP):**

```ts
interface UpdatePropertyDto {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  propertyType: 'SINGLE_FAMILY' | 'MULTI_FAMILY' | 'COMMERCIAL' | 'MIXED_USE' | 'OTHER';
  notes?: string | null;
  active: boolean;
}
```

**PUT Response:**

- `200 OK` with updated property resource.
- `400 Bad Request` with validation details.
- `403 Forbidden` if user lacks access to this property.
- `404 Not Found` if property not in user's organization.
- `500 Internal Server Error` for unexpected failures (captured by error filter + Sentry).

### 6.2 Domain Rules

- Editing a property does **not**:
  - Create or modify charges, payments, or journal entries.
  - Modify existing leases or their financial terms.

- Property `active = false`:
  - Does **not** auto-terminate leases (separate spec).
  - Simply hides property in default views (implement in UI query later).

### 6.3 Logging (Backend)

Use Winston + correlation IDs (Phase 0 setup):

**On successful update:**

```json
{
  "level": "info",
  "message": "property.updated",
  "propertyId": "<id>",
  "organizationId": "<orgId>",
  "userId": "<userId>",
  "changes": {
    "name": { "before": "Old Name", "after": "New Name" },
    "city": { "before": "Old City", "after": "New City" }
  },
  "correlationId": "<uuid>"
}
```

**On failure:**

```json
{
  "level": "error",
  "message": "property.update_failed",
  "propertyId": "<id>",
  "organizationId": "<orgId>",
  "userId": "<userId>",
  "error": { "name": "ValidationError", "message": "Postal code invalid" },
  "correlationId": "<uuid>"
}
```

> Only log diffs, not entire payloads, and never log secrets/PII beyond what's needed (addresses are acceptable, payment details are not relevant here).

---

## 7. Frontend Implementation

### 7.1 Components

**PropertyEditModal**

**Props:**

- `property: Property`
- `isOpen: boolean`
- `onClose: () => void`
- `onUpdated: (updated: Property) => void`

**Uses shadcn/ui components** (Dialog, Input, Textarea, Select, Switch, Button).

**Uses React Hook Form + Zod** for schema-based validation (if already adopted; otherwise simple custom validation with migration path).

**Pattern to reuse later for:**

- `UnitEditModal`
- `TenantEditModal`
- `VendorEditModal`

### 7.2 Data Flow

1. User clicks "Edit" → open modal, form pre-populated from `property`.
2. On `Save changes`:
   - Optimistically update local UI (optional), but always reconcile with server response.
   - Call `PUT /api/properties/:id`.
3. On success:
   - Update properties list cache (React Query/SWR or custom hook).
   - Close modal.
4. On error:
   - Show errors, do **not** mutate local property.

### 7.3 Analytics Events (Frontend)

Using `trackEvent` utility added in Phase 0:

- **On modal open:**
  - `PROPERTY_EDIT_OPENED`
  - Properties: `{ propertyId, source: 'list' | 'detail' }`

- **On successful save:**
  - `PROPERTY_EDIT_SAVED`
  - Properties: `{ propertyId, fieldsChangedCount, source }`

- **On failure:**
  - `PROPERTY_EDIT_SAVE_FAILED`
  - Properties: `{ propertyId, errorType: 'validation' | 'network' | 'server' }`

---

## 8. Security & Permissions

- Only users with `ROLE_ADMIN` or `ROLE_PROPERTY_MANAGER` for the given organization can edit properties.
- Access control enforced in backend via:
  - JWT → user/roles/organizationId.
  - Query scoping: `WHERE property.organizationId = user.organizationId`.

- Frontend should hide "Edit" option if user lacks permission, but this is defense in depth; backend is the source of truth.

---

## 9. Testing Strategy

### 9.1 Unit Tests (Backend)

**PropertyService.updateProperty:**

- Updates allowed fields only.
- Rejects invalid data (e.g., empty name, missing city).
- Enforces organization scoping.

**DTO validation:**

- Ensure required fields validated at controller level.

### 9.2 Integration Tests (API)

Use Jest + Supertest:

**PUT /api/properties/:id:**

- `200` on success with updated fields.
- `400` on invalid request.
- `403` when user belongs to different org.
- `404` when property does not exist (for this org).

### 9.3 Frontend Tests (Vitest/React Testing Library)

**PropertyEditModal:**

- Renders with initial values.
- Shows validation errors on empty required fields.
- Calls API and handles success (calls `onUpdated`, closes modal).
- Handles server error and shows error message without closing.

### 9.4 E2E Test (Playwright)

**Scenario:**

1. Log in as demo admin.
2. Navigate to Properties.
3. Open edit modal for a property.
4. Change name & city.
5. Click Save.
6. Assert:
   - Modal closes.
   - Table row shows updated values.
   - Property still accessible on refresh.

---

## 10. Definition of Done

- [ ] Backend `PUT /api/properties/:id` endpoint implemented with strict DTO validation and org scoping.
- [ ] `PropertyEditModal` implemented, wired to API, with client-side validation.
- [ ] UI updated optimistically but reconciled with API response.
- [ ] Winston logging for `property.updated` and `property.update_failed` added.
- [ ] Analytics events (`PROPERTY_EDIT_OPENED`, `PROPERTY_EDIT_SAVED`, `PROPERTY_EDIT_SAVE_FAILED`) instrumented.
- [ ] Unit tests (backend & frontend) implemented and passing.
- [ ] Integration tests for `PUT /properties/:id` passing in CI.
- [ ] One Playwright E2E test for property edit flow passing.
- [ ] No new `any` types introduced; TypeScript strict mode passes.
- [ ] Documentation:
  - This spec stored at `docs/features/property-edit-modal.md`.
  - README or module-level docs updated if needed.
