import { z } from 'zod';

/**
 * Centralized Validation Schemas using Zod
 *
 * This file contains all form validation schemas for the PropertyMaster admin portal.
 * Using Zod provides:
 * - Type-safe validation
 * - Consistent error messages
 * - Reusable validation rules
 * - Integration with react-hook-form via zodResolver
 *
 * Usage:
 * ```typescript
 * import { propertySchema } from '@/lib/validation-schemas';
 * import { useFormWithZod } from '@/components/forms/useFormWithZod';
 *
 * const form = useFormWithZod(propertySchema);
 * ```
 */

// ============================================================================
// Common Validation Rules
// ============================================================================

const email = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .trim();

const optionalEmail = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

const phone = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format')
  .trim();

const optionalPhone = z
  .string()
  .regex(/^[\d\s\-\(\)\+]*$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

const zipCode = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789')
  .trim();

const optionalZipCode = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789')
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

const positiveNumber = z
  .number({ invalid_type_error: 'Must be a number' })
  .positive('Must be greater than 0');

const nonNegativeNumber = z
  .number({ invalid_type_error: 'Must be a number' })
  .nonnegative('Cannot be negative');

const positiveInteger = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .positive('Must be greater than 0');

const nonNegativeInteger = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .nonnegative('Cannot be negative');

const usState = z
  .string()
  .length(2, 'State must be 2 characters')
  .regex(/^[A-Z]{2}$/, 'State must be uppercase 2-letter code')
  .trim();

// ============================================================================
// Property Schemas
// ============================================================================

export const propertySchema = z.object({
  // Required fields
  name: z.string().min(1, 'Property name is required').trim(),
  address1: z.string().min(1, 'Street address is required').trim(),
  city: z.string().min(1, 'City is required').trim(),
  state: usState,
  zipCode: zipCode,
  type: z.enum(['SINGLE_FAMILY', 'MULTIFAMILY', 'COMMERCIAL'], {
    required_error: 'Property type is required',
  }),

  // Optional fields
  address2: z.string().optional(),
  country: z.string().default('US'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type PropertyFormData = z.infer<typeof propertySchema>;

// ============================================================================
// Unit Schemas
// ============================================================================

export const unitSchema = z.object({
  // Required fields
  unitNumber: z.string().min(1, 'Unit number is required').trim(),
  type: z.enum(['STUDIO', 'ONE_BED', 'TWO_BED', 'THREE_BED', 'FOUR_PLUS_BED'], {
    required_error: 'Unit type is required',
  }),
  bedrooms: nonNegativeInteger,
  bathrooms: nonNegativeNumber,
  marketRent: positiveNumber,
  status: z.enum(['VACANT', 'OCCUPIED', 'NOTICE', 'MAINTENANCE'], {
    required_error: 'Status is required',
  }),
  propertyId: z.string().min(1, 'Property is required'),

  // Optional fields
  squareFeet: positiveInteger.optional(),
  floor: z.number().int().optional(),
  features: z.array(z.string()).optional(),
});

export type UnitFormData = z.infer<typeof unitSchema>;

// ============================================================================
// Lease Schemas
// ============================================================================

const tenantSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: email,
  phone: phone,
  isPrimary: z.boolean(),
});

export const leaseSchema = z
  .object({
    // Required fields
    propertyId: z.string().min(1, 'Property is required'),
    unitId: z.string().min(1, 'Unit is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    monthlyRent: positiveNumber,
    securityDeposit: nonNegativeNumber,
    paymentDueDay: z
      .number()
      .int()
      .min(1, 'Payment due day must be between 1 and 28')
      .max(28, 'Payment due day must be between 1 and 28'),
    tenants: z
      .array(tenantSchema)
      .min(1, 'At least one tenant is required')
      .refine((tenants) => tenants.filter((t) => t.isPrimary).length === 1, {
        message: 'Exactly one tenant must be marked as primary',
      }),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type LeaseFormData = z.infer<typeof leaseSchema>;
export type TenantFormData = z.infer<typeof tenantSchema>;

// ============================================================================
// Vendor Schemas
// ============================================================================

export const vendorSchema = z.object({
  // Required fields
  companyName: z.string().min(1, 'Company name is required').trim(),
  type: z.enum(
    [
      'MAINTENANCE',
      'LANDSCAPING',
      'CLEANING',
      'PLUMBING',
      'ELECTRICAL',
      'HVAC',
      'GENERAL_CONTRACTOR',
      'SUPPLIER',
      'UTILITY',
      'PROFESSIONAL_SERVICES',
      'OTHER',
    ],
    {
      required_error: 'Vendor type is required',
    }
  ),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    required_error: 'Status is required',
  }),

  // Optional fields
  contactName: z.string().optional(),
  email: optionalEmail,
  phone: optionalPhone,
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z
    .string()
    .length(2, 'State must be 2 characters')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  zipCode: optionalZipCode,
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  licenseNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type VendorFormData = z.infer<typeof vendorSchema>;

// ============================================================================
// Work Order Schemas
// ============================================================================

export const workOrderSchema = z.object({
  // Required fields
  title: z.string().min(5, 'Title must be at least 5 characters').trim(),
  description: z.string().min(10, 'Description must be at least 10 characters').trim(),
  type: z.enum(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'TURNOVER', 'EMERGENCY', 'PREVENTIVE'], {
    required_error: 'Work order type is required',
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'], {
    required_error: 'Priority is required',
  }),
  propertyId: z.string().min(1, 'Property is required'),
  permissionToEnter: z.boolean(),

  // Optional fields
  location: z.string().optional(),
  tenantReportedBy: z.string().optional(),
  tenantPhone: optionalPhone,
  estimatedCost: nonNegativeNumber.optional(),
});

export type WorkOrderFormData = z.infer<typeof workOrderSchema>;

// ============================================================================
// Payment Schemas
// ============================================================================

export const paymentSchema = z.object({
  // Required fields
  leaseId: z.string().min(1, 'Lease is required'),
  amount: positiveNumber,
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['CASH', 'CHECK', 'ACH', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER'], {
    required_error: 'Payment method is required',
  }),

  // Optional fields
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ============================================================================
// User/Tenant Schemas
// ============================================================================

export const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: email,
  phone: phone,
  role: z.enum(
    [
      'SUPER_ADMIN',
      'ORG_ADMIN',
      'PM',
      'ACCOUNTANT',
      'LEASING_AGENT',
      'MAINTENANCE_TECH',
      'TENANT',
      'VENDOR',
    ],
    {
      required_error: 'Role is required',
    }
  ),
});

export type UserFormData = z.infer<typeof userSchema>;

// ============================================================================
// Authentication Schemas
// ============================================================================

export const loginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    organizationName: z.string().min(1, 'Organization name is required').trim(),
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().min(1, 'Last name is required').trim(),
    email: email,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

// ============================================================================
// Settings Schemas
// ============================================================================

export const profileSettingsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: email,
  phone: phone,
  timezone: z.string().optional(),
  language: z.string().default('en'),
});

export type ProfileSettingsFormData = z.infer<typeof profileSettingsSchema>;

export const organizationSettingsSchema = z.object({
  name: z.string().min(1, 'Organization name is required').trim(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  phone: optionalPhone,
  email: optionalEmail,
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: optionalZipCode,
  timezone: z.string().optional(),
});

export type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;

// ============================================================================
// Export all schemas for easy access
// ============================================================================

export const schemas = {
  property: propertySchema,
  unit: unitSchema,
  lease: leaseSchema,
  tenant: tenantSchema,
  vendor: vendorSchema,
  workOrder: workOrderSchema,
  payment: paymentSchema,
  user: userSchema,
  login: loginSchema,
  register: registerSchema,
  passwordReset: passwordResetSchema,
  profileSettings: profileSettingsSchema,
  organizationSettings: organizationSettingsSchema,
} as const;
