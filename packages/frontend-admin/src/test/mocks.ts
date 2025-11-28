import { vi } from 'vitest';

// Mock zustand auth store
export const mockAuthStore = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  setUser: vi.fn(),
  setAccessToken: vi.fn(),
};

// Mock router navigation
export const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock axios
export const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(() => mockAxios),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

// Mock API service
export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

// Reset all mocks helper
export const resetAllMocks = () => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  mockAuthStore.login.mockReset();
  mockAuthStore.logout.mockReset();
  mockAuthStore.setUser.mockReset();
  mockAuthStore.setAccessToken.mockReset();
};
