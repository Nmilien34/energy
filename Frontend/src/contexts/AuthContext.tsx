import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { SESSION_EXPIRED_EVENT } from '../services/api';
import { User } from '../types/models';

// Key for storing last logged in user info (for "Continue as" flow)
const LAST_USER_KEY = 'lastLoggedInUser';

// Session expiry reasons
type SessionExpiredReason = 'token_expired' | 'invalid_token' | 'user_not_found' | null;

// Stored user info for "Continue as" flow
interface LastLoggedInUser {
  email: string;
  username: string;
  profilePicture?: string | null;
  lastLoginAt: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  sessionExpiredReason: SessionExpiredReason;
  lastLoggedInUser: LastLoggedInUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  handleOAuthCallback: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearSessionExpired: () => void;
  continueAsLastUser: (password: string) => Promise<void>;
  clearLastLoggedInUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get stored last user
const getLastLoggedInUser = (): LastLoggedInUser | null => {
  try {
    const stored = localStorage.getItem(LAST_USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Clear if older than 30 days
    if (Date.now() - parsed.lastLoginAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(LAST_USER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

// Helper to save last user
const saveLastLoggedInUser = (user: User) => {
  try {
    const data: LastLoggedInUser = {
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture,
      lastLoginAt: Date.now()
    };
    localStorage.setItem(LAST_USER_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredReason, setSessionExpiredReason] = useState<SessionExpiredReason>(null);
  const [lastLoggedInUser, setLastLoggedInUser] = useState<LastLoggedInUser | null>(getLastLoggedInUser);

  // Handle session expired event
  const handleSessionExpired = useCallback((event: CustomEvent) => {
    const { reason } = event.detail;
    console.log('[AuthContext] Session expired:', reason);

    setUser(null);
    setSessionExpired(true);
    setSessionExpiredReason(reason);
    setLoading(false);
  }, []);

  // Listen for session expired events
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);
    };
  }, [handleSessionExpired]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            saveLastLoggedInUser(currentUser);
          } else {
            localStorage.removeItem('token');
            // Don't set session expired here - this is initial load, not an expiry
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        localStorage.removeItem('token');
        // The API interceptor will dispatch session expired event if it was a 401
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setSessionExpired(false);
      setSessionExpiredReason(null);

      const response = await authService.login({ email, password });

      if (!response.user) {
        throw new Error('No user data received');
      }

      setUser(response.user);
      saveLastLoggedInUser(response.user);
      setLastLoggedInUser({
        email: response.user.email,
        username: response.user.username,
        profilePicture: response.user.profilePicture,
        lastLoginAt: Date.now()
      });
    } catch (err: any) {
      console.error('Login error in context:', err);
      setError(err.message || 'Failed to login');
      throw err;
    }
  };

  // Quick login for returning users
  const continueAsLastUser = async (password: string) => {
    if (!lastLoggedInUser) {
      throw new Error('No previous user found');
    }
    await login(lastLoggedInUser.email, password);
  };

  // Clear last logged in user (user wants to use different account)
  const clearLastLoggedInUser = () => {
    localStorage.removeItem(LAST_USER_KEY);
    setLastLoggedInUser(null);
  };

  // Clear session expired state
  const clearSessionExpired = () => {
    setSessionExpired(false);
    setSessionExpiredReason(null);
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      setError(null);
      setSessionExpired(false);
      setSessionExpiredReason(null);

      const response = await authService.register({ email, username, password });

      if (!response.user) {
        throw new Error('No user data received');
      }

      setUser(response.user);
      saveLastLoggedInUser(response.user);
      setLastLoggedInUser({
        email: response.user.email,
        username: response.user.username,
        profilePicture: response.user.profilePicture,
        lastLoginAt: Date.now()
      });
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
      setSessionExpired(false);
      setSessionExpiredReason(null);

      const user = await authService.handleOAuthCallback(token);
      if (user) {
        setUser(user);
        saveLastLoggedInUser(user);
        setLastLoggedInUser({
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture,
          lastLoginAt: Date.now()
        });
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
        sessionExpired,
        sessionExpiredReason,
        lastLoggedInUser,
        login,
        register,
        loginWithGoogle,
        handleOAuthCallback,
        logout,
        clearError,
        clearSessionExpired,
        continueAsLastUser,
        clearLastLoggedInUser,
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