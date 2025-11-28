import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, createMockUser } from '../test/test-utils';
import LoginPage from './LoginPage';

// Mock the auth service
const mockLogin = vi.fn();
vi.mock('../services/auth.service', () => ({
  authService: {
    login: (data: { email: string; password: string }) => mockLogin(data),
  },
}));

// Mock the auth store
const mockStoreLogin = vi.fn();
vi.mock('../store/auth.store', () => ({
  useAuthStore: () => ({
    login: mockStoreLogin,
    user: null,
    isAuthenticated: false,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe('LoginPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the login form', () => {
      render(<LoginPage />);

      expect(screen.getByText('PropertyMaster')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your PM Command Center')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render link to register page', () => {
      render(<LoginPage />);

      expect(screen.getByText(/create an account/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should require email and password fields', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    it('should have email type input', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password type input', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('form interaction', () => {
    it('should update email field on input', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field on input', async () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });
  });

  describe('form submission', () => {
    it('should call login service on form submit', async () => {
      const mockUser = createMockUser();
      mockLogin.mockResolvedValue({
        accessToken: 'test-token',
        user: mockUser,
      });

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!',
        });
      });
    });

    it('should call store login and navigate on success', async () => {
      const mockUser = createMockUser();
      mockLogin.mockResolvedValue({
        accessToken: 'test-token',
        user: mockUser,
      });

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockStoreLogin).toHaveBeenCalledWith('test-token', mockUser);
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should display error message on login failure', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state while submitting', async () => {
      // Create a promise that won't resolve immediately
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Button should be disabled during loading
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /signing in/i });
        expect(button).toBeDisabled();
      });

      // Resolve the promise
      resolveLogin!({
        accessToken: 'test-token',
        user: createMockUser(),
      });
    });
  });
});
