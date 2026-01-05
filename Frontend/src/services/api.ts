import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003';

// Session expiry event - components can listen to this
export const SESSION_EXPIRED_EVENT = 'session:expired';

// Track if we're currently retrying to prevent loops
let isRetrying = false;

// Dispatch session expired event with reason
export const dispatchSessionExpired = (reason: 'token_expired' | 'invalid_token' | 'user_not_found') => {
  const event = new CustomEvent(SESSION_EXPIRED_EVENT, {
    detail: { reason, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
};

// Check if token is expiring soon (within 1 hour)
export const isTokenExpiringSoon = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const oneHourFromNow = Date.now() + (60 * 60 * 1000);
    return expiresAt < oneHourFromNow;
  } catch {
    return false;
  }
};

// Get token expiry time
export const getTokenExpiryTime = (): Date | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
};

// Check if error is retryable (timeout or network error)
const isRetryableError = (error: AxiosError): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ETIMEDOUT' ||
    !error.response
  );
};

// Sleep helper for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 60000, // 60 second timeout (handles Render cold starts)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  response => {
    // If the response includes a new token, store it
    const token = response.data?.token || response.headers?.authorization;
    if (token) {
      localStorage.setItem('token', token.replace('Bearer ', ''));
    }
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // Retry logic for timeout/network errors (handles Render cold starts)
    if (isRetryableError(error) && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    if (isRetryableError(error) && originalRequest._retryCount < 2) {
      originalRequest._retryCount++;
      console.log(`[API] Retrying request (attempt ${originalRequest._retryCount}/2): ${originalRequest.url}`);

      // Wait before retrying (exponential backoff)
      await sleep(1000 * originalRequest._retryCount);

      return api(originalRequest);
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const requestUrl = originalRequest?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/login') ||
                             requestUrl.includes('/auth/register') ||
                             requestUrl.includes('/auth/oauth');

      // Only dispatch session expired if:
      // 1. User had a token (was logged in)
      // 2. This is NOT a login/register attempt (those should just fail normally)
      const hadToken = localStorage.getItem('token') !== null;

      if (hadToken && !isAuthEndpoint) {
        const errorMessage = error.response?.data?.error || '';

        // Determine the reason for the 401
        let reason: 'token_expired' | 'invalid_token' | 'user_not_found' = 'invalid_token';
        if (errorMessage.toLowerCase().includes('expired')) {
          reason = 'token_expired';
        } else if (errorMessage.toLowerCase().includes('not found')) {
          reason = 'user_not_found';
        }

        // Clear the invalid token
        localStorage.removeItem('token');

        // Dispatch session expired event so UI can react
        dispatchSessionExpired(reason);

        // Don't redirect here - let the AuthContext handle it
        // This prevents the gray loading page issue
      }
    }

    return Promise.reject(error);
  }
);

export default api; 