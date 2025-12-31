import { Song } from '../models/Song';
import { s3Service, S3AudioMetadata } from './s3Service';
import { youtubeService } from './youtubeService';
import { config } from '../utils/config';
import { Readable } from 'stream';
import fetch from 'node-fetch';

interface S3SyncOptions {
  minPlayCount?: number;
  batchSize?: number;
  delayBetweenSongs?: number;
  checkRateLimit?: boolean;
}

class S3SyncService {
  private isRunning: boolean = false;
  private syncedCount: number = 0;
  private failedCount: number = 0;
  private dailyUploadCount: number = 0;
  private lastResetDate: string = new Date().toDateString();

  /**
   * Sync popular songs to S3 storage
   * This reduces YouTube API calls by storing frequently played songs permanently
   */
  async syncPopularSongs(options: S3SyncOptions = {}): Promise<{
    synced: number;
    failed: number;
    skipped: number;
    duration: number;
  }> {
    if (!s3Service.isAvailable()) {
      console.warn('S3 service not available, skipping sync');
      return { synced: 0, failed: 0, skipped: 0, duration: 0 };
    }

    if (this.isRunning) {
      console.warn('S3 sync already running, skipping this run');
      return { synced: 0, failed: 0, skipped: 0, duration: 0 };
    }

    const startTime = Date.now();
    this.isRunning = true;
    this.syncedCount = 0;
    this.failedCount = 0;
    let skippedCount = 0;

    try {
      // Reset daily counter if it's a new day
      const today = new Date().toDateString();
      if (today !== this.lastResetDate) {
        this.dailyUploadCount = 0;
        this.lastResetDate = today;
      }

      // Use config values with option overrides
      const {
        minPlayCount = config.s3.minPlayCountForSync,
        batchSize = Math.min(config.s3.batchSize, config.s3.maxSongsPerDay - this.dailyUploadCount),
        delayBetweenSongs = 2000, // 2 seconds between songs to avoid rate limiting
        checkRateLimit = true
      } = options;

      // Check daily rate limit
      if (checkRateLimit && this.dailyUploadCount >= config.s3.maxSongsPerDay) {
        console.warn(`Daily upload limit reached (${config.s3.maxSongsPerDay}). Skipping sync.`);
        return { synced: 0, failed: 0, skipped: 0, duration: 0 };
      }

      // Adjust batch size to respect daily limit
      const effectiveBatchSize = Math.min(batchSize, config.s3.maxSongsPerDay - this.dailyUploadCount);

      console.log(`Starting S3 sync for popular songs (minPlayCount: ${minPlayCount}, batchSize: ${effectiveBatchSize}, dailyUploads: ${this.dailyUploadCount}/${config.s3.maxSongsPerDay})`);

      // Find popular songs that aren't in S3 yet
      const popularSongs = await Song.find({
        playCount: { $gte: minPlayCount },
        $or: [
          { audioSource: { $ne: 's3' } },
          { audioSource: { $exists: false } },
          { s3AudioKey: { $exists: false } }
        ]
      })
      .sort({ playCount: -1, viewCount: -1, lastPlayed: -1 }) // Prioritize recently played popular songs
      .limit(effectiveBatchSize);

      console.log(`Found ${popularSongs.length} popular songs to sync to S3`);

      for (const song of popularSongs) {
        try {
          // Check if already in S3 (double-check)
          const existsInS3 = await s3Service.audioExists(song.youtubeId);
          if (existsInS3) {
            console.log(`Song ${song.youtubeId} already in S3, updating database record`);
            song.audioSource = 's3';
            song.s3AudioKey = `audio/${song.youtubeId}.webm`;
            song.s3AudioFormat = 'webm';
            song.s3UploadedAt = new Date();
            await song.save();
            skippedCount++;
            continue;
          }

          // Download audio from YouTube
          console.log(`Downloading audio for: ${song.title} by ${song.artist}`);
          const audioUrl = await this.getDirectAudioUrl(song.youtubeId);

          if (!audioUrl) {
            console.error(`Failed to get audio URL for ${song.youtubeId}`);
            this.failedCount++;
            continue;
          }

          // Download the audio stream
          const audioStream = await this.downloadAudioStream(audioUrl);

          if (!audioStream) {
            console.error(`Failed to download audio stream for ${song.youtubeId}`);
            this.failedCount++;
            continue;
          }

          // Prepare metadata
          const metadata: S3AudioMetadata = {
            youtubeId: song.youtubeId,
            title: song.title,
            artist: song.artist,
            duration: song.duration,
            quality: 'medium',
            format: 'webm',
            uploadedAt: new Date()
          };

          // Upload to S3
          const s3Key = await s3Service.uploadAudio(
            song.youtubeId,
            audioStream,
            metadata,
            {
              contentType: 'audio/webm',
              acl: 'private'
            }
          );

          if (s3Key) {
            // Update song record
            song.audioSource = 's3';
            song.s3AudioKey = `audio/${song.youtubeId}.webm`;
            song.s3AudioFormat = 'webm';
            song.s3UploadedAt = new Date();
            await song.save();

            this.syncedCount++;
            this.dailyUploadCount++;
            console.log(`✓ Synced ${song.title} to S3 (${this.syncedCount}/${popularSongs.length}, daily: ${this.dailyUploadCount}/${config.s3.maxSongsPerDay})`);

            // Check if we've hit the daily limit
            if (checkRateLimit && this.dailyUploadCount >= config.s3.maxSongsPerDay) {
              console.warn(`Daily upload limit reached. Stopping sync.`);
              break;
            }
          } else {
            this.failedCount++;
            console.error(`Failed to upload ${song.youtubeId} to S3`);
          }

          // Delay between songs to avoid rate limiting
          if (delayBetweenSongs > 0) {
            await this.sleep(delayBetweenSongs);
          }

        } catch (error) {
          console.error(`Error syncing song ${song.youtubeId}:`, error);
          this.failedCount++;
        }
      }

      // Update S3 catalog with all songs
      await this.updateS3Catalog();

      const duration = Date.now() - startTime;
      console.log(`S3 sync completed: ${this.syncedCount} synced, ${this.failedCount} failed, ${skippedCount} skipped in ${duration}ms`);

      return {
        synced: this.syncedCount,
        failed: this.failedCount,
        skipped: skippedCount,
        duration
      };

    } catch (error) {
      console.error('Error in S3 sync process:', error);
      return {
        synced: this.syncedCount,
        failed: this.failedCount,
        skipped: 0,
        duration: Date.now() - startTime
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get direct audio URL from YouTube
   */
  private async getDirectAudioUrl(youtubeId: string): Promise<string | null> {
    try {
      const streamInfo = await youtubeService.getAudioStream(youtubeId);

      // Don't use embed URLs for S3 sync
      if (streamInfo.audioEncoding === 'youtube_embed') {
        console.warn(`Cannot download embed URL for ${youtubeId}`);
        return null;
      }

      return streamInfo.url;
    } catch (error) {
      console.error(`Failed to get audio URL for ${youtubeId}:`, error);
      return null;
    }
  }

  /**
   * Download audio stream from URL
   */
  private async downloadAudioStream(url: string): Promise<Readable | null> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Failed to download audio: ${response.status} ${response.statusText}`);
        return null;
      }

      return response.body as unknown as Readable;
    } catch (error) {
      console.error('Error downloading audio stream:', error);
      return null;
    }
  }

  /**
   * Update S3 catalog with all songs stored in S3
   */
  private async updateS3Catalog(): Promise<void> {
    try {
      const s3Songs = await Song.find({
        audioSource: 's3',
        s3AudioKey: { $exists: true }
      }).select('youtubeId title artist s3AudioFormat');

      const catalogData = s3Songs.map(song => ({
        youtubeId: song.youtubeId,
        title: song.title,
        artist: song.artist,
        format: song.s3AudioFormat || 'webm'
      }));

      await s3Service.updateCatalog(catalogData);
      console.log(`✓ Updated S3 catalog with ${catalogData.length} songs`);
    } catch (error) {
      console.error('Failed to update S3 catalog:', error);
    }
  }

  /**
   * Get S3 sync status
   */
  getStatus(): {
    isRunning: boolean;
    syncedCount: number;
    failedCount: number;
  } {
    return {
      isRunning: this.isRunning,
      syncedCount: this.syncedCount,
      failedCount: this.failedCount
    };
  }

  /**
   * Sync a specific song to S3
   */
  async syncSong(youtubeId: string): Promise<boolean> {
    if (!s3Service.isAvailable()) {
      console.warn('S3 service not available');
      return false;
    }

    try {
      const song = await Song.findOne({ youtubeId });
      if (!song) {
        console.error(`Song ${youtubeId} not found`);
        return false;
      }

      // Check if already in S3
      if (song.hasS3Audio()) {
        console.log(`Song ${youtubeId} already in S3`);
        return true;
      }

      // Get audio URL
      const audioUrl = await this.getDirectAudioUrl(youtubeId);
      if (!audioUrl) {
        return false;
      }

      // Download audio stream
      const audioStream = await this.downloadAudioStream(audioUrl);
      if (!audioStream) {
        return false;
      }

      // Prepare metadata
      const metadata: S3AudioMetadata = {
        youtubeId: song.youtubeId,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        quality: 'medium',
        format: 'webm',
        uploadedAt: new Date()
      };

      // Upload to S3
      const s3Key = await s3Service.uploadAudio(
        youtubeId,
        audioStream,
        metadata,
        {
          contentType: 'audio/webm',
          acl: 'private'
        }
      );

      if (s3Key) {
        // Update song record
        song.audioSource = 's3';
        song.s3AudioKey = `audio/${youtubeId}.webm`;
        song.s3AudioFormat = 'webm';
        song.s3UploadedAt = new Date();
        await song.save();

        console.log(`✓ Synced ${song.title} to S3`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error syncing song ${youtubeId} to S3:`, error);
      return false;
    }
  }

  /**
   * Cleanup old/unused songs from S3
   * Removes songs that haven't been played in X days and have low play counts
   */
  async cleanupUnusedSongs(): Promise<{
    deleted: number;
    failed: number;
    freedSpaceMB?: number;
  }> {
    if (!s3Service.isAvailable()) {
      console.warn('S3 service not available, skipping cleanup');
      return { deleted: 0, failed: 0 };
    }

    try {
      const cleanupAfterDays = config.s3.cleanupAfterDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cleanupAfterDays);

      // Find songs in S3 that:
      // 1. Haven't been played in X days
      // 2. Have low play count (< 5 plays)
      // 3. Were uploaded more than X days ago
      const unusedSongs = await Song.find({
        audioSource: 's3',
        s3AudioKey: { $exists: true },
        s3UploadedAt: { $lt: cutoffDate },
        $or: [
          { lastPlayed: { $lt: cutoffDate } },
          { lastPlayed: { $exists: false } }
        ],
        playCount: { $lt: 5 } // Low play count threshold
      }).limit(50); // Process in batches

      console.log(`Found ${unusedSongs.length} unused songs to cleanup from S3`);

      let deletedCount = 0;
      let failedCount = 0;

      for (const song of unusedSongs) {
        try {
          const deleted = await s3Service.deleteAudio(song.youtubeId, song.s3AudioFormat || 'webm');
          if (deleted) {
            // Remove S3 metadata from song
            song.audioSource = 'youtube';
            song.s3AudioKey = undefined;
            song.s3AudioFormat = undefined;
            song.s3UploadedAt = undefined;
            await song.save();
            deletedCount++;
            console.log(`✓ Cleaned up unused song: ${song.title}`);
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Failed to cleanup song ${song.youtubeId}:`, error);
          failedCount++;
        }
      }

      return { deleted: deletedCount, failed: failedCount };
    } catch (error) {
      console.error('Error in S3 cleanup:', error);
      return { deleted: 0, failed: 0 };
    }
  }

  /**
   * Check if a song should be automatically synced to S3 based on play count
   * This is called when a song's play count is incremented
   */
  async checkAndSyncIfNeeded(youtubeId: string): Promise<boolean> {
    if (!s3Service.isAvailable()) {
      return false;
    }

    // Check daily rate limit
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyUploadCount = 0;
      this.lastResetDate = today;
    }

    if (this.dailyUploadCount >= config.s3.maxSongsPerDay) {
      return false; // Daily limit reached
    }

    try {
      const song = await Song.findOne({ youtubeId });
      if (!song) {
        return false;
      }

      // Check if already in S3
      if (song.hasS3Audio()) {
        return true;
      }

      // Check if song meets criteria for auto-sync
      const minPlayCount = config.s3.minPlayCountForSync;
      if (song.playCount >= minPlayCount) {
        console.log(`Auto-syncing song to S3: ${song.title} (playCount: ${song.playCount})`);
        const result = await this.syncSong(youtubeId);
        if (result) {
          this.dailyUploadCount++;
        }
        return result;
      }

      return false;
    } catch (error) {
      console.error(`Error checking auto-sync for ${youtubeId}:`, error);
      return false;
    }
  }

  /**
   * Get daily upload statistics
   */
  getDailyStats(): {
    uploadedToday: number;
    maxPerDay: number;
    remaining: number;
  } {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyUploadCount = 0;
      this.lastResetDate = today;
    }

    return {
      uploadedToday: this.dailyUploadCount,
      maxPerDay: config.s3.maxSongsPerDay,
      remaining: Math.max(0, config.s3.maxSongsPerDay - this.dailyUploadCount)
    };
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const s3SyncService = new S3SyncService();
