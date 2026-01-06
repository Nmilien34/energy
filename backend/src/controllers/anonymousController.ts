import { Request, Response } from 'express';
import { AnonymousSession, IAnonymousSession } from '../models/AnonymousSession';
import crypto from 'crypto';

/**
 * Generate a unique session ID for anonymous users
 */
const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex'); // 32 character hex string
};

/**
 * Helper to get session response data with daily reset check
 */
const getSessionResponseData = (session: IAnonymousSession) => {
  // Call reset check to ensure counts are accurate
  session.resetDailyPlaysIfNeeded();

  return {
    sessionId: session.sessionId,
    playCount: session.dailyPlayCount,
    totalPlayed: session.totalSongsPlayed,
    canPlayMore: session.canPlayMore(),
    hasReachedLimit: session.dailyPlayCount >= session.dailyLimit,
    remainingPlays: session.getRemainingPlays(),
    dailyLimit: session.dailyLimit,
    songsPlayedToday: session.songsPlayedToday
  };
};

/**
 * Create or retrieve an anonymous session for landing page
 * POST /api/anonymous/session
 *
 * Frontend should:
 * 1. Check localStorage for existing sessionId
 * 2. If exists, send it in request body
 * 3. Store returned sessionId in localStorage
 */
export const createOrGetSession = async (req: Request, res: Response) => {
  try {
    const { existingSessionId } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    // If existing session ID provided, try to retrieve it
    if (existingSessionId) {
      const existingSession = await AnonymousSession.findOne({
        sessionId: existingSessionId,
        sessionType: 'landing'
      });

      if (existingSession && new Date() < existingSession.expiresAt) {
        console.log(`[Anonymous] Existing session found: ${existingSessionId.substring(0, 8)}...`);

        return res.status(200).json({
          success: true,
          data: getSessionResponseData(existingSession),
          message: 'Session retrieved'
        });
      } else if (existingSession) {
        // Session expired, delete it
        await AnonymousSession.deleteOne({ sessionId: existingSessionId });
        console.log(`[Anonymous] Expired session deleted: ${existingSessionId.substring(0, 8)}...`);
      }
    }

    // IP-BASED ENFORCEMENT: Check if this IP already has an active session
    // This prevents users from simply clearing cookies to reset their limit
    if (ipAddress) {
      // Find the most recent active session for this IP
      const existingIpSession = await AnonymousSession.findOne({
        ipAddress,
        sessionType: 'landing',
        expiresAt: { $gt: new Date() } // Must be not expired
      }).sort({ updatedAt: -1 }); // Get the most recently used one

      if (existingIpSession) {
        console.log(`[Anonymous] Found existing active session for IP ${ipAddress} (reusing ${existingIpSession.sessionId.substring(0, 8)}...)`);

        return res.status(200).json({
          success: true,
          data: getSessionResponseData(existingIpSession),
          message: 'Session restored from IP'
        });
      }
    }

    // Create new session (expires in 30 days)
    const sessionId = generateSessionId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = new AnonymousSession({
      sessionId,
      sessionType: 'landing',
      dailyLimit: 5, // 5 songs per day
      songsPlayedToday: [],
      dailyPlayCount: 0,
      totalSongsPlayed: 0,
      ipAddress,
      userAgent,
      expiresAt
    });

    await session.save();

    console.log(`[Anonymous] New session created: ${sessionId.substring(0, 8)}...`);

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        playCount: 0,
        totalPlayed: 0,
        canPlayMore: true,
        hasReachedLimit: false,
        remainingPlays: 5,
        dailyLimit: 5,
        songsPlayedToday: []
      },
      message: 'New session created'
    });
  } catch (error) {
    console.error('[Anonymous] Error creating/retrieving session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
};

/**
 * Track song play for anonymous session
 * POST /api/anonymous/play
 *
 * Call this BEFORE playing a song to check if allowed
 * Returns whether play is allowed and remaining count
 */
export const trackPlay = async (req: Request, res: Response) => {
  try {
    const { sessionId, songId } = req.body;

    if (!sessionId || !songId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and Song ID are required'
      });
    }

    // Find session
    const session = await AnonymousSession.findOne({
      sessionId,
      sessionType: 'landing'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found. Please refresh the page.',
        requiresNewSession: true
      });
    }

    // Check if session expired
    if (new Date() >= session.expiresAt) {
      await AnonymousSession.deleteOne({ sessionId });
      return res.status(410).json({
        success: false,
        error: 'Session expired. Please refresh the page.',
        requiresNewSession: true
      });
    }

    // Reset daily plays if it's a new day
    session.resetDailyPlaysIfNeeded();

    // Check if this song was already played today (doesn't count against limit)
    if (session.hasPlayedSongToday(songId)) {
      return res.json({
        success: true,
        data: getSessionResponseData(session),
        message: 'Song already played today - replaying is free!'
      });
    }

    // Check if user can play more songs today
    if (!session.canPlayMore()) {
      await session.save(); // Save any daily reset that occurred

      return res.status(403).json({
        success: false,
        error: 'You\'ve reached your daily limit of 5 free songs. Sign up to listen to unlimited music!',
        requiresAuth: true,
        data: getSessionResponseData(session)
      });
    }

    // Add song play
    await session.addSongPlay(songId);

    // Get updated session data
    const remainingPlays = session.getRemainingPlays();

    console.log(`[Anonymous] Session ${sessionId.substring(0, 8)}... played song. Remaining: ${remainingPlays}`);

    res.json({
      success: true,
      data: getSessionResponseData(session),
      message: remainingPlays > 0
        ? `Enjoy! You have ${remainingPlays} free song${remainingPlays === 1 ? '' : 's'} left today.`
        : 'This is your last free song today. Sign up for unlimited music!'
    });
  } catch (error) {
    console.error('[Anonymous] Error tracking play:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track play'
    });
  }
};

/**
 * Check session status (can user play more songs?)
 * GET /api/anonymous/session/:sessionId
 */
export const getSessionStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await AnonymousSession.findOne({
      sessionId,
      sessionType: 'landing'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        requiresNewSession: true
      });
    }

    // Check if session expired
    if (new Date() >= session.expiresAt) {
      await AnonymousSession.deleteOne({ sessionId });
      return res.status(410).json({
        success: false,
        error: 'Session expired',
        requiresNewSession: true
      });
    }

    res.json({
      success: true,
      data: getSessionResponseData(session)
    });
  } catch (error) {
    console.error('[Anonymous] Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session status'
    });
  }
};

/**
 * Check if a specific song can be played (pre-flight check)
 * GET /api/anonymous/can-play/:sessionId/:songId
 */
export const canPlaySong = async (req: Request, res: Response) => {
  try {
    const { sessionId, songId } = req.params;

    const session = await AnonymousSession.findOne({
      sessionId,
      sessionType: 'landing'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        canPlay: false,
        error: 'Session not found',
        requiresNewSession: true
      });
    }

    if (new Date() >= session.expiresAt) {
      return res.status(410).json({
        success: false,
        canPlay: false,
        error: 'Session expired',
        requiresNewSession: true
      });
    }

    // Reset if new day
    session.resetDailyPlaysIfNeeded();

    // Can play if: already played today (free replay) OR under daily limit
    const alreadyPlayedToday = session.hasPlayedSongToday(songId);
    const canPlay = alreadyPlayedToday || session.canPlayMore();

    res.json({
      success: true,
      canPlay,
      alreadyPlayedToday,
      data: getSessionResponseData(session),
      message: !canPlay
        ? 'Daily limit reached. Sign up for unlimited music!'
        : alreadyPlayedToday
          ? 'Replaying this song is free!'
          : undefined
    });
  } catch (error) {
    console.error('[Anonymous] Error checking if can play:', error);
    res.status(500).json({
      success: false,
      canPlay: false,
      error: 'Failed to check play status'
    });
  }
};

