import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormProps {
  onSuccess: () => void;
  onError: (error: Error) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const {
    login,
    loginWithGoogle,
    sessionExpired,
    sessionExpiredReason,
    lastLoggedInUser,
    clearSessionExpired,
    continueAsLastUser,
    clearLastLoggedInUser,
  } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showContinueAs, setShowContinueAs] = useState(!!lastLoggedInUser);
  const [continuePassword, setContinuePassword] = useState('');

  // Pre-fill email if we have a last logged in user and they're not using "Continue as"
  useEffect(() => {
    if (lastLoggedInUser && !showContinueAs) {
      setFormData(prev => ({ ...prev, email: lastLoggedInUser.email }));
    }
  }, [lastLoggedInUser, showContinueAs]);

  // Clear session expired when component mounts (user is back on login page)
  useEffect(() => {
    if (sessionExpired) {
      // Don't clear immediately - let the message show
      const timer = setTimeout(() => {
        clearSessionExpired();
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, clearSessionExpired]);

  // Get session expired message
  const getSessionExpiredMessage = () => {
    switch (sessionExpiredReason) {
      case 'token_expired':
        return 'Your session has expired. Please log in again to continue.';
      case 'invalid_token':
        return 'Your session is no longer valid. Please log in again.';
      case 'user_not_found':
        return 'Account not found. Please log in again.';
      default:
        return 'You have been logged out. Please log in again.';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      onSuccess();
    } catch (error: any) {
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      loginWithGoogle();
    } catch (error: any) {
      onError(error);
    }
  };

  // Handle "Continue as" login
  const handleContinueAs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastLoggedInUser) return;

    setIsLoading(true);
    try {
      await continueAsLastUser(continuePassword);
      await new Promise(resolve => setTimeout(resolve, 100));
      onSuccess();
    } catch (error: any) {
      onError(error);
      setContinuePassword('');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to different account
  const handleUseDifferentAccount = () => {
    setShowContinueAs(false);
    clearLastLoggedInUser();
    setFormData({ email: '', password: '', rememberMe: false });
  };

  // If we have a returning user, show "Continue as" option
  if (showContinueAs && lastLoggedInUser) {
    return (
      <div className="space-y-4">
        {/* Session Expired Notice */}
        {sessionExpired && (
          <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-amber-500 text-sm font-medium">Session Expired</p>
                <p className="text-amber-400/80 text-sm mt-1">{getSessionExpiredMessage()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Back Card */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
            {lastLoggedInUser.profilePicture ? (
              <img
                src={lastLoggedInUser.profilePicture}
                alt={lastLoggedInUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {lastLoggedInUser.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">Welcome back!</h3>
          <p className="text-zinc-400 text-sm mt-1">{lastLoggedInUser.username}</p>
          <p className="text-zinc-500 text-xs">{lastLoggedInUser.email}</p>
        </div>

        {/* Continue As Form */}
        <form onSubmit={handleContinueAs} className="space-y-4">
          <div>
            <label htmlFor="continuePassword" className="block text-sm font-medium text-[var(--text-secondary)]">
              Enter your password to continue
            </label>
            <input
              type="password"
              id="continuePassword"
              value={continuePassword}
              onChange={(e) => setContinuePassword(e.target.value)}
              className="mt-1 block w-full rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !continuePassword}
            className="w-full rounded-md bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              `Continue as ${lastLoggedInUser.username}`
            )}
          </button>
        </form>

        {/* Use Different Account */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-zinc-900 text-zinc-400">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseDifferentAccount}
          className="w-full text-center text-sm text-zinc-400 hover:text-white transition-colors py-2"
        >
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Expired Notice */}
      {sessionExpired && (
        <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-amber-500 text-sm font-medium">Session Expired</p>
              <p className="text-amber-400/80 text-sm mt-1">{getSessionExpiredMessage()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Google Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center px-4 py-2 border border-zinc-600 rounded-md bg-white text-zinc-900 font-medium hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
      >
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-zinc-900 text-zinc-400">Or continue with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)]">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="rememberMe"
          name="rememberMe"
          checked={formData.rememberMe}
          onChange={handleChange}
          className="h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-blue-500 focus:ring-blue-500"
          disabled={isLoading}
        />
        <label htmlFor="rememberMe" className="ml-2 block text-sm text-[var(--text-secondary)]">
          Remember me
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging in...
          </span>
        ) : (
          'Log in'
        )}
      </button>
      </form>
    </div>
  );
};

export default LoginForm; 