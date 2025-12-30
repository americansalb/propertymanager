import axios from 'axios';

// Build API URL - use same origin in production (static export)
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser, use same origin (works for both dev and prod)
    return `${window.location.origin}/api/v1`;
  }
  // Fallback for SSR/build time - only used during Next.js build
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return `${envUrl.replace(/\/$/, '')}/api/v1`;
  }
  // This fallback only affects build-time rendering, not runtime
  // Runtime always uses window.location.origin above
  return '/api/v1';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('tenant_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_user');
        window.location.href = '/tenant/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
