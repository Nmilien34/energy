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
import { publicApi, searchMusicPublic } from './anonymousSessionService';

const enhanceThumbnail = (url: string | undefined): string => {
  if (!url) return '';
  // Check for common YouTube thumbnail patterns
  if (url.includes('i.ytimg.com/vi/')) {
    // Upgrading to hqdefault (480x360) - safe and clear
    // Avoid maxresdefault as it might be missing for some videos
    return url.replace('/default.jpg', '/hqdefault.jpg')
      .replace('/mqdefault.jpg', '/hqdefault.jpg');
  }
  return url;
};


class MusicService {
  // Music search and streaming
  async searchMusic(query: string, type = 'song', limit = 20): Promise<ApiResponse<SearchResult>> {
    // CRITICAL: Trim the query to handle trailing/leading spaces
    const trimmedQuery = query.trim();

    // Don't search if query is empty after trimming
    if (!trimmedQuery) {
      return {
        success: true,
        data: {
          songs: [],
          total: 0,
          query: '',
          type: type
        }
      };
    }

    const response = await api.get(`/api/music/search?q=${encodeURIComponent(trimmedQuery)}&type=${type}&limit=${limit}`);

    // Decode HTML entities in search results (safety measure)
    if (response.data.success && response.data.data?.songs) {
      response.data.data.songs = response.data.data.songs.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        thumbnail: enhanceThumbnail(song.thumbnail),
        artist: decodeHtmlEntities(song.artist),
        channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
        description: song.description ? decodeHtmlEntities(song.description) : song.description,
      }));
      // REMOVED: Frontend filtering that was discarding valid backend results
      // The backend should handle relevance - trust its results
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
        thumbnail: enhanceThumbnail(song.thumbnail),
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
        thumbnail: enhanceThumbnail(song.thumbnail),
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

  async getPublicTrendingSongs(limit = 20): Promise<ApiResponse<{ songs: Song[] }>> {
    try {
      // Try fetching from standard endpoint using publicApi (no auth headers)
      const response = await publicApi.get(`/api/music/trending?limit=${limit}`);

      // Decode HTML entities
      if (response.data.success && response.data.data?.songs) {
        response.data.data.songs = response.data.data.songs.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          thumbnail: enhanceThumbnail(song.thumbnail),
          artist: decodeHtmlEntities(song.artist),
          channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
          description: song.description ? decodeHtmlEntities(song.description) : song.description,
        }));
      }

      return response.data;
    } catch (error) {
      console.warn('Public trending songs fetch failed, trying generic public search fallback');
      // Fallback: search for "top hits" if trending endpoint fails for anonymous
      try {
        const fallbackResults = await searchMusicPublic("top hits", 'song', limit);
        return {
          success: true,
          data: {
            songs: fallbackResults.data?.songs || []
          }
        };
      } catch (fallbackError) {
        console.warn('Fallback public search failed:', fallbackError);
        return { success: false, data: { songs: [] } };
      }
    }
  }

  async getPublicTrendingArtists(limit = 20): Promise<ApiResponse<{ artists: Artist[] }>> {
    try {
      const response = await publicApi.get(`/api/music/trending/artists?limit=${limit}`);

      if (response.data.success && response.data.data?.artists) {
        response.data.data.artists = response.data.data.artists.map((artist: Artist) => ({
          ...artist,
          name: decodeHtmlEntities(artist.name),
          channelTitle: artist.channelTitle ? decodeHtmlEntities(artist.channelTitle) : artist.channelTitle,
        }));
      }

      return response.data;
    } catch (error) {
      console.warn('Public trending artists fetch failed');
      return { success: false, data: { artists: [] } };
    }
  }

  // Marketing stats for anonymous users
  getPlatformStats() {
    return {
      songsPlayed: { value: 10000, label: "10k+" },
      playlists: { value: 500, label: "500+" },
      favorites: { value: 2500, label: "2.5k+" },
      hoursListened: { value: 1000, label: "1k+" }
    };
  }

  // Real stats for authenticated users
  async getUserStats(): Promise<{
    songsPlayed: string;
    playlists: string;
    favorites: string;
    hoursListened: string;
    rawValues?: {
      songsPlayed: number;
      playlists: number;
      favorites: number;
      hoursListened: number;
    }
  }> {
    try {
      const library = await this.getUserLibrary();

      if (!library.success || !library.data) {
        return {
          songsPlayed: "0",
          playlists: "0",
          favorites: "0",
          hoursListened: "0"
        };
      }

      const data = library.data;
      const songsPlayedCount = data.recentlyPlayed ? data.recentlyPlayed.length : 0;
      const playlistsCount = data.playlists ? data.playlists.length : 0;
      const favoritesCount = data.favorites ? data.favorites.length : 0;

      // Calculate hours listened based on recently played songs (approximate)
      // In a real app, this would be a dedicated backend stat
      let totalSeconds = 0;
      if (data.recentlyPlayed) {
        data.recentlyPlayed.forEach(song => {
          if (song.duration) {
            totalSeconds += song.duration;
          }
        });
      }
      // If we have play counts on songs, we could multiply, but checking recentlyPlayed 
      // without deduping is a rough proxy for "songs currently in history"

      const hours = Math.floor(totalSeconds / 3600);
      const hoursListened = hours > 0 ? (hours > 1000 ? (hours / 1000).toFixed(1) + 'k' : hours.toString()) : "0";

      return {
        songsPlayed: songsPlayedCount.toString(),
        playlists: playlistsCount.toString(),
        favorites: favoritesCount.toString(),
        hoursListened: hoursListened,
        rawValues: {
          songsPlayed: songsPlayedCount,
          playlists: playlistsCount,
          favorites: favoritesCount,
          hoursListened: hours
        }
      };
    } catch (error) {
      console.warn('Failed to calculate user stats:', error);
      return {
        songsPlayed: "0",
        playlists: "0",
        favorites: "0",
        hoursListened: "0"
      };
    }
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
          thumbnail: enhanceThumbnail(song.thumbnail),
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
          thumbnail: enhanceThumbnail(song.thumbnail),
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
          thumbnail: enhanceThumbnail(song.thumbnail),
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
        thumbnail: enhanceThumbnail(song.thumbnail),
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
    // Handle case where data might be null, undefined, or not an array
    if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
      response.data.data = response.data.data.map((song: Song) => ({
        ...song,
        title: decodeHtmlEntities(song.title),
        thumbnail: enhanceThumbnail(song.thumbnail),
        artist: decodeHtmlEntities(song.artist),
        channelTitle: song.channelTitle ? decodeHtmlEntities(song.channelTitle) : song.channelTitle,
        description: song.description ? decodeHtmlEntities(song.description) : song.description,
      }));
    } else if (response.data.success && !Array.isArray(response.data.data)) {
      // If data is not an array, set it to empty array
      response.data.data = [];
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
          thumbnail: enhanceThumbnail(data.nextTrack.thumbnail),
          artist: decodeHtmlEntities(data.nextTrack.artist),
        };
      }
      if (data.alternatives) {
        data.alternatives = data.alternatives.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          thumbnail: enhanceThumbnail(song.thumbnail),
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
          thumbnail: enhanceThumbnail(data.seedTrack.thumbnail),
          artist: decodeHtmlEntities(data.seedTrack.artist),
        };
      }
      if (data.queue) {
        data.queue = data.queue.map((song: Song) => ({
          ...song,
          title: decodeHtmlEntities(song.title),
          thumbnail: enhanceThumbnail(song.thumbnail),
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
        thumbnail: enhanceThumbnail(song.thumbnail),
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
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003';
    window.location.href = `${API_URL}/api/auth/oauth/google`;
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