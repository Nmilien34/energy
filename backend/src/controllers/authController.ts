import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../utils/config';
import { checkConnection, withTimeout, DB_TIMEOUTS, getConnectionState } from '../utils/database';

interface JwtPayload {
  id: string;
}

const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

export const register = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const logPrefix = '[Register]';

  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and username are required'
      });
    }

    // Normalize email to lowercase for consistent querying and storage
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    // Check connection first
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      console.error(`${logPrefix} DB not connected:`, connCheck.error);
      return res.status(connCheck.statusCode || 503).json({
        success: false,
        error: connCheck.error
      });
    }

    // Check if user already exists (case-insensitive for email)
    let existingUser: IUser | null;
    try {
      existingUser = await withTimeout(
        User.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { username: normalizedUsername }
          ]
        }).exec() as Promise<IUser | null>,
        DB_TIMEOUTS.QUERY,
        'Check existing user'
      );
    } catch (dbError: any) {
      const duration = Date.now() - startTime;
      console.error(`${logPrefix} DB query failed after ${duration}ms:`, {
        message: dbError?.message,
        connectionState: getConnectionState()
      });
      return res.status(503).json({
        success: false,
        error: 'Database error. Please try again.'
      });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email or username already exists'
      });
    }

    // Create new user
    const user = new User({
      email: normalizedEmail,
      password,
      username: normalizedUsername
    }) as IUser;

    try {
      await withTimeout(
        user.save(),
        DB_TIMEOUTS.QUERY,
        'Save new user'
      );
    } catch (saveError: any) {
      const duration = Date.now() - startTime;
      console.error(`${logPrefix} Save failed after ${duration}ms:`, {
        message: saveError?.message,
        code: saveError?.code
      });

      // Handle duplicate key error
      if (saveError?.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Email or username already exists'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error creating user'
      });
    }

    const token = generateToken(user._id.toString());
    const duration = Date.now() - startTime;
    console.log(`${logPrefix} Success (${duration}ms): ${normalizedEmail.substring(0, 3)}***`);

    res.status(201).json({
      success: true,
      data: {
        ...user.toJSON(),
        token
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Error after ${duration}ms:`, {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    });
    res.status(500).json({
      success: false,
      error: 'Error creating user'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const logPrefix = '[Login]';

  console.log(`${logPrefix} Attempt started`);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Normalize email to lowercase for consistent querying
    const normalizedEmail = email.toLowerCase().trim();

    // Check MongoDB connection - fail fast if not connected
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      console.error(`${logPrefix} DB not connected:`, connCheck.error);
      return res.status(connCheck.statusCode || 503).json({
        success: false,
        error: connCheck.error
      });
    }

    // Find user by email with timeout
    let user: IUser | null;
    try {
      user = await withTimeout(
        User.findOne({ email: normalizedEmail })
          .select('_id email password lastLogin')
          .exec() as Promise<IUser | null>,
        DB_TIMEOUTS.QUERY_SHORT,
        'Find user by email'
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
      // Don't reveal whether email exists or not for security
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user has a valid password (OAuth users have placeholder passwords)
    if (!user.password || user.password === 'google-oauth' || user.password.length < 10) {
      console.log(`${logPrefix} OAuth user attempting password login`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password with error handling
    let isMatch: boolean;
    try {
      isMatch = await user.comparePassword(password);
    } catch (passwordError: any) {
      console.error(`${logPrefix} Password comparison error:`, passwordError.message);
      return res.status(500).json({
        success: false,
        error: 'Error verifying credentials'
      });
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login (non-blocking, don't fail if this fails)
    user.lastLogin = new Date();
    user.save().catch((err: any) => {
      console.warn(`${logPrefix} Failed to update lastLogin:`, err.message);
    });

    // Generate token
    if (!config.jwt.secret || config.jwt.secret === 'fallback-secret-change-in-production') {
      console.error(`${logPrefix} JWT_SECRET not properly configured!`);
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const token = generateToken(user._id.toString());
    const duration = Date.now() - startTime;
    console.log(`${logPrefix} Success (${duration}ms): ${normalizedEmail.substring(0, 3)}***`);

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        token
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Error after ${duration}ms:`, {
      message: error?.message,
      name: error?.name,
      connectionState: getConnectionState()
    });

    // Categorize error for appropriate response
    if (error?.message?.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Request timeout. Please try again.'
      });
    }

    if (error?.message?.includes('Mongo') || error?.message?.includes('database')) {
      return res.status(503).json({
        success: false,
        error: 'Database error. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error logging in'
    });
  }
};

export const logout = async (_: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: null
    });
  } catch (error) {
    console.error('[Logout] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error logging out'
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const logPrefix = '[GetCurrentUser]';

  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Check connection
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      return res.status(connCheck.statusCode || 503).json({
        success: false,
        error: connCheck.error
      });
    }

    const user = await withTimeout(
      User.findById(userId).select('-password').exec(),
      DB_TIMEOUTS.QUERY_SHORT,
      'Get current user'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, {
      message: error?.message,
      connectionState: getConnectionState()
    });

    if (error?.message?.includes('timed out')) {
      return res.status(504).json({
        success: false,
        error: 'Request timeout. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error fetching user'
    });
  }
};
