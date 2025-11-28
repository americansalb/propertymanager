import React, { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: ReactNode;
}

// All providers wrapper
const AllTheProviders = ({ children }: WrapperProps) => {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function that wraps components with all providers
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ORGANIZATION_ADMIN',
  organizationId: 'org-123',
  organizationName: 'Test Organization',
  avatarUrl: null,
  ...overrides,
});

export const createMockProperty = (overrides = {}) => ({
  id: 'prop-123',
  name: 'Test Property',
  type: 'MULTIFAMILY',
  status: 'ACTIVE',
  address: '123 Test St',
  city: 'Test City',
  state: 'CA',
  zipCode: '12345',
  country: 'USA',
  totalUnits: 10,
  yearBuilt: 2000,
  organizationId: 'org-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockUnit = (overrides = {}) => ({
  id: 'unit-123',
  propertyId: 'prop-123',
  unitNumber: '101',
  type: 'ONE_BED',
  bedrooms: 1,
  bathrooms: 1,
  squareFeet: 750,
  marketRent: 1500,
  status: 'VACANT',
  ...overrides,
});

export const createMockLease = (overrides = {}) => ({
  id: 'lease-123',
  unitId: 'unit-123',
  type: 'FIXED_TERM',
  status: 'ACTIVE',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  monthlyRent: 1500,
  securityDeposit: 1500,
  tenants: [],
  ...overrides,
});

export const createMockTenant = (overrides = {}) => ({
  id: 'tenant-123',
  leaseId: 'lease-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  isPrimary: true,
  ...overrides,
});

// Mock API responses
export const mockApiResponse = <T,>(data: T) => ({
  success: true,
  data,
});

export const mockApiError = (message: string, code?: string) => ({
  success: false,
  error: {
    message,
    code,
  },
});
