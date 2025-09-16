import { UserSettings, IUserSettings } from '../models/UserSettings';
import { User, IUser } from '../models/User';
import mongoose from 'mongoose';

export class SettingsService {
  // Get or create user settings
  async getUserSettings(userId: string): Promise<IUserSettings> {
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      // Create default settings for new user
      settings = new UserSettings({
        userId
      });
      await settings.save();
    }

    return settings;
  }

  // Update notification settings
  async updateNotificationSettings(userId: string, updates: any): Promise<IUserSettings> {
    const settings = await this.getUserSettings(userId);

    // Merge updates with existing settings
    settings.notifications = { ...settings.notifications, ...updates };
    await settings.save();

    return settings;
  }

  // Update privacy settings
  async updatePrivacySettings(userId: string, updates: any): Promise<IUserSettings> {
    const settings = await this.getUserSettings(userId);

    settings.privacy = { ...settings.privacy, ...updates };
    await settings.save();

    return settings;
  }

  // Update audio settings
  async updateAudioSettings(userId: string, updates: any): Promise<IUserSettings> {
    const settings = await this.getUserSettings(userId);

    settings.audio = { ...settings.audio, ...updates };
    await settings.save();

    return settings;
  }

  // Update appearance settings
  async updateAppearanceSettings(userId: string, updates: any): Promise<IUserSettings> {
    const settings = await this.getUserSettings(userId);

    settings.appearance = { ...settings.appearance, ...updates };
    await settings.save();

    return settings;
  }

  // Update playback settings
  async updatePlaybackSettings(userId: string, updates: any): Promise<IUserSettings> {
    const settings = await this.getUserSettings(userId);

    settings.playback = { ...settings.playback, ...updates };
    await settings.save();

    return settings;
  }

  // Update social settings
  async updateSocialSettings(userId: string, updates: any): Promise<IUserSettings> {
    const settings = await this.getUserSettings(userId);

    settings.social = { ...settings.social, ...updates };
    await settings.save();

    return settings;
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: any): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Change user password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();
  }

  // Delete user account
  async deleteUserAccount(userId: string, password: string): Promise<void> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Password is incorrect');
    }

    // Start transaction to delete all user data
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete user settings
      await UserSettings.deleteOne({ userId }).session(session);

      // Delete user playlists
      const { Playlist } = await import('../models/Playlist');
      await Playlist.deleteMany({ owner: userId }).session(session);

      // Delete user library
      const { UserLibrary } = await import('../models/UserLibrary');
      await UserLibrary.deleteOne({ user: userId }).session(session);

      // Delete user
      await User.findByIdAndDelete(userId).session(session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get equalizer presets
  async getEqualizerPresets(): Promise<any[]> {
    return [
      { name: 'Flat', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { name: 'Pop', bands: [-1, 4, 7, 8, 5, 0, -2, -2, -1, -1] },
      { name: 'Rock', bands: [8, 4, -5, -8, -3, 4, 8, 11, 11, 11] },
      { name: 'Jazz', bands: [4, 2, -2, 2, -2, -2, 0, 2, 4, 6] },
      { name: 'Classical', bands: [5, 3, -2, 4, -1, -1, 0, 2, 3, 4] },
      { name: 'Bass Boost', bands: [7, 4, 2, 0, -2, -3, -2, 0, 2, 4] },
      { name: 'Treble Boost', bands: [-2, -1, 0, 2, 4, 6, 8, 9, 10, 11] },
      { name: 'Vocal', bands: [-2, 4, 6, 5, 1, -2, -1, 2, 4, 5] }
    ];
  }

  // Get available themes
  async getAvailableThemes(): Promise<any[]> {
    return [
      {
        name: 'Light',
        value: 'light',
        preview: '#FFFFFF'
      },
      {
        name: 'Dark',
        value: 'dark',
        preview: '#1F2937'
      },
      {
        name: 'System',
        value: 'system',
        preview: 'auto'
      }
    ];
  }

  // Get available accent colors
  async getAvailableAccentColors(): Promise<any[]> {
    return [
      { name: 'Blue', value: '#3B82F6' },
      { name: 'Purple', value: '#8B5CF6' },
      { name: 'Green', value: '#10B981' },
      { name: 'Red', value: '#EF4444' },
      { name: 'Orange', value: '#F59E0B' },
      { name: 'Pink', value: '#EC4899' },
      { name: 'Indigo', value: '#6366F1' },
      { name: 'Teal', value: '#14B8A6' }
    ];
  }

  // Reset settings to default
  async resetSettings(userId: string, category?: string): Promise<IUserSettings> {
    if (category) {
      // Delete and recreate just that category
      await UserSettings.findOneAndUpdate(
        { userId },
        { $unset: { [category]: 1 } }
      );
    } else {
      // Delete all settings and let defaults take over
      await UserSettings.findOneAndDelete({ userId });
    }

    // Get fresh settings with defaults
    return this.getUserSettings(userId);
  }

  // Export user data
  async exportUserData(userId: string): Promise<any> {
    const user = await User.findById(userId);
    const settings = await UserSettings.findOne({ userId });

    if (!user) {
      throw new Error('User not found');
    }

    // Get user playlists
    const { Playlist } = await import('../models/Playlist');
    const playlists = await Playlist.find({ owner: userId }).populate('songs');

    // Get user library
    const { UserLibrary } = await import('../models/UserLibrary');
    const library = await UserLibrary.findOne({ user: userId }).populate('favoriteSongs recentlyPlayed.song');

    return {
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      settings,
      playlists,
      library,
      exportedAt: new Date()
    };
  }
}

export const settingsService = new SettingsService();