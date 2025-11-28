import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AuthUser } from '@propertymaster/shared';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (accessToken, user) => {
        set({
          accessToken,
          user,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      setUser: (user) => {
        set({ user });
      },

      setAccessToken: (accessToken) => {
        set({ accessToken });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user and accessToken - refresh token is in httpOnly cookie
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
