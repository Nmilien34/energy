import express from 'express';
import multer from 'multer';
import { recognizeSong, getRecognitionStatus } from '../controllers/recognitionController';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    },
    fileFilter: (_req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// Validation schema for base64 recognition
const recognizeSchema = z.object({
    audio: z.string().optional(),
    audioData: z.string().optional(),
    isHumming: z.boolean().optional()
});

// Public routes - no authentication required

// POST /api/music/recognize
// Recognize song from audio (supports both file upload and base64)
router.post(
    '/recognize',
    upload.single('audio'),
    recognizeSong
);

// GET /api/music/recognize/status
// Check if recognition is available
router.get('/recognize/status', getRecognitionStatus);

export default router;
