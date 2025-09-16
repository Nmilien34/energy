import { google, youtube_v3 } from 'googleapis';
import ytdl from 'ytdl-core';
import playdl from 'play-dl';
import { config } from '../utils/config';
import { quotaTracker } from './quotaTracker';
import { Song } from '../models/Song';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  thumbnailHd?: string;
  viewCount?: number;
  publishedAt?: string;
  channelTitle?: string;
  channelId?: string;
  description?: string;
}

export interface AudioStreamInfo {
  url: string;
  quality: string;
  container: string;
  audioEncoding: string;
  expires: Date;
}

class YouTubeService {
  private youtube: youtube_v3.Youtube;
  private userAgent: string;
  private cookie?: string;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: config.youtube.apiKey
    });

    // Configure extraction headers
    this.userAgent = process.env.YT_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    this.cookie = process.env.YT_COOKIE;

    // If cookies provided, set for play-dl for better reliability
    if (this.cookie) {
      try {
        // @ts-ignore play-dl token setter
        playdl.setToken({ youtube: { cookie: this.cookie } });
        console.log('play-dl cookie configured for YouTube extraction');
      } catch (err) {
        console.warn('Failed to set play-dl cookie token:', err);
      }
    }
  }

  /**
   * Search for songs on YouTube with quota optimization
   */
  async searchSongs(query: string, maxResults: number = 20): Promise<YouTubeSearchResult[]> {
    try {
      if (!config.youtube.apiKey) {
        throw new Error('YouTube API key not configured');
      }

      // Check if we have quota available for search (100 units)
      if (!quotaTracker.canMakeSearchRequest()) {
        console.warn('YouTube API quota limit reached, using database fallback for search');
        return await this.searchDatabaseFallback(query, maxResults);
      }

      // Optimize search based on quota priority
      const priority = quotaTracker.getPriorityLevel();
      let optimizedMaxResults = maxResults;

      // Reduce search scope when quota is limited
      if (priority === 'HIGH') {
        optimizedMaxResults = Math.min(maxResults, 10);
      } else if (priority === 'CRITICAL') {
        optimizedMaxResults = Math.min(maxResults, 5);
      }

      console.log(`Searching YouTube with priority ${priority}, fetching ${optimizedMaxResults} results`);

      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        videoCategoryId: '10', // Music category
        maxResults: optimizedMaxResults,
        order: 'relevance',
        videoDuration: 'medium', // 4-20 minutes
        videoEmbeddable: 'true'
      });

      // Record the search request
      quotaTracker.recordSearchRequest();

      if (!response.data.items) {
        return [];
      }

      // Get video details for duration and statistics (1 unit per video)
      const videoIds = response.data.items.map(item => item.id?.videoId).filter(Boolean) as string[];

      // Check quota for video details
      if (!quotaTracker.canMakeVideoDetailsRequest(videoIds.length)) {
        console.warn('Not enough quota for video details, using basic metadata only');
        // Return results with basic metadata only
        return response.data.items.map(item => {
          const videoId = item.id?.videoId!;
          const snippet = item.snippet!;

          return {
            id: videoId,
            title: this.cleanTitle(snippet.title || ''),
            artist: this.extractArtist(snippet.title || '', snippet.channelTitle || ''),
            duration: 180, // Default duration estimate
            thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
            thumbnailHd: snippet.thumbnails?.high?.url || snippet.thumbnails?.maxres?.url || undefined,
            viewCount: 0, // No view count without video details
            publishedAt: snippet.publishedAt || undefined,
            channelTitle: snippet.channelTitle || undefined,
            channelId: snippet.channelId || undefined,
            description: snippet.description || undefined
          };
        });
      }

      const videoDetails = await this.getVideoDetails(videoIds);

      return response.data.items.map(item => {
        const videoId = item.id?.videoId!;
        const snippet = item.snippet!;
        const details = videoDetails.find(v => v.id === videoId);

        return {
          id: videoId,
          title: this.cleanTitle(snippet.title || ''),
          artist: this.extractArtist(snippet.title || '', snippet.channelTitle || ''),
          duration: this.parseDuration(details?.contentDetails?.duration || ''),
          thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          thumbnailHd: snippet.thumbnails?.high?.url || snippet.thumbnails?.maxres?.url || undefined,
          viewCount: parseInt(String(details?.statistics?.viewCount || '0')),
          publishedAt: snippet.publishedAt || undefined,
          channelTitle: snippet.channelTitle || undefined,
          channelId: snippet.channelId || undefined,
          description: snippet.description || undefined
        };
      }).filter(song => song.duration > 30 && song.duration < 1200); // Filter 30s - 20min
    } catch (error: any) {
      console.error('YouTube search error:', error);

      // Handle specific YouTube API errors
      if (error.message?.includes('quota')) {
        console.warn('Quota exceeded during search, falling back to database');
        return await this.searchDatabaseFallback(query, maxResults);
      } else if (error.message?.includes('API key')) {
        throw new Error('YouTube API key is invalid or not configured.');
      } else if (error.message?.includes('403')) {
        throw new Error('YouTube API access forbidden. Check API key permissions.');
      }

      throw new Error('Failed to search YouTube');
    }
  }

  /**
   * Search database when quota is exceeded
   */
  private async searchDatabaseFallback(query: string, maxResults: number): Promise<YouTubeSearchResult[]> {
    try {
      console.log(`Searching database for: ${query}`);

      // Search existing songs in database
      const songs = await Song.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { artist: { $regex: query, $options: 'i' } },
          { channelTitle: { $regex: query, $options: 'i' } }
        ]
      })
      .sort({ playCount: -1, viewCount: -1 }) // Prioritize popular songs
      .limit(maxResults);

      return songs.map(song => ({
        id: song.youtubeId,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
        thumbnailHd: song.thumbnailHd || undefined,
        viewCount: song.viewCount || 0,
        publishedAt: song.publishedAt?.toISOString() || undefined,
        channelTitle: song.channelTitle || undefined,
        channelId: song.channelId || undefined,
        description: song.description || undefined
      }));
    } catch (error) {
      console.error('Database fallback search failed:', error);
      return [];
    }
  }

  /**
   * Get detailed video information with quota tracking
   */
  private async getVideoDetails(videoIds: string[]): Promise<any[]> {
    try {
      // Record quota usage for video details (1 unit per video)
      quotaTracker.recordVideoDetailsRequest(videoIds.length);

      const response = await this.youtube.videos.list({
        part: ['contentDetails', 'statistics'],
        id: videoIds
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching video details:', error);
      return [];
    }
  }

  /**
   * Get audio stream URL for a YouTube video
   */
  async getAudioStream(videoId: string): Promise<AudioStreamInfo> {
    try {
      // Try play-dl first (more reliable with recent YouTube updates)
      try {
        const playInfo = await playdl.video_info(`https://www.youtube.com/watch?v=${videoId}`);
        const audioStream = playInfo.format.find(f => (f as any).audio_codec && !(f as any).video_codec);

        if (audioStream) {
          return {
            url: audioStream.url || '',
            quality: audioStream.quality || 'medium',
            container: (audioStream as any).container || 'webm',
            audioEncoding: (audioStream as any).audio_codec || 'opus',
            expires: new Date(Date.now() + 6 * 60 * 60 * 1000)
          };
        }
      } catch (playError) {
        console.warn(`play-dl failed for ${videoId}, trying ytdl-core:`, playError);
      }

      // Fallback to ytdl-core
      try {
        const info = await ytdl.getInfo(videoId, {
          requestOptions: {
            headers: {
              'User-Agent': this.userAgent,
              ...(this.cookie ? { 'Cookie': this.cookie } : {})
            }
          }
        } as any);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

        if (audioFormats.length > 0) {
          // Prefer highest quality audio
          const bestAudio = audioFormats.reduce((best, current) => {
            const bestBitrate = parseInt(String(best.audioBitrate || '0'));
            const currentBitrate = parseInt(String(current.audioBitrate || '0'));
            return currentBitrate > bestBitrate ? current : best;
          });

          return {
            url: bestAudio.url,
            quality: bestAudio.audioQuality || 'medium',
            container: bestAudio.container || 'webm',
            audioEncoding: bestAudio.audioCodec || 'opus',
            expires: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours
          };
        }
      } catch (ytdlError) {
        console.warn(`ytdl-core also failed for ${videoId}:`, ytdlError);
      }

      // Last resort: return YouTube embed URL as a fallback
      console.warn(`All audio extraction methods failed for ${videoId}, using embed fallback`);
      // Don't set origin parameter to avoid CORS issues - let frontend handle it
      const params = [
        'autoplay=1',
        'mute=1', // comply with browser autoplay policies
        'controls=0',
        'enablejsapi=1',
        'playsinline=1',
        'rel=0',
        'modestbranding=1'
      ].join('&');
      return {
        url: `https://www.youtube.com/embed/${videoId}?${params}`,
        quality: 'medium',
        container: 'embed',
        audioEncoding: 'youtube_embed',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      console.error(`Error getting audio stream for ${videoId}:`, error);
      throw new Error('Failed to get audio stream');
    }
  }

  /**
   * Get trending music videos with smart caching
   * Uses cached data when quota is limited, only fetches fresh data 2-3 times per day
   */
  async getTrendingMusic(maxResults: number = 20): Promise<YouTubeSearchResult[]> {
    try {
      const priority = quotaTracker.getPriorityLevel();

      // Check quota before making API call (costs 1 unit per video)
      if (!quotaTracker.canMakeVideoDetailsRequest(maxResults)) {
        console.warn('Not enough quota for trending music, using database fallback');
        const fallbackSongs = await Song.find()
          .sort({ viewCount: -1, playCount: -1 })
          .limit(maxResults);

        return fallbackSongs.map(song => ({
          id: song.youtubeId,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          thumbnail: song.thumbnail,
          thumbnailHd: song.thumbnailHd || undefined,
          viewCount: song.viewCount || 0,
          publishedAt: song.publishedAt?.toISOString() || undefined,
          channelTitle: song.channelTitle || undefined,
          channelId: song.channelId || undefined,
          description: song.description || undefined
        }));
      }

      console.log(`Fetching fresh trending music with priority ${priority}`);

      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        chart: 'mostPopular',
        videoCategoryId: '10', // Music category
        maxResults,
        regionCode: 'US'
      });

      // Record quota usage
      quotaTracker.recordVideoDetailsRequest(maxResults);

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map(item => {
        const snippet = item.snippet!;
        const contentDetails = item.contentDetails!;
        const statistics = item.statistics!;

        return {
          id: item.id!,
          title: this.cleanTitle(snippet.title || ''),
          artist: this.extractArtist(snippet.title || '', snippet.channelTitle || ''),
          duration: this.parseDuration(contentDetails.duration || ''),
          thumbnail: snippet.thumbnails?.medium?.url || '',
          thumbnailHd: snippet.thumbnails?.high?.url || undefined,
          viewCount: parseInt(String(statistics.viewCount || '0')),
          publishedAt: snippet.publishedAt || undefined,
          channelTitle: snippet.channelTitle || undefined,
          channelId: snippet.channelId || undefined,
          description: snippet.description || undefined
        };
      }).filter(song => song.duration > 30 && song.duration < 1200);
    } catch (error: any) {
      console.error('Error fetching trending music:', error);

      if (error.message?.includes('quota')) {
        console.warn('Quota exceeded for trending music, using database fallback');
        // Fallback to popular songs from database
        const fallbackSongs = await Song.find()
          .sort({ viewCount: -1, playCount: -1 })
          .limit(maxResults);

        return fallbackSongs.map(song => ({
          id: song.youtubeId,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          thumbnail: song.thumbnail,
          thumbnailHd: song.thumbnailHd || undefined,
          viewCount: song.viewCount || 0,
          publishedAt: song.publishedAt?.toISOString() || undefined,
          channelTitle: song.channelTitle || undefined,
          channelId: song.channelId || undefined,
          description: song.description || undefined
        }));
      }

      throw new Error('Failed to fetch trending music');
    }
  }

  /**
   * Search for artist's videos
   */
  async searchArtist(artistName: string, maxResults: number = 20): Promise<YouTubeSearchResult[]> {
    return this.searchSongs(`${artistName} music songs`, maxResults);
  }

  /**
   * Get related videos for a song
   */
  async getRelatedSongs(videoId: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
    try {
      // Get video details first
      const videoResponse = await this.youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      const video = videoResponse.data.items?.[0];
      if (!video) {
        return [];
      }

      const title = video.snippet?.title || '';
      const channelTitle = video.snippet?.channelTitle || '';

      // Search for similar content
      const searchQuery = `${this.extractArtist(title, channelTitle)} music`;
      return this.searchSongs(searchQuery, maxResults);
    } catch (error) {
      console.error('Error getting related songs:', error);
      return [];
    }
  }

  /**
   * Verify if a video is still available
   */
  async verifyVideo(videoId: string): Promise<boolean> {
    try {
      const response = await this.youtube.videos.list({
        part: ['status'],
        id: [videoId]
      });

      const video = response.data.items?.[0];
      return video?.status?.uploadStatus === 'processed' &&
             video?.status?.privacyStatus === 'public';
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up video title for better display
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\[.*?\]/g, '') // Remove square brackets
      .replace(/\(.*?\)/g, '') // Remove parentheses
      .replace(/【.*?】/g, '') // Remove Japanese brackets
      .replace(/Official.*?Video/gi, '')
      .replace(/Official.*?Audio/gi, '')
      .replace(/Music.*?Video/gi, '')
      .replace(/HD|4K|1080p|720p/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract artist name from title and channel
   */
  private extractArtist(title: string, channelTitle: string): string {
    // Common patterns to extract artist
    const patterns = [
      /^([^-]+)\s*-\s*/, // Artist - Song
      /^([^–]+)\s*–\s*/, // Artist – Song (em dash)
      /by\s+([^(]+)/i,   // by Artist
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback to channel title if no pattern matches
    return channelTitle || 'Unknown Artist';
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Get current quota usage statistics
   */
  getQuotaUsage() {
    return quotaTracker.getUsageStats();
  }

  /**
   * Check if quota is running low
   */
  isQuotaLow(): boolean {
    return quotaTracker.isApproachingLimit();
  }

  /**
   * Get optimal strategy based on current quota
   */
  getOptimalStrategy(): {
    searchAllowed: boolean;
    maxSearchResults: number;
    useCache: boolean;
    priority: string;
  } {
    const priority = quotaTracker.getPriorityLevel();

    return {
      searchAllowed: quotaTracker.canMakeSearchRequest(),
      maxSearchResults: priority === 'CRITICAL' ? 5 : priority === 'HIGH' ? 10 : 20,
      useCache: priority === 'HIGH' || priority === 'CRITICAL',
      priority
    };
  }
}

export const youtubeService = new YouTubeService();