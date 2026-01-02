/**
 * Recommendation Routes
 * "Infinite Context" Shuffle Algorithm API
 */

import express from 'express';
import {
  getNextTrack,
  recordTransition,
  getSimilarTracks,
  getTransitionStats,
  getForYou,
  startRadio
} from '../controllers/recommendationController';
import { optionalAuth } from '../middleware/optionalAuth';
import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const nextTrackSchema = z.object({
  currentTrackId: z.string().min(1),
  sessionId: z.string().optional(),
  sessionHistory: z.array(z.string()).optional()
});

const transitionSchema = z.object({
  fromTrackId: z.string().min(1),
  toTrackId: z.string().min(1),
  sessionId: z.string().min(1),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
  source: z.enum(['auto', 'manual', 'shuffle']).optional()
});

const radioSchema = z.object({
  seedTrackId: z.string().min(1),
  sessionId: z.string().optional()
});

// ============================================================
// PUBLIC ROUTES (work for both anonymous and authenticated users)
// ============================================================

/**
 * Get next track recommendation
 * POST /api/recommend/next
 *
 * The main recommendation endpoint. Uses the "Infinite Context" algorithm
 * to suggest the best next track based on:
 * - Current track's genre/vibe
 * - User's listening history (if authenticated)
 * - Collaborative filtering ("what others listen to next")
 * - Trending songs in the same genre
 *
 * Request body:
 * {
 *   currentTrackId: string,    // YouTube ID or MongoDB ID
 *   sessionId?: string,        // Optional session for tracking
 *   sessionHistory?: string[]  // Recent tracks in this session
 * }
 */
router.post('/next', optionalAuth, validateRequest(nextTrackSchema), getNextTrack);

/**
 * Record a track transition (for improving recommendations)
 * POST /api/recommend/transition
 *
 * Call this when a user moves from one song to another.
 * This data feeds the collaborative filtering algorithm.
 */
router.post('/transition', optionalAuth, validateRequest(transitionSchema), recordTransition);

/**
 * Get similar tracks ("More Like This")
 * GET /api/recommend/similar/:trackId
 *
 * Returns tracks similar to the given track based on:
 * - Same artist/channel
 * - Similar genre tags
 * - Inferred musical characteristics
 */
router.get('/similar/:trackId', optionalAuth, getSimilarTracks);

/**
 * Get transition statistics for a track
 * GET /api/recommend/transitions/:trackId
 *
 * Shows what songs users typically play after this track.
 * Useful for debugging the algorithm or showing "Others also listened to".
 */
router.get('/transitions/:trackId', getTransitionStats);

/**
 * Start a radio station based on a seed track
 * POST /api/recommend/radio
 *
 * Creates a "radio station" starting from a seed track.
 * Returns the seed track plus 5 recommended follow-up tracks.
 */
router.post('/radio', optionalAuth, validateRequest(radioSchema), startRadio);

// ============================================================
// AUTHENTICATED ROUTES (require login)
// ============================================================

/**
 * Get personalized "For You" recommendations
 * GET /api/recommend/for-you
 *
 * Returns a personalized mix based on:
 * - User's liked songs
 * - Listening history
 * - Followed artists
 * - Trending in preferred genres
 *
 * For anonymous users, returns trending tracks.
 */
router.get('/for-you', optionalAuth, getForYou);

export default router;
