import { Router } from 'express';
import * as adminController from '../controllers/adminController';

const router = Router();

// Cache statistics and management
router.get('/cache/stats', adminController.getCacheStats);
router.post('/cache/clear', adminController.clearAllCaches);
router.post('/cache/redis/clear', adminController.clearRedisCache);
router.post('/cache/expired/clear', adminController.clearExpiredCaches);
router.get('/cache/popular-searches', adminController.getPopularSearches);

// S3 sync management
router.post('/s3/sync', adminController.syncPopularSongsToS3);
router.post('/s3/sync/:youtubeId', adminController.syncSongToS3);
router.get('/s3/sync/status', adminController.getS3SyncStatus);
router.get('/s3/catalog', adminController.getS3Catalog);
router.post('/s3/cleanup', adminController.cleanupUnusedS3Songs);
router.get('/s3/stats', adminController.getS3DailyStats);

// YouTube API quota monitoring
router.get('/youtube/quota', adminController.getYouTubeQuotaStatus);

export default router;
