import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config/config';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  static async login(email: string, password: string) {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    };
  }

  static async register(userData: { email: string; password: string; name: string }) {
    // Check if user exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create user
    const user = await User.create({
      ...userData,
      password: hashedPassword
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    };
  }
} 