import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IPlaylist } from './Playlist';
import { ISong } from './Song';

export interface IShare extends Document {
  shareId: string; // unique share identifier for the URL
  type: 'playlist' | 'song';
  owner: Types.ObjectId | IUser;

  // References based on type
  playlist?: Types.ObjectId | IPlaylist;
  song?: Types.ObjectId | ISong;

  // Share metadata
  title: string; // cached title for quick display
  description?: string;
  thumbnail?: string;

  // Analytics
  viewCount: number;
  playCount: number;
  lastAccessedAt?: Date;

  // Share settings
  isActive: boolean;
  expiresAt?: Date; // optional expiration date

  createdAt: Date;
  updatedAt: Date;

  // Methods
  incrementViewCount(): Promise<IShare>;
  incrementPlayCount(): Promise<IShare>;
  isExpired(): boolean;
}

const shareSchema = new Schema<IShare>({
  shareId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['playlist', 'song'],
    required: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  playlist: {
    type: Schema.Types.ObjectId,
    ref: 'Playlist'
  },
  song: {
    type: Schema.Types.ObjectId,
    ref: 'Song'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String
  },
  viewCount: {
    type: Number,
    default: 0
  },
  playCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for efficient querying
shareSchema.index({ shareId: 1, isActive: 1 });
shareSchema.index({ owner: 1, type: 1 });
shareSchema.index({ createdAt: -1 });

// Validation: ensure either playlist or song is set based on type
shareSchema.pre('save', function(next) {
  if (this.type === 'playlist' && !this.playlist) {
    next(new Error('Playlist reference is required for playlist share type'));
  } else if (this.type === 'song' && !this.song) {
    next(new Error('Song reference is required for song share type'));
  } else {
    next();
  }
});

// Method to increment view count
shareSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Method to increment play count
shareSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  return this.save();
};

// Method to check if share is expired
shareSchema.methods.isExpired = function(): boolean {
  if (!this.expiresAt) return false;
  return new Date() >= this.expiresAt;
};

export const Share = mongoose.model<IShare>('Share', shareSchema);
