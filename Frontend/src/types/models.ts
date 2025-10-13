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
  youtubeMode?: YouTubeMode;
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
} 