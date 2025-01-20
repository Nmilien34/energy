import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    profilePicture: string | null;
    createdAt: Date;
    lastLogin: Date;
  };
  token: string;
}

class AuthService {
  async register(email: string, password: string, username: string): Promise<AuthResponse> {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      throw new Error('User already exists with this email or username');
    }

    const user = await User.create({
      email,
      password,
      username
    });

    const token = this.generateToken(user._id.toString());

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      token
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = this.generateToken(user._id.toString());

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      token
    };
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
  }
}

export const authService = new AuthService(); 