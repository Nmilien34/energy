import api from './api';
import { ApiResponse } from '../types/models';

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url: string;
  coverImage?: string;
}

interface PlaylistMetadata {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  songCount: number;
}

class MusicService {
  async searchSongs(query: string): Promise<ApiResponse<Song[]>> {
    const response = await api.get(`/music/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  async getRecentlyAdded(): Promise<ApiResponse<Song[]>> {
    const response = await api.get('/music/recent');
    return response.data;
  }

  async getPlaylists(): Promise<ApiResponse<PlaylistMetadata[]>> {
    const response = await api.get('/music/playlists');
    return response.data;
  }

  async createPlaylist(name: string, description?: string): Promise<ApiResponse<PlaylistMetadata>> {
    const response = await api.post('/music/playlists', { name, description });
    return response.data;
  }
}

export const musicService = new MusicService(); 