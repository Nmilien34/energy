import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../utils/config';
import { checkConnection, withTimeout, DB_TIMEOUTS, getConnectionState } from '../utils/database';

interface JwtPayload {
  id: string;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const logPrefix = '[Auth Middleware]';

  try {
    // Step 1: Extract token
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    // Step 2: Verify JWT (this is synchronous, no DB needed)
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (jwtError: any) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        console.log(`${logPrefix} Token expired`);
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please log in again.'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        console.log(`${logPrefix} Invalid token format`);
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please log in again.'
        });
      }
      throw jwtError;
    }

    // Step 3: Check DB connection before querying
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      console.error(`${logPrefix} DB not connected:`, connCheck.error);
      return res.status(connCheck.statusCode || 503).json({
        success: false,
        error: connCheck.error || 'Database temporarily unavailable'
      });
    }

    // Step 4: Find user with timeout
    let user: IUser | null;
    try {
      user = await withTimeout(
        User.findById(decoded.id).select('-password').exec() as Promise<IUser | null>,
        DB_TIMEOUTS.QUERY_SHORT,
        'Find user by ID'
      );
    } catch (dbError: any) {
      const duration = Date.now() - startTime;
      console.error(`${logPrefix} DB query failed after ${duration}ms:`, {
        message: dbError?.message,
        name: dbError?.name,
        connectionState: getConnectionState()
      });

      if (dbError?.message?.includes('timed out')) {
        return res.status(504).json({
          success: false,
          error: 'Request timeout. Please try again.'
        });
      }

      return res.status(503).json({
        success: false,
        error: 'Database error. Please try again.'
      });
    }

    if (!user) {
      console.log(`${logPrefix} User not found for ID: ${decoded.id?.substring(0, 8)}...`);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Success - attach user to request
    req.user = user;

    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`${logPrefix} Slow auth check: ${duration}ms`);
    }

    next();

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Error after ${duration}ms:`, {
      message: error?.message,
      name: error?.name,
      connectionState: getConnectionState()
    });

    res.status(401).json({
      success: false,
      error: 'Authentication failed. Please log in again.'
    });
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};
