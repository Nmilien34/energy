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

  async getTrendingArtists(limit: number = 20, hours: number = 48): Promise<any[]> {
    const key = `trending_artists:${hours}h`;

    // Serve from cache if valid (cache for 1 hour to balance freshman vs performance)
    const cached = await TrendingCache.findOne({ key, expiresAt: { $gt: new Date() } });
    if (cached && cached.snapshot?.length) {
      return cached.snapshot.slice(0, limit);
    }

    const { GlobalPlayLog } = await import('../models/GlobalPlayLog');
    const { Song } = await import('../models/Song');

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Aggregate global plays
    const artists = await GlobalPlayLog.aggregate([
      // 1. Filter by time window
      { $match: { timestamp: { $gte: since } } },

      // 2. Group by artist/channel
      {
        $group: {
          _id: '$channelId',
          artistName: { $first: '$artist' }, // Pick one name occurrence
          playCount: { $sum: 1 },
          songIds: { $addToSet: '$songId' } // Collect song IDs to find thumbnail later
        }
      },

      // 3. Sort by popularity
      { $sort: { playCount: -1 } },

      // 4. Limit for processing (get more than needed to filter bad results)
      { $limit: limit * 2 }
    ]);

    // Enrich with thumbnails from Songs table
    const enrichedArtists = await Promise.all(artists.map(async (artist) => {
      // Find the most popular song by this artist to get a good thumbnail
      // We look for a song that matches one of the played song IDs
      const topSong = await Song.findOne({
        youtubeId: { $in: artist.songIds },
        thumbnailHd: { $exists: true, $ne: null }
      }).sort({ viewCount: -1 });

      return {
        channelId: artist._id || 'unknown',
        name: artist.artistName,
        playCount: artist.playCount,
        songCount: artist.songIds.length,
        // Fallback to default if no song found (unlikely)
        thumbnail: topSong?.thumbnailHd || topSong?.thumbnail || 'https://via.placeholder.com/150'
      };
    }));

    // Sort again and limit
    const finalResults = enrichedArtists
      .filter(a => a.name) // Filter out missing names
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);

    // Cache the results
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour cache
    await TrendingCache.findOneAndUpdate(
      { key },
      { key, snapshot: finalResults as any, expiresAt }, // Cast as any since snapshot structure varies slightly from songs
      { upsert: true }
    );

    return finalResults;
  }
}

export const trendingService = new TrendingService();


