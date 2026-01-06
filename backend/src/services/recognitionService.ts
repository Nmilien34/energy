import { config } from '../utils/config';

const acrcloud = require('acrcloud');

interface RecognitionOptions {
    audioData: Buffer | string; // Base64 string or Buffer
    isHumming?: boolean;
}

interface RecognitionResult {
    success: boolean;
    song?: {
        title: string;
        artist: string;
        album?: string;
        releaseDate?: string;
        duration?: number;
        externalIds?: {
            youtube?: string;
            spotify?: string;
            isrc?: string;
        };
    };
    confidence?: number;
    message?: string;
}

class RecognitionService {
    private acrConfig: any;

    constructor() {
        this.acrConfig = {
            host: process.env.ACRCLOUD_HOST || 'identify-us-west-2.acrcloud.com',
            access_key: process.env.ACRCLOUD_ACCESS_KEY,
            access_secret: process.env.ACRCLOUD_ACCESS_SECRET,
            timeout: 10000 // 10 seconds
        };

        if (!this.acrConfig.access_key || !this.acrConfig.access_secret) {
            console.warn('[RecognitionService] ACRCloud credentials not configured');
        }
    }

    /**
     * Check if ACRCloud is properly configured
     */
    isConfigured(): boolean {
        return !!(this.acrConfig.access_key && this.acrConfig.access_secret);
    }

    /**
     * Recognize a song from audio data
     */
    async recognize(options: RecognitionOptions): Promise<RecognitionResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'ACRCloud is not configured. Please add credentials to .env file.'
            };
        }

        try {
            const recognizer = new acrcloud.ACRCloudRecognizer(this.acrConfig);

            // Determine recognition type
            const recType = options.isHumming ? 'humming' : 'audio';

            // Convert base64 to buffer if needed
            let audioBuffer: Buffer;
            if (typeof options.audioData === 'string') {
                // Remove data URL prefix if present (e.g., "data:audio/webm;base64,...")
                const base64Data = options.audioData.replace(/^data:audio\/\w+;base64,/, '');
                audioBuffer = Buffer.from(base64Data, 'base64');
            } else {
                audioBuffer = options.audioData;
            }

            console.log(`[RecognitionService] Recognizing ${recType} (${audioBuffer.length} bytes)...`);

            // Call ACRCloud API
            const result = await recognizer.recognize(audioBuffer);

            return this.parseACRCloudResponse(result);
        } catch (error: any) {
            console.error('[RecognitionService] Recognition error:', error?.message || error);
            return {
                success: false,
                message: 'Failed to recognize song. Please try again.'
            };
        }
    }

    /**
     * Parse ACRCloud API response
     */
    private parseACRCloudResponse(result: any): RecognitionResult {
        try {
            // Check if recognition was successful
            if (result.status?.code !== 0) {
                const errorMessages: Record<number, string> = {
                    1001: 'No result found',
                    2000: 'Audio too short',
                    2001: 'No valid audio detected',
                    3001: 'Access denied (invalid credentials)',
                    3002: 'Limit exceeded',
                    3003: 'Invalid request'
                };

                return {
                    success: false,
                    message: errorMessages[result.status?.code] || 'Song not recognized'
                };
            }

            // Extract song metadata
            const music = result.metadata?.music?.[0];
            if (!music) {
                return {
                    success: false,
                    message: 'No match found'
                };
            }

            // Extract external IDs
            const externalIds: any = {};
            if (music.external_ids) {
                externalIds.youtube = music.external_ids.youtube?.vid;
                externalIds.spotify = music.external_ids.spotify?.track?.id;
            }
            if (music.external_metadata?.youtube) {
                externalIds.youtube = music.external_metadata.youtube.vid;
            }

            return {
                success: true,
                song: {
                    title: music.title,
                    artist: music.artists?.[0]?.name || 'Unknown Artist',
                    album: music.album?.name,
                    releaseDate: music.release_date,
                    duration: music.duration_ms ? Math.floor(music.duration_ms / 1000) : undefined,
                    externalIds
                },
                confidence: music.score || 100
            };
        } catch (error) {
            console.error('[RecognitionService] Error parsing response:', error);
            return {
                success: false,
                message: 'Error processing recognition result'
            };
        }
    }
}

export const recognitionService = new RecognitionService();
