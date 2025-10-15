import api from './api';
import axios from 'axios';
import {
  ApiResponse,
  CreateShareResponse,
  ShareContent,
  AnonymousSession,
  Share
} from '../types/models';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003';

// Create a separate axios instance for anonymous share requests (no auth interceptor)
const publicApi = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Create a share link for a playlist
 */
export const createPlaylistShare = async (playlistId: string): Promise<CreateShareResponse> => {
  const response = await api.post<ApiResponse<CreateShareResponse>>(
    `/api/share/playlist/${playlistId}`
  );
  return response.data.data!;
};

/**
 * Create a share link for a song
 */
export const createSongShare = async (songId: string): Promise<CreateShareResponse> => {
  const response = await api.post<ApiResponse<CreateShareResponse>>(
    `/api/share/song/${songId}`
  );
  return response.data.data!;
};

/**
 * Get shared content (public - no auth required)
 */
export const getSharedContent = async (shareId: string): Promise<ShareContent> => {
  const response = await publicApi.get<ApiResponse<ShareContent>>(
    `/api/share/${shareId}`
  );
  return response.data.data!;
};

/**
 * Initialize anonymous session
 */
export const initializeAnonymousSession = async (
  shareId: string,
  existingSessionId?: string
): Promise<AnonymousSession> => {
  const response = await publicApi.post<ApiResponse<AnonymousSession>>(
    `/api/share/${shareId}/session`,
    { existingSessionId }
  );
  return response.data.data!;
};

/**
 * Track song play for anonymous session
 */
export const trackAnonymousPlay = async (
  shareId: string,
  sessionId: string,
  songId: string
): Promise<AnonymousSession> => {
  const response = await publicApi.post<ApiResponse<AnonymousSession>>(
    `/api/share/${shareId}/play`,
    { sessionId, songId }
  );
  return response.data.data!;
};

/**
 * Check session status
 */
export const checkSessionStatus = async (
  shareId: string,
  sessionId: string
): Promise<AnonymousSession> => {
  const response = await publicApi.get<ApiResponse<AnonymousSession>>(
    `/api/share/${shareId}/session/${sessionId}`
  );
  return response.data.data!;
};

/**
 * Delete a share link (authenticated)
 */
export const deleteShare = async (shareId: string): Promise<void> => {
  await api.delete(`/api/share/${shareId}`);
};

/**
 * Get user's share links (authenticated)
 */
export const getUserShares = async (): Promise<Share[]> => {
  const response = await api.get<ApiResponse<Share[]>>('/api/share/my/shares');
  return response.data.data!;
};

/**
 * Store session ID in localStorage
 */
export const storeSessionId = (shareId: string, sessionId: string): void => {
  localStorage.setItem(`share_session_${shareId}`, sessionId);
};

/**
 * Get session ID from localStorage
 */
export const getStoredSessionId = (shareId: string): string | null => {
  return localStorage.getItem(`share_session_${shareId}`);
};

/**
 * Remove session ID from localStorage
 */
export const removeStoredSessionId = (shareId: string): void => {
  localStorage.removeItem(`share_session_${shareId}`);
};
