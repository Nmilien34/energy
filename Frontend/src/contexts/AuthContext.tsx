import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User } from '../types/models';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  handleOAuthCallback: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await authService.login({ email, password });
      
      if (!response.user) {
        throw new Error('No user data received');
      }
      
      setUser(response.user);
    } catch (err: any) {
      console.error('Login error in context:', err);
      setError(err.message || 'Failed to login');
      throw err;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      setError(null);
      const response = await authService.register({ email, username, password });
      
      if (!response.user) {
        throw new Error('No user data received');
      }
      
      setUser(response.user);
    } catch (err: any) {
      console.error('Register error in context:', err);
      setError(err.message || 'Failed to register');
      throw err;
    }
  };

  const loginWithGoogle = () => {
    try {
      setError(null);
      authService.initiateGoogleLogin();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google login');
      throw err;
    }
  };

  const handleOAuthCallback = async (token: string) => {
    try {
      setError(null);
      setLoading(true);
      const user = await authService.handleOAuthCallback(token);
      if (user) {
        setUser(user);
      } else {
        throw new Error('Failed to get user data after OAuth login');
      }
    } catch (err: any) {
      console.error('OAuth callback error in context:', err);
      setError(err.message || 'Failed to complete Google login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('token');
      localStorage.clear(); // Clear all localStorage data
      sessionStorage.clear(); // Clear all sessionStorage data

      // Navigate to home page
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to logout');
      // Even if logout fails, clear local data and redirect
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        loginWithGoogle,
        handleOAuthCallback,
        logout,
        clearError,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 