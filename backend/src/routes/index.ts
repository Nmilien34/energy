import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';

const router = express.Router();

// Use routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router; 