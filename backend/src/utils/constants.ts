// HTTP Status Codes
export const STATUS_CODES = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// API Error Messages
export const ERROR_MESSAGES = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'Authentication required',
  INVALID_CREDENTIALS: 'Invalid credentials',
  PERMISSION_DENIED: 'Permission denied',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',

  // Validation
  VALIDATION_ERROR: 'Validation error',
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  INVALID_ID: 'Invalid ID format',

  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  USERNAME_ALREADY_EXISTS: 'Username already exists',

  // Songs
  SONG_NOT_FOUND: 'Song not found',
  SONG_UNAVAILABLE: 'Song is not available for streaming',
  AUDIO_STREAM_ERROR: 'Failed to get audio stream',
  YOUTUBE_API_ERROR: 'YouTube API error',
  SEARCH_FAILED: 'Search failed',

  // Playlists
  PLAYLIST_NOT_FOUND: 'Playlist not found',
  PLAYLIST_CREATE_FAILED: 'Failed to create playlist',
  PLAYLIST_UPDATE_FAILED: 'Failed to update playlist',
  PLAYLIST_DELETE_FAILED: 'Failed to delete playlist',
  PLAYLIST_NAME_REQUIRED: 'Playlist name is required',
  ONLY_OWNER_CAN_DELETE: 'Only playlist owner can delete',
  CANNOT_FOLLOW_PRIVATE: 'Cannot follow private playlist',
  SHARE_TOKEN_GENERATION_FAILED: 'Failed to generate share token',
  SHARED_PLAYLIST_NOT_FOUND: 'Shared playlist not found or token expired',

  // User Library
  LIBRARY_ERROR: 'Library operation failed',
  FAVORITES_ERROR: 'Failed to manage favorites',
  HISTORY_ERROR: 'Failed to manage listening history',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  YOUTUBE_QUOTA_EXCEEDED: 'YouTube API quota exceeded',

  // General
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  NETWORK_ERROR: 'Network error occurred',
  DATABASE_ERROR: 'Database operation failed',
  CACHE_ERROR: 'Cache operation failed'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTER_SUCCESS: 'Registration successful',

  // Songs
  SONG_FOUND: 'Song retrieved successfully',
  SEARCH_SUCCESS: 'Search completed successfully',
  PLAY_RECORDED: 'Play recorded successfully',

  // Playlists
  PLAYLIST_CREATED: 'Playlist created successfully',
  PLAYLIST_UPDATED: 'Playlist updated successfully',
  PLAYLIST_DELETED: 'Playlist deleted successfully',
  SONG_ADDED_TO_PLAYLIST: 'Song added to playlist',
  SONG_REMOVED_FROM_PLAYLIST: 'Song removed from playlist',
  PLAYLIST_REORDERED: 'Playlist songs reordered',
  PLAYLIST_FOLLOWED: 'Playlist followed',
  PLAYLIST_UNFOLLOWED: 'Playlist unfollowed',
  SHARE_TOKEN_GENERATED: 'Share token generated',

  // User Library
  ADDED_TO_FAVORITES: 'Added to favorites',
  REMOVED_FROM_FAVORITES: 'Removed from favorites',
  LIBRARY_UPDATED: 'Library updated successfully'
} as const;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
  error?: string;
}

// YouTube API Constants
export const YOUTUBE_CONSTANTS = {
  MAX_SEARCH_RESULTS: 50,
  DEFAULT_SEARCH_RESULTS: 20,
  MAX_PLAYLIST_SONGS: 1000,
  AUDIO_URL_CACHE_DURATION: 6 * 60 * 60 * 1000, // 6 hours
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second

  // Video duration limits (in seconds)
  MIN_DURATION: 30,
  MAX_DURATION: 1200, // 20 minutes

  // Quality options
  QUALITY_OPTIONS: ['low', 'medium', 'high'] as const
} as const;

// Rate Limiting Constants
export const RATE_LIMITS = {
  SEARCH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  STREAM: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 // requests per window
  },
  PLAYLIST: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // requests per window
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20 // requests per window for failed attempts (increased for development)
  }
} as const;

// Cache Constants
export const CACHE_KEYS = {
  TRENDING_SONGS: 'trending:songs',
  POPULAR_SONGS: 'popular:songs',
  SEARCH_RESULTS: 'search:results',
  SONG_METADATA: 'song:metadata',
  PLAYLIST_DATA: 'playlist:data',
  USER_LIBRARY: 'user:library'
} as const;

export const CACHE_TTL = {
  TRENDING_SONGS: 30 * 60, // 30 minutes
  POPULAR_SONGS: 60 * 60, // 1 hour
  SEARCH_RESULTS: 15 * 60, // 15 minutes
  SONG_METADATA: 24 * 60 * 60, // 24 hours
  PLAYLIST_DATA: 5 * 60, // 5 minutes
  USER_LIBRARY: 2 * 60 // 2 minutes
} as const;

// Validation Constants
export const VALIDATION_RULES = {
  PLAYLIST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100
  },
  PLAYLIST_DESCRIPTION: {
    MAX_LENGTH: 500
  },
  SEARCH_QUERY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
  }
} as const;

// File and Media Constants
export const MEDIA_CONSTANTS = {
  SUPPORTED_AUDIO_FORMATS: ['webm', 'mp4', 'm4a', 'ogg'] as const,
  THUMBNAIL_SIZES: {
    SMALL: { width: 120, height: 90 },
    MEDIUM: { width: 320, height: 180 },
    HIGH: { width: 480, height: 360 },
    STANDARD: { width: 640, height: 480 },
    MAXRES: { width: 1280, height: 720 }
  }
} as const;

// Environment Constants
export const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
} as const;

// Default Values
export const DEFAULTS = {
  PAGINATION: {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100
  },
  USER_PREFERENCES: {
    AUTOPLAY: true,
    SHUFFLE: false,
    REPEAT: 'none' as const,
    VOLUME: 80,
    QUALITY: 'medium' as const,
    CROSSFADE: 0
  }
} as const;

// Helper function to create standardized API responses
export const createResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString()
});

export const createPaginatedResponse = <T>(
  items: T[],
  total: number,
  page?: number,
  limit?: number
): PaginatedResponse<T> => ({
  success: true,
  data: {
    items,
    total,
    page,
    limit,
    hasMore: page && limit ? (page * limit) < total : false
  }
});

// Error classes for better error handling
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = STATUS_CODES.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.VALIDATION_ERROR) {
    super(message, STATUS_CODES.BAD_REQUEST);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.AUTH_REQUIRED) {
    super(message, STATUS_CODES.UNAUTHORIZED);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.PERMISSION_DENIED) {
    super(message, STATUS_CODES.FORBIDDEN);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not found') {
    super(message, STATUS_CODES.NOT_FOUND);
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED) {
    super(message, STATUS_CODES.TOO_MANY_REQUESTS);
  }
}