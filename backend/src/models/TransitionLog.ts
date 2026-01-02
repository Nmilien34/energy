/**
 * TransitionLog Model
 * Tracks song-to-song transitions (the "brain" of the recommendation algorithm)
 *
 * This is the collaborative filtering backbone:
 * "What do users typically listen to after song X?"
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransitionLog extends Document {
  fromTrackId: string;        // YouTube ID of the song that just finished
  toTrackId: string;          // YouTube ID of the song played next
  userId?: Types.ObjectId;    // User who made this transition (optional for anonymous)
  sessionId: string;          // Group transitions by listening session
  timestamp: Date;
  completed: boolean;         // Did user finish the first song? (listened > 80%)
  skipped: boolean;           // Was the second song skipped quickly?
  source: 'auto' | 'manual' | 'shuffle'; // How was the next song selected?
  createdAt: Date;
}

const transitionLogSchema = new Schema<ITransitionLog>({
  fromTrackId: {
    type: String,
    required: true,
    index: true
  },
  toTrackId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  completed: {
    type: Boolean,
    default: true
  },
  skipped: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['auto', 'manual', 'shuffle'],
    default: 'auto'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
transitionLogSchema.index({ fromTrackId: 1, toTrackId: 1 });
transitionLogSchema.index({ fromTrackId: 1, timestamp: -1 });
transitionLogSchema.index({ userId: 1, timestamp: -1 });
transitionLogSchema.index({ sessionId: 1, timestamp: 1 });

// TTL index: automatically delete old transitions after 90 days
transitionLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Static method: Get transition probabilities for a track
 * Returns the most common "next tracks" based on user behavior
 */
transitionLogSchema.statics.getTransitionProbabilities = async function(
  fromTrackId: string,
  limit: number = 20
): Promise<{ toTrackId: string; probability: number; count: number }[]> {
  const results = await this.aggregate([
    // Match transitions from this track
    { $match: { fromTrackId, completed: true } },

    // Group by destination track
    { $group: {
      _id: '$toTrackId',
      count: { $sum: 1 },
      uniqueUsers: { $addToSet: '$userId' }
    }},

    // Calculate stats
    { $project: {
      toTrackId: '$_id',
      count: 1,
      uniqueUserCount: { $size: '$uniqueUsers' }
    }},

    // Sort by count
    { $sort: { count: -1 } },

    // Limit results
    { $limit: limit }
  ]);

  // Calculate total transitions for probability
  const total = results.reduce((sum, r) => sum + r.count, 0);

  return results.map(r => ({
    toTrackId: r.toTrackId,
    probability: total > 0 ? r.count / total : 0,
    count: r.count
  }));
};

/**
 * Static method: Get the global "wisdom of the crowd" for a track
 * What do most people listen to after this song?
 */
transitionLogSchema.statics.getTopNextTracks = async function(
  fromTrackId: string,
  limit: number = 10
): Promise<string[]> {
  const results = await this.aggregate([
    { $match: { fromTrackId, completed: true, skipped: false } },
    { $group: { _id: '$toTrackId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);

  return results.map(r => r._id);
};

/**
 * Static method: Get user-specific transition patterns
 */
transitionLogSchema.statics.getUserTransitions = async function(
  userId: Types.ObjectId,
  fromTrackId?: string,
  limit: number = 50
): Promise<ITransitionLog[]> {
  const query: any = { userId };
  if (fromTrackId) {
    query.fromTrackId = fromTrackId;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * Static method: Record a transition
 */
transitionLogSchema.statics.recordTransition = async function(
  fromTrackId: string,
  toTrackId: string,
  options: {
    userId?: Types.ObjectId;
    sessionId: string;
    completed?: boolean;
    skipped?: boolean;
    source?: 'auto' | 'manual' | 'shuffle';
  }
): Promise<ITransitionLog> {
  const transition = new this({
    fromTrackId,
    toTrackId,
    userId: options.userId,
    sessionId: options.sessionId,
    completed: options.completed ?? true,
    skipped: options.skipped ?? false,
    source: options.source ?? 'auto',
    timestamp: new Date()
  });

  return transition.save();
};

/**
 * Static method: Get trending transitions (globally popular right now)
 */
transitionLogSchema.statics.getTrendingTransitions = async function(
  hoursAgo: number = 24,
  limit: number = 50
): Promise<{ fromTrackId: string; toTrackId: string; count: number }[]> {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  return this.aggregate([
    { $match: { timestamp: { $gte: since }, completed: true } },
    { $group: {
      _id: { from: '$fromTrackId', to: '$toTrackId' },
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: {
      fromTrackId: '$_id.from',
      toTrackId: '$_id.to',
      count: 1,
      _id: 0
    }}
  ]);
};

// Add static method types to the model
export interface ITransitionLogModel extends mongoose.Model<ITransitionLog> {
  getTransitionProbabilities(fromTrackId: string, limit?: number): Promise<{ toTrackId: string; probability: number; count: number }[]>;
  getTopNextTracks(fromTrackId: string, limit?: number): Promise<string[]>;
  getUserTransitions(userId: Types.ObjectId, fromTrackId?: string, limit?: number): Promise<ITransitionLog[]>;
  recordTransition(fromTrackId: string, toTrackId: string, options: {
    userId?: Types.ObjectId;
    sessionId: string;
    completed?: boolean;
    skipped?: boolean;
    source?: 'auto' | 'manual' | 'shuffle';
  }): Promise<ITransitionLog>;
  getTrendingTransitions(hoursAgo?: number, limit?: number): Promise<{ fromTrackId: string; toTrackId: string; count: number }[]>;
}

export const TransitionLog = mongoose.model<ITransitionLog, ITransitionLogModel>('TransitionLog', transitionLogSchema);
