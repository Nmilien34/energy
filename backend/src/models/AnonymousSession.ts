import mongoose, { Document, Schema } from 'mongoose';

export interface IAnonymousSession extends Document {
  sessionId: string; // unique identifier (sent to frontend as cookie/token)
  shareId?: string; // which share link they're accessing (optional for landing page sessions)
  sessionType: 'share' | 'landing'; // type of session

  // Track plays - daily reset
  songsPlayedToday: string[]; // array of song IDs played TODAY
  dailyPlayCount: number; // plays today (resets daily)
  lastPlayDate: Date; // date of last play (used for daily reset check)

  // Lifetime stats (optional, for analytics)
  totalSongsPlayed: number; // total songs ever played in this session

  // Session metadata
  ipAddress?: string;
  userAgent?: string;

  // Restrictions
  dailyLimit: number; // maximum plays allowed per day (5 for landing, 3 for share)

  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // sessions expire after 30 days of inactivity

  // Methods
  addSongPlay(songId: string): Promise<IAnonymousSession>;
  hasPlayedSongToday(songId: string): boolean;
  canPlayMore(): boolean;
  getRemainingPlays(): number;
  resetDailyPlaysIfNeeded(): void;
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
    required: false,
    index: true
  },
  sessionType: {
    type: String,
    enum: ['share', 'landing'],
    default: 'landing',
    index: true
  },
  songsPlayedToday: [{
    type: String
  }],
  dailyPlayCount: {
    type: Number,
    default: 0
  },
  lastPlayDate: {
    type: Date,
    default: null
  },
  totalSongsPlayed: {
    type: Number,
    default: 0
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  dailyLimit: {
    type: Number,
    default: 5 // 5 songs per day for landing page
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

// Indexes
anonymousSessionSchema.index({ sessionId: 1, sessionType: 1 });
anonymousSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

/**
 * Check if it's a new day and reset plays if needed
 */
anonymousSessionSchema.methods.resetDailyPlaysIfNeeded = function(): void {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today (midnight)

  if (!this.lastPlayDate) {
    // First time playing - no reset needed, will be set on first play
    return;
  }

  const lastPlay = new Date(this.lastPlayDate);
  const lastPlayDay = new Date(lastPlay.getFullYear(), lastPlay.getMonth(), lastPlay.getDate());

  // If last play was on a different day, reset daily counts
  if (lastPlayDay.getTime() < today.getTime()) {
    console.log(`[AnonymousSession] New day detected, resetting daily plays for session ${this.sessionId.substring(0, 8)}...`);
    this.songsPlayedToday = [];
    this.dailyPlayCount = 0;
  }
};

/**
 * Add a song play (tracks daily unique plays)
 */
anonymousSessionSchema.methods.addSongPlay = async function(songId: string): Promise<IAnonymousSession> {
  // First, check if we need to reset for a new day
  this.resetDailyPlaysIfNeeded();

  // Only count if this song hasn't been played today
  if (!this.songsPlayedToday.includes(songId)) {
    this.songsPlayedToday.push(songId);
    this.dailyPlayCount += 1;
    this.totalSongsPlayed += 1;
  }

  // Update last play date
  this.lastPlayDate = new Date();

  // Extend session expiry (30 days from now) - keeps session alive while user is active
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 30);
  this.expiresAt = newExpiry;

  return this.save();
};

/**
 * Check if a song has been played today
 */
anonymousSessionSchema.methods.hasPlayedSongToday = function(songId: string): boolean {
  this.resetDailyPlaysIfNeeded();
  return this.songsPlayedToday.includes(songId);
};

/**
 * Check if user can play more songs today
 */
anonymousSessionSchema.methods.canPlayMore = function(): boolean {
  this.resetDailyPlaysIfNeeded();
  return this.dailyPlayCount < this.dailyLimit;
};

/**
 * Get remaining plays for today
 */
anonymousSessionSchema.methods.getRemainingPlays = function(): number {
  this.resetDailyPlaysIfNeeded();
  return Math.max(0, this.dailyLimit - this.dailyPlayCount);
};

export const AnonymousSession = mongoose.model<IAnonymousSession>('AnonymousSession', anonymousSessionSchema);
