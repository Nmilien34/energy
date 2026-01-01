import mongoose from 'mongoose';
import { config } from './config';

// Connection state names for logging
export const CONNECTION_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

// Default timeout values
export const DB_TIMEOUTS = {
  QUERY: 5000,        // 5s for standard queries
  QUERY_SHORT: 3000,  // 3s for quick queries (login, auth checks)
  WAIT_FOR_CONNECTION: 2000, // 2s max wait when connecting
  OVERALL: 10000      // 10s overall timeout for operations
} as const;

/**
 * Check if MongoDB is connected and ready for queries
 * @returns {boolean} true if connected, false otherwise
 */
export const isMongoConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get current MongoDB connection state as string
 */
export const getConnectionState = (): string => {
  const state = mongoose.connection.readyState;
  return CONNECTION_STATES[state] || 'unknown';
};

/**
 * Check MongoDB connection and wait if connecting
 * @returns Object with connected status and error message if not connected
 */
export const checkConnection = async (): Promise<{
  connected: boolean;
  error?: string;
  statusCode?: number;
}> => {
  const state = mongoose.connection.readyState;

  // Already connected
  if (state === 1) {
    return { connected: true };
  }

  // Disconnected - fail fast
  if (state === 0) {
    console.error('[DB] MongoDB disconnected - failing fast');
    return {
      connected: false,
      error: 'Database not available. Please try again in a moment.',
      statusCode: 503
    };
  }

  // Connecting - wait briefly
  if (state === 2) {
    console.warn('[DB] MongoDB connecting, waiting up to 2s...');
    const start = Date.now();

    while (mongoose.connection.readyState === 2 && (Date.now() - start) < DB_TIMEOUTS.WAIT_FOR_CONNECTION) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (mongoose.connection.readyState === 1) {
      console.log('[DB] Connection established after wait');
      return { connected: true };
    }

    console.error('[DB] MongoDB still not connected after wait');
    return {
      connected: false,
      error: 'Database connection is taking too long. Please try again.',
      statusCode: 503
    };
  }

  // Disconnecting
  if (state === 3) {
    console.error('[DB] MongoDB disconnecting');
    return {
      connected: false,
      error: 'Database is temporarily unavailable. Please try again.',
      statusCode: 503
    };
  }

  return { connected: false, error: 'Unknown database state', statusCode: 500 };
};

/**
 * Wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param operationName Name of operation for error messages
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = DB_TIMEOUTS.QUERY,
  operationName: string = 'Database operation'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
};

/**
 * Execute a database operation with connection check and timeout
 * @param operation Function that returns a promise
 * @param options Configuration options
 */
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  options: {
    operationName?: string;
    timeoutMs?: number;
    skipConnectionCheck?: boolean;
  } = {}
): Promise<{ success: true; data: T } | { success: false; error: string; statusCode: number }> => {
  const {
    operationName = 'Database operation',
    timeoutMs = DB_TIMEOUTS.QUERY,
    skipConnectionCheck = false
  } = options;

  const startTime = Date.now();

  try {
    // Check connection first
    if (!skipConnectionCheck) {
      const connCheck = await checkConnection();
      if (!connCheck.connected) {
        console.error(`[DB] ${operationName} - connection check failed:`, connCheck.error);
        return {
          success: false,
          error: connCheck.error || 'Database connection error',
          statusCode: connCheck.statusCode || 503
        };
      }
    }

    // Execute with timeout
    const result = await withTimeout(operation(), timeoutMs, operationName);
    const duration = Date.now() - startTime;

    if (duration > 1000) {
      console.warn(`[DB] ${operationName} slow: ${duration}ms`);
    }

    return { success: true, data: result };

  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log error details
    console.error(`[DB] ${operationName} failed after ${duration}ms:`, {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      connectionState: getConnectionState()
    });

    // Determine appropriate status code and message
    if (error?.message?.includes('timed out')) {
      return {
        success: false,
        error: 'Request timeout. Please try again.',
        statusCode: 504
      };
    }

    if (error?.name === 'MongoServerSelectionError' || error?.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Database connection failed. Please try again later.',
        statusCode: 503
      };
    }

    if (error?.name === 'MongoTimeoutError') {
      return {
        success: false,
        error: 'Database query timeout. Please try again.',
        statusCode: 504
      };
    }

    if (error?.name === 'MongoNetworkError') {
      return {
        success: false,
        error: 'Database network error. Please try again later.',
        statusCode: 503
      };
    }

    return {
      success: false,
      error: 'Database operation failed. Please try again.',
      statusCode: 500
    };
  }
};

/**
 * Get connection diagnostics for health checks
 */
export const getConnectionDiagnostics = () => {
  const conn = mongoose.connection;
  return {
    readyState: conn.readyState,
    state: getConnectionState(),
    host: conn.host || 'unknown',
    name: conn.name || 'unknown',
    connected: isMongoConnected()
  };
};

// Legacy function - kept for backward compatibility
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('[DB] MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB connection error:', err);
});
