import { Request, Response } from 'express';
import { redisService } from '../services/redisService';
import { s3Service } from '../services/s3Service';
import { s3SyncService } from '../services/s3SyncService';
import { youtubeService } from '../services/youtubeService';
import { Song } from '../models/Song';
import { SearchCache } from '../models/SearchCache';

/**
 * Get cache statistics
 */
export const getCacheStats = async (_req: Request, res: Response) => {
  try {
    const [redisStats, s3Stats, dbStats] = await Promise.all([
      redisService.getStats(),
      s3Service.getStats(),
      getCacheStatsFromDatabase()
    ]);

    const quotaStats = youtubeService.getQuotaUsage();
    const s3SyncStatus = s3SyncService.getStatus();

    res.json({
      success: true,
      data: {
        redis: redisStats,
        s3: {
          ...s3Stats,
          syncStatus: s3SyncStatus
        },
        database: dbStats,
        youtube: {
          quota: quotaStats,
          strategy: youtubeService.getOptimalStrategy()
        }
      }
    });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
};

/**
 * Get database cache statistics
 */
async function getCacheStatsFromDatabase() {
  const [
    totalSongs,
    s3Songs,
    cachedAudioUrls,
    searchCacheCount,
    popularSearches
  ] = await Promise.all([
    Song.countDocuments(),
    Song.countDocuments({ audioSource: 's3' }),
    Song.countDocuments({ audioUrl: { $exists: true }, audioUrlExpiry: { $gt: new Date() } }),
    SearchCache.countDocuments(),
    (SearchCache as any).getPopularSearches(5)
  ]);

  return {
    totalSongs,
    s3Songs,
    cachedAudioUrls,
    searchCacheCount,
    popularSearches
  };
}

/**
 * Clear all caches
 */
export const clearAllCaches = async (_req: Request, res: Response) => {
  try {
    const results = await Promise.allSettled([
      redisService.clearAll(),
      SearchCache.deleteMany({}),
      Song.updateMany(
        {},
        {
          $unset: {
            audioUrl: 1,
            audioUrlExpiry: 1
          }
        }
      )
    ]);

    res.json({
      success: true,
      data: {
        message: 'All caches cleared',
        results: results.map((r, i) => ({
          cache: ['redis', 'searchCache', 'audioCache'][i],
          status: r.status,
          value: r.status === 'fulfilled' ? r.value : null
        }))
      }
    });
  } catch (error) {
    console.error('Clear caches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear caches'
    });
  }
};

/**
 * Clear Redis cache only
 */
export const clearRedisCache = async (_req: Request, res: Response) => {
  try {
    const result = await redisService.clearAll();

    res.json({
      success: true,
      data: {
        message: result ? 'Redis cache cleared' : 'Redis not available',
        cleared: result
      }
    });
  } catch (error) {
    console.error('Clear Redis cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear Redis cache'
    });
  }
};

/**
 * Clear expired search caches
 */
export const clearExpiredCaches = async (_req: Request, res: Response) => {
  try {
    const result = await (SearchCache as any).cleanupExpired();

    res.json({
      success: true,
      data: {
        message: 'Expired search caches cleared',
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Clear expired caches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear expired caches'
    });
  }
};

/**
 * Get popular searches
 */
export const getPopularSearches = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const [redisPopular, dbPopular] = await Promise.all([
      redisService.getPopularSearches(parseInt(limit as string)),
      (SearchCache as any).getPopularSearches(parseInt(limit as string))
    ]);

    res.json({
      success: true,
      data: {
        redis: redisPopular,
        database: dbPopular
      }
    });
  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular searches'
    });
  }
};

/**
 * Trigger S3 sync for popular songs
 */
export const syncPopularSongsToS3 = async (req: Request, res: Response) => {
  try {
    const { minPlayCount = 10, batchSize = 20 } = req.body;

    // Start sync in background
    const syncPromise = s3SyncService.syncPopularSongs({
      minPlayCount,
      batchSize,
      delayBetweenSongs: 2000
    });

    // Don't wait for completion, return immediately
    res.json({
      success: true,
      data: {
        message: 'S3 sync started in background',
        status: s3SyncService.getStatus()
      }
    });

    // Log completion
    syncPromise.then(result => {
      console.log('S3 sync completed:', result);
    }).catch(error => {
      console.error('S3 sync failed:', error);
    });

  } catch (error) {
    console.error('Sync to S3 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start S3 sync'
    });
  }
};

/**
 * Sync a specific song to S3
 */
export const syncSongToS3 = async (req: Request, res: Response) => {
  try {
    const { youtubeId } = req.params;

    if (!youtubeId) {
      return res.status(400).json({
        success: false,
        error: 'YouTube ID is required'
      });
    }

    const result = await s3SyncService.syncSong(youtubeId);

    res.json({
      success: result,
      data: {
        message: result ? 'Song synced to S3 successfully' : 'Failed to sync song to S3',
        youtubeId
      }
    });
  } catch (error) {
    console.error('Sync song to S3 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync song to S3'
    });
  }
};

/**
 * Get S3 sync status
 */
export const getS3SyncStatus = async (_req: Request, res: Response) => {
  try {
    const status = s3SyncService.getStatus();

    const s3SongCount = await Song.countDocuments({ audioSource: 's3' });

    res.json({
      success: true,
      data: {
        ...status,
        totalS3Songs: s3SongCount
      }
    });
  } catch (error) {
    console.error('Get S3 sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get S3 sync status'
    });
  }
};

/**
 * Get S3 catalog
 */
export const getS3Catalog = async (_req: Request, res: Response) => {
  try {
    const catalog = await s3Service.getCatalog();

    if (!catalog) {
      return res.json({
        success: true,
        data: {
          message: 'No catalog found',
          songs: []
        }
      });
    }

    res.json({
      success: true,
      data: catalog
    });
  } catch (error) {
    console.error('Get S3 catalog error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get S3 catalog'
    });
  }
};

/**
 * Cleanup unused songs from S3
 */
export const cleanupUnusedS3Songs = async (_req: Request, res: Response) => {
  try {
    const result = await s3SyncService.cleanupUnusedSongs();

    res.json({
      success: true,
      data: {
        message: 'S3 cleanup completed',
        ...result
      }
    });
  } catch (error) {
    console.error('S3 cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup S3 songs'
    });
  }
};

/**
 * Get S3 daily upload statistics
 */
export const getS3DailyStats = async (_req: Request, res: Response) => {
  try {
    const stats = s3SyncService.getDailyStats();
    const s3SongCount = await Song.countDocuments({ audioSource: 's3' });

    res.json({
      success: true,
      data: {
        ...stats,
        totalS3Songs: s3SongCount
      }
    });
  } catch (error) {
    console.error('Get S3 daily stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get S3 daily stats'
    });
  }
};

/**
 * YouTube API quota status
 */
export const getYouTubeQuotaStatus = async (_req: Request, res: Response) => {
  try {
    const quotaStats = youtubeService.getQuotaUsage();
    const strategy = youtubeService.getOptimalStrategy();

    res.json({
      success: true,
      data: {
        quota: quotaStats,
        strategy,
        recommendations: {
          useCache: strategy.useCache,
          limitSearches: !strategy.searchAllowed,
          priorityLevel: strategy.priority
        }
      }
    });
  } catch (error) {
    console.error('Get YouTube quota status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get YouTube quota status'
    });
  }
};
