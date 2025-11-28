import axios from 'axios';

// Build API URL - append /api/v1 to the base URL if it's set from env
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    // Remove trailing slash if present and append /api/v1
    return `${envUrl.replace(/\/$/, '')}/api/v1`;
  }
  return 'http://localhost:3001/api/v1';
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
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
