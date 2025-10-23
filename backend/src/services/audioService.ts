import { Song, ISong } from '../models/Song';
import { youtubeService, AudioStreamInfo } from './youtubeService';
import { redisService } from './redisService';
import { s3Service } from './s3Service';

export interface StreamOptions {
  quality: 'low' | 'medium' | 'high';
  format: 'audio' | 'stream';
  mobile: boolean;
}

export interface AudioResponse {
  url: string;
  expires: Date;
  quality: string;
  format: string;
  headers?: Record<string, string>;
}

class AudioService {
  /**
   * Get audio stream URL for a song with multi-layer caching
   * Priority: S3 > Redis > Database > YouTube API
   */
  async getAudioUrl(
    songId: string,
    options: Partial<StreamOptions> = {}
  ): Promise<AudioResponse> {
    try {
      let song = await Song.findOne({ youtubeId: songId });

      // LAYER 1: Check if song has S3 audio (highest priority)
      if (song?.hasS3Audio() && s3Service.isAvailable()) {
        console.log(`✓ Using S3 audio for ${songId}`);
        const s3Url = await s3Service.getAudioSignedUrl(songId, song.s3AudioFormat || 'webm');

        if (s3Url) {
          return {
            url: s3Url,
            expires: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
            quality: options.quality || 'high',
            format: song.s3AudioFormat || 'webm'
          };
        }
      }

      // LAYER 2: Check Redis cache for audio URL
      if (redisService.isAvailable()) {
        const cachedAudio = await redisService.getCachedAudioUrl(songId);
        if (cachedAudio) {
          console.log(`✓ Using cached audio URL from Redis for ${songId}`);
          return cachedAudio;
        }
      }

      // LAYER 3: Check database for valid cached URL
      if (song && !song.needsAudioRefresh() && song.audioUrl) {
        console.log(`✓ Using cached audio URL from database for ${songId}`);
        const isEmbedUrl = song.audioUrl.includes('youtube.com/embed');
        const audioResponse = {
          url: song.audioUrl,
          expires: song.audioUrlExpiry || new Date(Date.now() + 6 * 60 * 60 * 1000),
          quality: options.quality || 'medium',
          format: isEmbedUrl ? 'embed' : 'stream'
        };

        // Update Redis cache in background
        if (redisService.isAvailable()) {
          redisService.cacheAudioUrl(songId, audioResponse).catch(err =>
            console.error('Failed to cache audio URL in Redis:', err)
          );
        }

        return audioResponse;
      }

      // LAYER 4: Get fresh audio stream from YouTube API (last resort)
      console.log(`⚠ Fetching fresh audio URL from YouTube for ${songId}`);
      const streamInfo = await youtubeService.getAudioStream(songId);

      const audioResponse = {
        url: streamInfo.url,
        expires: streamInfo.expires,
        quality: streamInfo.quality,
        format: streamInfo.container,
        headers: this.getStreamHeaders(options.mobile || false)
      };

      // Update database cache
      if (song) {
        song.audioUrl = streamInfo.url;
        song.audioUrlExpiry = streamInfo.expires;
        song.audioSource = 'youtube';
        await song.save();
      }

      // Update Redis cache in background
      if (redisService.isAvailable()) {
        redisService.cacheAudioUrl(songId, audioResponse).catch(err =>
          console.error('Failed to cache audio URL in Redis:', err)
        );
      }

      return audioResponse;
    } catch (error) {
      console.error(`Error getting audio URL for ${songId}:`, error);
      throw new Error('Failed to get audio stream');
    }
  }

  /**
   * Get background playback URL optimized for mobile
   */
  async getBackgroundPlaybackUrl(songId: string): Promise<AudioResponse> {
    return this.getAudioUrl(songId, {
      quality: 'medium',
      format: 'audio',
      mobile: true
    });
  }

  /**
   * Get high quality audio URL for web players
   */
  async getHighQualityUrl(songId: string): Promise<AudioResponse> {
    return this.getAudioUrl(songId, {
      quality: 'high',
      format: 'stream',
      mobile: false
    });
  }

  /**
   * Preload audio URLs for a playlist
   */
  async preloadPlaylist(songIds: string[]): Promise<{ [songId: string]: AudioResponse }> {
    const results: { [songId: string]: AudioResponse } = {};

    // Process in batches to avoid overwhelming YouTube API
    const batchSize = 5;
    for (let i = 0; i < songIds.length; i += batchSize) {
      const batch = songIds.slice(i, i + batchSize);

      const promises = batch.map(async (songId) => {
        try {
          const audioResponse = await this.getAudioUrl(songId);
          results[songId] = audioResponse;
        } catch (error) {
          console.error(`Failed to preload ${songId}:`, error);
          // Continue with other songs even if one fails
        }
      });

      await Promise.allSettled(promises);

      // Small delay between batches to be respectful to YouTube
      if (i + batchSize < songIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Verify and refresh expired audio URLs
   */
  async refreshExpiredUrls(): Promise<number> {
    try {
      // Find songs with expired or soon-to-expire URLs (within 1 hour)
      const expiringSoon = new Date(Date.now() + 60 * 60 * 1000);
      const expiredSongs = await Song.find({
        audioUrl: { $exists: true },
        audioUrlExpiry: { $lt: expiringSoon }
      });

      let refreshedCount = 0;

      for (const song of expiredSongs) {
        try {
          const streamInfo = await youtubeService.getAudioStream(song.youtubeId);
          song.audioUrl = streamInfo.url;
          song.audioUrlExpiry = streamInfo.expires;
          await song.save();
          refreshedCount++;
        } catch (error) {
          console.error(`Failed to refresh ${song.youtubeId}:`, error);
          // Clear expired URL so it will be regenerated on next request
          song.audioUrl = undefined;
          song.audioUrlExpiry = undefined;
          await song.save();
        }
      }

      console.log(`Refreshed ${refreshedCount} expired audio URLs`);
      return refreshedCount;
    } catch (error) {
      console.error('Error refreshing expired URLs:', error);
      return 0;
    }
  }

  /**
   * Get streaming proxy URL for CORS and mobile compatibility
   */
  getProxyStreamUrl(songId: string, baseUrl: string): string {
    // This will be used for mobile apps that need CORS-free streaming
    return `${baseUrl}/api/music/stream/${songId}`;
  }

  /**
   * Get appropriate headers for streaming
   */
  private getStreamHeaders(mobile: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'audio/*',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    };

    if (mobile) {
      // Mobile-specific headers for better compatibility
      headers['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15';
      headers['Accept-Ranges'] = 'bytes';
    }

    return headers;
  }

  /**
   * Validate that a song can be streamed
   */
  async validateStreamability(songId: string): Promise<boolean> {
    try {
      const isValid = await youtubeService.verifyVideo(songId);
      if (!isValid) {
        // Remove invalid song from database
        await Song.deleteOne({ youtubeId: songId });
      }
      return isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get download URL for offline caching (mobile apps)
   */
  async getDownloadUrl(songId: string): Promise<AudioResponse> {
    // For mobile apps that want to cache songs locally
    return this.getAudioUrl(songId, {
      quality: 'medium',
      format: 'audio',
      mobile: true
    });
  }

  /**
   * Clean up old cached audio URLs
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const result = await Song.updateMany(
        { audioUrlExpiry: { $lt: expiredDate } },
        {
          $unset: {
            audioUrl: 1,
            audioUrlExpiry: 1
          }
        }
      );

      console.log(`Cleaned up ${result.modifiedCount} expired audio cache entries`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }

  /**
   * Get audio stream with retry logic
   */
  async getAudioUrlWithRetry(
    songId: string,
    options: Partial<StreamOptions> = {},
    maxRetries: number = 3
  ): Promise<AudioResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getAudioUrl(songId, options);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s between retries
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          console.log(`Retrying audio URL fetch for ${songId} (attempt ${attempt + 1})`);
        }
      }
    }

    throw lastError!;
  }
}

export const audioService = new AudioService();