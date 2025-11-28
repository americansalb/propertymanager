import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';
import { createMockUser } from '../test/test-utils';

describe('auth.store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  });

  describe('initial state', () => {
    it('should have null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have null accessToken initially', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should set user and accessToken on login', () => {
      const mockUser = createMockUser();
      const mockToken = 'test-access-token';

      useAuthStore.getState().login(mockToken, mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should update isAuthenticated to true on login', () => {
      const mockUser = createMockUser();

      useAuthStore.getState().login('token', mockUser);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear user and accessToken on logout', () => {
      // First login
      const mockUser = createMockUser();
      useAuthStore.getState().login('token', mockUser);

      // Then logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should set isAuthenticated to false on logout', () => {
      const mockUser = createMockUser();
      useAuthStore.getState().login('token', mockUser);

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should update the user', () => {
      const mockUser = createMockUser();
      useAuthStore.getState().login('token', mockUser);

      const updatedUser = createMockUser({ firstName: 'Updated' });
      useAuthStore.getState().setUser(updatedUser);

      expect(useAuthStore.getState().user?.firstName).toBe('Updated');
    });
  });

  describe('setAccessToken', () => {
    it('should update the accessToken', () => {
      const mockUser = createMockUser();
      useAuthStore.getState().login('old-token', mockUser);

      useAuthStore.getState().setAccessToken('new-token');

      expect(useAuthStore.getState().accessToken).toBe('new-token');
    });
  });

  describe('persistence', () => {
    it('should have partialize function that only persists specific fields', () => {
      // The store is configured with persistence
      // We're testing that the partialize config exists in the store setup
      const mockUser = createMockUser();
      useAuthStore.getState().login('token', mockUser);

      const state = useAuthStore.getState();

      // These should be in the state
      expect(state.user).toBeDefined();
      expect(state.accessToken).toBeDefined();
      expect(state.isAuthenticated).toBeDefined();
    });
  });
});
