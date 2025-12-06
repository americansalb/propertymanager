import { type AxiosError } from 'axios';

/**
 * API error response from backend
 */
export interface ApiErrorResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Typed Axios error for API calls
 */
export type ApiError = AxiosError<ApiErrorResponse>;

/**
 * Extract error message from API error
 */
export function getApiErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  const axiosError = error as ApiError;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return message || axiosError.message || 'An unexpected error occurred';
}

/**
 * Common entity types used across the frontend
 */
export interface Property {
  id: string;
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: string;
  status: string;
  totalUnits?: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
  propertyId: string;
  type: string;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number | null;
  marketRent: number;
}

export interface Lease {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit?: number;
  status: string;
  tenants?: Tenant[];
  unit?: Unit & { property?: Property };
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isPrimary?: boolean;
  leaseId?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  propertyId?: string;
  unitId?: string;
  property?: Property;
  unit?: Unit;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  companyName: string;
  email?: string;
  phone?: string;
  status: string;
  vendorType?: string;
}

export interface VendorMarketplaceProfile {
  id: string;
  vendorId: string;
  companyName: string;
  businessDescription?: string;
  services?: VendorService[];
  averageRating?: number;
  totalJobs?: number;
}

export interface VendorService {
  id: string;
  serviceName: string;
  description?: string;
  basePrice?: number;
  priceType?: string;
}
