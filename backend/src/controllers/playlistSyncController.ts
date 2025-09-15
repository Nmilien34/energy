import { Request, Response } from 'express';
import { playlistImportService } from '../services/playlistImportService';
import { STATUS_CODES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { IUser } from '../models/User';

export const getUserYouTubePlaylists = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;

    if (!user.youtubeAccessToken) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'YouTube account not connected'
      });
    }

    const playlists = await playlistImportService.getUserPlaylists(user._id.toString());

    res.json({
      success: true,
      data: {
        playlists,
        count: playlists.length
      }
    });

  } catch (error) {
    console.error('Get YouTube playlists error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

export const getYouTubePlaylistVideos = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const { playlistId } = req.params;

    if (!user.youtubeAccessToken) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'YouTube account not connected'
      });
    }

    if (!playlistId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Playlist ID is required'
      });
    }

    const videos = await playlistImportService.getPlaylistVideos(
      user._id.toString(),
      playlistId
    );

    res.json({
      success: true,
      data: {
        videos,
        count: videos.length
      }
    });

  } catch (error) {
    console.error('Get YouTube playlist videos error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

export const importYouTubePlaylist = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const { youtubePlaylistId, customName } = req.body;

    if (!user.youtubeAccessToken) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'YouTube account not connected'
      });
    }

    if (!youtubePlaylistId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'YouTube playlist ID is required'
      });
    }

    const playlist = await playlistImportService.importPlaylist(
      user._id.toString(),
      youtubePlaylistId,
      customName
    );

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      data: {
        playlist,
        message: SUCCESS_MESSAGES.PLAYLIST_CREATED
      }
    });

  } catch (error) {
    console.error('Import YouTube playlist error:', error);

    if (error instanceof Error) {
      if (error.message === 'Playlist not found') {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'YouTube playlist not found'
        });
      }

      if (error.message === 'User not found') {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

export const syncYouTubePlaylist = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const { playlistId } = req.params;

    if (!user.youtubeAccessToken) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'YouTube account not connected'
      });
    }

    if (!playlistId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Playlist ID is required'
      });
    }

    const playlist = await playlistImportService.syncPlaylist(
      user._id.toString(),
      playlistId
    );

    res.json({
      success: true,
      data: {
        playlist,
        message: 'Playlist synced successfully'
      }
    });

  } catch (error) {
    console.error('Sync YouTube playlist error:', error);

    if (error instanceof Error) {
      if (error.message === 'Playlist not found') {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'Playlist not found'
        });
      }

      if (error.message === 'Not authorized to sync this playlist') {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          error: 'Not authorized to sync this playlist'
        });
      }

      if (error.message === 'Playlist is not linked to a YouTube playlist') {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Playlist is not linked to a YouTube playlist'
        });
      }
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

export const deleteImportedPlaylist = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const { playlistId } = req.params;

    if (!playlistId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Playlist ID is required'
      });
    }

    await playlistImportService.deleteImportedPlaylist(
      user._id.toString(),
      playlistId
    );

    res.json({
      success: true,
      data: {
        message: 'Playlist deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete imported playlist error:', error);

    if (error instanceof Error) {
      if (error.message === 'Playlist not found') {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'Playlist not found'
        });
      }

      if (error.message === 'Not authorized to delete this playlist') {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          error: 'Not authorized to delete this playlist'
        });
      }
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};