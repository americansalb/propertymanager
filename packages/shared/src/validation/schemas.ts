import { z } from 'zod';

// =====================================================
// Common Validators & Utilities
// =====================================================

/**
 * Sanitize string input - removes leading/trailing whitespace and normalizes spaces
 */
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Custom email validator with strict format
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters')
  .transform((val) => val.toLowerCase().trim());

/**
 * Phone number validator - US format with optional formatting
 */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(
    /^(\+1)?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/,
    'Invalid phone number format (e.g., (555) 555-5555)',
  )
  .transform((val) => {
    // Normalize to digits only with country code
    const digits = val.replace(/\D/g, '');
    return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
  });

/**
 * Optional phone - can be empty
 */
export const optionalPhoneSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val;
  })
  .pipe(phoneSchema.optional());

/**
 * Password validation with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    'Password must contain at least one special character',
  );

/**
 * Monetary amount - positive number with 2 decimal places
 */
export const moneySchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(10000000, 'Amount exceeds maximum allowed')
  .transform((val) => Math.round(val * 100) / 100);

/**
 * String to money - parses string input to money
 */
export const stringToMoneySchema = z
  .string()
  .min(1, 'Amount is required')
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
  .transform((val) => parseFloat(val))
  .pipe(moneySchema);

/**
 * Positive integer
 */
export const positiveIntSchema = z
  .number()
  .int('Must be a whole number')
  .positive('Must be a positive number');

/**
 * Name field - letters, spaces, hyphens, apostrophes
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform(sanitizeString);

/**
 * US State code
 */
export const stateSchema = z
  .string()
  .length(2, 'State must be a 2-letter code')
  .regex(/^[A-Z]{2}$/, 'Invalid state code')
  .transform((val) => val.toUpperCase());

/**
 * US ZIP code
 */
export const zipCodeSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format (e.g., 12345 or 12345-6789)');

/**
 * Date string (ISO format)
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .refine((val) => !isNaN(Date.parse(val)), 'Invalid date');

/**
 * Future date
 */
export const futureDateSchema = dateStringSchema.refine(
  (val) => new Date(val) > new Date(),
  'Date must be in the future',
);

/**
 * UUID v4
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

// =====================================================
// Auth Schemas
// =====================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    organizationName: z
      .string()
      .min(2, 'Organization name must be at least 2 characters')
      .max(100, 'Organization name must be less than 100 characters')
      .transform(sanitizeString),
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// =====================================================
// Property Schemas
// =====================================================

export const propertyTypeEnum = z.enum([
  'SINGLE_FAMILY',
  'MULTI_FAMILY',
  'APARTMENT',
  'CONDO',
  'TOWNHOUSE',
  'COMMERCIAL',
  'MIXED_USE',
]);

export const createPropertySchema = z.object({
  name: z
    .string()
    .min(1, 'Property name is required')
    .max(200, 'Name must be less than 200 characters')
    .transform(sanitizeString),
  type: propertyTypeEnum,
  address1: z
    .string()
    .min(1, 'Address is required')
    .max(200, 'Address must be less than 200 characters')
    .transform(sanitizeString),
  address2: z
    .string()
    .max(100, 'Address line 2 must be less than 100 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters')
    .transform(sanitizeString),
  state: stateSchema,
  zipCode: zipCodeSchema,
  country: z.string().default('USA'),
  totalUnits: positiveIntSchema.optional(),
  yearBuilt: z
    .number()
    .int()
    .min(1800, 'Year built must be after 1800')
    .max(new Date().getFullYear() + 5, 'Year built cannot be more than 5 years in the future')
    .optional(),
  squareFootage: z.number().positive('Square footage must be positive').optional(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

// =====================================================
// Unit Schemas
// =====================================================

export const unitStatusEnum = z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE']);

export const unitTypeEnum = z.enum([
  'STUDIO',
  'APARTMENT',
  '1BR',
  '2BR',
  '3BR',
  '4BR_PLUS',
  'HOUSE',
  'TOWNHOUSE',
  'COMMERCIAL',
]);

export const createUnitSchema = z.object({
  propertyId: uuidSchema,
  unitNumber: z
    .string()
    .min(1, 'Unit number is required')
    .max(20, 'Unit number must be less than 20 characters')
    .transform(sanitizeString),
  type: unitTypeEnum,
  status: unitStatusEnum.default('VACANT'),
  bedrooms: z
    .number()
    .min(0, 'Bedrooms cannot be negative')
    .max(20, 'Bedrooms cannot exceed 20'),
  bathrooms: z
    .number()
    .min(0, 'Bathrooms cannot be negative')
    .max(20, 'Bathrooms cannot exceed 20'),
  squareFootage: z.number().positive('Square footage must be positive').optional(),
  marketRent: moneySchema,
  depositAmount: moneySchema.optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  amenities: z.array(z.string()).optional(),
});

export const updateUnitSchema = createUnitSchema.partial().omit({ propertyId: true });

// =====================================================
// Tenant Schemas
// =====================================================

export const createTenantSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateStringSchema.optional(),
  ssn: z
    .string()
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, 'Invalid SSN format')
    .optional(),
  driversLicense: z.string().max(50).optional(),
  emergencyContact: z
    .object({
      name: nameSchema,
      phone: phoneSchema,
      relationship: z.string().max(50),
    })
    .optional(),
  isPrimary: z.boolean().default(false),
});

export const updateTenantSchema = createTenantSchema.partial();

// =====================================================
// Lease Schemas
// =====================================================

export const leaseTypeEnum = z.enum(['FIXED_TERM', 'MONTH_TO_MONTH', 'WEEK_TO_WEEK']);

export const leaseStatusEnum = z.enum([
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'RENEWED',
]);

export const createLeaseSchema = z
  .object({
    unitId: uuidSchema,
    type: leaseTypeEnum.default('FIXED_TERM'),
    startDate: dateStringSchema,
    endDate: dateStringSchema.optional(),
    monthlyRent: moneySchema.refine((val) => val > 0, 'Monthly rent must be greater than 0'),
    securityDeposit: moneySchema.optional(),
    paymentDueDay: z.number().int().min(1).max(28).default(1),
    lateFeeAmount: moneySchema.optional(),
    lateFeeGracePeriod: z.number().int().min(0).max(30).default(5),
    terms: z.string().max(10000).optional(),
    tenants: z.array(createTenantSchema).min(1, 'At least one tenant is required'),
  })
  .refine(
    (data) => {
      if (data.type === 'FIXED_TERM' && !data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: 'End date is required for fixed-term leases',
      path: ['endDate'],
    },
  )
  .refine(
    (data) => {
      if (data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
        return false;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    },
  )
  .refine(
    (data) => {
      const hasPrimary = data.tenants.some((t) => t.isPrimary);
      return hasPrimary;
    },
    {
      message: 'One tenant must be marked as primary',
      path: ['tenants'],
    },
  );

export const updateLeaseSchema = createLeaseSchema.partial().omit({ unitId: true, tenants: true });

// =====================================================
// Work Order Schemas
// =====================================================

export const workOrderPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']);

export const workOrderStatusEnum = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

export const workOrderCategoryEnum = z.enum([
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'APPLIANCE',
  'STRUCTURAL',
  'PEST_CONTROL',
  'LANDSCAPING',
  'CLEANING',
  'PAINTING',
  'FLOORING',
  'SAFETY',
  'OTHER',
]);

export const createWorkOrderSchema = z.object({
  unitId: uuidSchema.optional(),
  propertyId: uuidSchema,
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .transform(sanitizeString),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  priority: workOrderPriorityEnum.default('MEDIUM'),
  category: workOrderCategoryEnum,
  requestedBy: z.string().optional(),
  scheduledDate: dateStringSchema.optional(),
  estimatedCost: moneySchema.optional(),
  attachments: z.array(z.string().url()).max(10, 'Maximum 10 attachments allowed').optional(),
});

export const updateWorkOrderSchema = z.object({
  status: workOrderStatusEnum.optional(),
  priority: workOrderPriorityEnum.optional(),
  description: z.string().max(5000).optional(),
  vendorId: uuidSchema.optional(),
  scheduledDate: dateStringSchema.optional(),
  completedDate: dateStringSchema.optional(),
  actualCost: moneySchema.optional(),
  notes: z.string().max(2000).optional(),
});

// =====================================================
// Payment Schemas
// =====================================================

export const paymentMethodEnum = z.enum([
  'CASH',
  'CHECK',
  'MONEY_ORDER',
  'ACH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'OTHER',
]);

export const recordPaymentSchema = z.object({
  tenantId: uuidSchema,
  amount: moneySchema.refine((val) => val > 0, 'Payment amount must be greater than 0'),
  method: paymentMethodEnum,
  paymentDate: dateStringSchema,
  checkNumber: z.string().max(50).optional(),
  memo: z.string().max(500).optional(),
  allocations: z
    .array(
      z.object({
        chargeId: uuidSchema,
        amount: moneySchema.positive(),
      }),
    )
    .optional(),
});

export const refundPaymentSchema = z.object({
  amount: moneySchema.optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

// =====================================================
// Vendor Schemas
// =====================================================

export const vendorTypeEnum = z.enum([
  'PLUMBER',
  'ELECTRICIAN',
  'HVAC',
  'GENERAL_CONTRACTOR',
  'LANDSCAPER',
  'CLEANER',
  'PAINTER',
  'ROOFER',
  'PEST_CONTROL',
  'APPLIANCE_REPAIR',
  'LOCKSMITH',
  'OTHER',
]);

export const createVendorSchema = z.object({
  name: z
    .string()
    .min(2, 'Vendor name must be at least 2 characters')
    .max(200, 'Vendor name must be less than 200 characters')
    .transform(sanitizeString),
  type: vendorTypeEnum,
  email: emailSchema.optional(),
  phone: phoneSchema,
  address: z.string().max(300).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  taxId: z.string().max(50).optional(),
  insuranceExpiry: dateStringSchema.optional(),
  licenseNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  hourlyRate: moneySchema.optional(),
  isPreferred: z.boolean().default(false),
});

export const updateVendorSchema = createVendorSchema.partial();

// =====================================================
// Document Schemas
// =====================================================

export const documentTypeEnum = z.enum([
  'LEASE_AGREEMENT',
  'ADDENDUM',
  'NOTICE',
  'INVOICE',
  'RECEIPT',
  'INSPECTION_REPORT',
  'PHOTO',
  'ID_DOCUMENT',
  'INSURANCE',
  'TAX_DOCUMENT',
  'OTHER',
]);

export const uploadDocumentSchema = z.object({
  name: z
    .string()
    .min(1, 'Document name is required')
    .max(200, 'Document name must be less than 200 characters'),
  type: documentTypeEnum,
  propertyId: uuidSchema.optional(),
  unitId: uuidSchema.optional(),
  leaseId: uuidSchema.optional(),
  tenantId: uuidSchema.optional(),
  description: z.string().max(1000).optional(),
});

// =====================================================
// Search & Filter Schemas
// =====================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z
  .object({
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
    },
  );

// =====================================================
// Type Exports
// =====================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
