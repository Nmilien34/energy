import mongoose, { Document, Schema } from 'mongoose';

export interface ISearchCache extends Document {
  query: string; // normalized search query
  youtubeIds: string[]; // array of YouTube IDs from results
  resultCount: number;
  searchType: 'song' | 'artist' | 'trending';
  expiresAt: Date;
  hitCount: number; // track how many times this cache was used
  createdAt: Date;
  updatedAt: Date;
}

const searchCacheSchema = new Schema<ISearchCache>({
  query: {
    type: String,
    required: true,
    index: true,
    // Normalize queries for better cache hits
    set: (v: string) => v.toLowerCase().trim().replace(/\s+/g, ' ')
  },
  youtubeIds: {
    type: [String],
    required: true,
    default: []
  },
  resultCount: {
    type: Number,
    required: true,
    default: 0
  },
  searchType: {
    type: String,
    enum: ['song', 'artist', 'trending'],
    default: 'song',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  hitCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
searchCacheSchema.index({ query: 1, searchType: 1, expiresAt: 1 });

// Index for automatic cleanup of expired entries
searchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to increment hit count
searchCacheSchema.methods.recordHit = function() {
  this.hitCount += 1;
  return this.save();
};

// Static method to find valid cache entry
searchCacheSchema.statics.findValidCache = function(query: string, searchType: string = 'song') {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return this.findOne({
    query: normalizedQuery,
    searchType,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to create or update cache
searchCacheSchema.statics.upsertCache = async function(
  query: string,
  youtubeIds: string[],
  searchType: string = 'song',
  ttlHours: number = 1
) {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  return this.findOneAndUpdate(
    { query: normalizedQuery, searchType },
    {
      query: normalizedQuery,
      youtubeIds,
      resultCount: youtubeIds.length,
      searchType,
      expiresAt,
      $inc: { hitCount: 0 } // Don't increment on upsert
    },
    { upsert: true, new: true }
  );
};

// Static method to get popular searches
searchCacheSchema.statics.getPopularSearches = function(limit: number = 10) {
  return this.find({
    expiresAt: { $gt: new Date() },
    hitCount: { $gt: 0 }
  })
    .sort({ hitCount: -1 })
    .limit(limit)
    .select('query hitCount searchType');
};

// Static method to cleanup expired entries (manual, as fallback to TTL index)
searchCacheSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

export const SearchCache = mongoose.model<ISearchCache>('SearchCache', searchCacheSchema);
