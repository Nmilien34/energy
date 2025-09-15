import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, ERROR_MESSAGES, STATUS_CODES } from '../utils/constants';

// Create rate limiters for different endpoints
export const searchRateLimit = rateLimit({
  windowMs: RATE_LIMITS.SEARCH.windowMs,
  max: RATE_LIMITS.SEARCH.max,
  message: {
    success: false,
    error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
    retryAfter: Math.ceil(RATE_LIMITS.SEARCH.windowMs / 1000)
  },
  statusCode: STATUS_CODES.TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false
});

export const streamRateLimit = rateLimit({
  windowMs: RATE_LIMITS.STREAM.windowMs,
  max: RATE_LIMITS.STREAM.max,
  message: {
    success: false,
    error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
    retryAfter: Math.ceil(RATE_LIMITS.STREAM.windowMs / 1000)
  },
  statusCode: STATUS_CODES.TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  // Use default IP-based key generation to handle IPv6 properly
});

export const playlistRateLimit = rateLimit({
  windowMs: RATE_LIMITS.PLAYLIST.windowMs,
  max: RATE_LIMITS.PLAYLIST.max,
  message: {
    success: false,
    error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
    retryAfter: Math.ceil(RATE_LIMITS.PLAYLIST.windowMs / 1000)
  },
  statusCode: STATUS_CODES.TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: {
    success: false,
    error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
    retryAfter: Math.ceil(RATE_LIMITS.AUTH.windowMs / 1000)
  },
  statusCode: STATUS_CODES.TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Only count failed auth attempts
});