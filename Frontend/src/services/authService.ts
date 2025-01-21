import api from './api';
import { User, LoginCredentials, RegisterCredentials, AuthResponse } from '../types/models';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', credentials);
      if (response.data.success && response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/register', credentials);
      if (response.data.success && response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
      localStorage.removeItem('token');
    } catch (error: any) {
      console.error('Logout failed:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await api.get<{ success: boolean; data: User }>('/api/auth/me');
      return response.data.success ? response.data.data : null;
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService(); 