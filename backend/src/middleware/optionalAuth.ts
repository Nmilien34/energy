import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../utils/config';

interface JwtPayload {
  id: string;
}

/**
 * Optional authentication middleware
 * Sets req.user if a valid token is provided, but doesn't require it
 * This is useful for endpoints that can be accessed by both authenticated and anonymous users
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      // No token provided, continue without user
      req.user = undefined;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await User.findById(decoded.id);

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Invalid token, continue without user
      req.user = undefined;
    }

    next();
  } catch (error) {
    // Error occurred, continue without user
    req.user = undefined;
    next();
  }
};
