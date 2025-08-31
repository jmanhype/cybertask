import { api } from './api';
import { User, LoginCredentials, RegisterData, ApiResponse } from '../types';

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post('/auth/login', credentials);
    // Backend returns {success: true, data: {user: {...}, tokens: {...}}}
    return response.data.data;
  },

  async register(userData: RegisterData) {
    const response = await api.post('/auth/register', userData);
    // Backend returns {success: true, data: {user: {...}, tokens: {...}}}
    return response.data.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    // Backend returns {success: true, data: {user: {...}}}
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};