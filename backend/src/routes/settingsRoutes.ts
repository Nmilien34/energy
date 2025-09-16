import express from 'express';
import {
  getUserSettings,
  updateNotificationSettings,
  updatePrivacySettings,
  updateAudioSettings,
  updateAppearanceSettings,
  updatePlaybackSettings,
  updateSocialSettings,
  updateProfile,
  changePassword,
  deleteAccount,
  getEqualizerPresets,
  getAvailableThemes,
  getAvailableAccentColors,
  resetSettings,
  exportUserData
} from '../controllers/settingsController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Get all user settings
router.get('/', getUserSettings);

// Notification settings
router.put('/notifications', updateNotificationSettings);

// Privacy settings
router.put('/privacy', updatePrivacySettings);

// Audio settings
router.put('/audio', updateAudioSettings);
router.get('/audio/equalizer/presets', getEqualizerPresets);

// Appearance settings
router.put('/appearance', updateAppearanceSettings);
router.get('/appearance/themes', getAvailableThemes);
router.get('/appearance/colors', getAvailableAccentColors);

// Playback settings
router.put('/playback', updatePlaybackSettings);

// Social settings
router.put('/social', updateSocialSettings);

// Profile settings
router.put('/profile', updateProfile);

// Security settings
router.put('/security/password', changePassword);
router.delete('/account', deleteAccount);

// Utility endpoints
router.post('/reset', resetSettings);
router.get('/export', exportUserData);

export default router;