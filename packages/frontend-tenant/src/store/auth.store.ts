'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

function getErrorMessage(error: unknown, defaultMsg: string): string {
  const apiError = error as ApiErrorResponse;
  const message = apiError.response?.data?.message || defaultMsg;
  return Array.isArray(message) ? message.join(', ') : message;
}

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  leaseId: string | null;
  unitId: string | null;
}

interface InvitationInfo {
  firstName: string;
  lastName: string;
  email: string;
  property: string | null;
  unit: string | null;
}

interface AuthState {
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (data: Partial<Tenant>) => Promise<void>;
  validateInvitation: (token: string) => Promise<InvitationInfo>;
  register: (token: string, password: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      tenant: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/tenant-auth/login', { email, password });
          const { tenant, token } = response.data.data;

          localStorage.setItem('tenant_token', token);
          localStorage.setItem('tenant_user', JSON.stringify(tenant));

          set({
            tenant,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: getErrorMessage(error, 'Login failed. Please check your credentials.'),
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_user');
        set({
          tenant: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      requestPasswordReset: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/tenant-auth/forgot-password', { email });
          set({ isLoading: false });
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: getErrorMessage(error, 'Failed to send reset email.'),
          });
          throw error;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/tenant-auth/reset-password', { token, password });
          set({ isLoading: false });
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: getErrorMessage(error, 'Failed to reset password.'),
          });
          throw error;
        }
      },

      updateProfile: async (data: Partial<Tenant>) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.put('/tenant-auth/profile', data);
          const updatedTenant = response.data.data;
          localStorage.setItem('tenant_user', JSON.stringify(updatedTenant));
          set({
            tenant: updatedTenant,
            isLoading: false,
          });
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: getErrorMessage(error, 'Failed to update profile.'),
          });
          throw error;
        }
      },

      validateInvitation: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/tenant-auth/validate-invitation', { token });
          set({ isLoading: false });
          return response.data.data.tenant as InvitationInfo;
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: getErrorMessage(error, 'Invalid or expired invitation.'),
          });
          throw error;
        }
      },

      register: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/tenant-auth/register', { token, password });
          const { tenant, token: authToken } = response.data.data;

          localStorage.setItem('tenant_token', authToken);
          localStorage.setItem('tenant_user', JSON.stringify(tenant));

          set({
            tenant,
            token: authToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: getErrorMessage(error, 'Registration failed.'),
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tenant-auth-storage',
      partialize: (state) => ({
        tenant: state.tenant,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
