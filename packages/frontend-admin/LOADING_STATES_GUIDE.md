# Loading States Guide

This guide explains how to implement consistent, professional loading states throughout the PropertyMaster admin portal.

## Why Loading States Matter

Good loading states:
- ✅ Improve perceived performance
- ✅ Reduce user anxiety during waits
- ✅ Provide visual feedback that the app is working
- ✅ Create a professional, polished feel

Bad loading states:
- ❌ Generic "Loading..." text
- ❌ Blank screens
- ❌ Inconsistent spinners
- ❌ No feedback during actions

## Available Components

All loading state components are in `src/components/ui/skeleton.tsx`:

### Core Components

#### 1. `<Skeleton />`
Base skeleton component for custom layouts.

```typescript
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-4 w-full" />
<Skeleton className="h-8 w-32 rounded-full" />
```

#### 2. `<LoadingSpinner />`
Inline spinner for buttons and small areas.

```typescript
import { LoadingSpinner } from '@/components/ui/skeleton';

<Button disabled={isPending}>
  {isPending ? (
    <>
      <LoadingSpinner size="sm" />
      <span className="ml-2">Saving...</span>
    </>
  ) : (
    'Save'
  )}
</Button>
```

Sizes: `sm` | `md` | `lg`

### Page-Level Components

#### 3. `<PageLoadingSkeleton />`
Full page loading state with header, stats, and charts.

```typescript
import { PageLoadingSkeleton } from '@/components/ui/skeleton';

if (isLoading) {
  return <PageLoadingSkeleton title="Loading properties..." />;
}
```

#### 4. `<CardSkeleton />`
Dashboard stat card skeleton.

```typescript
import { CardSkeleton } from '@/components/ui/skeleton';

{isLoading ? (
  <CardSkeleton />
) : (
  <StatCard {...data} />
)}
```

#### 5. `<PropertyCardSkeleton />`
Property grid card skeleton.

```typescript
import { PropertyCardSkeleton } from '@/components/ui/skeleton';

{isLoading ? (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <PropertyCardSkeleton key={i} />
    ))}
  </div>
) : (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {properties.map(property => <PropertyCard key={property.id} {...property} />)}
  </div>
)}
```

#### 6. `<WorkOrderCardSkeleton />`
Work order list item skeleton.

```typescript
import { WorkOrderCardSkeleton } from '@/components/ui/skeleton';

{isLoading ? (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <WorkOrderCardSkeleton key={i} />
    ))}
  </div>
) : (
  workOrders.map(wo => <WorkOrderCard key={wo.id} {...wo} />)
)}
```

#### 7. `<TableRowSkeleton />`
Table row skeleton.

```typescript
import { TableRowSkeleton } from '@/components/ui/skeleton';

<table>
  <thead>...</thead>
  <tbody>
    {isLoading ? (
      Array.from({ length: 10 }).map((_, i) => (
        <TableRowSkeleton key={i} columns={5} />
      ))
    ) : (
      data.map(row => <tr key={row.id}>...</tr>)
    )}
  </tbody>
</table>
```

#### 8. `<ChartSkeleton />`
Chart/graph skeleton.

```typescript
import { ChartSkeleton } from '@/components/ui/skeleton';

{isLoading ? (
  <ChartSkeleton height={300} />
) : (
  <BarChart data={chartData} />
)}
```

#### 9. `<ActivityItemSkeleton />`
Activity feed item skeleton.

```typescript
import { ActivityItemSkeleton } from '@/components/ui/skeleton';

{isLoading ? (
  <div className="divide-y">
    {Array.from({ length: 5 }).map((_, i) => (
      <ActivityItemSkeleton key={i} />
    ))}
  </div>
) : (
  activities.map(activity => <ActivityItem key={activity.id} {...activity} />)
)}
```

#### 10. `<CalendarDaySkeleton />`
Calendar day cell skeleton.

```typescript
import { CalendarDaySkeleton } from '@/components/ui/skeleton';

<div className="grid grid-cols-7">
  {isLoading ? (
    Array.from({ length: 35 }).map((_, i) => (
      <CalendarDaySkeleton key={i} />
    ))
  ) : (
    days.map(day => <CalendarDay key={day.id} {...day} />)
  )}
</div>
```

### Empty States

#### 11. `<EmptyState />`
When there's no data to display.

```typescript
import { EmptyState } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';

{!isLoading && properties.length === 0 && (
  <EmptyState
    icon={Building2}
    title="No properties yet"
    description="Get started by adding your first property"
    action={
      <Button onClick={handleAdd}>
        <Plus className="w-4 h-4 mr-2" />
        Add Property
      </Button>
    }
  />
)}
```

## Usage Patterns

### Pattern 1: List/Grid Loading

For lists or grids of items (properties, units, vendors, etc.):

```typescript
import { PropertyCardSkeleton } from '@/components/ui/skeleton';

export default function PropertiesPage() {
  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  return (
    <div className="space-y-6">
      {/* Header always visible */}
      <div className="flex items-center justify-between">
        <h1>Properties</h1>
        <Button onClick={handleAdd}>Add Property</Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Data state */}
      {!isLoading && properties && properties.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map(property => (
            <PropertyCard key={property.id} {...property} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!properties || properties.length === 0) && (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Get started by adding your first property"
          action={<Button onClick={handleAdd}>Add Property</Button>}
        />
      )}
    </div>
  );
}
```

### Pattern 2: Form Button Loading

For form submissions and mutations:

```typescript
import { LoadingSpinner } from '@/components/ui/skeleton';

export default function MyForm() {
  const createMutation = useMutation({
    mutationFn: createItem,
  });

  const handleSubmit = async (data) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}

      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? (
          <>
            <LoadingSpinner size="sm" />
            <span className="ml-2">Creating...</span>
          </>
        ) : (
          'Create'
        )}
      </Button>
    </form>
  );
}
```

### Pattern 3: Inline Action Loading

For inline actions (delete, update, etc.):

```typescript
export function WorkOrderCard({ workOrder }) {
  const deleteMutation = useMutation({
    mutationFn: deleteWorkOrder,
  });

  return (
    <div className="p-4 border rounded-lg">
      <h3>{workOrder.title}</h3>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteMutation.mutate(workOrder.id)}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
```

### Pattern 4: Full Page Loading

For initial page loads:

```typescript
import { PageLoadingSkeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  });

  if (isLoading) {
    return <PageLoadingSkeleton title="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard content */}
    </div>
  );
}
```

### Pattern 5: Partial Page Updates

For sections that load independently:

```typescript
export function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: fetchActivities,
  });

  return (
    <div className="bg-white rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>

      {isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="divide-y">
          {activities.map(activity => (
            <ActivityItem key={activity.id} {...activity} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Optimistic Updates

For mutations that should feel instant:

### Example: Toggle Status

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function UnitCard({ unit }) {
  const queryClient = useQueryClient();

  const toggleStatusMutation = useMutation({
    mutationFn: updateUnitStatus,
    // Optimistic update
    onMutate: async (newStatus) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['units'] });

      // Snapshot previous value
      const previousUnits = queryClient.getQueryData(['units']);

      // Optimistically update
      queryClient.setQueryData(['units'], (old) =>
        old.map((u) =>
          u.id === unit.id ? { ...u, status: newStatus } : u
        )
      );

      // Return rollback function
      return { previousUnits };
    },
    // Rollback on error
    onError: (err, newStatus, context) => {
      queryClient.setQueryData(['units'], context.previousUnits);
    },
    // Refetch on success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });

  return (
    <div className="p-4 border rounded-lg">
      <h3>{unit.unitNumber}</h3>

      <Button
        onClick={() => toggleStatusMutation.mutate(
          unit.status === 'VACANT' ? 'OCCUPIED' : 'VACANT'
        )}
        disabled={toggleStatusMutation.isPending}
      >
        {/* Status changes instantly, no spinner needed */}
        {unit.status === 'VACANT' ? 'Mark Occupied' : 'Mark Vacant'}
      </Button>
    </div>
  );
}
```

### Example: Add Item to List

```typescript
const addPropertyMutation = useMutation({
  mutationFn: createProperty,
  onMutate: async (newProperty) => {
    await queryClient.cancelQueries({ queryKey: ['properties'] });

    const previousProperties = queryClient.getQueryData(['properties']);

    // Add optimistic property with temporary ID
    queryClient.setQueryData(['properties'], (old) => [
      ...old,
      { ...newProperty, id: 'temp-' + Date.now(), _optimistic: true },
    ]);

    return { previousProperties };
  },
  onError: (err, newProperty, context) => {
    queryClient.setQueryData(['properties'], context.previousProperties);
  },
  onSuccess: (data) => {
    // Replace optimistic item with real data
    queryClient.setQueryData(['properties'], (old) =>
      old.map((p) => (p._optimistic ? data : p))
    );
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  },
});
```

## Best Practices

### 1. Match Skeleton to Content

Make skeletons look like the actual content:

```typescript
// ❌ Bad: Generic skeleton doesn't match content
{isLoading ? (
  <div className="text-gray-500">Loading...</div>
) : (
  <PropertyCard {...property} />
)}

// ✅ Good: Skeleton matches property card layout
{isLoading ? (
  <PropertyCardSkeleton />
) : (
  <PropertyCard {...property} />
)}
```

### 2. Show Header/Actions While Loading

Don't hide the whole page - keep navigation visible:

```typescript
// ❌ Bad: Everything disappears
{isLoading ? (
  <div>Loading...</div>
) : (
  <div>
    <Header />
    <Content />
  </div>
)}

// ✅ Good: Header always visible
<div>
  <Header />
  {isLoading ? <ContentSkeleton /> : <Content />}
</div>
```

### 3. Use Appropriate Skeleton Count

Show a realistic number of skeleton items:

```typescript
// ❌ Bad: Shows 100 skeletons (page is huge)
{Array.from({ length: 100 }).map((_, i) => <Skeleton key={i} />)}

// ✅ Good: Shows expected number of items
{Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
```

### 4. Disable Buttons During Mutations

Always disable buttons while loading:

```typescript
// ❌ Bad: Can submit multiple times
<Button onClick={handleSubmit}>
  {isPending ? 'Saving...' : 'Save'}
</Button>

// ✅ Good: Disabled while pending
<Button onClick={handleSubmit} disabled={isPending}>
  {isPending ? (
    <>
      <LoadingSpinner size="sm" />
      <span className="ml-2">Saving...</span>
    </>
  ) : (
    'Save'
  )}
</Button>
```

### 5. Use Optimistic Updates for Instant Feel

For toggles, deletes, and simple updates:

```typescript
// ❌ Slow: Shows spinner, waits for server
const deleteMutation = useMutation({
  mutationFn: deleteItem,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});

// ✅ Fast: Item disappears instantly
const deleteMutation = useMutation({
  mutationFn: deleteItem,
  onMutate: async (itemId) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });
    const previous = queryClient.getQueryData(['items']);
    queryClient.setQueryData(['items'], (old) =>
      old.filter((item) => item.id !== itemId)
    );
    return { previous };
  },
  onError: (err, itemId, context) => {
    queryClient.setQueryData(['items'], context.previous);
  },
});
```

### 6. Show Loading State Immediately

Don't delay showing loading states:

```typescript
// ❌ Bad: Flash of content before loading
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  setIsLoading(true);
  fetchData().then(() => setIsLoading(false));
}, []);

// ✅ Good: Start with loading state
const [isLoading, setIsLoading] = useState(true); // Default to loading

// Or better: Use React Query
const { data, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});
```

### 7. Graceful Error States

Always handle errors:

```typescript
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['properties'],
  queryFn: fetchProperties,
});

if (isLoading) {
  return <PropertyCardSkeleton />;
}

if (isError) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-600">
        Failed to load properties: {error.message}
      </p>
      <Button onClick={() => queryClient.invalidateQueries(['properties'])}>
        Try Again
      </Button>
    </div>
  );
}

return <PropertyCard {...data} />;
```

## Migration Checklist

To update a page to use proper loading states:

1. ✅ Import appropriate skeleton components
2. ✅ Replace "Loading..." text with skeleton
3. ✅ Match skeleton count to expected items
4. ✅ Keep header/navigation visible during loading
5. ✅ Add disabled state to form buttons
6. ✅ Show LoadingSpinner in buttons during submit
7. ✅ Add EmptyState for zero-data scenarios
8. ✅ Consider optimistic updates for instant feel
9. ✅ Handle error states gracefully
10. ✅ Test loading states by throttling network

## Testing Loading States

### In Development

1. **Throttle Network**: Chrome DevTools → Network → Throttling → Slow 3G
2. **Delay Queries**: Add delay to API calls
   ```typescript
   queryFn: async () => {
     await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
     return fetchData();
   }
   ```

3. **Storybook**: Create stories for loading states
   ```typescript
   export const Loading = {
     args: {
       isLoading: true,
     },
   };
   ```

### Network Tab

Watch for:
- Multiple sequential requests (should be parallel when possible)
- Unnecessarily large payloads
- Requests that could be cached

## Common Mistakes

### ❌ Mistake 1: No Loading State

```typescript
const { data } = useQuery({ queryKey: ['items'], queryFn: fetchItems });
return <div>{data?.map(item => <Item {...item} />)}</div>;
// Problem: Shows nothing while loading
```

### ❌ Mistake 2: Generic Text

```typescript
{isLoading && <div>Loading...</div>}
// Problem: Looks unprofessional
```

### ❌ Mistake 3: Hiding Everything

```typescript
{isLoading ? <Loading /> : <EntirePageContent />}
// Problem: Whole page disappears
```

### ❌ Mistake 4: Wrong Skeleton

```typescript
{isLoading ? <TableRowSkeleton /> : <PropertyCard {...property} />}
// Problem: Skeleton doesn't match content
```

### ❌ Mistake 5: No Button Feedback

```typescript
<Button onClick={handleSubmit}>
  {isPending ? 'Saving...' : 'Save'}
</Button>
// Problem: Button still clickable, no visual spinner
```

## Resources

- [React Query: Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [UX: Skeleton Screens](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a)
- [Material Design: Progress Indicators](https://m3.material.io/components/progress-indicators/overview)

## Questions?

Check the skeleton component implementations in `src/components/ui/skeleton.tsx` for examples.
