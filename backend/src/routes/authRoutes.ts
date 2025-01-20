import express from 'express';
import { login, register, logout, getCurrentUser } from '../controllers/authController';
import { validateLogin, validateRegister } from '../middleware/validation';
import { auth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Protected routes
router.post('/logout', auth, logout);
router.get('/me', auth, getCurrentUser);

export default router; 