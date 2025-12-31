import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
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

    // Find user by email (direct query - emails are stored lowercase in DB)
    // Using direct query instead of regex for better performance and index usage
    // Add maxTimeMS to prevent hanging queries
    const user = await User.findOne({ email: normalizedEmail })
      .maxTimeMS(5000) // 5 second timeout
      .exec() as IUser | null;

    if (!user) {
      // Don't reveal whether email exists or not for security
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    // Log full error details for debugging in production
    if (error instanceof Error) {
      console.error('Login error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Check for timeout errors
      if (error.message.includes('timeout')) {
        return res.status(504).json({
          success: false,
          error: 'Request timeout. Please try again.'
        });
      }
      
      // Check for database connection errors
      if (error.message.includes('Mongo') || error.message.includes('connection')) {
        return res.status(503).json({
          success: false,
          error: 'Database connection error. Please try again later.'
        });
      }
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

 