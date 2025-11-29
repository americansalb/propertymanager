import { ZodError, ZodSchema } from 'zod';

/**
 * Form field error type
 */
export interface FieldError {
  message: string;
  path: string;
}

/**
 * Form validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: FieldError[];
  fieldErrors?: Record<string, string>;
}

/**
 * Validate form data against a Zod schema
 */
export function validateForm<T>(
  schema: ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: FieldError[] = error.errors.map((err) => ({
        message: err.message,
        path: err.path.join('.'),
      }));

      const fieldErrors: Record<string, string> = {};
      for (const err of error.errors) {
        const path = err.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      }

      return {
        success: false,
        errors,
        fieldErrors,
      };
    }
    throw error;
  }
}

/**
 * Safe parse with typed result
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: ZodError } {
  const result = schema.safeParse(data);
  return result;
}

/**
 * Get first error message for a field
 */
export function getFieldError(
  fieldErrors: Record<string, string> | undefined,
  fieldName: string,
): string | undefined {
  return fieldErrors?.[fieldName];
}

/**
 * Check if field has error
 */
export function hasFieldError(
  fieldErrors: Record<string, string> | undefined,
  fieldName: string,
): boolean {
  return !!fieldErrors?.[fieldName];
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Convert Zod errors to flat array of messages
 */
export function flattenZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/**
 * Input sanitization utilities
 */
export const sanitize = {
  /**
   * Remove HTML tags
   */
  stripHtml: (str: string): string => {
    return str.replace(/<[^>]*>/g, '');
  },

  /**
   * Escape HTML entities
   */
  escapeHtml: (str: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, (char) => map[char]);
  },

  /**
   * Remove script tags and event handlers
   */
  stripScripts: (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  },

  /**
   * Normalize whitespace
   */
  normalizeWhitespace: (str: string): string => {
    return str.trim().replace(/\s+/g, ' ');
  },

  /**
   * Remove non-printable characters
   */
  removeNonPrintable: (str: string): string => {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[\x00-\x1F\x7F]/g, '');
  },

  /**
   * Full sanitization for user input
   */
  userInput: (str: string): string => {
    return sanitize.normalizeWhitespace(
      sanitize.removeNonPrintable(
        sanitize.stripScripts(str)
      )
    );
  },

  /**
   * Sanitize for display (escapes HTML)
   */
  forDisplay: (str: string): string => {
    return sanitize.escapeHtml(
      sanitize.normalizeWhitespace(
        sanitize.removeNonPrintable(str)
      )
    );
  },
};

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('1') ? digits.slice(1) : digits;

  if (normalized.length !== 10) {
    return phone; // Return as-is if not 10 digits
  }

  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  options: { currency?: string; locale?: string } = {},
): string {
  const { currency = 'USD', locale = 'en-US' } = options;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(d);
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

  return formatDate(d);
}

/**
 * Debounce function for form input
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validate on blur with debounce
 */
export function createFieldValidator<T>(
  schema: ZodSchema<T>,
  fieldName: string,
  onError: (error: string | null) => void,
  debounceMs = 300,
): (value: unknown) => void {
  const debouncedValidate = debounce((value: unknown) => {
    try {
      schema.parse({ [fieldName]: value });
      onError(null);
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldError = error.errors.find(
          (e) => e.path.includes(fieldName),
        );
        onError(fieldError?.message || null);
      }
    }
  }, debounceMs);

  return debouncedValidate;
}
