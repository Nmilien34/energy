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
  const initSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have an existing session in localStorage
      const existingSessionId = getStoredSessionId();

      // Initialize session (will create new or retrieve existing)
      const sessionData = await initializeAnonymousSession(existingSessionId || undefined);

      // Store the session ID
      storeSessionId(sessionData.sessionId);
      setSession(sessionData);
    } catch (err: any) {
      console.error('Failed to initialize session:', err);
      setError(err.response?.data?.error || 'Failed to initialize session');

      // If session not found or expired, clear stored session and try again
      if (err.response?.status === 404 || err.response?.status === 410) {
        removeStoredSessionId();
        try {
          const sessionData = await initializeAnonymousSession();
          storeSessionId(sessionData.sessionId);
          setSession(sessionData);
          setError(null);
        } catch (retryErr: any) {
          console.error('Failed to create new session:', retryErr);
        }
      }
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

