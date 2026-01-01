import { Request, Response, NextFunction } from 'express';
import { getConnectionState } from '../utils/database';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string | number;
  isOperational?: boolean;
}

// Error categories for structured logging
type ErrorCategory = 'DATABASE' | 'AUTH' | 'VALIDATION' | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN';

const categorizeError = (err: ErrorWithStatus): ErrorCategory => {
  const message = err.message?.toLowerCase() || '';
  const name = err.name || '';

  if (name.includes('Mongo') || message.includes('database') || message.includes('mongodb')) {
    return 'DATABASE';
  }
  if (name.includes('Token') || name.includes('Jwt') || message.includes('auth') || err.status === 401) {
    return 'AUTH';
  }
  if (name.includes('Validation') || message.includes('validation') || err.status === 400) {
    return 'VALIDATION';
  }
  if (name.includes('Network') || message.includes('econnrefused') || message.includes('network')) {
    return 'NETWORK';
  }
  if (message.includes('timeout') || message.includes('timed out') || err.status === 504) {
    return 'TIMEOUT';
  }
  return 'UNKNOWN';
};

const getStatusFromCategory = (category: ErrorCategory, originalStatus?: number): number => {
  if (originalStatus && originalStatus >= 400 && originalStatus < 600) {
    return originalStatus;
  }

  switch (category) {
    case 'DATABASE':
      return 503;
    case 'AUTH':
      return 401;
    case 'VALIDATION':
      return 400;
    case 'NETWORK':
      return 503;
    case 'TIMEOUT':
      return 504;
    default:
      return 500;
  }
};

const getUserFriendlyMessage = (category: ErrorCategory, originalMessage: string): string => {
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    switch (category) {
      case 'DATABASE':
        return 'Database temporarily unavailable. Please try again.';
      case 'AUTH':
        return 'Authentication failed. Please log in again.';
      case 'VALIDATION':
        return originalMessage; // Validation messages are usually safe to expose
      case 'NETWORK':
        return 'Network error. Please check your connection and try again.';
      case 'TIMEOUT':
        return 'Request timeout. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  return originalMessage;
};

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  const category = categorizeError(err);
  const status = getStatusFromCategory(category, err.status);
  const message = err.message || 'Internal Server Error';
  const userMessage = getUserFriendlyMessage(category, message);

  // Build structured log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: status >= 500 ? 'ERROR' : 'WARN',
    category,
    status,
    method: req.method,
    path: req.path,
    error: {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
    },
    context: {
      dbState: getConnectionState(),
      userId: (req as any).user?._id?.toString()?.substring(0, 8),
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      // Don't log request body for security (might contain passwords)
      hasBody: !!req.body && Object.keys(req.body).length > 0
    }
  };

  // Log based on severity
  if (status >= 500) {
    console.error('[Error Handler]', JSON.stringify(logEntry, null, 2));
  } else {
    console.warn('[Error Handler]', JSON.stringify(logEntry));
  }

  // Return consistent error format matching controller responses
  res.status(status).json({
    success: false,
    error: userMessage,
    // Include error code for client-side handling
    code: category,
    // Include request ID if available (for tracing)
    requestId: req.headers['x-request-id']
  });
};

// Custom error class for operational errors (expected errors)
export class AppError extends Error {
  status: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, status: number = 500, code: string = 'UNKNOWN') {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Convenience error factories
export const createDatabaseError = (message: string = 'Database operation failed') =>
  new AppError(message, 503, 'DATABASE');

export const createAuthError = (message: string = 'Authentication required') =>
  new AppError(message, 401, 'AUTH');

export const createValidationError = (message: string) =>
  new AppError(message, 400, 'VALIDATION');

export const createNotFoundError = (resource: string = 'Resource') =>
  new AppError(`${resource} not found`, 404, 'NOT_FOUND');

export const createTimeoutError = (operation: string = 'Request') =>
  new AppError(`${operation} timed out`, 504, 'TIMEOUT');
