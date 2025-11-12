import { authApiClient, setTokens, clearTokens } from './api-client';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
} from '../types';

export const authService = {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authApiClient.post<AuthResponse>('/auth/login', credentials);
    const { tokens } = response.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    return response.data;
  },

  // Register
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await authApiClient.post<AuthResponse>('/auth/register', data);
    const { tokens } = response.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    return response.data;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await authApiClient.post('/auth/logout');
    } finally {
      clearTokens();
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await authApiClient.get<User>('/auth/me');
    return response.data;
  },

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await authApiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    const { tokens } = response.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    return response.data;
  },

  // Update profile
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await authApiClient.patch<User>('/auth/profile', data);
    return response.data;
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await authApiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    await authApiClient.post('/auth/forgot-password', { email });
  },

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await authApiClient.post('/auth/reset-password', { token, newPassword });
  },
};
