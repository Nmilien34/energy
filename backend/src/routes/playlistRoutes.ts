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

// Public routes
router.get('/public', getPublicPlaylists);
router.get('/shared/:token', getSharedPlaylist);

// Protected routes - authentication required
router.post('/', playlistRateLimit, auth, validateRequest(createPlaylistSchema), createPlaylist);
router.get('/my', auth, getUserPlaylists);
router.get('/:id', getPlaylist); // Can be public or private
router.put('/:id', playlistRateLimit, auth, validateRequest(updatePlaylistSchema), updatePlaylist);
router.delete('/:id', playlistRateLimit, auth, deletePlaylist);

// Song management in playlists
router.post('/:id/songs', playlistRateLimit, auth, validateRequest(addSongSchema), addSongToPlaylist);
router.delete('/:id/songs/:songId', playlistRateLimit, auth, removeSongFromPlaylist);
router.put('/:id/reorder', playlistRateLimit, auth, validateRequest(reorderSongsSchema), reorderPlaylistSongs);

// Social features
router.post('/:id/follow', auth, followPlaylist);
router.post('/:id/share', auth, generateShareToken);

export default router;