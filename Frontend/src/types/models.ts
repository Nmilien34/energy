// User types
export interface User {
  id: string;
  email: string;
  username: string;
  profilePicture?: string | null;
  googleId?: string;
  youtubeChannelId?: string;
  createdAt: string;
  lastLogin: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Song types
export interface Song {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  thumbnailHd: string;
  viewCount: number;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  description: string;
  tags: string[];
  playCount: number;
  createdAt: string;
  updatedAt: string;
  audioSource?: 's3' | 'youtube' | 'cache';  // Where audio is from
  isCached?: boolean;                        // Whether song is cached in S3
  // Search match quality indicators (optional, from backend)
  matchScore?: number;                      // Match quality score (0-100)
  durationDelta?: number;                   // Duration difference from query
  isBestMatch?: boolean;                    // Whether this is the best match
}

// Artist types
export interface Artist {
  name: string;
  thumbnail?: string;
  playCount?: number;
  songCount?: number;
  channelId?: string;
  channelTitle?: string;
}

export interface SearchResult {
  songs: Song[];
  total: number;
  query: string;
  type: string;
}

export interface AudioStream {
  audioUrl: string;
  expiresAt: string;
  format?: 'stream' | 'embed' | 'proxy';
  isEmbed?: boolean;
  youtubeId?: string;
  audioSource?: 's3' | 'youtube' | 'cache';  // Where audio is from
  isCached?: boolean;                        // Whether song is cached in S3
  quality?: string;                          // Audio quality
}

// Playlist types
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  owner: User | string; // Can be a User object or just an ID
  songs: Song[];
  isPublic: boolean;
  isCollaborative: boolean;
  collaborators: (User | string)[]; // Can be User objects or IDs
  followers: (User | string)[]; // Can be User objects or IDs
  tags: string[];
  playCount: number;
  lastPlayed?: string;
  youtubePlaylistId?: string;
  importedAt?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  isCollaborative?: boolean;
}

// YouTube integration types
export interface YouTubeProfile {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
  privacy: string;
  channelTitle: string;
  publishedAt: string;
}

export interface YouTubeVideo {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  position: number;
}

export interface ImportPlaylistRequest {
  youtubePlaylistId: string;
  customName?: string;
}

// User library types
export interface UserLibrary {
  favorites: Song[];
  recentlyPlayed: Song[];
  playlists: Playlist[];
}

// Player state types
export interface YouTubeMode {
  isYoutube: boolean;
  youtubeId?: string;
  embedUrl?: string;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  queue: Song[];
  currentIndex: number;
  volume: number;
  duration: number;
  currentTime: number;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
  shuffleSource: Song[];
  youtubeMode?: YouTubeMode;
}

// Share types
export interface Share {
  id: string;
  shareId: string;
  type: 'playlist' | 'song';
  owner: {
    id: string;
    username: string;
    profilePicture?: string;
  };
  playlist?: string;
  song?: string;
  title: string;
  description?: string;
  thumbnail?: string;
  viewCount: number;
  playCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShareContent {
  share: Share;
  type: 'playlist' | 'song';
  content: Playlist | Song;
}

export interface AnonymousSession {
  sessionId: string;
  playCount: number;
  canPlayMore: boolean;
  hasReachedLimit: boolean;
  remainingPlays?: number;
  songsPlayed?: string[];
}

export interface CreateShareResponse {
  shareId: string;
  shareUrl: string;
  share: Share;
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requiresAuth?: boolean;
} 