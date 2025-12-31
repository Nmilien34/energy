import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { config } from '../utils/config';

interface JwtPayload {
  id: string;
}

const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

export const register = async (req: Request, res: Response) => {
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

    // Check if user already exists (case-insensitive for email)
    const existingUser = await User.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { username: normalizedUsername }
      ] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email or username already exists'
      });
    }

    // Create new user (Mongoose schema will lowercase email on save, but we normalize here too)
    const user = new User({
      email: normalizedEmail,
      password,
      username: normalizedUsername
    }) as IUser;

    await user.save();
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      data: {
        ...user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Registration error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error creating user'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('Login attempt started:', { email: req.body?.email ? 'provided' : 'missing', timestamp: new Date().toISOString() });
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Normalize email to lowercase for consistent querying
    // Since the schema has lowercase: true, emails are stored in lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Check if MongoDB is connected before querying
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    if (connectionState !== 1) {
      console.error('MongoDB not connected:', {
        readyState: connectionState,
        state: connectionStates[connectionState as keyof typeof connectionStates],
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        mongoUri: process.env.MONGODB_URI ? 'set' : 'missing'
      });
      
      // If connecting, wait a bit and retry
      if (connectionState === 2) {
        console.log('MongoDB is connecting, waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Check again
        if (mongoose.connection.readyState === 1) {
          console.log('MongoDB connected after wait');
        } else {
          return res.status(503).json({
            success: false,
            error: 'Database is connecting. Please try again in a moment.'
          });
        }
      } else {
        return res.status(503).json({
          success: false,
          error: 'Database not connected. Please try again later.'
        });
      }
    }

    // Find user by email (direct query - emails are stored lowercase in DB)
    // Using direct query instead of regex for better performance and index usage
    // Add maxTimeMS to prevent hanging queries
    let user: IUser | null;
    try {
      user = await User.findOne({ email: normalizedEmail })
        .maxTimeMS(5000) // 5 second timeout
        .exec() as IUser | null;
    } catch (dbError: any) {
      const errorDetails = {
        message: dbError?.message,
        name: dbError?.name,
        code: dbError?.code,
        readyState: mongoose.connection.readyState,
        connectionState: connectionStates[mongoose.connection.readyState as keyof typeof connectionStates],
        stack: dbError?.stack
      };
      
      console.error('Database query error:', errorDetails);
      
      // More specific error messages
      if (dbError?.name === 'MongoServerSelectionError' || dbError?.code === 'ECONNREFUSED') {
        console.error('MongoDB server selection failed - connection string or network issue');
        return res.status(503).json({
          success: false,
          error: 'Database connection failed. Please check server configuration.'
        });
      }
      
      if (dbError?.name === 'MongoTimeoutError' || dbError?.message?.includes('timeout')) {
        console.error('MongoDB query timed out');
        return res.status(504).json({
          success: false,
          error: 'Database query timeout. Please try again.'
        });
      }
      
      if (dbError?.name === 'MongoNetworkError') {
        console.error('MongoDB network error');
        return res.status(503).json({
          success: false,
          error: 'Database network error. Please try again later.'
        });
      }
      
      // Log the full error for debugging
      console.error('Unknown database error:', JSON.stringify(errorDetails, null, 2));
      
      return res.status(503).json({
        success: false,
        error: 'Database connection error. Please try again later.'
      });
    }

    if (!user) {
      // Don't reveal whether email exists or not for security
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user has a valid password (OAuth users might have placeholder passwords)
    if (!user.password || user.password === 'google-oauth' || user.password.length < 10) {
      console.error('User has invalid password hash:', { userId: user._id, email: user.email });
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
      console.error('Password comparison error:', passwordError);
      console.error('User password hash issue:', { 
        userId: user._id, 
        email: user.email,
        passwordExists: !!user.password,
        passwordLength: user.password?.length 
      });
      return res.status(500).json({
        success: false,
        error: 'Error verifying password'
      });
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    try {
      user.lastLogin = new Date();
      await user.save();
    } catch (saveError: any) {
      console.error('Error saving last login:', saveError);
      // Continue anyway - last login update is not critical
    }

    // Generate token with error handling
    let token: string;
    try {
      if (!config.jwt.secret || config.jwt.secret === 'fallback-secret-change-in-production') {
        console.error('JWT_SECRET is not properly configured!');
        return res.status(500).json({
          success: false,
          error: 'Server configuration error'
        });
      }
      token = generateToken(user._id.toString());
    } catch (tokenError: any) {
      console.error('Token generation error:', tokenError);
      return res.status(500).json({
        success: false,
        error: 'Error generating authentication token'
      });
    }

    const duration = Date.now() - startTime;
    console.log('Login successful:', { email: normalizedEmail, duration: `${duration}ms` });
    
    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        token
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Login error:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      duration: `${duration}ms`,
      email: req.body?.email ? 'provided' : 'missing',
      timestamp: new Date().toISOString()
    });
    
    // Log full error details for debugging in production
    if (error instanceof Error) {
      console.error('Login error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: (error as any).cause
      });
      
      // Check for timeout errors
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        return res.status(504).json({
          success: false,
          error: 'Request timeout. Please try again.'
        });
      }
      
      // Check for database connection errors
      if (error.message?.includes('Mongo') || error.message?.includes('connection') || error.message?.includes('ECONNREFUSED')) {
        return res.status(503).json({
          success: false,
          error: 'Database connection error. Please try again later.'
        });
      }
      
      // Check for JWT errors
      if (error.message?.includes('jwt') || error.message?.includes('JWT')) {
        return res.status(500).json({
          success: false,
          error: 'Authentication service error. Please contact support.'
        });
      }
    }
    
    // Generic error response
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
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Error logging out'
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user?._id);
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
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user'
    });
  }
};

 