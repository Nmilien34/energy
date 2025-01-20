import express from 'express';
import authRoutes from './auth.routes';

const router = express.Router();

// Use routes
router.use('/auth', authRoutes);

export default router; 