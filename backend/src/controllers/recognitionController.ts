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

        if (!result.success || !result.song) {
            return res.status(404).json({
                success: false,
                error: result.message || 'Song not recognized'
            });
        }

        // Try to find or create the song in our database
        let youtubeId = result.song.externalIds?.youtube;

        // If no YouTube ID from ACRCloud, search for it
        if (!youtubeId) {
            try {
                console.log(`[RecognizeSong] Searching YouTube for: ${result.song.title} - ${result.song.artist}`);
                const searchResults = await youtubeService.searchSongs(
                    `${result.song.title} ${result.song.artist}`,
                    1
                );

                if (searchResults.length > 0) {
                    youtubeId = searchResults[0].id;
                }
            } catch (searchError) {
                console.error('[RecognizeSong] YouTube search failed:', searchError);
            }
        }

        // Find or create song in database
        let song = null;
        if (youtubeId) {
            song = await Song.findOne({ youtubeId });

            if (!song) {
                // Create new song entry
                song = new Song({
                    youtubeId,
                    title: result.song.title,
                    artist: result.song.artist,
                    duration: result.song.duration,
                    publishedAt: result.song.releaseDate ? new Date(result.song.releaseDate) : undefined
                });
                await song.save();
            }
        }

        res.json({
            success: true,
            data: {
                recognized: {
                    title: result.song.title,
                    artist: result.song.artist,
                    album: result.song.album,
                    confidence: result.confidence
                },
                song: song ? {
                    id: song.youtubeId,
                    youtubeId: song.youtubeId,
                    title: song.title,
                    artist: song.artist,
                    duration: song.duration,
                    thumbnail: song.thumbnail,
                    thumbnailHd: song.thumbnailHd
                } : null,
                youtubeId
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
