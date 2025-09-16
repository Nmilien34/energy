import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  getUserLibrary,
  getRecentlyPlayed,
  getFavoriteSongs,
  addToFavorites,
  removeFromFavorites,
  addToRecentlyPlayed
} from '../controllers/userController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

// Library routes
router.get('/library', auth, getUserLibrary);
router.get('/library/recent', auth, getRecentlyPlayed);
router.get('/library/favorites', auth, getFavoriteSongs);
router.post('/library/favorites', auth, addToFavorites);
router.delete('/library/favorites', auth, removeFromFavorites);
router.post('/library/recent', auth, addToRecentlyPlayed);

export default router; 