import express from 'express';
import {
  createPlaylistShare,
  createSongShare,
  getSharedContent,
  initializeAnonymousSession,
  trackAnonymousPlay,
  checkSessionStatus,
  deleteShare,
  getUserShares
} from '../controllers/shareController';
import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const initSessionSchema = z.object({
  existingSessionId: z.string().optional()
});

const trackPlaySchema = z.object({
  sessionId: z.string().min(1),
  songId: z.string().min(1)
});

// Public routes - no authentication required
router.get('/:shareId', getSharedContent); // Get shared content (playlist or song)
router.post('/:shareId/session', validateRequest(initSessionSchema), initializeAnonymousSession); // Initialize anonymous session
router.post('/:shareId/play', validateRequest(trackPlaySchema), trackAnonymousPlay); // Track song play
router.get('/:shareId/session/:sessionId', checkSessionStatus); // Check session status

// Protected routes - authentication required
router.post('/playlist/:playlistId', auth, createPlaylistShare); // Create playlist share
router.post('/song/:songId', auth, createSongShare); // Create song share
router.get('/my/shares', auth, getUserShares); // Get user's shares
router.delete('/:shareId', auth, deleteShare); // Delete/deactivate share

export default router;
