import axios from 'axios';
import { ApiResponse, AnonymousSession, SearchResult, Song } from '../types/models';
import { decodeHtmlEntities } from '../utils/htmlEntities';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003';

// Create a separate axios instance for anonymous requests (no auth interceptor)
export const publicApi = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000
});

const SESSION_STORAGE_KEY = 'anonymous_session_id';

/**
 * Initialize anonymous session for landing page
 */
export const initializeAnonymousSession = async (
  existingSessionId?: string
): Promise<AnonymousSession> => {
  const response = await publicApi.post<ApiResponse<AnonymousSession>>(
    `/api/anonymous/session`,
    { existingSessionId }
  );
  return response.data.data!;
};

/**
 * Track song play for anonymous session
 */
export const trackAnonymousPlay = async (
  sessionId: string,
  songId: string
): Promise<AnonymousSession> => {
  const response = await publicApi.post<ApiResponse<AnonymousSession>>(
    `/api/anonymous/play`,
    { sessionId, songId }
  );
  return response.data.data!;
};

/**
 * Check session status
 */
export const checkSessionStatus = async (
  sessionId: string
): Promise<AnonymousSession> => {
  const response = await publicApi.get<ApiResponse<AnonymousSession>>(
    `/api/anonymous/session/${sessionId}`
  );
  return response.data.data!;
};

/**
 * Store session ID in localStorage
 */
export const storeSessionId = (sessionId: string): void => {
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
};

/**
 * Get session ID from localStorage
 */
export const getStoredSessionId = (): string | null => {
  return localStorage.getItem(SESSION_STORAGE_KEY);
};

/**
 * Remove session ID from localStorage
 */
export const removeStoredSessionId = (): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

/**
 * Public music search (no auth required)
 */
export const searchMusicPublic = async (
  query: string,
  type = 'song',
  limit = 20
): Promise<ApiResponse<SearchResult>> => {
  const response = await publicApi.get<ApiResponse<SearchResult>>(
    `/api/music/search/public?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
  );

  // Decode and filter
  if (response.data.success && response.data.data?.songs) {
    const lowerQuery = query.toLowerCase().trim();
    response.data.data.songs = response.data.data.songs.map((song: Song) => ({
      ...song,
      title: decodeHtmlEntities(song.title),
      artist: decodeHtmlEntities(song.artist),
      channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
      description: song.description ? decodeHtmlEntities(song.description) : song.description,
    })).filter((song: Song) => {
      if (!lowerQuery) return true;
      return song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery);
    });
  }

  return response.data;
};

