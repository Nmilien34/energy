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
import { decodeHtmlEntities } from '../utils/htmlEntities';

class MusicService {
  // Music search and streaming
  async searchMusic(query: string, type = 'song', limit = 20): Promise<ApiResponse<SearchResult>> {
    const response = await api.get(`/api/music/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);
    
    // Decode HTML entities in search results (safety measure)
    if (response.data.success && response.data.data?.songs) {
      response.data.data.songs = response.data.data.songs.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        artist: decodeHtmlEntities(song.artist),
        channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
        description: song.description ? decodeHtmlEntities(song.description) : song.description,
      }));
    }
    
    return response.data;
  }

  async getSongById(songId: string): Promise<ApiResponse<Song>> {
    const response = await api.get(`/api/music/songs/${songId}`);
    
    // Decode HTML entities (safety measure)
    if (response.data.success && response.data.data) {
      const song = response.data.data;
      response.data.data = {
        ...song,
        title: decodeHtmlEntities(song.title),
        artist: decodeHtmlEntities(song.artist),
        channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
        description: song.description ? decodeHtmlEntities(song.description) : song.description,
      };
    }
    
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
    
    // Decode HTML entities in trending songs (safety measure)
    if (response.data.success && response.data.data?.songs) {
      response.data.data.songs = response.data.data.songs.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        artist: decodeHtmlEntities(song.artist),
        channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
        description: song.description ? decodeHtmlEntities(song.description) : song.description,
      }));
    }
    
    return response.data;
  }

  async getTrendingArtists(limit = 20): Promise<ApiResponse<{ artists: Artist[] }>> {
    const response = await api.get(`/api/music/trending/artists?limit=${limit}`);
    
    // Decode HTML entities in artist names (safety measure)
    if (response.data.success && response.data.data?.artists) {
      response.data.data.artists = response.data.data.artists.map((artist: Artist) => ({
        ...artist,
        name: decodeHtmlEntities(artist.name),
        channelTitle: artist.channelTitle ? decodeHtmlEntities(artist.channelTitle) : artist.channelTitle,
      }));
    }
    
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
    
    // Decode HTML entities in playlists (safety measure)
    if (response.data.success && response.data.data) {
      response.data.data = response.data.data.map((playlist: Playlist) => ({
        ...playlist,
        name: decodeHtmlEntities(playlist.name),
        description: playlist.description ? decodeHtmlEntities(playlist.description) : playlist.description,
        songs: playlist.songs ? playlist.songs.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          artist: decodeHtmlEntities(song.artist),
          channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
          description: song.description ? decodeHtmlEntities(song.description) : song.description,
        })) : playlist.songs,
      }));
    }
    
    return response.data;
  }

  async createPlaylist(data: CreatePlaylistRequest): Promise<ApiResponse<Playlist>> {
    const response = await api.post('/api/playlists', data);
    return response.data;
  }

  async getPlaylistById(playlistId: string): Promise<ApiResponse<Playlist>> {
    const response = await api.get(`/api/playlists/${playlistId}`);
    
    // Decode HTML entities in playlist songs (safety measure)
    if (response.data.success && response.data.data) {
      const playlist = response.data.data;
      response.data.data = {
        ...playlist,
        name: decodeHtmlEntities(playlist.name),
        description: playlist.description ? decodeHtmlEntities(playlist.description) : playlist.description,
        songs: playlist.songs ? playlist.songs.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          artist: decodeHtmlEntities(song.artist),
          channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
          description: song.description ? decodeHtmlEntities(song.description) : song.description,
        })) : playlist.songs,
      };
    }
    
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
    
    // Decode HTML entities in public playlists (safety measure)
    if (response.data.success && response.data.data?.playlists) {
      response.data.data.playlists = response.data.data.playlists.map((playlist: Playlist) => ({
        ...playlist,
        name: decodeHtmlEntities(playlist.name),
        description: playlist.description ? decodeHtmlEntities(playlist.description) : playlist.description,
        songs: playlist.songs ? playlist.songs.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          artist: decodeHtmlEntities(song.artist),
          channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
          description: song.description ? decodeHtmlEntities(song.description) : song.description,
        })) : playlist.songs,
      }));
    }
    
    return response.data;
  }

  async followPlaylist(playlistId: string): Promise<ApiResponse<void>> {
    const response = await api.post(`/api/playlists/${playlistId}/follow`);
    return response.data;
  }

  // User library management
  async getUserLibrary(): Promise<ApiResponse<UserLibrary>> {
    const response = await api.get('/api/users/library');
    
    // Decode HTML entities in library songs (safety measure)
    if (response.data.success && response.data.data) {
      const library = response.data.data;
      const decodeSongs = (songs: Song[]) => songs.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        artist: decodeHtmlEntities(song.artist),
        channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
        description: song.description ? decodeHtmlEntities(song.description) : song.description,
      }));
      
      response.data.data = {
        ...library,
        favorites: library.favorites ? decodeSongs(library.favorites) : library.favorites,
        recentlyPlayed: library.recentlyPlayed ? decodeSongs(library.recentlyPlayed) : library.recentlyPlayed,
      };
    }
    
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
    
    // Decode HTML entities in recently played songs (safety measure)
    if (response.data.success && response.data.data) {
      response.data.data = response.data.data.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        artist: decodeHtmlEntities(song.artist),
        channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
        description: song.description ? decodeHtmlEntities(song.description) : song.description,
      }));
    }
    
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

  // ============================================================
  // RECOMMENDATION API (Infinite Context Shuffle)
  // ============================================================

  /**
   * Get the next track recommendation based on current track
   * This is the core of the auto-play feature
   */
  async getNextRecommendation(
    currentTrackId: string,
    sessionId?: string,
    sessionHistory?: string[]
  ): Promise<ApiResponse<{
    nextTrack: Song;
    alternatives: Song[];
    sessionId: string;
  }>> {
    const response = await api.post('/api/recommend/next', {
      currentTrackId,
      sessionId,
      sessionHistory
    });

    // Decode HTML entities in recommended tracks
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      if (data.nextTrack) {
        data.nextTrack = {
          ...data.nextTrack,
          title: decodeHtmlEntities(data.nextTrack.title),
          artist: decodeHtmlEntities(data.nextTrack.artist),
        };
      }
      if (data.alternatives) {
        data.alternatives = data.alternatives.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          artist: decodeHtmlEntities(song.artist),
        }));
      }
    }

    return response.data;
  }

  /**
   * Record a transition between two tracks (for improving recommendations)
   */
  async recordTransition(
    fromTrackId: string,
    toTrackId: string,
    sessionId: string,
    options?: {
      completed?: boolean;
      skipped?: boolean;
      source?: 'auto' | 'manual' | 'shuffle';
    }
  ): Promise<ApiResponse<{ transitionId: string }>> {
    const response = await api.post('/api/recommend/transition', {
      fromTrackId,
      toTrackId,
      sessionId,
      ...options
    });
    return response.data;
  }

  /**
   * Start a radio station based on a seed track
   * Returns the seed track plus 5 recommended follow-up tracks
   */
  async startRadio(
    seedTrackId: string,
    sessionId?: string
  ): Promise<ApiResponse<{
    sessionId: string;
    seedTrack: Song;
    queue: Song[];
  }>> {
    const response = await api.post('/api/recommend/radio', {
      seedTrackId,
      sessionId
    });

    // Decode HTML entities
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      if (data.seedTrack) {
        data.seedTrack = {
          ...data.seedTrack,
          title: decodeHtmlEntities(data.seedTrack.title),
          artist: decodeHtmlEntities(data.seedTrack.artist),
        };
      }
      if (data.queue) {
        data.queue = data.queue.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          artist: decodeHtmlEntities(song.artist),
        }));
      }
    }

    return response.data;
  }

  /**
   * Get similar tracks to a given track
   */
  async getSimilarTracks(trackId: string, limit = 10): Promise<ApiResponse<{
    tracks: Song[];
    sourceTrack: { id: string; title: string; artist: string };
  }>> {
    const response = await api.get(`/api/recommend/similar/${trackId}?limit=${limit}`);

    // Decode HTML entities
    if (response.data.success && response.data.data?.tracks) {
      response.data.data.tracks = response.data.data.tracks.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        artist: decodeHtmlEntities(song.artist),
      }));
    }

    return response.data;
  }

  /**
   * Get personalized "For You" recommendations
   */
  async getForYouRecommendations(limit = 20): Promise<ApiResponse<{
    tracks: Song[];
    type: 'personalized' | 'trending';
  }>> {
    const response = await api.get(`/api/recommend/for-you?limit=${limit}`);

    // Decode HTML entities
    if (response.data.success && response.data.data?.tracks) {
      response.data.data.tracks = response.data.data.tracks.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        artist: decodeHtmlEntities(song.artist),
      }));
    }

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