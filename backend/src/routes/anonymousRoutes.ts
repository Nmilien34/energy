import express from 'express';
import {
  createOrGetSession,
  trackPlay,
  getSessionStatus,
  canPlaySong
} from '../controllers/anonymousController';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createSessionSchema = z.object({
  existingSessionId: z.string().optional()
});

const trackPlaySchema = z.object({
  sessionId: z.string().min(1),
  songId: z.string().min(1)
});

// Public routes - no authentication required

// Create or retrieve session
// POST /api/anonymous/session
// Body: { existingSessionId?: string }
router.post('/session', validateRequest(createSessionSchema), createOrGetSession);

// Track a song play (call before playing)
// POST /api/anonymous/play
// Body: { sessionId: string, songId: string }
router.post('/play', validateRequest(trackPlaySchema), trackPlay);

// Get session status
// GET /api/anonymous/session/:sessionId
router.get('/session/:sessionId', getSessionStatus);

// Pre-flight check: can this song be played?
// GET /api/anonymous/can-play/:sessionId/:songId
router.get('/can-play/:sessionId/:songId', canPlaySong);

export default router;
