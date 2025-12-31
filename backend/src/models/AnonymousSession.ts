import mongoose, { Document, Schema } from 'mongoose';

export interface IAnonymousSession extends Document {
  sessionId: string; // unique identifier (sent to frontend as cookie/token)
  shareId?: string; // which share link they're accessing (optional for landing page sessions)
  sessionType: 'share' | 'landing'; // type of session

  // Track plays
  songsPlayed: string[]; // array of song IDs that have been played
  playCount: number; // total number of songs played

  // Session metadata
  ipAddress?: string;
  userAgent?: string;

  // Restrictions
  hasReachedLimit: boolean; // true if they've hit the limit (3 for share, 5 for landing)
  playLimit: number; // maximum plays allowed (3 for share, 5 for landing)

  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // sessions expire after 24 hours

  // Methods
  addSongPlay(songId: string): Promise<IAnonymousSession>;
  hasPlayedSong(songId: string): boolean;
  canPlayMore(): boolean;
}

const anonymousSessionSchema = new Schema<IAnonymousSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  shareId: {
    type: String,
    required: false, // Optional for landing page sessions
    index: true
  },
  sessionType: {
    type: String,
    enum: ['share', 'landing'],
    default: 'share',
    index: true
  },
  songsPlayed: [{
    type: String
  }],
  playCount: {
    type: Number,
    default: 0
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  hasReachedLimit: {
    type: Boolean,
    default: false
  },
  playLimit: {
    type: Number,
    default: 3 // Default 3 for share sessions, 5 for landing
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
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
anonymousSessionSchema.index({ sessionId: 1, shareId: 1 });
anonymousSessionSchema.index({ sessionId: 1, sessionType: 1 }); // For landing page sessions
anonymousSessionSchema.index({ expiresAt: 1 }); // For automatic cleanup via TTL

// TTL index to automatically delete expired sessions after 24 hours
anonymousSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to add a song play
anonymousSessionSchema.methods.addSongPlay = function(songId: string) {
  // Only count unique songs
  if (!this.songsPlayed.includes(songId)) {
    this.songsPlayed.push(songId);
    this.playCount += 1;

    // Check if limit is reached (based on playLimit)
    if (this.playCount >= this.playLimit) {
      this.hasReachedLimit = true;
    }
  }

  return this.save();
};

// Method to check if a song has been played
anonymousSessionSchema.methods.hasPlayedSong = function(songId: string): boolean {
  return this.songsPlayed.includes(songId);
};

// Method to check if user can play more songs
anonymousSessionSchema.methods.canPlayMore = function(): boolean {
  return this.playCount < this.playLimit;
};

export const AnonymousSession = mongoose.model<IAnonymousSession>('AnonymousSession', anonymousSessionSchema);
