import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import adminRoutes from './adminRoutes';

const router = express.Router();

// Use routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

export default router; 