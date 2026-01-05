import { useState, useEffect, useCallback } from 'react';
import {
  initializeAnonymousSession,
  trackAnonymousPlay,
  checkSessionStatus,
  getStoredSessionId,
  storeSessionId,
  removeStoredSessionId
} from '../services/anonymousSessionService';
import { AnonymousSession } from '../types/models';

interface UseAnonymousLandingSessionReturn {
  session: AnonymousSession | null;
  isLoading: boolean;
  error: string | null;
  trackPlay: (songId: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
}

export const useAnonymousLandingSession = (): UseAnonymousLandingSessionReturn => {
  const [session, setSession] = useState<AnonymousSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize or retrieve session
  const initSession = useCallback(async (retryCount = 0) => {
    const maxRetries = 2;

    try {
      setIsLoading(true);
      setError(null);

      // Check if we have an existing session in localStorage
      const existingSessionId = getStoredSessionId();
      console.log('[AnonSession] Initializing session, existing ID:', existingSessionId);

      // Initialize session (will create new or retrieve existing)
      const sessionData = await initializeAnonymousSession(existingSessionId || undefined);
      console.log('[AnonSession] Session initialized:', sessionData?.sessionId);

      // Store the session ID
      storeSessionId(sessionData.sessionId);
      setSession(sessionData);
    } catch (err: any) {
      // Only log errors, don't show them to users for anonymous sessions
      // Anonymous sessions are optional - the app should work without them
      console.warn('[AnonSession] Session initialization failed (non-blocking):', err?.message || 'Unknown error');

      // Check if it's a network/timeout error and retry
      const isNetworkError = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';

      if (isNetworkError && retryCount < maxRetries) {
        console.log(`[AnonSession] Retrying in ${(retryCount + 1) * 2}s (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => initSession(retryCount + 1), (retryCount + 1) * 2000);
        return; // Don't set loading to false yet
      }

      // If session not found or expired, clear stored session and try again
      if (err.response?.status === 404 || err.response?.status === 410) {
        removeStoredSessionId();
        try {
          const sessionData = await initializeAnonymousSession();
          storeSessionId(sessionData.sessionId);
          setSession(sessionData);
          setError(null);
        } catch (retryErr: any) {
          // Silent fail - anonymous session is optional
          console.warn('[AnonSession] Could not create session, continuing without it');
        }
      }

      // Don't set error state for network issues - just continue without session
      // This prevents blocking the UI for anonymous users
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Track a song play
  const trackPlay = useCallback(async (songId: string): Promise<boolean> => {
    if (!session) {
      console.error('No session available');
      return false;
    }

    try {
      const updatedSession = await trackAnonymousPlay(session.sessionId, songId);
      setSession(updatedSession);
      return true;
    } catch (err: any) {
      console.error('Failed to track play:', err);

      // If limit reached, return false and let the component handle it
      if (err.response?.data?.requiresAuth) {
        setError('Play limit reached');
        return false;
      }

      // If session expired, try to create a new one
      if (err.response?.status === 410) {
        removeStoredSessionId();
        await initSession();
      }

      return false;
    }
  }, [session, initSession]);

  // Refresh session status
  const refreshSession = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const sessionData = await checkSessionStatus(session.sessionId);
      setSession(sessionData);
    } catch (err: any) {
      console.error('Failed to refresh session:', err);

      // If session expired, reinitialize
      if (err.response?.status === 410 || err.response?.status === 404) {
        removeStoredSessionId();
        await initSession();
      }
    }
  }, [session, initSession]);

  // Clear session
  const clearSession = useCallback(() => {
    removeStoredSessionId();
    setSession(null);
    setError(null);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  return {
    session,
    isLoading,
    error,
    trackPlay,
    refreshSession,
    clearSession
  };
};

