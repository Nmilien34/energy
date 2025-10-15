import { Request, Response } from 'express';
import { Share, IShare } from '../models/Share';
import { AnonymousSession } from '../models/AnonymousSession';
import { Playlist } from '../models/Playlist';
import { Song } from '../models/Song';
import crypto from 'crypto';

/**
 * Generate a unique share ID
 */
const generateShareId = (): string => {
  return crypto.randomBytes(8).toString('hex'); // 16 character hex string
};

/**
 * Generate a unique session ID for anonymous users
 */
const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex'); // 32 character hex string
};

/**
 * Create a share link for a playlist
 * POST /api/share/playlist/:playlistId
 */
export const createPlaylistShare = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Find the playlist
    const playlist = await Playlist.findById(playlistId).populate('songs');

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    // Check if user owns the playlist
    const playlistOwnerId = playlist.owner.toString();
    const requestUserId = userId.toString();

    console.log('Playlist owner:', playlistOwnerId);
    console.log('Request user:', requestUserId);
    console.log('Match:', playlistOwnerId === requestUserId);

    if (playlistOwnerId !== requestUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only share your own playlists'
      });
    }

    // Check if share already exists for this playlist
    let share = await Share.findOne({
      playlist: playlistId,
      owner: userId,
      type: 'playlist',
      isActive: true
    });

    if (share) {
      // Return existing share
      return res.status(200).json({
        success: true,
        data: {
          shareId: share.shareId,
          shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareId}`,
          share
        }
      });
    }

    // Create new share
    const shareId = generateShareId();
    share = new Share({
      shareId,
      type: 'playlist',
      owner: userId,
      playlist: playlistId,
      title: playlist.name,
      description: playlist.description,
      thumbnail: playlist.thumbnail || (playlist.songs[0] as any)?.thumbnail
    });

    await share.save();

    res.status(201).json({
      success: true,
      data: {
        shareId: share.shareId,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareId}`,
        share
      }
    });
  } catch (error) {
    console.error('Error creating playlist share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create share link'
    });
  }
};

/**
 * Create a share link for a song
 * POST /api/share/song/:songId
 */
export const createSongShare = async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Find the song
    const song = await Song.findById(songId);

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    // Check if share already exists for this song
    let share = await Share.findOne({
      song: songId,
      owner: userId,
      type: 'song',
      isActive: true
    });

    if (share) {
      // Return existing share
      return res.status(200).json({
        success: true,
        data: {
          shareId: share.shareId,
          shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareId}`,
          share
        }
      });
    }

    // Create new share
    const shareId = generateShareId();
    share = new Share({
      shareId,
      type: 'song',
      owner: userId,
      song: songId,
      title: song.title,
      description: `${song.artist} - ${song.title}`,
      thumbnail: song.thumbnail
    });

    await share.save();

    res.status(201).json({
      success: true,
      data: {
        shareId: share.shareId,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareId}`,
        share
      }
    });
  } catch (error) {
    console.error('Error creating song share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create share link'
    });
  }
};

/**
 * Get shared content (public access)
 * GET /api/share/:shareId
 */
export const getSharedContent = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;

    // Find the share
    const share = await Share.findOne({ shareId, isActive: true })
      .populate('owner', 'username profilePicture')
      .populate({
        path: 'playlist',
        populate: {
          path: 'songs'
        }
      })
      .populate('song');

    if (!share) {
      return res.status(404).json({
        success: false,
        error: 'Share link not found or has expired'
      });
    }

    // Check if share is expired
    if (share.isExpired()) {
      return res.status(410).json({
        success: false,
        error: 'This share link has expired'
      });
    }

    // Increment view count
    await share.incrementViewCount();

    // Return share data
    res.status(200).json({
      success: true,
      data: {
        share,
        type: share.type,
        content: share.type === 'playlist' ? share.playlist : share.song
      }
    });
  } catch (error) {
    console.error('Error getting shared content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shared content'
    });
  }
};

/**
 * Initialize anonymous session for a shared link
 * POST /api/share/:shareId/session
 */
export const initializeAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const { existingSessionId } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    // Check if share exists
    const share = await Share.findOne({ shareId, isActive: true });

    if (!share) {
      return res.status(404).json({
        success: false,
        error: 'Share link not found'
      });
    }

    // Check if session already exists
    if (existingSessionId) {
      const existingSession = await AnonymousSession.findOne({
        sessionId: existingSessionId,
        shareId
      });

      if (existingSession && new Date() < existingSession.expiresAt) {
        return res.status(200).json({
          success: true,
          data: {
            sessionId: existingSession.sessionId,
            playCount: existingSession.playCount,
            canPlayMore: existingSession.canPlayMore(),
            hasReachedLimit: existingSession.hasReachedLimit
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
      shareId,
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
        hasReachedLimit: false
      }
    });
  } catch (error) {
    console.error('Error initializing anonymous session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize session'
    });
  }
};

/**
 * Track song play for anonymous session
 * POST /api/share/:shareId/play
 */
export const trackAnonymousPlay = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const { sessionId, songId } = req.body;

    if (!sessionId || !songId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and Song ID are required'
      });
    }

    // Find session
    const session = await AnonymousSession.findOne({ sessionId, shareId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if session is expired
    if (new Date() >= session.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'Session has expired'
      });
    }

    // Check if limit is already reached
    if (session.hasReachedLimit) {
      return res.status(403).json({
        success: false,
        error: 'Play limit reached. Please create an account to continue listening.',
        requiresAuth: true
      });
    }

    // Add song play
    await session.addSongPlay(songId);

    // Increment share play count
    const share = await Share.findOne({ shareId });
    if (share) {
      await share.incrementPlayCount();
    }

    res.status(200).json({
      success: true,
      data: {
        playCount: session.playCount,
        canPlayMore: session.canPlayMore(),
        hasReachedLimit: session.hasReachedLimit,
        remainingPlays: Math.max(0, 3 - session.playCount)
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
 * GET /api/share/:shareId/session/:sessionId
 */
export const checkSessionStatus = async (req: Request, res: Response) => {
  try {
    const { shareId, sessionId } = req.params;

    const session = await AnonymousSession.findOne({ sessionId, shareId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if session is expired
    if (new Date() >= session.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'Session has expired'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        playCount: session.playCount,
        canPlayMore: session.canPlayMore(),
        hasReachedLimit: session.hasReachedLimit,
        remainingPlays: Math.max(0, 3 - session.playCount),
        songsPlayed: session.songsPlayed
      }
    });
  } catch (error) {
    console.error('Error checking session status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check session status'
    });
  }
};

/**
 * Delete a share link (deactivate)
 * DELETE /api/share/:shareId
 */
export const deleteShare = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const share = await Share.findOne({ shareId });

    if (!share) {
      return res.status(404).json({
        success: false,
        error: 'Share not found'
      });
    }

    // Check if user owns the share
    if (share.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own shares'
      });
    }

    // Deactivate instead of delete (for analytics)
    share.isActive = false;
    await share.save();

    res.status(200).json({
      success: true,
      message: 'Share link deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete share'
    });
  }
};

/**
 * Get user's share links
 * GET /api/share/my
 */
export const getUserShares = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const shares = await Share.find({ owner: userId, isActive: true })
      .populate('playlist', 'name thumbnail')
      .populate('song', 'title artist thumbnail')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: shares
    });
  } catch (error) {
    console.error('Error getting user shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shares'
    });
  }
};
