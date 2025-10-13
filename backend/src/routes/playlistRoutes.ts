import express from 'express';
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  getPublicPlaylists,
  followPlaylist,
  generateShareToken,
  getSharedPlaylist
} from '../controllers/playlistController';
import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { playlistRateLimit } from '../middleware/rateLimiting';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  isCollaborative: z.boolean().optional()
});

const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  isCollaborative: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

const addSongSchema = z.object({
  songId: z.string().min(1)
});

const reorderSongsSchema = z.object({
  songIds: z.array(z.string().min(1))
});

// Public routes (specific paths first)
router.get('/public', getPublicPlaylists);
router.get('/shared/:token', getSharedPlaylist);

// Protected routes - authentication required
// IMPORTANT: Specific routes MUST come before generic /:id routes to avoid conflicts
router.post('/', playlistRateLimit, auth, validateRequest(createPlaylistSchema), createPlaylist);
router.get('/my', auth, getUserPlaylists);
router.get('/user', auth, getUserPlaylists);

// Song management in playlists (specific routes before /:id)
router.post('/:id/songs',
  (req, res, next) => {
    console.log('🎯 Matched route /:id/songs');
    console.log('  Playlist ID:', req.params.id);
    console.log('  Body:', req.body);
    next();
  },
  (req, res, next) => {
    console.log('✅ Passed rate limit');
    next();
  },
  playlistRateLimit,
  (req, res, next) => {
    console.log('✅ Passed auth');
    next();
  },
  auth,
  (req, res, next) => {
    console.log('✅ About to validate');
    next();
  },
  validateRequest(addSongSchema),
  (req, res, next) => {
    console.log('✅ Passed validation, calling controller');
    next();
  },
  addSongToPlaylist
);
router.delete('/:id/songs/:songId', playlistRateLimit, auth, removeSongFromPlaylist);
router.put('/:id/reorder', playlistRateLimit, auth, validateRequest(reorderSongsSchema), reorderPlaylistSongs);

// Social features (specific routes before /:id)
router.post('/:id/follow', auth, followPlaylist);
router.post('/:id/share', auth, generateShareToken);

// Generic playlist ID routes (MUST be after specific routes)
router.get('/:id', getPlaylist); // Get specific playlist - can be public or private
router.put('/:id', playlistRateLimit, auth, validateRequest(updatePlaylistSchema), updatePlaylist);
router.delete('/:id', playlistRateLimit, auth, deletePlaylist);

// Get user playlists (MUST be absolute last to avoid matching everything)
router.get('/', auth, getUserPlaylists); // GET /api/playlists returns user's playlists

export default router;