import express from 'express';
import {
  searchMusic,
  getSong,
  getAudioStream,
  getTrendingMusic,
  getRecentlyAdded,
  getPopularSongs,
  getRelatedSongs,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getRecentlyPlayed,
  recordPlay
} from '../controllers/musicController';
import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { searchRateLimit, streamRateLimit } from '../middleware/rateLimiting';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const searchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.number().min(1).max(50).optional(),
  type: z.enum(['song', 'artist', 'all']).optional()
});

const recordPlaySchema = z.object({
  songId: z.string().min(1),
  duration: z.number().min(0).optional(),
  completed: z.boolean().optional()
});

const favoriteSchema = z.object({
  songId: z.string().min(1)
});

// Public routes - no authentication required
router.get('/search', searchRateLimit, validateRequest(searchSchema), searchMusic);
router.get('/trending', getTrendingMusic);
router.get('/recent', getRecentlyAdded);
router.get('/popular', getPopularSongs);
router.get('/song/:id', getSong);
router.get('/song/:id/related', searchRateLimit, getRelatedSongs);
router.get('/stream/:id', streamRateLimit, getAudioStream);

// User-specific routes - authentication required
router.post('/favorites', auth, validateRequest(favoriteSchema), addToFavorites);
router.delete('/favorites/:songId', auth, removeFromFavorites);
router.get('/favorites', auth, getFavorites);
router.get('/recently-played', auth, getRecentlyPlayed);
router.post('/play', validateRequest(recordPlaySchema), recordPlay); // Optional auth

export default router;