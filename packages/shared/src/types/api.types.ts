/**
 * Common API types used across all packages
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

export interface ApiMetadata {
  page?: number;
  limit?: number;
  total?: number;
  timestamp?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: ApiMetadata & {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Standard error codes
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Financial
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  TRUST_ACCOUNTING_VIOLATION = 'TRUST_ACCOUNTING_VIOLATION',

  // Operations
  WORK_ORDER_INVALID_STATE = 'WORK_ORDER_INVALID_STATE',

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
