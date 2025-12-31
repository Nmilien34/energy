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
  audioUrl?: string; // cached audio stream URL (YouTube CDN or S3)
  audioUrlExpiry?: Date; // when the audio URL expires
  audioSource?: 's3' | 'youtube' | 'cache'; // where the audio is stored
  s3AudioKey?: string; // S3 key if stored in S3
  s3AudioFormat?: string; // audio format in S3 (webm, mp4, etc)
  s3UploadedAt?: Date; // when audio was uploaded to S3
  createdAt: Date;
  updatedAt: Date;
  needsAudioRefresh(): boolean;
  incrementPlayCount(): Promise<ISong>;
  hasS3Audio(): boolean;
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
  },
  audioSource: {
    type: String,
    enum: ['s3', 'youtube', 'cache'],
    default: 'youtube'
  },
  s3AudioKey: {
    type: String
  },
  s3AudioFormat: {
    type: String,
    default: 'webm'
  },
  s3UploadedAt: {
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
songSchema.methods.incrementPlayCount = async function() {
  this.playCount += 1;
  this.lastPlayed = new Date();
  await this.save();
  
  // Auto-sync to S3 if play count reaches threshold (in background, don't block)
  if (!this.hasS3Audio() && this.playCount >= 10) {
    // Import here to avoid circular dependency
    import('../services/s3SyncService').then(({ s3SyncService }) => {
      s3SyncService.checkAndSyncIfNeeded(this.youtubeId).catch(err => {
        console.error(`Background S3 sync failed for ${this.youtubeId}:`, err);
      });
    }).catch(() => {
      // Ignore import errors
    });
  }
  
  return this;
};

// Method to check if song has S3 audio
songSchema.methods.hasS3Audio = function(): boolean {
  return this.audioSource === 's3' && !!this.s3AudioKey;
};

export const Song = mongoose.model<ISong>('Song', songSchema);