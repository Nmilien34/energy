/**
 * Recommendation Controller
 * API endpoints for the "Infinite Context" shuffle algorithm
 */

import { Request, Response } from 'express';
import { Song } from '../models/Song';
import { TransitionLog } from '../models/TransitionLog';
import { recommendationEngine } from '../services/recommendationEngine';
import crypto from 'crypto';

/**
 * Generate a session ID for tracking
 */
const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Get next track recommendation
 * POST /api/recommend/next
 *
 * Body: {
 *   currentTrackId: string (YouTube ID or MongoDB ID)
 *   sessionId?: string (for session tracking)
 *   sessionHistory?: string[] (recent track IDs in session)
 * }
 */
export const getNextTrack = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { currentTrackId, sessionId, sessionHistory = [] } = req.body;
    const userId = (req as any).user?._id?.toString() || null;

    if (!currentTrackId) {
      return res.status(400).json({
        success: false,
        error: 'currentTrackId is required'
      });
    }

    // Find the current track
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(currentTrackId);
    let currentTrack;

    if (isMongoId) {
      currentTrack = await Song.findById(currentTrackId);
    } else {
      currentTrack = await Song.findOne({ youtubeId: currentTrackId });
    }

    if (!currentTrack) {
      return res.status(404).json({
        success: false,
        error: 'Current track not found'
      });
    }

    // Build session context
    const context = await recommendationEngine.buildSessionContext(
      userId,
      currentTrack,
      sessionHistory
    );

    // Get recommendation
    const recommendation = await recommendationEngine.getNextTrack(context);

    const duration = Date.now() - startTime;
    console.log(`[Recommendation API] Completed in ${duration}ms`);

    res.json({
      success: true,
      data: {
        nextTrack: recommendation.nextTrack,
        alternatives: recommendation.alternatives,
        sessionId: sessionId || generateSessionId()
      },
      debug: process.env.NODE_ENV !== 'production' ? recommendation.debug : undefined
    });
  } catch (error: any) {
    console.error('[Recommendation API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendation'
    });
  }
};

/**
 * Record a track transition (for collaborative filtering)
 * POST /api/recommend/transition
 *
 * Body: {
 *   fromTrackId: string
 *   toTrackId: string
 *   sessionId: string
 *   completed?: boolean (did user finish the first song?)
 *   skipped?: boolean (was the second song skipped?)
 *   source?: 'auto' | 'manual' | 'shuffle'
 * }
 */
export const recordTransition = async (req: Request, res: Response) => {
  try {
    const {
      fromTrackId,
      toTrackId,
      sessionId,
      completed = true,
      skipped = false,
      source = 'auto'
    } = req.body;
    const userId = (req as any).user?._id || null;

    if (!fromTrackId || !toTrackId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'fromTrackId, toTrackId, and sessionId are required'
      });
    }

    // Record the transition
    const transition = await TransitionLog.recordTransition(fromTrackId, toTrackId, {
      userId,
      sessionId,
      completed,
      skipped,
      source
    });

    console.log(`[Transition] Recorded: ${fromTrackId} -> ${toTrackId} (${source})`);

    res.status(201).json({
      success: true,
      data: {
        transitionId: transition._id,
        message: 'Transition recorded successfully'
      }
    });
  } catch (error: any) {
    console.error('[Transition API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record transition'
    });
  }
};

/**
 * Get similar tracks (for "More Like This" feature)
 * GET /api/recommend/similar/:trackId
 */
export const getSimilarTracks = async (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);

    // Find the track
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(trackId);
    let track;

    if (isMongoId) {
      track = await Song.findById(trackId);
    } else {
      track = await Song.findOne({ youtubeId: trackId });
    }

    if (!track) {
      return res.status(404).json({
        success: false,
        error: 'Track not found'
      });
    }

    // Get genre inference for the track
    const inference = recommendationEngine.inferGenre(track);

    // Find similar tracks based on genre and artist
    const similar = await Song.find({
      $and: [
        { youtubeId: { $ne: track.youtubeId } }, // Exclude current track
        {
          $or: [
            { channelId: track.channelId }, // Same artist
            { artist: track.artist },       // Same artist name
            { tags: { $in: inference.genres } } // Similar genre tags
          ]
        }
      ]
    })
      .sort({ playCount: -1, viewCount: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        tracks: similar,
        sourceTrack: {
          id: track.youtubeId,
          title: track.title,
          artist: track.artist
        },
        inferredGenres: inference.genres
      }
    });
  } catch (error: any) {
    console.error('[Similar Tracks API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get similar tracks'
    });
  }
};

/**
 * Get transition statistics for a track
 * GET /api/recommend/transitions/:trackId
 */
export const getTransitionStats = async (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const transitions = await TransitionLog.getTransitionProbabilities(trackId, limit);

    // Get track details for each transition target
    const trackIds = transitions.map(t => t.toTrackId);
    const tracks = await Song.find({ youtubeId: { $in: trackIds } })
      .select('youtubeId title artist thumbnail')
      .lean();

    const trackMap = new Map(tracks.map(t => [t.youtubeId, t]));

    const enrichedTransitions = transitions.map(t => ({
      ...t,
      track: trackMap.get(t.toTrackId) || null
    }));

    res.json({
      success: true,
      data: {
        fromTrackId: trackId,
        transitions: enrichedTransitions,
        totalTransitions: transitions.reduce((sum, t) => sum + t.count, 0)
      }
    });
  } catch (error: any) {
    console.error('[Transition Stats API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transition statistics'
    });
  }
};

/**
 * Get personalized "For You" recommendations
 * GET /api/recommend/for-you
 */
export const getForYou = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id?.toString() || null;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    if (!userId) {
      // For anonymous users, return trending
      const trending = await Song.find({ viewCount: { $gte: 10000 } })
        .sort({ playCount: -1, viewCount: -1 })
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        data: {
          tracks: trending,
          type: 'trending',
          message: 'Sign in for personalized recommendations'
        }
      });
    }

    // For authenticated users, build a smart mix
    const { UserLibrary } = await import('../models/UserLibrary');
    const userLibrary = await UserLibrary.findOne({ user: userId })
      .populate('favoriteSongs')
      .lean();

    if (!userLibrary || !(userLibrary.favoriteSongs as any[])?.length) {
      // New user: return trending
      const trending = await Song.find({ viewCount: { $gte: 10000 } })
        .sort({ playCount: -1 })
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        data: {
          tracks: trending,
          type: 'trending',
          message: 'Like some songs to get personalized recommendations'
        }
      });
    }

    // Analyze user's favorite genres
    const favorites = userLibrary.favoriteSongs as any[];
    const genreCounts = new Map<string, number>();

    for (const song of favorites) {
      const inference = recommendationEngine.inferGenre(song);
      for (const genre of inference.genres) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      }
    }

    // Get top genres
    const topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    // Build "For You" mix
    const forYouTracks = await Song.find({
      youtubeId: { $nin: favorites.map((s: any) => s.youtubeId) }, // Exclude already liked
      $or: topGenres.map(genre => ({
        $or: [
          { tags: { $regex: genre, $options: 'i' } },
          { title: { $regex: genre, $options: 'i' } }
        ]
      }))
    })
      .sort({ playCount: -1, viewCount: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        tracks: forYouTracks,
        type: 'personalized',
        topGenres,
        basedOn: favorites.length + ' liked songs'
      }
    });
  } catch (error: any) {
    console.error('[For You API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get For You recommendations'
    });
  }
};

/**
 * Start a radio station based on a seed track
 * POST /api/recommend/radio
 *
 * Body: {
 *   seedTrackId: string
 *   sessionId?: string
 * }
 */
export const startRadio = async (req: Request, res: Response) => {
  try {
    const { seedTrackId, sessionId: existingSessionId } = req.body;
    const userId = (req as any).user?._id?.toString() || null;

    if (!seedTrackId) {
      return res.status(400).json({
        success: false,
        error: 'seedTrackId is required'
      });
    }

    // Find the seed track
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(seedTrackId);
    let seedTrack;

    if (isMongoId) {
      seedTrack = await Song.findById(seedTrackId);
    } else {
      seedTrack = await Song.findOne({ youtubeId: seedTrackId });
    }

    if (!seedTrack) {
      return res.status(404).json({
        success: false,
        error: 'Seed track not found'
      });
    }

    // Generate session ID
    const sessionId = existingSessionId || generateSessionId();

    // Build initial context
    const context = await recommendationEngine.buildSessionContext(userId, seedTrack, []);

    // Get first batch of recommendations (5 tracks)
    const recommendations = [];
    let currentContext = context;

    for (let i = 0; i < 5; i++) {
      try {
        const rec = await recommendationEngine.getNextTrack(currentContext);
        recommendations.push(rec.nextTrack);

        // Update context for next iteration
        currentContext = {
          ...currentContext,
          currentTrack: rec.nextTrack,
          recentHistory: [...currentContext.recentHistory, rec.nextTrack.youtubeId]
        };
      } catch (error) {
        console.error(`[Radio] Failed to get recommendation ${i + 1}:`, error);
        break;
      }
    }

    res.json({
      success: true,
      data: {
        sessionId,
        seedTrack: {
          id: seedTrack.youtubeId,
          title: seedTrack.title,
          artist: seedTrack.artist,
          thumbnail: seedTrack.thumbnail
        },
        queue: recommendations,
        message: `Radio started based on "${seedTrack.title}"`
      }
    });
  } catch (error: any) {
    console.error('[Radio API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start radio'
    });
  }
};
