import api from './api';
import {
  ApiResponse,
  Song,
  SearchResult,
  AudioStream,
  Playlist,
  CreatePlaylistRequest,
  YouTubeProfile,
  YouTubePlaylist,
  YouTubeVideo,
  ImportPlaylistRequest,
  UserLibrary,
  Artist
} from '../types/models';

class MusicService {
  // Music search and streaming
  async searchMusic(query: string, type = 'song', limit = 20): Promise<ApiResponse<SearchResult>> {
    const response = await api.get(`/api/music/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);
    return response.data;
  }

  async getSongById(songId: string): Promise<ApiResponse<Song>> {
    const response = await api.get(`/api/music/songs/${songId}`);
    return response.data;
  }

  async getSongAudioStream(songId: string): Promise<ApiResponse<AudioStream>> {
    // Based on backend docs, the endpoint is /api/music/stream/:id
    // But we'll try both endpoints for compatibility
    try {
      console.log('Fetching stream from /api/music/stream/' + songId);
      const response = await api.get(`/api/music/stream/${songId}`);
      console.log('Stream endpoint response:', response.data);
      return response.data;
    } catch (error: any) {
      // Fallback to old endpoint if new one fails
      console.log('Primary endpoint failed, trying fallback:', error.response?.status);
      try {
        const response = await api.get(`/api/music/songs/${songId}/stream`);
        console.log('Fallback endpoint response:', response.data);
        return response.data;
      } catch (fallbackError: any) {
        console.error('Both endpoints failed:', {
          primary: error.response?.status,
          fallback: fallbackError.response?.status,
          primaryError: error.message,
          fallbackError: fallbackError.message
        });
        throw fallbackError;
      }
    }
  }

  async getTrendingSongs(limit = 20): Promise<ApiResponse<{ songs: Song[] }>> {
    const response = await api.get(`/api/music/trending?limit=${limit}`);
    return response.data;
  }

  async getTrendingArtists(limit = 20): Promise<ApiResponse<{ artists: Artist[] }>> {
    const response = await api.get(`/api/music/trending/artists?limit=${limit}`);
    return response.data;
  }

  async incrementPlayCount(songId: string, duration?: number, completed: boolean = true): Promise<ApiResponse<void>> {
    const response = await api.post('/api/music/play', {
      songId,
      duration,
      completed
    });
    return response.data;
  }

  // Playlist management
  async getUserPlaylists(): Promise<ApiResponse<Playlist[]>> {
    const response = await api.get('/api/playlists/user');
    return response.data;
  }

  async createPlaylist(data: CreatePlaylistRequest): Promise<ApiResponse<Playlist>> {
    const response = await api.post('/api/playlists', data);
    return response.data;
  }

  async getPlaylistById(playlistId: string): Promise<ApiResponse<Playlist>> {
    const response = await api.get(`/api/playlists/${playlistId}`);
    return response.data;
  }

  async updatePlaylist(playlistId: string, data: Partial<CreatePlaylistRequest>): Promise<ApiResponse<Playlist>> {
    const response = await api.put(`/api/playlists/${playlistId}`, data);
    return response.data;
  }

  async deletePlaylist(playlistId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/api/playlists/${playlistId}`);
    return response.data;
  }

  async addSongToPlaylist(playlistId: string, songId: string): Promise<ApiResponse<void>> {
    const response = await api.post(`/api/playlists/${playlistId}/songs`, { songId });
    return response.data;
  }

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/api/playlists/${playlistId}/songs/${songId}`);
    return response.data;
  }

  async reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<ApiResponse<void>> {
    const response = await api.put(`/api/playlists/${playlistId}/reorder`, { songIds });
    return response.data;
  }

  async getPublicPlaylists(page = 1, limit = 20, search?: string): Promise<ApiResponse<{ playlists: Playlist[], total: number }>> {
    let url = `/api/playlists/public?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const response = await api.get(url);
    return response.data;
  }

  async followPlaylist(playlistId: string): Promise<ApiResponse<void>> {
    const response = await api.post(`/api/playlists/${playlistId}/follow`);
    return response.data;
  }

  // User library management
  async getUserLibrary(): Promise<ApiResponse<UserLibrary>> {
    const response = await api.get('/api/users/library');
    return response.data;
  }

  async addToFavorites(songId: string): Promise<ApiResponse<void>> {
    const response = await api.post('/api/users/library/favorites', { songId });
    return response.data;
  }

  async removeFromFavorites(songId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/api/users/library/favorites/${songId}`);
    return response.data;
  }

  async getRecentlyPlayed(limit = 50): Promise<ApiResponse<Song[]>> {
    const response = await api.get(`/api/users/library/recent?limit=${limit}`);
    return response.data;
  }

  // YouTube integration
  async getYouTubeProfile(): Promise<ApiResponse<YouTubeProfile>> {
    const response = await api.get('/api/auth/oauth/youtube/profile');
    return response.data;
  }

  async getYouTubePlaylists(): Promise<ApiResponse<{ playlists: YouTubePlaylist[], count: number }>> {
    const response = await api.get('/api/auth/oauth/youtube/playlists');
    return response.data;
  }

  async getYouTubePlaylistVideos(playlistId: string): Promise<ApiResponse<{ videos: YouTubeVideo[], count: number }>> {
    const response = await api.get(`/api/auth/oauth/youtube/playlists/${playlistId}/videos`);
    return response.data;
  }

  async importYouTubePlaylist(data: ImportPlaylistRequest): Promise<ApiResponse<Playlist>> {
    const response = await api.post('/api/auth/oauth/youtube/playlists/import', data);
    return response.data;
  }

  async syncYouTubePlaylist(playlistId: string): Promise<ApiResponse<Playlist>> {
    const response = await api.post(`/api/auth/oauth/youtube/playlists/${playlistId}/sync`);
    return response.data;
  }

  async disconnectYouTube(): Promise<ApiResponse<void>> {
    const response = await api.post('/api/auth/oauth/youtube/disconnect');
    return response.data;
  }

  // Authentication OAuth
  initiateGoogleOAuth(): void {
    window.location.href = '/api/auth/oauth/google';
  }

  // Utility methods
  formatDuration(seconds: number | undefined | null): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatViewCount(count: number | undefined | null): string {
    if (!count || isNaN(count)) return '0';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  parseYouTubeDuration(duration: string): number {
    // Parse ISO 8601 duration format (PT3M33S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }
}

export const musicService = new MusicService(); 