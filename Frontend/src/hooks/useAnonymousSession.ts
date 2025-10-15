import { useState, useEffect, useCallback } from 'react';
import {
  initializeAnonymousSession,
  trackAnonymousPlay,
  checkSessionStatus,
  getStoredSessionId,
  storeSessionId,
  removeStoredSessionId
} from '../services/shareService';
import { AnonymousSession } from '../types/models';

interface UseAnonymousSessionReturn {
  session: AnonymousSession | null;
  isLoading: boolean;
  error: string | null;
  trackPlay: (songId: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
}

export const useAnonymousSession = (shareId: string | null): UseAnonymousSessionReturn => {
  const [session, setSession] = useState<AnonymousSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize or retrieve session
  const initSession = useCallback(async () => {
    if (!shareId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if we have an existing session in localStorage
      const existingSessionId = getStoredSessionId(shareId);

      // Initialize session (will create new or retrieve existing)
      const sessionData = await initializeAnonymousSession(shareId, existingSessionId || undefined);

      // Store the session ID
      storeSessionId(shareId, sessionData.sessionId);
      setSession(sessionData);
    } catch (err: any) {
      console.error('Failed to initialize session:', err);
      setError(err.response?.data?.error || 'Failed to initialize session');

      // If session not found or expired, clear stored session and try again
      if (err.response?.status === 404 || err.response?.status === 410) {
        removeStoredSessionId(shareId);
        try {
          const sessionData = await initializeAnonymousSession(shareId);
          storeSessionId(shareId, sessionData.sessionId);
          setSession(sessionData);
          setError(null);
        } catch (retryErr: any) {
          console.error('Failed to create new session:', retryErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [shareId]);

  // Track a song play
  const trackPlay = useCallback(async (songId: string): Promise<boolean> => {
    if (!shareId || !session) {
      console.error('No session available');
      return false;
    }

    try {
      const updatedSession = await trackAnonymousPlay(shareId, session.sessionId, songId);
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
        removeStoredSessionId(shareId);
        await initSession();
      }

      return false;
    }
  }, [shareId, session, initSession]);

  // Refresh session status
  const refreshSession = useCallback(async () => {
    if (!shareId || !session) {
      return;
    }

    try {
      const sessionData = await checkSessionStatus(shareId, session.sessionId);
      setSession(sessionData);
    } catch (err: any) {
      console.error('Failed to refresh session:', err);

      // If session expired, reinitialize
      if (err.response?.status === 410 || err.response?.status === 404) {
        removeStoredSessionId(shareId);
        await initSession();
      }
    }
  }, [shareId, session, initSession]);

  // Clear session
  const clearSession = useCallback(() => {
    if (shareId) {
      removeStoredSessionId(shareId);
    }
    setSession(null);
    setError(null);
  }, [shareId]);

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
