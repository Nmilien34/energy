import mongoose, { Document, Schema } from 'mongoose';

export interface ITrendingCache extends Document {
  key: string; // e.g., 'trending:US'
  youtubeIds: string[];
  // denormalized snapshot for quick serve without extra lookups
  snapshot: Array<{
    id: string;
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
    thumbnailHd?: string;
    viewCount?: number;
    publishedAt?: Date;
    channelTitle?: string;
    channelId?: string;
    description?: string;
  }>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const trendingCacheSchema = new Schema<ITrendingCache>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  youtubeIds: {
    type: [String],
    default: []
  },
  snapshot: {
    type: [
      {
        id: String,
        title: String,
        artist: String,
        duration: Number,
        thumbnail: String,
        thumbnailHd: String,
        viewCount: Number,
        publishedAt: Date,
        channelTitle: String,
        channelId: String,
        description: String
      }
    ],
    default: []
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

export const TrendingCache = mongoose.model<ITrendingCache>('TrendingCache', trendingCacheSchema);


