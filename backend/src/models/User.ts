import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  username: string;
  profilePicture: string | null;
  googleId?: string;
  youtubeAccessToken?: string;
  youtubeRefreshToken?: string;
  youtubeChannelId?: string;
  createdAt: Date;
  lastLogin: Date;
  totalSongsPlayed: number;
  totalSecondsListened: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  profilePicture: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  totalSongsPlayed: {
    type: Number,
    default: 0
  },
  totalSecondsListened: {
    type: Number,
    default: 0
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  youtubeAccessToken: {
    type: String
  },
  youtubeRefreshToken: {
    type: String
  },
  youtubeChannelId: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      delete ret.password;
      delete ret.youtubeAccessToken;
      delete ret.youtubeRefreshToken;
      return ret;
    }
  }
});

// Index for faster email lookups (unique constraint already creates one, but explicit index helps)
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    // Validate inputs
    if (!candidatePassword || typeof candidatePassword !== 'string') {
      console.error('Invalid candidate password provided');
      return false;
    }
    
    if (!this.password || typeof this.password !== 'string') {
      console.error('User password hash is invalid:', { userId: this._id, hasPassword: !!this.password });
      return false;
    }

    // Check if password hash looks valid (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (!this.password.startsWith('$2')) {
      console.error('Password hash format is invalid (not bcrypt):', { userId: this._id });
      return false;
    }

    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error: any) {
    console.error('bcrypt.compare error:', {
      error: error.message,
      userId: this._id,
      passwordHashLength: this.password?.length
    });
    throw error;
  }
};

export const User = mongoose.model<IUser, UserModel>('User', userSchema); 