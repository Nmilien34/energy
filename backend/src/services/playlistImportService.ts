import { google } from 'googleapis';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { Playlist, IPlaylist } from '../models/Playlist';
import { Song, ISong } from '../models/Song';
import { youtubeService } from './youtubeService';
import { config } from '../utils/config';

/**
 * Decode HTML entities (e.g., &#39; -> ', &amp; -> &)
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  // Decode numeric entities (&#39;, &#8217;, etc.)
  let decoded = text.replace(/&#(\d+);/g, (_, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });

  // Decode hex entities (&#x27;, etc.)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Decode named entities
  const entityMap: { [key: string]: string } = {
    '&apos;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
  };

  for (const [entity, char] of Object.entries(entityMap)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  return decoded;
}

export interface ImportedPlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
  privacy: string;
  channelTitle: string;
  publishedAt: string;
}

export interface ImportedVideo {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  position: number;
}

export class PlaylistImportService {
  private async getYouTubeClient(user: IUser) {
    if (!user.youtubeAccessToken) {
      throw new Error('User not connected to YouTube');
    }

    const oauth2Client = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: user.youtubeAccessToken,
      refresh_token: user.youtubeRefreshToken
    });

    return google.youtube({ version: 'v3', auth: oauth2Client });
  }

  private parseDuration(duration: string): number {
    // Convert ISO 8601 duration (PT4M13S) to seconds
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  async getUserPlaylists(userId: string): Promise<ImportedPlaylist[]> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const youtube = await this.getYouTubeClient(user);

      const response = await youtube.playlists.list({
        part: ['snippet', 'status', 'contentDetails'],
        mine: true,
        maxResults: 50
      });

      const playlists: ImportedPlaylist[] = [];

      for (const playlist of response.data.items || []) {
        if (!playlist.snippet || !playlist.id) continue;

        playlists.push({
          id: playlist.id,
          title: decodeHtmlEntities(playlist.snippet.title || 'Untitled Playlist'),
          description: decodeHtmlEntities(playlist.snippet.description || ''),
          thumbnail: playlist.snippet.thumbnails?.medium?.url ||
                    playlist.snippet.thumbnails?.default?.url || '',
          videoCount: playlist.contentDetails?.itemCount || 0,
          privacy: playlist.status?.privacyStatus || 'private',
          channelTitle: decodeHtmlEntities(playlist.snippet.channelTitle || ''),
          publishedAt: playlist.snippet.publishedAt || ''
        });
      }

      return playlists;

    } catch (error) {
      console.error('Error fetching user playlists:', error);
      throw new Error('Failed to fetch playlists from YouTube');
    }
  }

  async getPlaylistVideos(userId: string, playlistId: string): Promise<ImportedVideo[]> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const youtube = await this.getYouTubeClient(user);

      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: playlistId,
        maxResults: 50
      });

      const videos: ImportedVideo[] = [];
      const videoIds: string[] = [];

      // Collect video IDs for duration lookup
      for (const item of response.data.items || []) {
        if (item.snippet?.resourceId?.videoId) {
          videoIds.push(item.snippet.resourceId.videoId);
        }
      }

      // Get video durations in batch
      const videoDetailsResponse = await youtube.videos.list({
        part: ['contentDetails'],
        id: videoIds
      });

      const videoDurations: { [key: string]: string } = {};
      for (const video of videoDetailsResponse.data.items || []) {
        if (video.id && video.contentDetails?.duration) {
          videoDurations[video.id] = video.contentDetails.duration;
        }
      }

      // Build video list with durations
      for (const item of response.data.items || []) {
        if (!item.snippet?.resourceId?.videoId) continue;

        const videoId = item.snippet.resourceId.videoId;
        const duration = videoDurations[videoId] || 'PT0S';

        videos.push({
          youtubeId: videoId,
          title: decodeHtmlEntities(item.snippet.title || 'Untitled Video'),
          channelTitle: decodeHtmlEntities(item.snippet.videoOwnerChannelTitle || 'Unknown Channel'),
          thumbnail: item.snippet.thumbnails?.medium?.url ||
                    item.snippet.thumbnails?.default?.url || '',
          duration: duration,
          position: item.snippet.position || 0
        });
      }

      return videos.sort((a, b) => a.position - b.position);

    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      throw new Error('Failed to fetch playlist videos from YouTube');
    }
  }

  async importPlaylist(
    userId: string,
    youtubePlaylistId: string,
    customName?: string
  ): Promise<IPlaylist> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get playlist details
      const playlists = await this.getUserPlaylists(userId);
      const playlistInfo = playlists.find(p => p.id === youtubePlaylistId);

      if (!playlistInfo) {
        throw new Error('Playlist not found');
      }

      // Get playlist videos
      const videos = await this.getPlaylistVideos(userId, youtubePlaylistId);

      // Create or find songs in database
      const songIds: mongoose.Types.ObjectId[] = [];

      for (const video of videos) {
        let song = await Song.findOne({ youtubeId: video.youtubeId });

        if (!song) {
          // Create new song entry
          song = new Song({
            youtubeId: video.youtubeId,
            title: video.title,
            artist: video.channelTitle,
            duration: this.parseDuration(video.duration),
            thumbnail: video.thumbnail,
            thumbnailHd: video.thumbnail,
            viewCount: 0,
            publishedAt: new Date(),
            channelTitle: video.channelTitle,
            channelId: '',
            description: '',
            tags: [],
            playCount: 0
          });

          await song.save();
        }

        songIds.push(song._id as mongoose.Types.ObjectId);
      }

      // Create playlist in database
      const playlist = new Playlist({
        name: customName || playlistInfo.title,
        owner: userId,
        songs: songIds,
        isPublic: playlistInfo.privacy === 'public',
        isCollaborative: false,
        description: playlistInfo.description,
        thumbnail: playlistInfo.thumbnail,
        youtubePlaylistId: youtubePlaylistId,
        importedAt: new Date()
      });

      await playlist.save();

      return playlist;

    } catch (error) {
      console.error('Error importing playlist:', error);
      throw new Error('Failed to import playlist');
    }
  }

  async syncPlaylist(userId: string, playlistId: string): Promise<IPlaylist> {
    try {
      const playlist = await Playlist.findById(playlistId).populate('owner');

      if (!playlist) {
        throw new Error('Playlist not found');
      }

      if (playlist.owner._id.toString() !== userId) {
        throw new Error('Not authorized to sync this playlist');
      }

      if (!playlist.youtubePlaylistId) {
        throw new Error('Playlist is not linked to a YouTube playlist');
      }

      // Get current YouTube playlist videos
      const videos = await this.getPlaylistVideos(userId, playlist.youtubePlaylistId);

      // Update songs in playlist
      const songIds: mongoose.Types.ObjectId[] = [];

      for (const video of videos) {
        let song = await Song.findOne({ youtubeId: video.youtubeId });

        if (!song) {
          // Create new song entry
          song = new Song({
            youtubeId: video.youtubeId,
            title: video.title,
            artist: video.channelTitle,
            duration: this.parseDuration(video.duration),
            thumbnail: video.thumbnail,
            thumbnailHd: video.thumbnail,
            viewCount: 0,
            publishedAt: new Date(),
            channelTitle: video.channelTitle,
            channelId: '',
            description: '',
            tags: [],
            playCount: 0
          });

          await song.save();
        }

        songIds.push(song._id as mongoose.Types.ObjectId);
      }

      // Update playlist with new songs
      playlist.songs = songIds as any;
      playlist.lastSyncedAt = new Date();
      await playlist.save();

      return playlist;

    } catch (error) {
      console.error('Error syncing playlist:', error);
      throw new Error('Failed to sync playlist');
    }
  }

  async deleteImportedPlaylist(userId: string, playlistId: string): Promise<void> {
    try {
      const playlist = await Playlist.findById(playlistId);

      if (!playlist) {
        throw new Error('Playlist not found');
      }

      if (playlist.owner.toString() !== userId) {
        throw new Error('Not authorized to delete this playlist');
      }

      await Playlist.findByIdAndDelete(playlistId);

    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw new Error('Failed to delete playlist');
    }
  }
}

export const playlistImportService = new PlaylistImportService();