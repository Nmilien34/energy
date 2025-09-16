import api from './api';
import { ApiResponse } from '../types/models';

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'dim' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showActivity: boolean;
    showPlaylists: boolean;
  };
  playback: {
    autoplay: boolean;
    crossfade: number;
    volume: number;
    quality: 'low' | 'medium' | 'high';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'dim' | 'system';
}

export interface AvailableTheme {
  id: string;
  name: string;
  description?: string;
}

class SettingsService {
  // Get current user settings
  async getUserSettings(): Promise<ApiResponse<UserSettings>> {
    const response = await api.get('/api/settings/');
    return response.data;
  }

  // Update appearance settings (including theme)
  async updateAppearanceSettings(settings: AppearanceSettings): Promise<ApiResponse<UserSettings>> {
    const response = await api.put('/api/settings/appearance', settings);
    return response.data;
  }

  // Get available themes
  async getAvailableThemes(): Promise<ApiResponse<AvailableTheme[]>> {
    const response = await api.get('/api/settings/appearance/themes');
    return response.data;
  }

  // Update theme specifically
  async updateTheme(theme: 'light' | 'dark' | 'dim' | 'system'): Promise<ApiResponse<UserSettings>> {
    return this.updateAppearanceSettings({ theme });
  }
}

export const settingsService = new SettingsService();