import { Request, Response } from 'express';
import { Song, ISong } from '../models/Song';
import { UserLibrary } from '../models/UserLibrary';
import { youtubeService } from '../services/youtubeService';
import { trendingService } from '../services/trendingService';
import { audioService } from '../services/audioService';
import { IUser } from '../models/User';
import { Types } from 'mongoose';


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

    try {
      switch (type) {
        case 'artist':
          results = await youtubeService.searchArtist(q, parseInt(limit));
          break;
        case 'song':
        default:
          results = await youtubeService.searchSongs(q, parseInt(limit));
          break;
      }
    } catch (error: any) {
      // If YouTube API quota is exceeded, try to get real trending data as fallback
      if (error.message?.includes('quota exceeded') || error.message?.includes('quotaExceeded')) {
        console.warn('YouTube API quota exceeded, trying trending music fallback');
        results = await getTrendingMusicFallback(parseInt(limit));
      } else {
        console.warn('YouTube API error, trying trending music fallback:', error.message);
        results = await getTrendingMusicFallback(parseInt(limit));
      }
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
        type,
        isMockData: results.length > 0 && results[0].id.startsWith('mock_')
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

// Enhanced fallback system when YouTube API quota is exceeded
async function getTrendingMusicFallback(limit: number): Promise<any[]> {
  try {
    // First, try to get cached trending data from database
    const cachedTrending = await Song.find({
      viewCount: { $gt: 100000 } // Songs with more than 100k views
    })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(limit);

    if (cachedTrending.length >= 5) {
      console.log('Using cached trending songs from database');
      return cachedTrending.map(song => ({
        id: song.youtubeId,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
        thumbnailHd: song.thumbnailHd,
        viewCount: song.viewCount,
        publishedAt: song.publishedAt,
        channelTitle: song.channelTitle,
        channelId: song.channelId,
        description: song.description
      }));
    }

    // If not enough cached data, try YouTube trending API (different endpoint)
    try {
      console.log('Attempting to get fresh trending music from YouTube API');
      const trendingResults = await youtubeService.getTrendingMusic(limit);
      if (trendingResults.length > 0) {
        console.log('Successfully got trending music from YouTube API');
        return trendingResults;
      }
    } catch (trendingError: any) {
      console.warn('Trending API also failed:', trendingError.message);
    }

    // Last resort: return any songs from database
    const anySongs = await Song.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    if (anySongs.length > 0) {
      console.log('Using any available songs from database');
      return anySongs.map(song => ({
        id: song.youtubeId,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
        thumbnailHd: song.thumbnailHd,
        viewCount: song.viewCount,
        publishedAt: song.publishedAt,
        channelTitle: song.channelTitle,
        channelId: song.channelId,
        description: song.description
      }));
    }

    // Final fallback: minimal demo songs if database is empty
    console.warn('No songs in database, using minimal demo songs');
    return generateMinimalMockData(limit);

  } catch (error) {
    console.error('Error in trending music fallback:', error);
    return generateMinimalMockData(limit);
  }
}

// Minimal mock data as absolute last resort
function generateMinimalMockData(limit: number): any[] {
  const popularSongs = [
    {
      id: `trending_${Date.now()}_1`,
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      duration: 200,
      thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg',
      viewCount: 1000000000,
      publishedAt: '2019-11-29T00:00:00Z',
      channelTitle: 'TheWeekndVEVO',
      description: 'Popular trending song'
    },
    {
      id: `trending_${Date.now()}_2`,
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      duration: 235,
      thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg',
      viewCount: 5000000000,
      publishedAt: '2017-01-30T00:00:00Z',
      channelTitle: 'Ed Sheeran',
      description: 'Popular trending song'
    },
    {
      id: `trending_${Date.now()}_3`,
      title: 'Bad Habits',
      artist: 'Ed Sheeran',
      duration: 231,
      thumbnail: 'https://i.ytimg.com/vi/orJSJGHjBLI/mqdefault.jpg',
      viewCount: 800000000,
      publishedAt: '2021-06-25T00:00:00Z',
      channelTitle: 'Ed Sheeran',
      description: 'Popular trending song'
    },
    {
      id: `trending_${Date.now()}_4`,
      title: 'Levitating',
      artist: 'Dua Lipa',
      duration: 203,
      thumbnail: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/mqdefault.jpg',
      viewCount: 600000000,
      publishedAt: '2020-10-01T00:00:00Z',
      channelTitle: 'Dua Lipa',
      description: 'Popular trending song'
    },
    {
      id: `trending_${Date.now()}_5`,
      title: 'Stay',
      artist: 'The Kid LAROI & Justin Bieber',
      duration: 141,
      thumbnail: 'https://i.ytimg.com/vi/kTJczUoc26U/mqdefault.jpg',
      viewCount: 900000000,
      publishedAt: '2021-07-09T00:00:00Z',
      channelTitle: 'The Kid LAROI',
      description: 'Popular trending song'
    }
  ];

  return popularSongs.slice(0, limit);
}

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

    let youtubeId = id;
    let song: any = null;

    // Check if the ID is a MongoDB ObjectId (24 characters, hexadecimal)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);

    if (isMongoId) {
      // Find song by MongoDB ID and get the YouTube ID
      song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          error: 'Song not found'
        });
      }
      youtubeId = song.youtubeId;
    } else {
      // Find song by YouTube ID
      song = await Song.findOne({ youtubeId: id });
    }

    const audioResponse = await audioService.getAudioUrl(youtubeId, {
      quality: quality as 'low' | 'medium' | 'high',
      mobile: mobile === 'true'
    });

    // Increment play count if song exists
    if (song) {
      await song.incrementPlayCount();
    }

    // Map to frontend expected shape
    res.json({
      success: true,
      data: {
        audioUrl: audioResponse.url,
        expiresAt: audioResponse.expires?.toISOString?.() || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        format: audioResponse.format as any,
        isEmbed: (audioResponse.format as any) === 'embed',
        youtubeId
      }
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

    // Use cached trending results with 12h TTL
    const trending = await trendingService.getTrending(parseInt(limit as string));

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
export const addToFavorites = async (req: Request, res: Response) => {
  try {
    const { songId } = req.body;
    const userId = (req as any).user?._id;

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

export const removeFromFavorites = async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const userId = (req as any).user?._id;

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

export const getFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

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

export const getRecentlyPlayed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

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

export const recordPlay = async (req: Request, res: Response) => {
  try {
    const { songId, duration, completed = false } = req.body;
    const userId = (req as any).user?._id;

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

// YouTube IFrame Player API - Compliant solution
export const getYouTubeEmbedUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let youtubeId = id;
    let song: any = null;

    // Check if the ID is a MongoDB ObjectId (24 characters, hexadecimal)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);

    if (isMongoId) {
      // Find song by MongoDB ID and get the YouTube ID
      song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          error: 'Song not found'
        });
      }
      youtubeId = song.youtubeId;
    } else {
      // Find song by YouTube ID
      song = await Song.findOne({ youtubeId: id });
      if (!song) {
        return res.status(404).json({
          success: false,
          error: 'Song not found'
        });
      }
    }

    // Generate YouTube embed URL with proper parameters
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0&enablejsapi=1&origin=${encodeURIComponent(process.env.FRONTEND_URL || 'http://localhost:3000')}`;

    // Increment play count
    await song.incrementPlayCount();

    res.json({
      success: true,
      data: {
        embedUrl,
        playerType: 'youtube_embed',
        song: {
          id: song.youtubeId,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          thumbnail: song.thumbnail
        }
      }
    });
  } catch (error) {
    console.error('Get YouTube embed URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get YouTube embed URL'
    });
  }
};

// Alternative audio streaming with better error handling
export const getAudioStreamWithFallback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quality = 'medium', mobile = false } = req.query;

    // Check if song exists
    const song = await Song.findOne({ youtubeId: id });
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    try {
      // Try to get audio stream
      const audioResponse = await audioService.getAudioUrl(id, {
        quality: quality as 'low' | 'medium' | 'high',
        mobile: mobile === 'true'
      });

      // Increment play count
      await song.incrementPlayCount();

      res.json({
        success: true,
        data: {
          audioUrl: audioResponse.url,
          expiresAt: audioResponse.expires?.toISOString?.() || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          format: audioResponse.format as any,
          isEmbed: (audioResponse.format as any) === 'embed',
          youtubeId: id,
          fallback: {
            embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0`,
            playerType: 'youtube_embed'
          }
        }
      });
    } catch (audioError) {
      console.warn(`Audio stream failed for ${id}, providing fallback:`, audioError);
      
      // Provide YouTube embed as fallback
      const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0`;
      
      res.json({
        success: true,
        data: {
          audioUrl: embedUrl,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          format: 'embed',
          isEmbed: true,
          youtubeId: id,
          fallback: true,
          reason: 'Audio stream unavailable, using YouTube embed'
        }
      });
    }
  } catch (error) {
    console.error('Get audio stream with fallback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audio stream'
    });
  }
};

// Audio streaming proxy to handle CORS and provide reliable streaming
export const streamAudioProxy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quality = 'medium', mobile = false } = req.query;

    // Check if song exists
    const song = await Song.findOne({ youtubeId: id });
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    try {
      // Get audio stream URL
      const audioResponse = await audioService.getAudioUrl(id, {
        quality: quality as 'low' | 'medium' | 'high',
        mobile: mobile === 'true'
      });

      // Set CORS headers
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Content-Type': 'audio/webm',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });

      // Handle range requests for audio streaming
      const range = req.headers.range;
      if (range) {
        // Forward range request to YouTube
        const response = await fetch(audioResponse.url, {
          headers: {
            'Range': range,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.status === 206) {
          // Partial content response
          const contentLength = response.headers.get('content-length');
          const contentRange = response.headers.get('content-range');

          if (contentLength) res.set('Content-Length', contentLength);
          if (contentRange) res.set('Content-Range', contentRange);

          res.status(206);
          response.body?.pipeTo(res as any);
        } else {
          // Full content response
          res.status(200);
          response.body?.pipeTo(res as any);
        }
      } else {
        // Stream full audio file
        const response = await fetch(audioResponse.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const contentLength = response.headers.get('content-length');
        if (contentLength) res.set('Content-Length', contentLength);

        res.status(200);
        response.body?.pipeTo(res as any);
      }

      // Increment play count
      await song.incrementPlayCount();

    } catch (audioError) {
      console.error(`Audio proxy failed for ${id}:`, audioError);
      res.status(500).json({
        success: false,
        error: 'Failed to stream audio',
        fallback: {
          embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0`,
          playerType: 'youtube_embed'
        }
      });
    }
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream audio'
    });
  }
};

// YouTube API Quota monitoring endpoint
export const getQuotaStatus = async (_req: Request, res: Response) => {
  try {
    const quotaStats = youtubeService.getQuotaUsage();
    const strategy = youtubeService.getOptimalStrategy();

    res.json({
      success: true,
      data: {
        quota: quotaStats,
        strategy,
        recommendations: {
          useCache: strategy.useCache,
          limitSearches: !strategy.searchAllowed,
          priorityLevel: strategy.priority
        }
      }
    });
  } catch (error) {
    console.error('Quota status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quota status'
    });
  }
};