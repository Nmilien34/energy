import { TrendingCache } from '../models/TrendingCache';
import { youtubeService, YouTubeSearchResult } from './youtubeService';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

class TrendingService {
  private key(region: string = 'US') {
    return `trending:${region}`;
  }

  async getTrending(maxResults: number = 20, region: string = 'US'): Promise<YouTubeSearchResult[]> {
    const key = this.key(region);

    // Serve from cache if valid
    const cached = await TrendingCache.findOne({ key, expiresAt: { $gt: new Date() } });
    if (cached && cached.snapshot?.length) {
      return cached.snapshot.slice(0, maxResults).map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        thumbnail: s.thumbnail,
        thumbnailHd: s.thumbnailHd,
        viewCount: s.viewCount,
        publishedAt: s.publishedAt?.toISOString(),
        channelTitle: s.channelTitle,
        channelId: s.channelId,
        description: s.description
      }));
    }

    // Refresh cache at most every 12 hours
    const fresh = await youtubeService.getTrendingMusic(maxResults);

    const snapshot = fresh.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      duration: s.duration,
      thumbnail: s.thumbnail,
      thumbnailHd: s.thumbnailHd,
      viewCount: s.viewCount,
      publishedAt: s.publishedAt ? new Date(s.publishedAt) : undefined,
      channelTitle: s.channelTitle,
      channelId: s.channelId,
      description: s.description
    }));

    const expiresAt = new Date(Date.now() + TWELVE_HOURS_MS);

    await TrendingCache.findOneAndUpdate(
      { key },
      { key, youtubeIds: fresh.map(s => s.id), snapshot, expiresAt },
      { upsert: true }
    );

    return fresh;
  }
}

export const trendingService = new TrendingService();


