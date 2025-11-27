# Work Orders Maintenance Vertical Slice - Handoff Document

**Status**: Backend COMPLETE ✅ | Frontend UI PENDING ⏳

**Last Updated**: 2024-11-24 (after commit 11f153b)

---

## What's Been Built (DO NOT REDO)

### ✅ Backend (COMPLETE - Deployed to Render)

**Files Modified/Created**:

- `packages/backend/src/work-orders/dto/create-work-order.dto.ts` - DTO with validation
- `packages/backend/src/work-orders/dto/update-work-order.dto.ts` - Update DTO
- `packages/backend/src/work-orders/work-orders.service.ts` - Full CRUD with event tracking
- `packages/backend/src/work-orders/work-orders.controller.ts` - REST endpoints
- `packages/backend/src/work-orders/work-orders.module.ts` - Module with EventsModule import
- `packages/backend/src/common/decorators/user-id.decorator.ts` - JWT user ID extraction
- `packages/frontend-admin/src/hooks/useWorkOrders.ts` - React Query hooks

**API Endpoints (LIVE)**:

```
GET    /api/v1/work-orders          - List all (org-scoped)
GET    /api/v1/work-orders/:id      - Get single work order
POST   /api/v1/work-orders          - Create (201 status)
PUT    /api/v1/work-orders/:id      - Update
```

**Event Tracking (WORKING)**:

- `WORK_ORDER_CREATED` - Fired on create
- `WORK_ORDER_STATUS_CHANGED` - Fired when status changes
- `WORK_ORDER_UPDATED` - Fired on other updates

**Key Implementation Details**:

- Org scoping enforced via property.organizationId
- Property/unit validation in create()
- Auto-sets completedDate when status → COMPLETED
- Winston logging on all operations
- DTOs use `!` assertion (title!, description!, etc.) for TypeScript strictNullChecks

---

## What Needs to be Built (FRONTEND UI ONLY)

### ❌ 1. Enhanced WorkOrdersPage

**Current State**: Basic list view exists at `packages/frontend-admin/src/pages/WorkOrdersPage.tsx`

**What to Add**:

**A. Create Modal** (Follow PropertyEditModal pattern):

- Component: `packages/frontend-admin/src/components/work-orders/WorkOrderCreateModal.tsx`
- Form fields:
  - Title (required, text input)
  - Description (required, textarea)
  - Type (required, dropdown: MAINTENANCE, REPAIR, INSPECTION, TURNOVER, EMERGENCY, PREVENTIVE)
  - Priority (optional, dropdown: LOW, MEDIUM, HIGH, EMERGENCY, default: MEDIUM)
  - Property (required, dropdown - load from useProperties hook)
  - Unit (optional, dropdown - load units for selected property)
  - Location (optional, text input - e.g., "Lobby", "Roof")
- Uses `useCreateWorkOrder()` hook
- On success: closes modal, invalidates cache, shows success message
- Trigger: "Create Work Order" button in WorkOrdersPage header

**B. Update Modal** (Status changes + basic editing):

- Component: `packages/frontend-admin/src/components/work-orders/WorkOrderUpdateModal.tsx`
- Form fields:
  - Status (dropdown: DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
  - Priority (dropdown)
  - Completion Notes (textarea, show only if status = COMPLETED)
  - Scheduled Date (optional date picker)
  - Estimated Cost (optional number input)
  - Actual Cost (optional number input)
- Uses `useUpdateWorkOrder()` hook
- On success: closes modal, invalidates cache
- Trigger: Click work order card in list

**C. WorkOrdersPage Enhancements**:

- Make work order cards clickable (onClick opens UpdateModal)
- Add hover state with edit icon (same pattern as PropertiesPage)
- Wire up "Create Work Order" button to open CreateModal
- Use existing `useWorkOrders()` hook (already imported)

**UI/UX Pattern to Follow**:

```tsx
// Same pattern as PropertiesPage:
const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
const [createModalOpen, setCreateModalOpen] = useState(false);
const [updateModalOpen, setUpdateModalOpen] = useState(false);

const handleWorkOrderClick = (workOrder: WorkOrder) => {
  setSelectedWorkOrder(workOrder);
  setUpdateModalOpen(true);
};

// Cards are clickable with hover effect
<Card
  className="hover:shadow-lg transition-all cursor-pointer group"
  onClick={() => handleWorkOrderClick(workOrder)}
>
  {/* Existing card content */}
  <Edit className="w-4 h-4 text-gray-400 group-hover:text-primary" />
</Card>;
```

---

### ❌ 2. QA Dashboard Tests

**File to Modify**: `packages/frontend-admin/src/pages/QADashboard.tsx`

**Add 3 New Tests** (after existing 4 tests):

**Test 5: Load Work Orders**

```tsx
{
  name: 'Load Work Orders',
  description: 'Fetches all work orders for the organization',
  endpoint: 'GET /work-orders',
  testFn: async () => {
    const { data } = await apiCall('/work-orders');
    const workOrders = data.data || data;
    return {
      success: true,
      message: `✅ Loaded ${workOrders.length} work orders (${response.time}ms)`,
      time: response.time,
      statusCode: 200,
      data: workOrders,
    };
  },
  requiresAuth: true,
}
```

**Test 6: Create Test Work Order**

```tsx
{
  name: 'Create Test Work Order',
  description: 'Creates a test work order (tagged for QA)',
  endpoint: 'POST /work-orders',
  testFn: async () => {
    // Use first available property from properties state
    if (!properties || properties.length === 0) {
      throw new Error('No properties available for testing');
    }

    const testData = {
      title: 'QA Test Work Order',
      description: 'This is a test work order created by QA Dashboard',
      type: 'MAINTENANCE',
      priority: 'LOW',
      propertyId: properties[0].id,
      tenantReportedBy: 'QA Dashboard',
    };

    const { data, time, statusCode } = await apiCall('/work-orders', {
      method: 'POST',
      body: JSON.stringify(testData),
    });

    return {
      success: true,
      message: `✅ Work order created (${time}ms)`,
      time,
      statusCode,
      data: data.data || data,
    };
  },
  requiresAuth: true,
}
```

**Test 7: Update Work Order Status**

```tsx
{
  name: 'Update Work Order Status',
  description: 'Updates a work order status to COMPLETED',
  endpoint: 'PUT /work-orders/:id',
  testFn: async () => {
    // Load work orders, find one that's not COMPLETED
    const { data: listResponse } = await apiCall('/work-orders');
    const workOrders = listResponse.data || listResponse;

    const openWorkOrder = workOrders.find(
      (wo: any) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED'
    );

    if (!openWorkOrder) {
      throw new Error('No open work orders available for testing');
    }

    const { data, time, statusCode } = await apiCall(`/work-orders/${openWorkOrder.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'COMPLETED',
        completionNotes: 'Completed by QA Dashboard test',
      }),
    });

    return {
      success: true,
      message: `✅ Work order status updated to COMPLETED (${time}ms)`,
      time,
      statusCode,
      data: data.data || data,
    };
  },
  requiresAuth: true,
}
```

**Integration**:

- Add to existing `tests` array in QADashboard.tsx
- They will auto-show in the UI with existing test runner
- All 7 tests should pass when clicked

---

## Architectural Patterns (MUST FOLLOW)

### 1. Modal Pattern

- Use existing `Dialog` component from `components/ui/dialog.tsx`
- Follow `PropertyEditModal.tsx` structure exactly:
  - State management with `useState` for form data
  - `useEffect` to initialize form when modal opens
  - Validation before submission
  - Error handling with error state
  - Loading state during mutation
  - Success: close modal + invalidate cache

### 2. React Query Pattern

```tsx
// List query
const { data: workOrders, isLoading } = useWorkOrders();

// Create mutation
const createMutation = useCreateWorkOrder();
createMutation.mutate(formData, {
  onSuccess: () => {
    setModalOpen(false);
    // Cache auto-invalidates via hook
  },
  onError: (error) => {
    setError(error.message);
  },
});

// Update mutation
const updateMutation = useUpdateWorkOrder();
updateMutation.mutate({ id, data: formData });
```

### 3. Org Scoping

- Backend already enforces org scoping via `@OrganizationId()` decorator
- Frontend doesn't need to pass organizationId - it's extracted from JWT
- Work orders automatically filtered to user's org

### 4. Event Tracking

- Already implemented in backend service
- No frontend changes needed
- Events appear in Event table automatically

---

## Testing Checklist (User's Success Criteria)

After frontend UI is complete, user must be able to:

**Via UI (Founder-Clickable)**:

1. ✅ Log in as landlord@aalb.org
2. ✅ Click "Work Orders" in sidebar
3. ✅ See list of work orders (empty or populated)
4. ✅ Click "Create Work Order" button
5. ✅ Fill out form (title, description, type, priority, property)
6. ✅ Click "Save"
7. ✅ See new work order appear in list
8. ✅ Click a work order card
9. ✅ Change status (e.g., SUBMITTED → IN_PROGRESS → COMPLETED)
10. ✅ See status update immediately

**Via QA Dashboard**:

1. ✅ Go to /qa
2. ✅ See 7 tests (4 existing + 3 new work order tests)
3. ✅ Click "Run All Tests"
4. ✅ All 7 tests pass ✅
5. ✅ Each test shows HTTP status code + response time

**Backend (Already Working)**:

- Check Event table for WORK_ORDER_CREATED events
- Check Event table for WORK_ORDER_STATUS_CHANGED events
- Verify Winston logs in Render console

---

## What NOT to Change

**DO NOT TOUCH** (these work perfectly):

- ✅ Backend service logic (work-orders.service.ts)
- ✅ Backend controller (work-orders.controller.ts)
- ✅ DTOs (create/update)
- ✅ React Query hooks (useWorkOrders.ts)
- ✅ Event tracking implementation
- ✅ Existing QA Dashboard structure/logic

**DO NOT ADD** (out of scope for Phase 1):

- ❌ Vendor assignment UI (vendor dropdown in create modal is OK, but no vendor management flow)
- ❌ Work order attachments/photos
- ❌ Work order comments/notes (beyond completion notes)
- ❌ Advanced filtering/search
- ❌ Work order analytics/reports
- ❌ Scheduling/calendar view
- ❌ Mobile app work order submission

Keep it simple: **Create, List, Update Status** - that's it.

---

## Files That Need to be Created

**Required**:

1. `packages/frontend-admin/src/components/work-orders/WorkOrderCreateModal.tsx`
2. `packages/frontend-admin/src/components/work-orders/WorkOrderUpdateModal.tsx`

**Optional** (nice to have): 3. `packages/frontend-admin/src/components/work-orders/StatusBadge.tsx` - Reusable status badge component

---

## Common Pitfalls to Avoid

### 1. ❌ Don't Overcomplicate the Create Modal

**Wrong**:

```tsx
// Adding too many fields
<Input label="Assigned To" /> // Not needed in Phase 1
<Input label="Vendor" />       // Not needed in Phase 1
<Input label="Estimated Cost" /> // Optional, defer to edit modal
```

**Right**:

```tsx
// Minimum viable fields
<Input label="Title" required />
<Textarea label="Description" required />
<Select label="Type" required />
<Select label="Priority" />
<Select label="Property" required />
```

### 2. ❌ Don't Forget to Load Properties

**Wrong**:

```tsx
// Hardcoding property options
<option value="prop-1">Property 1</option>
```

**Right**:

```tsx
// Load from API
const { data: properties } = useQuery({
  queryKey: ['properties'],
  queryFn: async () => {
    const response = await api.get('/properties');
    return response.data.data;
  },
});

<select>
  {properties?.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ))}
</select>;
```

### 3. ❌ Don't Break Existing WorkOrdersPage

**Wrong**:

```tsx
// Replacing the entire file
export default function WorkOrdersPage() {
  // Starting from scratch
}
```

**Right**:

```tsx
// Adding to existing file
import { useState } from 'react';
import WorkOrderCreateModal from '../components/work-orders/WorkOrderCreateModal';
// ... existing imports

export default function WorkOrdersPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // ... existing code

  // Add modal at the end before closing </div>
  <WorkOrderCreateModal open={createModalOpen} onOpenChange={setCreateModalOpen} />;
}
```

---

## Verification Steps (Before Calling it Done)

### Manual Testing:

1. ✅ Create a work order via UI
2. ✅ Verify it appears in list
3. ✅ Click work order card
4. ✅ Change status to COMPLETED
5. ✅ Verify status updates in list
6. ✅ Go to /qa
7. ✅ Run "Load Work Orders" test → ✅
8. ✅ Run "Create Test Work Order" test → ✅
9. ✅ Run "Update Work Order Status" test → ✅

### Database Verification:

```sql
-- Check work orders were created
SELECT * FROM "WorkOrder" ORDER BY "createdAt" DESC LIMIT 5;

-- Check events were tracked
SELECT * FROM "Event" WHERE name IN ('WORK_ORDER_CREATED', 'WORK_ORDER_STATUS_CHANGED') ORDER BY "createdAt" DESC LIMIT 10;
```

### Render Logs Verification:

```
Search for:
- "work_order.created"
- "work_order.updated"
- "WORK_ORDER_CREATED" (event tracking)
- "WORK_ORDER_STATUS_CHANGED" (event tracking)
```

---

## Phase 1 Alignment

**This work orders feature is:**

- ✅ Part of "Maintenance" (half of "Money + Maintenance" Phase 1 focus)
- ✅ Mid-market PM friendly (100-2,000 units need maintenance tracking)
- ✅ Founder-clickable (no code editing, no DevTools)
- ✅ Production-grade (DTOs, validation, event tracking, org scoping)

**This work orders feature is NOT:**

- ❌ A full CMMS (Computerized Maintenance Management System)
- ❌ A vendor marketplace (that's Phase 3)
- ❌ An AI-powered predictive maintenance tool (that's Phase 3)
- ❌ A mobile field app (future enhancement)

**Scope boundaries:**

- IN SCOPE: Create, list, update status
- OUT OF SCOPE: Everything else

---

## Commit Message Template (When Done)

```
feat: Complete Work Orders frontend UI + QA Dashboard tests

Implements founder-clickable Work Orders maintenance flow:

**UI Components**:
- WorkOrderCreateModal: Create work orders with property selection
- WorkOrderUpdateModal: Update status and details
- Enhanced WorkOrdersPage with click-to-edit

**QA Dashboard**:
- Test 5: Load Work Orders (GET /work-orders)
- Test 6: Create Test Work Order (POST /work-orders)
- Test 7: Update Work Order Status (PUT /work-orders/:id)

**Founder Workflow** (Zero Code):
1. Login → Work Orders → Create → Fill form → Save
2. Click work order → Change status → Save
3. Go to /qa → Run all tests → All green ✅

**Phase 1 Alignment**:
Completes Maintenance vertical slice (Money + Maintenance focus).
Backend already deployed (commit 11f153b).
All 7 QA tests passing.

Verified:
- Work order CRUD via UI clicks
- Event tracking (WORK_ORDER_CREATED, WORK_ORDER_STATUS_CHANGED)
- Org scoping enforced
- QA Dashboard all green
```

---

## Questions to Ask User (If Unclear)

1. **Property Selector**: Should create modal auto-select the first property, or require explicit selection?
2. **Unit Field**: Optional or required? (Recommendation: Optional - not all work orders are unit-specific)
3. **Status Workflow**: Can user set any status, or enforce workflow (SUBMITTED → ASSIGNED → IN_PROGRESS → COMPLETED)?
4. **Delete**: Should users be able to delete work orders, or just CANCEL status?

**Recommendations** (if user doesn't have strong opinions):

- Auto-select first property (like PropertyEditModal auto-selects first property for update test)
- Unit optional
- Any status allowed (simpler, user can self-correct)
- CANCEL status instead of delete (audit trail)

---

## Contact Previous Session (If Needed)

If something is unclear or seems wrong:

**Check Commit History**:

```bash
git log --oneline -20
git show 11f153b  # Work orders backend commit
git show 14c3de6  # PropertyEditModal commit
```

**Check Existing Patterns**:

- Look at `PropertyEditModal.tsx` for modal structure
- Look at `PropertiesPage.tsx` for click-to-edit pattern
- Look at `QADashboard.tsx` for test structure

**Verify Backend is Working**:

```bash
curl https://propertymanager-1.onrender.com/api/v1/work-orders \
  -H "Authorization: Bearer YOUR_JWT"
```

---

**Last Updated**: 2024-11-24
**Commit**: 11f153b
**Author**: Brahma (Claude session ending due to context length)
**Next Session**: Build frontend UI + QA tests only
