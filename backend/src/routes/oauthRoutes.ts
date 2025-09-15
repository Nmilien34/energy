import express from 'express';
import {
  googleAuth,
  googleCallback,
  linkGoogleAccount,
  getYouTubeProfile,
  disconnectYouTube
} from '../controllers/oauthController';
import {
  getUserYouTubePlaylists,
  getYouTubePlaylistVideos,
  importYouTubePlaylist,
  syncYouTubePlaylist,
  deleteImportedPlaylist
} from '../controllers/playlistSyncController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Link Google account to existing user
router.get('/google/link', auth, linkGoogleAccount);

// YouTube specific routes
router.get('/youtube/profile', auth, getYouTubeProfile);
router.post('/youtube/disconnect', auth, disconnectYouTube);

// YouTube playlist sync routes
router.get('/youtube/playlists', auth, getUserYouTubePlaylists);
router.get('/youtube/playlists/:playlistId/videos', auth, getYouTubePlaylistVideos);
router.post('/youtube/playlists/import', auth, importYouTubePlaylist);
router.post('/youtube/playlists/:playlistId/sync', auth, syncYouTubePlaylist);
router.delete('/youtube/playlists/:playlistId', auth, deleteImportedPlaylist);

export default router;