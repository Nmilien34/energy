import { z } from 'zod';

// Notification Settings Validation
export const notificationSettingsSchema = z.object({
  newMusicReleases: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  playlistUpdates: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  playlistShares: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  socialActivity: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  followers: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  likes: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  systemUpdates: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  securityAlerts: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }).optional()
});

// Privacy Settings Validation
export const privacySettingsSchema = z.object({
  privateProfile: z.boolean().optional(),
  shareListeningActivity: z.boolean().optional(),
  showFavorites: z.boolean().optional(),
  showPlaylists: z.boolean().optional(),
  allowFollowers: z.boolean().optional(),
  showRecentlyPlayed: z.boolean().optional(),
  dataCollection: z.boolean().optional(),
  marketingEmails: z.boolean().optional()
});

// Audio Settings Validation
export const audioSettingsSchema = z.object({
  streamingQuality: z.enum(['auto', 'high', 'normal', 'low']).optional(),
  crossfade: z.object({
    enabled: z.boolean(),
    duration: z.number().min(0).max(12)
  }).optional(),
  volumeNormalization: z.boolean().optional(),
  monoAudio: z.boolean().optional(),
  audioOutput: z.enum(['stereo', 'mono']).optional(),
  equalizer: z.object({
    enabled: z.boolean(),
    preset: z.string(),
    bands: z.array(z.number()).length(10)
  }).optional(),
  gaplessPlayback: z.boolean().optional(),
  replayGain: z.boolean().optional()
});

// Appearance Settings Validation
export const appearanceSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accentColor: z.string().optional().refine(
    (val) => !val || /^#[0-9A-F]{6}$/i.test(val),
    { message: 'Invalid hex color format (must be #RRGGBB)' }
  ),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  compactMode: z.boolean().optional(),
  showAlbumArt: z.boolean().optional(),
  animationsEnabled: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  colorBlindFriendly: z.boolean().optional(),
  language: z.string().min(2).max(5).optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional()
}).passthrough(); // Allow additional fields to pass through

// Playback Settings Validation
export const playbackSettingsSchema = z.object({
  autoplay: z.boolean().optional(),
  shuffleMode: z.enum(['off', 'on', 'smart']).optional(),
  repeatMode: z.enum(['off', 'one', 'all']).optional(),
  skipSilence: z.boolean().optional(),
  defaultVolume: z.number().min(0).max(100).optional(),
  fadeInOut: z.boolean().optional()
});

// Social Settings Validation
export const socialSettingsSchema = z.object({
  discoverability: z.boolean().optional(),
  friendRequests: z.enum(['everyone', 'friends', 'none']).optional(),
  messageRequests: z.enum(['everyone', 'friends', 'none']).optional(),
  showOnlineStatus: z.boolean().optional(),
  shareToSocial: z.boolean().optional(),
  collaborativePlaylists: z.boolean().optional()
});

// Profile Settings Validation
export const profileSettingsSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
  birthDate: z.string().datetime().optional(),
  phoneNumber: z.string().optional()
});

// Password Change Validation
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Account Deletion Validation
export const accountDeletionSchema = z.object({
  password: z.string().min(6),
  confirmDeletion: z.literal(true, {
    errorMap: () => ({ message: "Please confirm account deletion" })
  })
});