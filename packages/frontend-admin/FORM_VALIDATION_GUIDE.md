# Form Validation Guide

This guide explains how to use the centralized Zod validation schemas for consistent form validation across the PropertyMaster admin portal.

## Why Zod?

Previously, each form had its own manual validation logic with:
- Scattered validation code
- Inconsistent error messages
- Duplicated validation rules (e.g., multiple email regex patterns)
- Manual error state management

With Zod schemas, we get:
- ✅ Type-safe validation
- ✅ Consistent error messages
- ✅ Reusable validation rules
- ✅ Automatic integration with react-hook-form
- ✅ Better maintainability

## Quick Start

### 1. Import the schema

```typescript
import { unitSchema, type UnitFormData } from '@/lib/validation-schemas';
import { useFormWithZod } from '@/components/forms/useFormWithZod';
```

### 2. Use the hook

```typescript
const form = useFormWithZod(unitSchema, {
  defaultValues: {
    unitNumber: '',
    type: 'ONE_BED',
    bedrooms: 1,
    bathrooms: 1,
    marketRent: 0,
    status: 'VACANT',
    propertyId: '',
  },
});
```

### 3. Use form methods

```typescript
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  setValue,
  watch,
} = form;
```

### 4. Handle submission

```typescript
const onSubmit = handleSubmit(async (data: UnitFormData) => {
  // data is automatically validated and typed
  await createUnit(data);
});
```

## Complete Example: Converting UnitModal

### Before (Manual Validation)

```typescript
const [formData, setFormData] = useState({
  unitNumber: '',
  type: 'ONE_BED',
  bedrooms: 1,
  // ...
});
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const newErrors: Record<string, string> = {};
  if (!formData.unitNumber.trim()) {
    newErrors.unitNumber = 'Unit number is required';
  }
  if (!formData.marketRent || parseFloat(formData.marketRent) <= 0) {
    newErrors.marketRent = 'Market rent must be greater than 0';
  }
  // ... more validation

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // Submit...
};
```

### After (Zod Validation)

```typescript
import { unitSchema, type UnitFormData } from '@/lib/validation-schemas';
import { useFormWithZod } from '@/components/forms/useFormWithZod';

const form = useFormWithZod(unitSchema, {
  defaultValues: {
    unitNumber: '',
    type: 'ONE_BED',
    bedrooms: 1,
    bathrooms: 1,
    marketRent: 0,
    status: 'VACANT',
    propertyId: '',
  },
});

const { register, handleSubmit, formState: { errors } } = form;

const onSubmit = handleSubmit(async (data: UnitFormData) => {
  // Automatically validated!
  await createUnit(data);
});
```

## Form Field Examples

### Text Input

```typescript
<Input
  {...register('unitNumber')}
  placeholder="e.g. 101, A1"
  className={errors.unitNumber ? 'border-red-500' : ''}
/>
{errors.unitNumber && (
  <p className="text-sm text-red-600 mt-1">{errors.unitNumber.message}</p>
)}
```

### Number Input

```typescript
<Input
  type="number"
  {...register('marketRent', { valueAsNumber: true })}
  placeholder="0.00"
  className={errors.marketRent ? 'border-red-500' : ''}
/>
{errors.marketRent && (
  <p className="text-sm text-red-600 mt-1">{errors.marketRent.message}</p>
)}
```

### Select Dropdown

```typescript
<select {...register('type')} className="w-full">
  <option value="STUDIO">Studio</option>
  <option value="ONE_BED">1 Bedroom</option>
  {/* ... */}
</select>
{errors.type && (
  <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
)}
```

### Checkbox

```typescript
<input
  type="checkbox"
  {...register('permissionToEnter')}
  className="rounded"
/>
```

## Programmatic Value Updates

```typescript
// Set a single value
setValue('bedrooms', 2);

// Set multiple values
setValue('bedrooms', 2);
setValue('bathrooms', 1.5);

// Watch a value for changes
const bedrooms = watch('bedrooms');

// Get all current values
const currentValues = getValues();
```

## Conditional Validation

Some forms need validation that depends on other fields. Use Zod's `refine()` method:

```typescript
const leaseSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  // ...
}).refine((data) => data.startDate < data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'], // Shows error on endDate field
});
```

## Custom Error Messages

You can customize error messages when defining schemas:

```typescript
const customSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .trim(),
  age: z.number()
    .min(18, 'You must be at least 18 years old')
    .max(120, 'Please enter a valid age'),
});
```

## Available Schemas

All schemas are exported from `src/lib/validation-schemas.ts`:

### Core Entities
- `propertySchema` - Property creation/editing
- `unitSchema` - Unit creation/editing
- `leaseSchema` - Lease creation with embedded tenant validation
- `tenantSchema` - Standalone tenant validation
- `vendorSchema` - Vendor management
- `workOrderSchema` - Work order creation
- `paymentSchema` - Payment processing

### Authentication
- `loginSchema` - User login
- `registerSchema` - New organization registration
- `passwordResetSchema` - Password reset flow

### Settings
- `userSchema` - User profile
- `profileSettingsSchema` - User settings
- `organizationSettingsSchema` - Organization settings

## Migration Checklist

To convert an existing form to use Zod:

1. ✅ Import the schema and type:
   ```typescript
   import { unitSchema, type UnitFormData } from '@/lib/validation-schemas';
   import { useFormWithZod } from '@/components/forms/useFormWithZod';
   ```

2. ✅ Replace useState with useFormWithZod:
   ```typescript
   // OLD: const [formData, setFormData] = useState({...});
   // NEW:
   const form = useFormWithZod(unitSchema, { defaultValues: {...} });
   const { register, handleSubmit, formState: { errors } } = form;
   ```

3. ✅ Remove manual error state:
   ```typescript
   // DELETE: const [errors, setErrors] = useState<Record<string, string>>({});
   ```

4. ✅ Remove manual validation functions:
   ```typescript
   // DELETE: const validateField = () => {...}
   // DELETE: const validateForm = () => {...}
   ```

5. ✅ Update form inputs to use register:
   ```typescript
   // OLD: value={formData.field} onChange={e => setFormData({...})}
   // NEW: {...register('field')}
   ```

6. ✅ Update submit handler:
   ```typescript
   // OLD: const handleSubmit = (e) => { e.preventDefault(); /* validate */ }
   // NEW: const onSubmit = handleSubmit(async (data) => { /* auto-validated */ });
   ```

7. ✅ Update error display:
   ```typescript
   // OLD: {errors.field && <p>{errors.field}</p>}
   // NEW: {errors.field && <p>{errors.field.message}</p>}
   ```

8. ✅ Test thoroughly:
   - Submit with valid data
   - Submit with invalid data (should show errors)
   - Check all field types (text, number, select, checkbox)
   - Verify error messages are clear

## Common Patterns

### Loading State

```typescript
const { formState: { isSubmitting } } = form;

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

### Reset Form After Submission

```typescript
const onSubmit = handleSubmit(async (data) => {
  await createUnit(data);
  form.reset(); // Clears form
  onClose();
});
```

### Pre-fill Form for Editing

```typescript
useEffect(() => {
  if (existingUnit) {
    form.reset({
      unitNumber: existingUnit.unitNumber,
      type: existingUnit.type,
      // ...
    });
  }
}, [existingUnit, form]);
```

### Dynamic Fields (Arrays)

For forms with dynamic arrays (like multiple tenants in a lease):

```typescript
import { useFieldArray } from 'react-hook-form';

const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'tenants',
});

// Add tenant
append({ firstName: '', lastName: '', email: '', phone: '', isPrimary: false });

// Remove tenant
remove(index);

// Render
{fields.map((field, index) => (
  <div key={field.id}>
    <Input {...register(`tenants.${index}.firstName`)} />
    {errors.tenants?.[index]?.firstName && (
      <p>{errors.tenants[index].firstName.message}</p>
    )}
  </div>
))}
```

## Validation Modes

The `useFormWithZod` hook is configured for optimal UX:
- `mode: 'onBlur'` - Validate on first blur (not on every keystroke)
- `reValidateMode: 'onChange'` - After first error, re-validate on change

You can override this:

```typescript
const form = useFormWithZod(schema, {
  defaultValues: {...},
  mode: 'onChange', // Validate on every change
});
```

## Adding New Schemas

When adding a new form:

1. Add the schema to `src/lib/validation-schemas.ts`:
   ```typescript
   export const myNewSchema = z.object({
     field1: z.string().min(1, 'Required'),
     // ...
   });

   export type MyNewFormData = z.infer<typeof myNewSchema>;
   ```

2. Add to exports object at bottom:
   ```typescript
   export const schemas = {
     // ...existing schemas
     myNew: myNewSchema,
   } as const;
   ```

3. Use in your component:
   ```typescript
   import { myNewSchema, type MyNewFormData } from '@/lib/validation-schemas';
   ```

## Best Practices

1. **Use TypeScript types from Zod**
   ```typescript
   type FormData = z.infer<typeof schema>; // ✅
   // Not: interface FormData { ... } // ❌
   ```

2. **Keep schemas in central file**
   - Don't create inline schemas in components
   - All validation rules should be in `validation-schemas.ts`

3. **Use consistent error messages**
   - "X is required" for required fields
   - "Invalid X" for format errors
   - "X must be..." for constraint errors

4. **Test edge cases**
   - Empty strings
   - Whitespace-only strings
   - Negative numbers where not allowed
   - Invalid email/phone formats
   - Boundary values (min/max)

5. **Provide helpful errors**
   - Bad: "Invalid input"
   - Good: "Email must be in format user@example.com"

## Troubleshooting

### Error: "Cannot find module '@/lib/validation-schemas'"

Make sure TypeScript path aliases are configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Error: "Type X is not assignable to type Y"

Make sure you're using `valueAsNumber: true` for number inputs:
```typescript
<Input type="number" {...register('age', { valueAsNumber: true })} />
```

### Form not validating on submit

Make sure you're using `handleSubmit` from the form:
```typescript
const { handleSubmit } = form;
const onSubmit = handleSubmit(async (data) => { /* ... */ });

// In JSX:
<form onSubmit={onSubmit}>
```

### Errors not showing

Make sure you're accessing the `message` property:
```typescript
{errors.field && <p>{errors.field.message}</p>} // ✅
{errors.field && <p>{errors.field}</p>} // ❌ (shows object)
```

## Resources

- [Zod Documentation](https://zod.dev/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Resolver](https://github.com/react-hook-form/resolvers#zod)

## Questions?

If you have questions about form validation:
1. Check this guide
2. Look at `validation-schemas.ts` for schema examples
3. Look at converted forms for usage examples
