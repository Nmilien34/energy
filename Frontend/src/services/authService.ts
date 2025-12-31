import api from './api';
import { User, LoginCredentials, RegisterCredentials, AuthResponse, ApiResponse } from '../types/models';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<User & { token: string }>>('/api/auth/login', credentials);
      
      // Check if we have a response
      if (!response.data) {
        throw new Error('No response received from server');
      }

      // Check success flag
      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed');
      }

      // Check if we have the data object
      if (!response.data.data) {
        throw new Error('No data received from server');
      }

      const userData = response.data.data;
      const { token, ...user } = userData;
      
      // Validate user and token
      if (!user || !token) {
        throw new Error('Invalid response structure from server');
      }

      localStorage.setItem('token', token);
      return { user, token };
    } catch (error: any) {
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('Login timeout:', error);
        throw new Error('Login request timed out. Please check your connection and try again.');
      }
      
      // Handle network errors
      if (error.code === 'ERR_NETWORK' || !error.response) {
        console.error('Network error during login:', error);
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Handle HTTP errors
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      const statusCode = error.response?.status;
      
      console.error('Login error:', {
        status: statusCode,
        error: errorMessage,
        fullError: error.response?.data,
        message: error.message
      });
      
      // Provide more specific error messages based on status code
      if (statusCode === 500) {
        throw new Error('Server error during login. Please try again later or contact support.');
      } else if (statusCode === 401) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else {
        throw new Error(errorMessage);
      }
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<User & { token: string }>>('/api/auth/register', credentials);
      
      // Check if we have a response
      if (!response.data) {
        throw new Error('No response received from server');
      }

      // Check success flag
      if (!response.data.success) {
        throw new Error(response.data.error || 'Registration failed');
      }

      // Check if we have the data object
      if (!response.data.data) {
        throw new Error('No data received from server');
      }

      const userData = response.data.data;
      const { token, ...user } = userData;
      
      // Validate user and token
      if (!user || !token) {
        throw new Error('Invalid response structure from server');
      }

      localStorage.setItem('token', token);
      return { user, token };
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Registration failed');
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

  // Google OAuth methods
  initiateGoogleLogin(): void {
    // Redirect to Google OAuth endpoint
    window.location.href = `${api.defaults.baseURL}/api/auth/oauth/google`;
  }

  async handleOAuthCallback(token: string): Promise<User | null> {
    try {
      if (!token) {
        throw new Error('No token received from OAuth callback');
      }

      // Store the token
      localStorage.setItem('token', token);

      // Fetch user data
      const user = await this.getCurrentUser();
      return user;
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      localStorage.removeItem('token');
      throw new Error('Failed to complete Google login');
    }
  }
}

export const authService = new AuthService(); 