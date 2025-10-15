import mongoose, { Document, Schema } from 'mongoose';

export interface IAnonymousSession extends Document {
  sessionId: string; // unique identifier (sent to frontend as cookie/token)
  shareId: string; // which share link they're accessing

  // Track plays
  songsPlayed: string[]; // array of song IDs that have been played
  playCount: number; // total number of songs played

  // Session metadata
  ipAddress?: string;
  userAgent?: string;

  // Restrictions
  hasReachedLimit: boolean; // true if they've hit the 3-song limit

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
    required: true,
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
anonymousSessionSchema.index({ expiresAt: 1 }); // For automatic cleanup via TTL

// TTL index to automatically delete expired sessions after 24 hours
anonymousSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to add a song play
anonymousSessionSchema.methods.addSongPlay = function(songId: string) {
  if (!this.songsPlayed.includes(songId)) {
    this.songsPlayed.push(songId);
  }
  this.playCount += 1;

  // Check if limit is reached (3 songs)
  if (this.playCount >= 3) {
    this.hasReachedLimit = true;
  }

  return this.save();
};

// Method to check if a song has been played
anonymousSessionSchema.methods.hasPlayedSong = function(songId: string): boolean {
  return this.songsPlayed.includes(songId);
};

// Method to check if user can play more songs
anonymousSessionSchema.methods.canPlayMore = function(): boolean {
  return this.playCount < 3;
};

export const AnonymousSession = mongoose.model<IAnonymousSession>('AnonymousSession', anonymousSessionSchema);
