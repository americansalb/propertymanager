/**
 * API client for properties endpoints
 * Handles HTTP communication with backend
 */

import { PropertyType } from './types';

export interface Property {
  id: string;
  organizationId: string;
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: PropertyType;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_CONSTRUCTION';
  totalUnits?: number;
  yearBuilt?: number | null;
  squareFeet?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePropertyDto {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  propertyType: PropertyType;
  active: boolean;
}

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ApiErrorResponse = {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    correlationId?: string;
    errors?: string[];
    stack?: string;
  };
};

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Custom error class that preserves backend error details
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public correlationId?: string,
    public errors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    const errorData = !json.success ? json.error : {
      message: 'Unknown error',
      statusCode: response.status,
    };

    throw new ApiError(
      errorData.message,
      errorData.statusCode,
      errorData.code,
      errorData.correlationId,
      errorData.errors,
    );
  }

  return json.data;
}

/**
 * Get all properties for current organization
 */
export async function fetchProperties(): Promise<Property[]> {
  return apiFetch<Property[]>('/api/properties');
}

/**
 * Get single property by ID
 */
export async function fetchProperty(id: string): Promise<Property> {
  return apiFetch<Property>(`/api/properties/${id}`);
}

/**
 * Update property
 */
export async function updateProperty(
  id: string,
  data: UpdatePropertyDto,
): Promise<Property> {
  return apiFetch<Property>(`/api/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete property
 */
export async function deleteProperty(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/properties/${id}`, {
    method: 'DELETE',
  });
}
