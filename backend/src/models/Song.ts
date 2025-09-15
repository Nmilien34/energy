import mongoose, { Document, Schema } from 'mongoose';

export interface ISong extends Document {
  youtubeId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  thumbnail: string;
  thumbnailHd?: string;
  viewCount?: number;
  publishedAt?: Date;
  channelTitle?: string;
  channelId?: string;
  description?: string;
  tags?: string[];
  category?: string;
  playCount: number;
  lastPlayed?: Date;
  audioUrl?: string; // cached audio stream URL
  audioUrlExpiry?: Date; // when the audio URL expires
  createdAt: Date;
  updatedAt: Date;
  needsAudioRefresh(): boolean;
  incrementPlayCount(): Promise<ISong>;
}

const songSchema = new Schema<ISong>({
  youtubeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  artist: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  album: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  thumbnail: {
    type: String,
    required: true
  },
  thumbnailHd: {
    type: String
  },
  viewCount: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date
  },
  channelTitle: {
    type: String,
    trim: true
  },
  channelId: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    trim: true
  },
  playCount: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date
  },
  audioUrl: {
    type: String
  },
  audioUrlExpiry: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for efficient searching
songSchema.index({ title: 'text', artist: 'text', album: 'text' });
songSchema.index({ artist: 1, title: 1 });
songSchema.index({ playCount: -1 });
songSchema.index({ createdAt: -1 });

// Method to check if audio URL needs refreshing
songSchema.methods.needsAudioRefresh = function(): boolean {
  if (!this.audioUrl || !this.audioUrlExpiry) return true;
  return new Date() >= this.audioUrlExpiry;
};

// Method to increment play count
songSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  this.lastPlayed = new Date();
  return this.save();
};

export const Song = mongoose.model<ISong>('Song', songSchema);