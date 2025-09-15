import { Request, Response } from 'express';
import { Song, ISong } from '../models/Song';
import { UserLibrary } from '../models/UserLibrary';
import { youtubeService } from '../services/youtubeService';
import { audioService } from '../services/audioService';
import { IUser } from '../models/User';
import { Types } from 'mongoose';

interface AuthRequest extends Request {
  user?: IUser;
}

interface SearchQuery {
  q: string;
  limit?: number;
  type?: 'song' | 'artist' | 'all';
}

export const searchMusic = async (req: Request, res: Response) => {
  try {
    const { q, limit = 20, type = 'song' } = req.query as any;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    let results;

    switch (type) {
      case 'artist':
        results = await youtubeService.searchArtist(q, parseInt(limit));
        break;
      case 'song':
      default:
        results = await youtubeService.searchSongs(q, parseInt(limit));
        break;
    }

    // Save new songs to database
    const savedSongs = await Promise.all(
      results.map(async (result) => {
        let song = await Song.findOne({ youtubeId: result.id });

        if (!song) {
          song = new Song({
            youtubeId: result.id,
            title: result.title,
            artist: result.artist,
            duration: result.duration,
            thumbnail: result.thumbnail,
            thumbnailHd: result.thumbnailHd,
            viewCount: result.viewCount,
            publishedAt: result.publishedAt ? new Date(result.publishedAt) : undefined,
            channelTitle: result.channelTitle,
            channelId: result.channelId,
            description: result.description
          });

          await song.save();
        }

        return song;
      })
    );

    res.json({
      success: true,
      data: {
        songs: savedSongs,
        total: savedSongs.length,
        query: q,
        type
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search music'
    });
  }
};

export const getSong = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let song = await Song.findOne({ youtubeId: id });

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    res.json({
      success: true,
      data: song
    });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get song'
    });
  }
};

export const getAudioStream = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quality = 'medium', mobile = false } = req.query;

    const audioResponse = await audioService.getAudioUrl(id, {
      quality: quality as 'low' | 'medium' | 'high',
      mobile: mobile === 'true'
    });

    // Increment play count
    const song = await Song.findOne({ youtubeId: id });
    if (song) {
      await song.incrementPlayCount();
    }

    res.json({
      success: true,
      data: audioResponse
    });
  } catch (error) {
    console.error('Get audio stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audio stream'
    });
  }
};

export const getTrendingMusic = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const trending = await youtubeService.getTrendingMusic(parseInt(limit as string));

    // Save trending songs to database
    const savedSongs = await Promise.all(
      trending.map(async (result) => {
        let song = await Song.findOne({ youtubeId: result.id });

        if (!song) {
          song = new Song({
            youtubeId: result.id,
            title: result.title,
            artist: result.artist,
            duration: result.duration,
            thumbnail: result.thumbnail,
            thumbnailHd: result.thumbnailHd,
            viewCount: result.viewCount,
            publishedAt: result.publishedAt ? new Date(result.publishedAt) : undefined,
            channelTitle: result.channelTitle,
            channelId: result.channelId,
            description: result.description
          });

          await song.save();
        }

        return song;
      })
    );

    res.json({
      success: true,
      data: {
        songs: savedSongs,
        total: savedSongs.length
      }
    });
  } catch (error) {
    console.error('Get trending music error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending music'
    });
  }
};

export const getRecentlyAdded = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const recentSongs = await Song.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        songs: recentSongs,
        total: recentSongs.length
      }
    });
  } catch (error) {
    console.error('Get recently added error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recently added songs'
    });
  }
};

export const getPopularSongs = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const popularSongs = await Song.find()
      .sort({ playCount: -1, viewCount: -1 })
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        songs: popularSongs,
        total: popularSongs.length
      }
    });
  } catch (error) {
    console.error('Get popular songs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular songs'
    });
  }
};

export const getRelatedSongs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    const relatedSongs = await youtubeService.getRelatedSongs(id, parseInt(limit as string));

    // Save related songs to database
    const savedSongs = await Promise.all(
      relatedSongs.map(async (result) => {
        let song = await Song.findOne({ youtubeId: result.id });

        if (!song) {
          song = new Song({
            youtubeId: result.id,
            title: result.title,
            artist: result.artist,
            duration: result.duration,
            thumbnail: result.thumbnail,
            thumbnailHd: result.thumbnailHd,
            viewCount: result.viewCount,
            publishedAt: result.publishedAt ? new Date(result.publishedAt) : undefined,
            channelTitle: result.channelTitle,
            channelId: result.channelId,
            description: result.description
          });

          await song.save();
        }

        return song;
      })
    );

    res.json({
      success: true,
      data: {
        songs: savedSongs,
        total: savedSongs.length,
        baseSong: id
      }
    });
  } catch (error) {
    console.error('Get related songs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get related songs'
    });
  }
};

// User-specific endpoints
export const addToFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const { songId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify song exists
    const song = await Song.findOne({ youtubeId: songId });
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    // Get or create user library
    let userLibrary = await UserLibrary.findOne({ user: userId });
    if (!userLibrary) {
      userLibrary = new UserLibrary({ user: userId });
    }

    await userLibrary.addToFavorites(song._id as Types.ObjectId);

    res.json({
      success: true,
      data: {
        message: 'Song added to favorites',
        songId: song.youtubeId
      }
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add song to favorites'
    });
  }
};

export const removeFromFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const { songId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const song = await Song.findOne({ youtubeId: songId });
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    const userLibrary = await UserLibrary.findOne({ user: userId });
    if (userLibrary) {
      await userLibrary.removeFromFavorites(song._id as Types.ObjectId);
    }

    res.json({
      success: true,
      data: {
        message: 'Song removed from favorites',
        songId: song.youtubeId
      }
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove song from favorites'
    });
  }
};

export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userLibrary = await UserLibrary.findOne({ user: userId })
      .populate('favoriteSongs');

    const favoriteSongs = userLibrary?.favoriteSongs || [];

    res.json({
      success: true,
      data: {
        songs: favoriteSongs,
        total: favoriteSongs.length
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get favorite songs'
    });
  }
};

export const getRecentlyPlayed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userLibrary = await UserLibrary.findOne({ user: userId })
      .populate('recentlyPlayed.song');

    const recentlyPlayed = userLibrary?.recentlyPlayed || [];

    res.json({
      success: true,
      data: {
        songs: recentlyPlayed,
        total: recentlyPlayed.length
      }
    });
  } catch (error) {
    console.error('Get recently played error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recently played songs'
    });
  }
};

export const recordPlay = async (req: AuthRequest, res: Response) => {
  try {
    const { songId, duration, completed = false } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      // Allow anonymous play tracking for basic functionality
      const song = await Song.findOne({ youtubeId: songId });
      if (song) {
        await song.incrementPlayCount();
      }

      return res.json({
        success: true,
        data: { message: 'Play recorded anonymously' }
      });
    }

    const song = await Song.findOne({ youtubeId: songId });
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    // Update song play count
    await song.incrementPlayCount();

    // Get or create user library
    let userLibrary = await UserLibrary.findOne({ user: userId });
    if (!userLibrary) {
      userLibrary = new UserLibrary({ user: userId });
      await userLibrary.save();
    }

    // Add to recently played and listening history
    await userLibrary.addToRecentlyPlayed(song._id as Types.ObjectId);
    await userLibrary.addToHistory(song._id as Types.ObjectId, duration || 0, completed);

    res.json({
      success: true,
      data: {
        message: 'Play recorded',
        songId: song.youtubeId
      }
    });
  } catch (error) {
    console.error('Record play error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record play'
    });
  }
};