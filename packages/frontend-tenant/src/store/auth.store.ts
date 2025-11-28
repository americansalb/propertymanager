'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  leaseId: string | null;
  unitId: string | null;
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
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
          set({
            isLoading: false,
            error: Array.isArray(message) ? message.join(', ') : message,
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
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to send reset email.';
          set({
            isLoading: false,
            error: Array.isArray(message) ? message.join(', ') : message,
          });
          throw error;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/tenant-auth/reset-password', { token, password });
          set({ isLoading: false });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to reset password.';
          set({
            isLoading: false,
            error: Array.isArray(message) ? message.join(', ') : message,
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
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to update profile.';
          set({
            isLoading: false,
            error: Array.isArray(message) ? message.join(', ') : message,
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
    }
  )
);
