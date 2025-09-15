import express from 'express';
import { login, register, logout, getCurrentUser } from '../controllers/authController';
import { validateLogin, validateRegister } from '../middleware/validation';
import { auth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiting';

const router = express.Router();

// Public routes
router.post('/register', authRateLimit, validateRegister, register);
router.post('/login', authRateLimit, validateLogin, login);

// Protected routes
router.post('/logout', auth, logout);
router.get('/me', auth, getCurrentUser);

export default router; 