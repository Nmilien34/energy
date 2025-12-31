import { Request, Response } from 'express';
import { AnonymousSession } from '../models/AnonymousSession';
import crypto from 'crypto';

/**
 * Generate a unique session ID for anonymous users
 */
const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex'); // 32 character hex string
};

/**
 * Create or retrieve an anonymous session for landing page
 * POST /api/anonymous/session
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
        return res.status(200).json({
          success: true,
          data: {
            sessionId: existingSession.sessionId,
            playCount: existingSession.playCount,
            canPlayMore: existingSession.canPlayMore(),
            hasReachedLimit: existingSession.hasReachedLimit,
            remainingPlays: Math.max(0, existingSession.playLimit - existingSession.playCount),
            songsPlayed: existingSession.songsPlayed
          }
        });
      }
    }

    // Create new session
    const sessionId = generateSessionId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Session expires in 24 hours

    const session = new AnonymousSession({
      sessionId,
      sessionType: 'landing',
      playLimit: 5, // 5 songs for landing page
      ipAddress,
      userAgent,
      expiresAt
    });

    await session.save();

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        playCount: 0,
        canPlayMore: true,
        hasReachedLimit: false,
        remainingPlays: 5,
        songsPlayed: []
      }
    });
  } catch (error) {
    console.error('Error creating/retrieving anonymous session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
};

/**
 * Track song play for anonymous session
 * POST /api/anonymous/play
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
        error: 'Session not found'
      });
    }

    // Check if session expired
    if (new Date() >= session.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'Session expired',
        requiresAuth: true
      });
    }

    // Check if limit already reached
    if (session.hasReachedLimit) {
      return res.status(403).json({
        success: false,
        error: 'Play limit reached. Please sign up to continue.',
        requiresAuth: true,
        data: {
          sessionId: session.sessionId,
          playCount: session.playCount,
          canPlayMore: false,
          hasReachedLimit: true,
          remainingPlays: 0,
          songsPlayed: session.songsPlayed
        }
      });
    }

    // Check if can play more
    if (!session.canPlayMore()) {
      session.hasReachedLimit = true;
      await session.save();

      return res.status(403).json({
        success: false,
        error: 'Play limit reached. Please sign up to continue.',
        requiresAuth: true,
        data: {
          sessionId: session.sessionId,
          playCount: session.playCount,
          canPlayMore: false,
          hasReachedLimit: true,
          remainingPlays: 0,
          songsPlayed: session.songsPlayed
        }
      });
    }

    // Add song play (only counts unique songs)
    await session.addSongPlay(songId);

    // Refresh session from DB
    const updatedSession = await AnonymousSession.findById(session._id);

    res.json({
      success: true,
      data: {
        sessionId: updatedSession!.sessionId,
        playCount: updatedSession!.playCount,
        canPlayMore: updatedSession!.canPlayMore(),
        hasReachedLimit: updatedSession!.hasReachedLimit,
        remainingPlays: Math.max(0, updatedSession!.playLimit - updatedSession!.playCount),
        songsPlayed: updatedSession!.songsPlayed
      }
    });
  } catch (error) {
    console.error('Error tracking anonymous play:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track play'
    });
  }
};

/**
 * Check session status
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
        error: 'Session not found'
      });
    }

    // Check if session expired
    if (new Date() >= session.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'Session expired',
        requiresAuth: true
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        playCount: session.playCount,
        canPlayMore: session.canPlayMore(),
        hasReachedLimit: session.hasReachedLimit,
        remainingPlays: Math.max(0, session.playLimit - session.playCount),
        songsPlayed: session.songsPlayed
      }
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session status'
    });
  }
};

