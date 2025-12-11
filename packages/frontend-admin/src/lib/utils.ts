import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Extract error message from API response.
 * Backend returns: { success: false, error: { message: "...", code: "...", statusCode: ... } }
 * This helper handles both the correct path and legacy direct message path.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred',
): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const err = error as Record<string, unknown>;

  // Check axios-style error.response.data.error.message (correct path)
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    if (response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      // New format: { error: { message: "..." } }
      if (data.error && typeof data.error === 'object') {
        const errorObj = data.error as Record<string, unknown>;
        if (typeof errorObj.message === 'string') {
          return errorObj.message;
        }
      }
      // Legacy format: { message: "..." }
      if (typeof data.message === 'string') {
        return data.message;
      }
    }
  }

  // Check direct error.message
  if (typeof err.message === 'string') {
    return err.message;
  }

  return fallback;
}
