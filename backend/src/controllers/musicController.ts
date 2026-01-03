import { Request, Response } from 'express';
import { Song, ISong, isValidYouTubeId } from '../models/Song';
import { UserLibrary } from '../models/UserLibrary';
import { SearchCache } from '../models/SearchCache';
import { youtubeService } from '../services/youtubeService';
import { trendingService } from '../services/trendingService';
import { audioService } from '../services/audioService';
import { redisService } from '../services/redisService';
import { s3Service } from '../services/s3Service';
import { bestMatchService } from '../services/bestMatchService';
import { IUser } from '../models/User';
import { Types } from 'mongoose';

/**
 * Decode HTML entities (e.g., &#39; -> ', &amp; -> &)
 * Handles data from YouTube API that may contain encoded entities
 */
const decodeHtmlEntities = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  // Decode numeric entities (&#39;, &#8217;, etc.)
  let decoded = text.replace(/&#(\d+);/g, (_, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });

  // Decode hex entities (&#x27;, etc.)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Decode named entities
  const entityMap: { [key: string]: string } = {
    '&apos;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
  };

  for (const [entity, char] of Object.entries(entityMap)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  return decoded;
};

// Helper function to normalize song objects (convert _id to id for frontend)
// Also decodes HTML entities in titles and other text fields
const normalizeSong = (song: any): any => {
  if (!song) return song;

  // If it's a Mongoose document, use toObject/toJSON
  let normalized;
  if (song.toObject && typeof song.toObject === 'function') {
    normalized = song.toObject();
  } else {
    // If it's a lean result or plain object, copy it
    normalized = { ...song };
  }

  // Convert _id to id
  if (normalized._id) {
    normalized.id = normalized._id.toString();
    delete normalized._id;
  } else if (normalized.youtubeId && !normalized.id) {
    // Fallback: use youtubeId as id if _id is missing
    normalized.id = normalized.youtubeId;
  }

  // Decode HTML entities in text fields (fixes &#39; etc.)
  if (normalized.title) {
    normalized.title = decodeHtmlEntities(normalized.title);
  }
  if (normalized.artist) {
    normalized.artist = decodeHtmlEntities(normalized.artist);
  }
  if (normalized.channelTitle) {
    normalized.channelTitle = decodeHtmlEntities(normalized.channelTitle);
  }
  if (normalized.description) {
    normalized.description = decodeHtmlEntities(normalized.description);
  }
  if (normalized.album) {
    normalized.album = decodeHtmlEntities(normalized.album);
  }

  return normalized;
};


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

    const limitNum = parseInt(limit);
    let results;
    let cacheSource = 'none';

    // LAYER 1: Check Redis cache first (fastest)
    if (redisService.isAvailable()) {
      const cachedResults = await redisService.getCachedSearchResults(q);
      if (cachedResults && cachedResults.length > 0) {
        console.log(`✓ Cache hit: Redis for query "${q}"`);
        results = cachedResults.slice(0, limitNum);
        cacheSource = 'redis';

        // Track popular search in background
        redisService.trackPopularSearch(q).catch(err =>
          console.error('Failed to track popular search:', err)
        );
      }
    }

    // LAYER 2: Check database SearchCache (if Redis missed)
    if (!results) {
      const dbCache = await (SearchCache as any).findValidCache(q, type);
      if (dbCache && dbCache.youtubeIds.length > 0) {
        console.log(`✓ Cache hit: Database for query "${q}"`);

        // Fetch songs from database by YouTube IDs (optimized with lean and selective fields)
        const songs = await Song.find({ youtubeId: { $in: dbCache.youtubeIds.slice(0, limitNum) } })
          .select('youtubeId title artist duration thumbnail thumbnailHd viewCount publishedAt channelTitle channelId description')
          .lean()
          .maxTimeMS(3000);

        if (songs.length > 0) {
          results = songs.map(song => normalizeSong(song));
          cacheSource = 'database';

          // Record cache hit
          await dbCache.recordHit();

          // Update Redis cache in background
          if (redisService.isAvailable()) {
            redisService.cacheSearchResults(q, results).catch(err =>
              console.error('Failed to update Redis cache:', err)
            );
          }
        }
      }
    }

    // LAYER 3: Search existing songs in MongoDB (if caches missed)
    if (!results) {
      // Optimize database search with lean and selective fields
      const existingSongs = await Song.find({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { artist: { $regex: q, $options: 'i' } },
          { channelTitle: { $regex: q, $options: 'i' } }
        ]
      })
      .select('youtubeId title artist duration thumbnail thumbnailHd viewCount publishedAt channelTitle channelId description playCount')
      .sort({ playCount: -1, viewCount: -1 })
      .limit(limitNum)
      .lean()
      .maxTimeMS(5000);

      if (existingSongs.length >= 5) {
        console.log(`✓ Found ${existingSongs.length} songs in database for query "${q}"`);
        results = existingSongs.map(song => normalizeSong(song));
        cacheSource = 'database-search';

        // Cache these results for future searches
        const youtubeIds = results.map(r => r.id);
        await Promise.all([
          (SearchCache as any).upsertCache(q, youtubeIds, type, 1),
          redisService.isAvailable() ? redisService.cacheSearchResults(q, results) : Promise.resolve()
        ]);
      }
    }

    // LAYER 4: Query YouTube API (last resort)
    if (!results) {
      console.log(`⚠ No cached results, querying YouTube API for "${q}"`);

      try {
        switch (type) {
          case 'artist':
            results = await youtubeService.searchArtist(q, limitNum);
            break;
          case 'song':
          default:
            // Use Musi Algorithm (Best Match) for the first result
            // This ensures the top result is the exact track the user wants
            if (limitNum >= 1) {
              try {
                console.log(`🎯 Using Musi Algorithm for best match`);
                const bestMatch = await bestMatchService.findBestMatch(q);
                
                if (bestMatch && bestMatch.isBestMatch && bestMatch.id && bestMatch.title) {
                  const score = typeof bestMatch.matchScore === 'number' ? bestMatch.matchScore.toFixed(1) : 'N/A';
                  console.log(`✅ Best match found: "${bestMatch.title}" (Score: ${score})`);
                  
                  try {
                    // Get additional results using regular search
                    const additionalResults = await youtubeService.searchSongs(q, Math.max(1, limitNum - 1));
                    // Combine: best match first, then additional results (avoid duplicates)
                    const bestMatchId = bestMatch.id;
                    const filteredAdditional = additionalResults.filter(r => r.id !== bestMatchId);
                    results = [bestMatch, ...filteredAdditional].slice(0, limitNum);
                    cacheSource = 'musi-algorithm';
                  } catch (additionalError: any) {
                    // If getting additional results fails, just use the best match
                    console.warn('Error getting additional results, using best match only:', additionalError?.message);
                    results = [bestMatch].slice(0, limitNum);
                    cacheSource = 'musi-algorithm';
                  }
                } else {
                  // Fallback to regular search if best match fails or is invalid
                  console.log(`⚠️  Best match algorithm failed or returned invalid result, using regular search`);
                  results = await youtubeService.searchSongs(q, limitNum);
                  cacheSource = 'youtube-api';
                }
              } catch (bestMatchError: any) {
                // If best match algorithm throws an error, fall back to regular search
                console.error('Best match algorithm error:', bestMatchError?.message || bestMatchError);
                console.error('Stack trace:', bestMatchError?.stack);
                console.log('⚠️  Falling back to regular YouTube search due to error');
                try {
                  results = await youtubeService.searchSongs(q, limitNum);
                  cacheSource = 'youtube-api';
                } catch (fallbackError: any) {
                  // If even the fallback fails, throw the error to be caught by outer catch
                  console.error('Fallback search also failed:', fallbackError?.message);
                  throw fallbackError;
                }
              }
            } else {
              results = await youtubeService.searchSongs(q, limitNum);
              cacheSource = 'youtube-api';
            }
            break;
        }

        // Cache the fresh results in all layers
        const youtubeIds = results.map(r => r.id);
        await Promise.all([
          (SearchCache as any).upsertCache(q, youtubeIds, type, 1),
          redisService.isAvailable() ? redisService.cacheSearchResults(q, results) : Promise.resolve()
        ]);

      } catch (error: any) {
        // If YouTube API quota is exceeded, try trending music fallback
        if (error.message?.includes('quota exceeded') || error.message?.includes('quotaExceeded')) {
          console.warn('YouTube API quota exceeded, using trending music fallback');
          results = await getTrendingMusicFallback(limitNum);
          cacheSource = 'fallback';
        } else {
          console.warn('YouTube API error, using trending music fallback:', error.message);
          results = await getTrendingMusicFallback(limitNum);
          cacheSource = 'fallback';
        }
      }
    }

    // Save new songs to database (upsert) - optimized batch operation
    // IMPORTANT: Use result.youtubeId (the real YouTube video ID) NOT result.id
    // When results come from database cache, result.id is the MongoDB _id, not the YouTube ID
    const savedSongs = await Promise.all(
      results.map(async (result) => {
        // Get the real YouTube video ID - prefer youtubeId field, fall back to id only for API results
        const realYoutubeId = result.youtubeId || result.id;

        // Validate the YouTube ID format before proceeding
        if (!isValidYouTubeId(realYoutubeId)) {
          console.warn(`[SearchMusic] Skipping result with invalid YouTube ID: "${realYoutubeId}" (title: ${result.title})`);
          return null; // Skip invalid results
        }

        // Use findOne without lean first to check if exists
        let song = await Song.findOne({ youtubeId: realYoutubeId })
          .select('youtubeId title artist duration thumbnail thumbnailHd viewCount publishedAt channelTitle channelId description');

        if (!song) {
          // Create new song with validated YouTube ID
          const newSong = new Song({
            youtubeId: realYoutubeId,
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

          await newSong.save();
          song = newSong;
        } else {
          // Update view count if it's higher (use updateOne for better performance)
          if (result.viewCount && result.viewCount > (song.viewCount || 0)) {
            await Song.updateOne(
              { youtubeId: realYoutubeId },
              { $set: { viewCount: result.viewCount } }
            );
            song.viewCount = result.viewCount;
          }
        }

        // Convert to plain object for response and normalize
        return normalizeSong(song);
      })
    );

    // Filter out any null results from invalid YouTube IDs
    const validSavedSongs = savedSongs.filter(song => song !== null);

    // Add cache headers based on cache source
    if (cacheSource === 'redis' || cacheSource === 'database') {
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour if from cache
    } else {
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes if fresh
    }

    res.json({
      success: true,
      data: {
        songs: validSavedSongs,
        total: validSavedSongs.length,
        query: q,
        type,
        cacheSource,
        isMockData: results.length > 0 && (results[0].youtubeId || results[0].id)?.startsWith('mock_')
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

    // Check if the ID is a MongoDB ObjectId (24 characters, hexadecimal)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);

    // Optimize query with lean and selective fields
    let song: any;
    if (isMongoId) {
      song = await Song.findById(id)
        .select('-__v')
        .lean()
        .maxTimeMS(3000);
    } else {
      song = await Song.findOne({ youtubeId: id })
        .select('-__v')
        .lean()
        .maxTimeMS(3000);
    }

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    // Normalize song object (convert _id to id)
    const songData = normalizeSong(song);

    // Add S3 cache status (check if has S3 audio)
    const isCached = song.audioSource === 's3' && !!song.s3AudioKey;
    const audioSource = song.audioSource || 'youtube';

    // Add cache headers (cache individual songs for 1 hour)
    res.set('Cache-Control', 'public, max-age=3600');
    
    res.json({
      success: true,
      data: {
        ...songData,
        isCached,
        audioSource
      }
    });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get song'
    });
  }
};

// isValidYouTubeId is now imported from '../models/Song'
// This provides consistent validation across the entire codebase

export const getAudioStream = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quality = 'medium', mobile = false, sessionId } = req.query;

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

      // Validate that the stored youtubeId is actually a valid YouTube video ID
      if (!isValidYouTubeId(youtubeId)) {
        console.error(`[AudioStream] Invalid YouTube ID stored in database for song ${id}: "${youtubeId}"`);
        console.error(`[AudioStream] This song has corrupt data - youtubeId looks like a MongoDB ID`);

        // Return error with helpful message
        return res.status(400).json({
          success: false,
          error: 'This song has invalid YouTube data. Please search for it again.',
          debug: {
            storedYoutubeId: youtubeId,
            mongoId: id,
            songTitle: song.title,
            issue: 'The stored YouTube ID is not a valid YouTube video ID'
          }
        });
      }
    } else {
      // Find song by YouTube ID
      song = await Song.findOne({ youtubeId: id });
    }

    // If anonymous session ID provided, track the play (optional - doesn't block if fails)
    if (sessionId && typeof sessionId === 'string') {
      try {
        const { AnonymousSession } = await import('../models/AnonymousSession');
        const session = await AnonymousSession.findOne({
          sessionId,
          sessionType: 'landing'
        });

        if (session && new Date() < session.expiresAt) {
          // Track play in background (don't await to avoid blocking)
          session.addSongPlay(song?._id?.toString() || youtubeId).catch(err => {
            console.error('Error tracking anonymous play:', err);
          });
        }
      } catch (err) {
        // Silently fail - don't block audio streaming if session tracking fails
        console.error('Error in anonymous session tracking:', err);
      }
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
        youtubeId,
        // Add audio source information for frontend
        audioSource: song?.audioSource || 'youtube',
        isCached: song?.hasS3Audio() || false,
        quality: audioResponse.quality
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

    // Save trending songs to database (optimized with selective fields)
    const savedSongs = await Promise.all(
      trending.map(async (result) => {
        // Validate YouTube ID format (trending comes from YouTube API, so result.id is the YouTube ID)
        if (!isValidYouTubeId(result.id)) {
          console.warn(`[TrendingMusic] Skipping result with invalid YouTube ID: "${result.id}"`);
          return null;
        }

        const realYoutubeId = result.id;

        // Use select only needed fields for faster queries
        let song = await Song.findOne({ youtubeId: realYoutubeId })
          .select('youtubeId title artist duration thumbnail thumbnailHd viewCount publishedAt channelTitle channelId');

        if (!song) {
          const newSong = new Song({
            youtubeId: realYoutubeId,
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

          await newSong.save();
          song = newSong;
        }

        // Convert to plain object for response and normalize
        return normalizeSong(song);
      })
    );

    // Filter out null results
    const validSavedSongs = savedSongs.filter(song => song !== null);

    // Add cache headers for trending music (cache for 1 hour)
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      success: true,
      data: {
        songs: validSavedSongs,
        total: validSavedSongs.length
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

    // Optimize query with lean() and selective fields
    const recentSongs = await Song.find()
      .select('youtubeId title artist duration thumbnail thumbnailHd viewCount createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean()
      .maxTimeMS(5000); // 5 second timeout

    // Normalize songs (convert _id to id)
    const normalizedSongs = recentSongs.map(song => normalizeSong(song));

    // Add cache headers (cache for 15 minutes)
    res.set('Cache-Control', 'public, max-age=900');
    res.json({
      success: true,
      data: {
        songs: normalizedSongs,
        total: normalizedSongs.length
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

    // Optimize query with lean() and selective fields
    const popularSongs = await Song.find()
      .select('youtubeId title artist duration thumbnail thumbnailHd viewCount playCount publishedAt')
      .sort({ playCount: -1, viewCount: -1 })
      .limit(parseInt(limit as string))
      .lean()
      .maxTimeMS(5000); // 5 second timeout

    // Normalize songs (convert _id to id)
    const normalizedSongs = popularSongs.map(song => normalizeSong(song));

    // Add cache headers (cache for 30 minutes)
    res.set('Cache-Control', 'public, max-age=1800');
    res.json({
      success: true,
      data: {
        songs: normalizedSongs,
        total: normalizedSongs.length
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

export const getTrendingArtists = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = parseInt(limit as string);

    // Aggregate songs by channelId/channelTitle to get trending artists
    // Group by channelId and calculate totals
    const artists = await Song.aggregate([
      // Match only songs with channel information
      {
        $match: {
          channelId: { $exists: true, $ne: null },
          channelTitle: { $exists: true, $ne: null }
        }
      },
      // Group by channelId
      {
        $group: {
          _id: '$channelId',
          name: { $first: '$channelTitle' }, // Use channelTitle as artist name
          channelId: { $first: '$channelId' },
          channelTitle: { $first: '$channelTitle' },
          // Sum playCount from all songs
          playCount: { $sum: '$playCount' },
          // Count number of songs
          songCount: { $sum: 1 },
          // Store all thumbnails to pick best one later
          thumbnails: { $push: { thumbnail: '$thumbnail', thumbnailHd: '$thumbnailHd', playCount: '$playCount' } }
        }
      },
      // Get thumbnail from the most popular song in the group
      {
        $lookup: {
          from: 'songs',
          let: { channelId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$channelId', '$$channelId'] }
              }
            },
            {
              $sort: { playCount: -1, viewCount: -1 }
            },
            {
              $limit: 1
            },
            {
              $project: {
                thumbnail: 1,
                thumbnailHd: 1
              }
            }
          ],
          as: 'topSongData'
        }
      },
      // Unwind and set thumbnail
      {
        $unwind: {
          path: '$topSongData',
          preserveNullAndEmptyArrays: true
        }
      },
      // Project final fields
      {
        $project: {
          _id: 0,
          name: '$name',
          channelId: '$channelId',
          channelTitle: '$channelTitle',
          playCount: { $ifNull: ['$playCount', 0] },
          songCount: { $ifNull: ['$songCount', 0] },
          thumbnail: {
            $ifNull: [
              '$topSongData.thumbnailHd',
              { $ifNull: ['$topSongData.thumbnail', null] }
            ]
          }
        }
      },
      // Sort by playCount descending
      {
        $sort: { playCount: -1, songCount: -1 }
      },
      // Limit results
      {
        $limit: limitNum
      }
    ], {
      maxTimeMS: 10000 // 10 second timeout for aggregation
    });

    // Add cache headers (cache for 1 hour)
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      success: true,
      data: {
        artists: artists
      }
    });
  } catch (error) {
    console.error('Get trending artists error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending artists'
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
        // Validate YouTube ID format (related songs come from YouTube API, so result.id is the YouTube ID)
        if (!isValidYouTubeId(result.id)) {
          console.warn(`[RelatedSongs] Skipping result with invalid YouTube ID: "${result.id}"`);
          return null;
        }

        const realYoutubeId = result.id;
        let song = await Song.findOne({ youtubeId: realYoutubeId });

        if (!song) {
          song = new Song({
            youtubeId: realYoutubeId,
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

    // Filter out null results
    const validSavedSongs = savedSongs.filter(song => song !== null);

    res.json({
      success: true,
      data: {
        songs: validSavedSongs,
        total: validSavedSongs.length,
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
          audioSource: song.audioSource || 'youtube',
          isCached: song.hasS3Audio(),
          quality: audioResponse.quality,
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