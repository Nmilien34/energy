import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';

export interface INotificationSettings {
  newMusicReleases: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  playlistUpdates: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  playlistShares: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  socialActivity: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  followers: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  likes: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  systemUpdates: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  securityAlerts: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export interface IPrivacySettings {
  privateProfile: boolean;
  shareListeningActivity: boolean;
  showFavorites: boolean;
  showPlaylists: boolean;
  allowFollowers: boolean;
  showRecentlyPlayed: boolean;
  dataCollection: boolean;
  marketingEmails: boolean;
}

export interface IAudioSettings {
  streamingQuality: 'auto' | 'high' | 'normal' | 'low';
  crossfade: {
    enabled: boolean;
    duration: number;
  };
  volumeNormalization: boolean;
  monoAudio: boolean;
  audioOutput: 'stereo' | 'mono';
  equalizer: {
    enabled: boolean;
    preset: string;
    bands: number[];
  };
  gaplessPlayback: boolean;
  replayGain: boolean;
}

export interface IAppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showAlbumArt: boolean;
  animationsEnabled: boolean;
  highContrast: boolean;
  colorBlindFriendly: boolean;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface IPlaybackSettings {
  autoplay: boolean;
  shuffleMode: 'off' | 'on' | 'smart';
  repeatMode: 'off' | 'one' | 'all';
  skipSilence: boolean;
  defaultVolume: number;
  fadeInOut: boolean;
}

export interface ISocialSettings {
  discoverability: boolean;
  friendRequests: 'everyone' | 'friends' | 'none';
  messageRequests: 'everyone' | 'friends' | 'none';
  showOnlineStatus: boolean;
  shareToSocial: boolean;
  collaborativePlaylists: boolean;
}

export interface IUserSettings extends Document {
  userId: Types.ObjectId | IUser;
  notifications: INotificationSettings;
  privacy: IPrivacySettings;
  audio: IAudioSettings;
  appearance: IAppearanceSettings;
  playback: IPlaybackSettings;
  social: ISocialSettings;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSettingsSchema = new Schema({
  newMusicReleases: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  playlistUpdates: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  playlistShares: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  socialActivity: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  followers: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  likes: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  systemUpdates: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  securityAlerts: {
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  }
}, { _id: false });

const privacySettingsSchema = new Schema({
  privateProfile: { type: Boolean, default: false },
  shareListeningActivity: { type: Boolean, default: true },
  showFavorites: { type: Boolean, default: true },
  showPlaylists: { type: Boolean, default: true },
  allowFollowers: { type: Boolean, default: true },
  showRecentlyPlayed: { type: Boolean, default: true },
  dataCollection: { type: Boolean, default: true },
  marketingEmails: { type: Boolean, default: false }
}, { _id: false });

const audioSettingsSchema = new Schema({
  streamingQuality: {
    type: String,
    enum: ['auto', 'high', 'normal', 'low'],
    default: 'auto'
  },
  crossfade: {
    enabled: { type: Boolean, default: false },
    duration: { type: Number, default: 3, min: 0, max: 12 }
  },
  volumeNormalization: { type: Boolean, default: true },
  monoAudio: { type: Boolean, default: false },
  audioOutput: {
    type: String,
    enum: ['stereo', 'mono'],
    default: 'stereo'
  },
  equalizer: {
    enabled: { type: Boolean, default: false },
    preset: { type: String, default: 'flat' },
    bands: { type: [Number], default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  },
  gaplessPlayback: { type: Boolean, default: true },
  replayGain: { type: Boolean, default: false }
}, { _id: false });

const appearanceSettingsSchema = new Schema({
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  accentColor: { type: String, default: '#3B82F6' },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  compactMode: { type: Boolean, default: false },
  showAlbumArt: { type: Boolean, default: true },
  animationsEnabled: { type: Boolean, default: true },
  highContrast: { type: Boolean, default: false },
  colorBlindFriendly: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '12h'
  }
}, { _id: false });

const playbackSettingsSchema = new Schema({
  autoplay: { type: Boolean, default: true },
  shuffleMode: {
    type: String,
    enum: ['off', 'on', 'smart'],
    default: 'off'
  },
  repeatMode: {
    type: String,
    enum: ['off', 'one', 'all'],
    default: 'off'
  },
  skipSilence: { type: Boolean, default: false },
  defaultVolume: { type: Number, default: 80, min: 0, max: 100 },
  fadeInOut: { type: Boolean, default: true }
}, { _id: false });

const socialSettingsSchema = new Schema({
  discoverability: { type: Boolean, default: true },
  friendRequests: {
    type: String,
    enum: ['everyone', 'friends', 'none'],
    default: 'everyone'
  },
  messageRequests: {
    type: String,
    enum: ['everyone', 'friends', 'none'],
    default: 'friends'
  },
  showOnlineStatus: { type: Boolean, default: true },
  shareToSocial: { type: Boolean, default: true },
  collaborativePlaylists: { type: Boolean, default: true }
}, { _id: false });

const userSettingsSchema = new Schema<IUserSettings>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  notifications: {
    type: notificationSettingsSchema,
    default: () => ({})
  },
  privacy: {
    type: privacySettingsSchema,
    default: () => ({})
  },
  audio: {
    type: audioSettingsSchema,
    default: () => ({})
  },
  appearance: {
    type: appearanceSettingsSchema,
    default: () => ({})
  },
  playback: {
    type: playbackSettingsSchema,
    default: () => ({})
  },
  social: {
    type: socialSettingsSchema,
    default: () => ({})
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index already created by unique: true constraint on userId

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);