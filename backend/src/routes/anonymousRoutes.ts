import express from 'express';
import {
  createOrGetSession,
  trackPlay,
  getSessionStatus
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
router.post('/session', validateRequest(createSessionSchema), createOrGetSession);
router.post('/play', validateRequest(trackPlaySchema), trackPlay);
router.get('/session/:sessionId', getSessionStatus);

export default router;

