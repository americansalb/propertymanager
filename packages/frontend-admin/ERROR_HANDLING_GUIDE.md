# Error Handling Guide

This guide explains how to implement consistent, user-friendly error handling throughout the PropertyMaster admin portal.

## Why Error Handling Matters

Good error handling:
- ✅ Prevents crashes and improves stability
- ✅ Provides clear feedback to users
- ✅ Helps debug issues in development
- ✅ Creates a professional, polished experience

Bad error handling:
- ❌ Silent failures (user doesn't know what happened)
- ❌ Cryptic technical errors shown to users
- ❌ App crashes with white screen
- ❌ No way to recover from errors

## Available Tools

### 1. Toast Notifications

For user-facing error messages, success confirmations, and warnings.

**Location**: `src/hooks/useToast.tsx`, `src/components/ui/toast.tsx`

#### Basic Usage

```typescript
import { useToast } from '@/hooks/useToast';

export function MyComponent() {
  const { success, error, warning, toast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      success('Saved successfully', 'Your changes have been saved.');
    } catch (err) {
      error('Save failed', 'Could not save your changes. Please try again.');
    }
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

#### Toast Variants

```typescript
// Success (green)
toast.success('Property created', 'Main Street Property has been added.');

// Error (red)
toast.error('Failed to delete', 'You don't have permission to delete this property.');

// Warning (yellow)
toast.warning('Unsaved changes', 'You have unsaved changes that will be lost.');

// Default (neutral)
toast.toast({
  title: 'New message',
  description: 'You have a new notification.',
});
```

#### Advanced Toast Options

```typescript
import { useToast } from '@/hooks/useToast';

const { toast } = useToast();

// Toast with action button
toast.toast({
  variant: 'error',
  title: 'Failed to send email',
  description: 'Connection timeout while sending.',
  action: (
    <ToastAction altText="Retry" onClick={retryEmail}>
      Retry
    </ToastAction>
  ),
});

// Manually dismiss a toast
const { id, dismiss } = toast.success('Uploading file...');
// Later:
dismiss();
```

### 2. Error Boundary

Catches React component errors and prevents white screen crashes.

**Location**: `src/components/ErrorBoundary.tsx`

#### App-Level Error Boundary

Wrap your entire app (already done in `App.tsx`):

```typescript
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

#### Page-Level Error Boundary

For graceful degradation of individual pages:

```typescript
import ErrorBoundary, { PageErrorFallback } from '@/components/ErrorBoundary';

export default function DashboardPage() {
  return (
    <ErrorBoundary fallback={PageErrorFallback}>
      <DashboardContent />
    </ErrorBoundary>
  );
}
```

#### Custom Error Fallback

For special error UIs:

```typescript
function CustomErrorFallback({ error, resetError }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="font-semibold text-red-800">Chart failed to load</h3>
      <p className="text-sm text-red-600">{error.message}</p>
      <Button onClick={resetError}>Retry</Button>
    </div>
  );
}

<ErrorBoundary fallback={CustomErrorFallback}>
  <ComplexChart data={data} />
</ErrorBoundary>
```

### 3. API Error Utility

Extracts clean error messages from API responses.

**Location**: `src/lib/utils.ts`

```typescript
import { getApiErrorMessage } from '@/lib/utils';

try {
  await api.post('/properties', data);
} catch (error) {
  const message = getApiErrorMessage(error, 'Failed to create property');
  toast.error('Error', message);
}
```

### 4. React Query Error Handling

Automatic retry and error states.

**Already configured** in `src/main.tsx`:
- `retry: 1` - Failed queries retry once
- `staleTime: 5min` - Prevents unnecessary refetches

## Error Handling Patterns

### Pattern 1: Mutation Errors (Forms)

Show errors on form submission:

```typescript
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/lib/utils';

export function CreatePropertyForm() {
  const { success, error: showError } = useToast();

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: (data) => {
      success('Property created', `${data.name} has been added successfully.`);
      onClose();
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Failed to create property');
      showError('Creation failed', message);
    },
  });

  const handleSubmit = (formData) => {
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}

      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Property'}
      </Button>
    </form>
  );
}
```

### Pattern 2: Query Errors (Data Loading)

Show error state when data fails to load:

```typescript
import { useQuery } from '@tanstack/react-query';

export function PropertiesList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  if (isLoading) {
    return <PropertyCardSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 mb-1">
              Failed to load properties
            </h3>
            <p className="text-sm text-red-600 mb-3">
              {getApiErrorMessage(error)}
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries(['properties'])}
              size="sm"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {data.map(property => <PropertyCard key={property.id} {...property} />)}
    </div>
  );
}
```

### Pattern 3: Inline Action Errors

For delete, update, toggle actions:

```typescript
export function PropertyCard({ property }) {
  const { error: showError } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries(['properties']);
    },
    onError: (error) => {
      showError(
        'Delete failed',
        getApiErrorMessage(error, 'Could not delete this property')
      );
    },
  });

  return (
    <div className="p-4 border rounded-lg">
      <h3>{property.name}</h3>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteMutation.mutate(property.id)}
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

### Pattern 4: Global Error Handler

For catching all unhandled errors:

```typescript
// In main.tsx or App.tsx
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // Show toast for unhandled errors
  toast.error(
    'Unexpected error',
    'Something went wrong. Please try refreshing the page.'
  );
});
```

### Pattern 5: Form Validation Errors

Handled by Zod schemas (see Form Validation Guide):

```typescript
import { useFormWithZod } from '@/components/forms/useFormWithZod';
import { propertySchema } from '@/lib/validation-schemas';

const form = useFormWithZod(propertySchema);

const onSubmit = form.handleSubmit(async (data) => {
  // Validation errors are shown automatically
  // This only runs if validation passes
  await createProperty(data);
});
```

### Pattern 6: Network Errors

Handle offline/timeout scenarios:

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isError, error } = useQuery({
  queryKey: ['properties'],
  queryFn: fetchProperties,
  retry: (failureCount, error) => {
    // Don't retry 4xx errors (client errors)
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return false;
    }
    // Retry 5xx errors (server errors) up to 2 times
    return failureCount < 2;
  },
  // Optional: Show custom error for network issues
  onError: (error) => {
    if (error.message === 'Network Error') {
      toast.error(
        'Connection lost',
        'Please check your internet connection and try again.'
      );
    }
  },
});
```

## Error Message Best Practices

### ✅ Good Error Messages

**Be specific and actionable:**
```typescript
// ✅ Good: Tells user what happened and what to do
error('Email already exists', 'This email is already registered. Try logging in instead.');

// ✅ Good: Provides context
error('Permission denied', 'Only admins can delete properties.');

// ✅ Good: Suggests next step
error('File too large', 'Maximum file size is 10MB. Please choose a smaller file.');
```

### ❌ Bad Error Messages

```typescript
// ❌ Bad: Too technical
error('Error', 'AxiosError: Request failed with status code 422');

// ❌ Bad: Not actionable
error('Error', 'Something went wrong');

// ❌ Bad: No context
error('Failed', error.message);
```

### Error Message Template

```typescript
const getErrorMessage = (error: unknown, context: string): string => {
  const apiError = getApiErrorMessage(error);

  // Map common errors to friendly messages
  if (apiError.includes('duplicate') || apiError.includes('already exists')) {
    return `This ${context} already exists. Please use a different name.`;
  }

  if (apiError.includes('not found')) {
    return `${context} not found. It may have been deleted.`;
  }

  if (apiError.includes('permission') || apiError.includes('unauthorized')) {
    return `You don't have permission to modify this ${context}.`;
  }

  // Fallback to API message or generic error
  return apiError || `Failed to save ${context}. Please try again.`;
};

// Usage
onError: (error) => {
  toast.error('Error', getErrorMessage(error, 'property'));
}
```

## Retry Logic

### Automatic Retry (React Query)

Already configured globally (1 retry):

```typescript
// In main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Retry once on failure
    },
  },
});
```

### Custom Retry Logic

For specific scenarios:

```typescript
const { data } = useQuery({
  queryKey: ['properties'],
  queryFn: fetchProperties,
  retry: (failureCount, error) => {
    // Never retry 401/403 (auth errors)
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return false;
    }

    // Retry up to 3 times for network errors
    if (error.message === 'Network Error') {
      return failureCount < 3;
    }

    // Retry once for other errors
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  },
});
```

### Manual Retry Button

Let users retry failed operations:

```typescript
const { refetch, isError } = useQuery({
  queryKey: ['properties'],
  queryFn: fetchProperties,
  // Disable automatic retry
  retry: false,
});

{isError && (
  <Button onClick={() => refetch()}>
    <RefreshCw className="w-4 h-4 mr-2" />
    Retry
  </Button>
)}
```

## Testing Error States

### Simulate Errors in Development

#### 1. Network Errors

```typescript
// In your API service
if (process.env.NODE_ENV === 'development' && Math.random() < 0.3) {
  throw new Error('Simulated network error');
}
```

#### 2. API Errors

```typescript
// In mock API
if (process.env.REACT_APP_SIMULATE_ERRORS === 'true') {
  throw { response: { status: 500, data: { error: { message: 'Server error' } } } };
}
```

#### 3. Component Errors

```typescript
// Force error boundary
if (process.env.NODE_ENV === 'development' && forceError) {
  throw new Error('Forced error for testing');
}
```

### Chrome DevTools

1. **Offline Mode**: DevTools → Network → Offline
2. **Throttling**: DevTools → Network → Slow 3G
3. **Request Blocking**: DevTools → Network → Request Blocking

### Manual Testing Checklist

- [ ] Test form submission with invalid data
- [ ] Test API failures (disconnect network)
- [ ] Test slow network (3G throttling)
- [ ] Test 401/403 errors (invalid auth)
- [ ] Test 404 errors (deleted resource)
- [ ] Test 500 errors (server error)
- [ ] Test component crashes (throw error in render)
- [ ] Test recovery (retry button works)
- [ ] Test toast notifications appear
- [ ] Test error messages are clear

## Common Mistakes

### ❌ Mistake 1: Silent Failures

```typescript
// Bad: User doesn't know what happened
try {
  await saveData();
} catch (error) {
  console.error(error); // Only logs to console
}

// Good: Show user feedback
try {
  await saveData();
  toast.success('Saved successfully');
} catch (error) {
  toast.error('Save failed', getApiErrorMessage(error));
}
```

### ❌ Mistake 2: Technical Error Messages

```typescript
// Bad: Shows technical details
toast.error('Error', error.toString());

// Good: User-friendly message
toast.error('Failed to load properties', 'Please try again later.');
```

### ❌ Mistake 3: No Recovery Option

```typescript
// Bad: User is stuck
{isError && <div>Failed to load</div>}

// Good: Provide retry
{isError && (
  <div>
    <p>Failed to load</p>
    <Button onClick={() => refetch()}>Retry</Button>
  </div>
)}
```

### ❌ Mistake 4: Not Using Error Boundary

```typescript
// Bad: Entire app crashes on component error
<App />

// Good: Graceful error handling
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### ❌ Mistake 5: Retrying Auth Errors

```typescript
// Bad: Keeps retrying 401 errors
retry: 3,

// Good: Don't retry auth errors
retry: (failureCount, error) => {
  if (error?.response?.status === 401) return false;
  return failureCount < 1;
}
```

## Error Logging (Production)

For production error tracking, integrate Sentry or similar:

```typescript
// In ErrorBoundary.tsx
componentDidCatch(error, errorInfo) {
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry
    Sentry.captureException(error, { extra: errorInfo });
  }
}

// In API error handler
catch (error) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      tags: { type: 'api_error' },
      extra: { endpoint: url },
    });
  }
  throw error;
}
```

## Migration Checklist

To add proper error handling to a component:

1. ✅ Import toast hook: `import { useToast } from '@/hooks/useToast';`
2. ✅ Add success toast on successful mutations
3. ✅ Add error toast on failed mutations
4. ✅ Use `getApiErrorMessage()` for API errors
5. ✅ Handle query errors with error state UI
6. ✅ Add retry button for failed queries
7. ✅ Wrap risky components in `<ErrorBoundary>`
8. ✅ Test all error scenarios
9. ✅ Ensure error messages are user-friendly
10. ✅ Verify no silent failures

## Resources

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-functions#handling-and-throwing-errors)
- [Radix UI Toast](https://www.radix-ui.com/primitives/docs/components/toast)

## Questions?

Check the implementations in:
- `src/hooks/useToast.tsx` - Toast hook
- `src/components/ErrorBoundary.tsx` - Error boundary
- `src/lib/utils.ts` - Error message utility
