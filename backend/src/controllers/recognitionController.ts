import { Request, Response } from 'express';
import { recognitionService } from '../services/recognitionService';
import { youtubeService } from '../services/youtubeService';
import { Song } from '../models/Song';

/**
 * POST /api/music/recognize
 * Recognize a song from audio data (file upload or base64)
 */
export const recognizeSong = async (req: Request, res: Response) => {
    try {
        const { audio, audioData, isHumming = false } = req.body;
        const audioFile = (req as any).file; // From multer if using file upload

        // Get audio data from either file upload or base64
        let audioBuffer: Buffer | string;

        if (audioFile) {
            // From multer file upload
            audioBuffer = audioFile.buffer;
        } else if (audio) {
            // From base64 string in body
            audioBuffer = audio;
        } else if (audioData) {
            // Alternative field name
            audioBuffer = audioData;
        } else {
            return res.status(400).json({
                success: false,
                error: 'No audio data provided. Send either a file upload or base64 audio data.'
            });
        }

        console.log(`[RecognizeSong] Processing ${isHumming ? 'humming' : 'audio'} recognition request`);

        // Call ACRCloud recognition service
        const result = await recognitionService.recognize({
            audioData: audioBuffer,
            isHumming
        });

        if (!result.success || !result.songs || result.songs.length === 0) {
            return res.status(404).json({
                success: false,
                error: result.message || 'Song not recognized'
            });
        }

        // Limit results for humming vs regular
        const maxResults = isHumming ? 5 : 1;
        const topMatches = result.songs.slice(0, maxResults);

        // Enrich matches with YouTube data and database presence
        const enrichedMatches = await Promise.all(topMatches.map(async (match) => {
            let youtubeId = match.externalIds?.youtube;

            // If no YouTube ID from ACRCloud, search for it
            if (!youtubeId) {
                try {
                    console.log(`[RecognizeSong] Searching YouTube for: ${match.title} - ${match.artist}`);
                    const searchResults = await youtubeService.searchSongs(
                        `${match.title} ${match.artist}`,
                        1
                    );

                    if (searchResults.length > 0) {
                        youtubeId = searchResults[0].id;
                    }
                } catch (searchError) {
                    console.error('[RecognizeSong] YouTube search failed:', searchError);
                }
            }

            // Find or create song in database if we have a YouTube ID
            let dbSong = null;
            if (youtubeId) {
                dbSong = await Song.findOne({ youtubeId });

                if (!dbSong) {
                    // Create new song entry
                    dbSong = new Song({
                        youtubeId,
                        title: match.title,
                        artist: match.artist,
                        duration: match.duration,
                        publishedAt: match.releaseDate ? new Date(match.releaseDate) : undefined
                    });
                    await dbSong.save();
                }
            }

            return {
                recognized: {
                    title: match.title,
                    artist: match.artist,
                    album: match.album,
                    confidence: match.confidence
                },
                song: dbSong ? {
                    id: dbSong.youtubeId,
                    youtubeId: dbSong.youtubeId,
                    title: dbSong.title,
                    artist: dbSong.artist,
                    duration: dbSong.duration,
                    thumbnail: dbSong.thumbnail,
                    thumbnailHd: dbSong.thumbnailHd
                } : null,
                youtubeId
            };
        }));

        res.json({
            success: true,
            data: {
                matches: enrichedMatches,
                // For backward compatibility or simpler frontend handling
                recognized: enrichedMatches[0].recognized,
                song: enrichedMatches[0].song,
                youtubeId: enrichedMatches[0].youtubeId
            }
        });
    } catch (error) {
        console.error('[RecognizeSong] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to recognize song'
        });
    }
};

/**
 * GET /api/music/recognize/status
 * Check if ACRCloud is configured and available
 */
export const getRecognitionStatus = async (_req: Request, res: Response) => {
    try {
        const isConfigured = recognitionService.isConfigured();

        res.json({
            success: true,
            data: {
                available: isConfigured,
                message: isConfigured
                    ? 'Song recognition is available'
                    : 'Song recognition is not configured'
            }
        });
    } catch (error) {
        console.error('[RecognitionStatus] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check recognition status'
        });
    }
};
