import { google, youtube_v3 } from 'googleapis';
import ytdl from 'ytdl-core';
import playdl from 'play-dl';
import { config } from '../utils/config';

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

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: config.youtube.apiKey
    });
  }

  /**
   * Search for songs on YouTube
   */
  async searchSongs(query: string, maxResults: number = 20): Promise<YouTubeSearchResult[]> {
    try {
      if (!config.youtube.apiKey) {
        throw new Error('YouTube API key not configured');
      }

      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        videoCategoryId: '10', // Music category
        maxResults,
        order: 'relevance',
        videoDuration: 'medium', // 4-20 minutes
        videoEmbeddable: 'true'
      });

      if (!response.data.items) {
        return [];
      }

      // Get video details for duration and statistics
      const videoIds = response.data.items.map(item => item.id?.videoId).filter(Boolean) as string[];
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
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube');
    }
  }

  /**
   * Get detailed video information
   */
  private async getVideoDetails(videoIds: string[]): Promise<any[]> {
    try {
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
      // Try ytdl-core first (more reliable for audio)
      const info = await ytdl.getInfo(videoId);
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

      // Fallback to play-dl
      const playInfo = await playdl.video_info(`https://www.youtube.com/watch?v=${videoId}`);
      const audioStream = playInfo.format.find(f => (f as any).audio_codec && !(f as any).video_codec);

      if (audioStream) {
        return {
          url: audioStream.url || '',
          quality: (audioStream as any).quality || 'medium',
          container: (audioStream as any).container || 'webm',
          audioEncoding: (audioStream as any).audio_codec || 'opus',
          expires: new Date(Date.now() + 6 * 60 * 60 * 1000)
        };
      }

      throw new Error('No audio stream found');
    } catch (error) {
      console.error(`Error getting audio stream for ${videoId}:`, error);
      throw new Error('Failed to get audio stream');
    }
  }

  /**
   * Get trending music videos
   */
  async getTrendingMusic(maxResults: number = 20): Promise<YouTubeSearchResult[]> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        chart: 'mostPopular',
        videoCategoryId: '10', // Music category
        maxResults,
        regionCode: 'US'
      });

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
    } catch (error) {
      console.error('Error fetching trending music:', error);
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
}

export const youtubeService = new YouTubeService();