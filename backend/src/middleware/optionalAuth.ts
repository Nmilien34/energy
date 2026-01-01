import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../utils/config';
import { isMongoConnected, withTimeout, DB_TIMEOUTS } from '../utils/database';

interface JwtPayload {
  id: string;
}

/**
 * Optional authentication middleware
 * Sets req.user if a valid token is provided, but doesn't require it
 * This is useful for endpoints that can be accessed by both authenticated and anonymous users
 * Fails silently on any error - just continues without user
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      // No token provided, continue without user
      req.user = undefined;
      return next();
    }

    // Skip DB lookup if MongoDB isn't connected
    if (!isMongoConnected()) {
      req.user = undefined;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

      // Find user with timeout - don't block for too long on optional auth
      const user = await withTimeout(
        User.findById(decoded.id).select('-password').exec() as Promise<IUser | null>,
        DB_TIMEOUTS.QUERY_SHORT,
        'Optional auth user lookup'
      );

      if (user) {
        req.user = user;
      } else {
        req.user = undefined;
      }
    } catch (error) {
      // Invalid token or DB error, continue without user
      req.user = undefined;
    }

    next();
  } catch (error) {
    // Error occurred, continue without user
    req.user = undefined;
    next();
  }
};
