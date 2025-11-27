import api from './api';
import {
  type LoginRequest,
  type RegisterRequest,
  type LoginResponse,
  type ApiResponse,
} from '@propertymaster/shared';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return response.data.data!;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
    return response.data.data!;
  },

  async getCurrentUser() {
    const response = await api.get('/users/me');
    return response.data.data;
  },
};
