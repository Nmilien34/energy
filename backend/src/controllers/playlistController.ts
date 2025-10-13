import { Request, Response } from 'express';
import { Playlist, IPlaylist } from '../models/Playlist';
import { Song } from '../models/Song';
import { UserLibrary } from '../models/UserLibrary';
import { IUser } from '../models/User';
import { Types } from 'mongoose';


export const createPlaylist = async (req: Request, res: Response) => {
  try {
    const { name, description, isPublic = false, isCollaborative = false } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Playlist name is required'
      });
    }

    const playlist = new Playlist({
      name: name.trim(),
      description: description?.trim(),
      owner: userId,
      isPublic,
      isCollaborative,
      songs: [],
      collaborators: [],
      followers: [],
      tags: []
    });

    await playlist.save();

    res.status(201).json({
      success: true,
      data: playlist
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create playlist'
    });
  }
};

export const getUserPlaylists = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const playlists = await Playlist.find({
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    })
      .populate('songs', 'youtubeId title artist duration thumbnail')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: playlists
    });
  } catch (error) {
    console.error('Get user playlists error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get playlists'
    });
  }
};

export const getPlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid playlist ID'
      });
    }

    const playlist = await Playlist.findById(id)
      .populate('songs')
      .populate('owner', 'username email')
      .populate('collaborators', 'username email');

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    res.json({
      success: true,
      data: playlist
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get playlist'
    });
  }
};

export const updatePlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic, isCollaborative, tags } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid playlist ID'
      });
    }

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    if (!playlist.canEdit(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    // Update fields
    if (name !== undefined) playlist.name = name.trim();
    if (description !== undefined) playlist.description = description?.trim();
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    if (isCollaborative !== undefined) playlist.isCollaborative = isCollaborative;
    if (tags !== undefined) playlist.tags = tags;

    await playlist.save();

    res.json({
      success: true,
      data: playlist
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update playlist'
    });
  }
};

export const deletePlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid playlist ID'
      });
    }

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    // Only owner can delete playlist
    if (!(playlist.owner as any).equals(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only playlist owner can delete'
      });
    }

    await Playlist.findByIdAndDelete(id);

    // Remove from user libraries
    await UserLibrary.updateMany(
      { favoritePlaylists: new Types.ObjectId(id) },
      { $pull: { favoritePlaylists: new Types.ObjectId(id) } }
    );

    res.json({
      success: true,
      data: { message: 'Playlist deleted successfully' }
    });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete playlist'
    });
  }
};

export const addSongToPlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid playlist ID'
      });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    if (!playlist.canEdit(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    // Try to find song by youtubeId first, then by _id if it looks like an ObjectId
    let song;
    if (Types.ObjectId.isValid(songId)) {
      // Try finding by MongoDB _id first
      song = await Song.findById(songId);
    }

    // If not found by _id, try by youtubeId
    if (!song) {
      song = await Song.findOne({ youtubeId: songId });
    }

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    await playlist.addSong(song._id as Types.ObjectId);

    // Update playlist thumbnail to use the last added song's thumbnail
    if (song.thumbnail) {
      playlist.thumbnail = song.thumbnail;
      await playlist.save();
    }

    res.json({
      success: true,
      data: {
        message: 'Song added to playlist',
        playlistId: playlist._id,
        songId: song.youtubeId
      }
    });
  } catch (error) {
    console.error('Add song to playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add song to playlist'
    });
  }
};

export const removeSongFromPlaylist = async (req: Request, res: Response) => {
  try {
    const { id, songId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid playlist ID'
      });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    if (!playlist.canEdit(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const song = await Song.findOne({ youtubeId: songId });
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found'
      });
    }

    await playlist.removeSong(song._id as Types.ObjectId);

    // Update playlist thumbnail to the last song if songs remain
    await playlist.populate('songs');
    const songs = playlist.songs as any[];
    if (songs.length > 0) {
      const lastSong = songs[songs.length - 1];
      if (lastSong.thumbnail) {
        playlist.thumbnail = lastSong.thumbnail;
        await playlist.save();
      }
    } else {
      // No songs left, clear the thumbnail
      playlist.thumbnail = undefined;
      await playlist.save();
    }

    res.json({
      success: true,
      data: {
        message: 'Song removed from playlist',
        playlistId: playlist._id,
        songId: song.youtubeId
      }
    });
  } catch (error) {
    console.error('Remove song from playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove song from playlist'
    });
  }
};

export const reorderPlaylistSongs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { songIds } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid playlist ID'
      });
    }

    if (!Array.isArray(songIds)) {
      return res.status(400).json({
        success: false,
        error: 'songIds must be an array'
      });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    if (!playlist.canEdit(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    // Convert YouTube IDs to MongoDB ObjectIds
    const songs = await Song.find({ youtubeId: { $in: songIds } });
    const orderedObjectIds = songIds.map(ytId => {
      const song = songs.find(s => s.youtubeId === ytId);
      return song?._id;
    }).filter(Boolean) as Types.ObjectId[];

    await playlist.reorderSongs(orderedObjectIds);

    res.json({
      success: true,
      data: {
        message: 'Playlist songs reordered',
        playlistId: playlist._id
      }
    });
  } catch (error) {
    console.error('Reorder playlist songs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder playlist songs'
    });
  }
};

export const getPublicPlaylists = async (req: Request, res: Response) => {
  try {
    const { limit = 20, skip = 0, search } = req.query;

    let query: any = { isPublic: true };

    if (search) {
      query.$text = { $search: search as string };
    }

    const playlists = await Playlist.find(query)
      .populate('owner', 'username')
      .populate('songs', 'youtubeId title artist duration thumbnail')
      .sort(search ? { score: { $meta: 'textScore' } } : { playCount: -1, createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string));

    const total = await Playlist.countDocuments(query);

    res.json({
      success: true,
      data: {
        playlists,
        total,
        hasMore: total > parseInt(skip as string) + playlists.length
      }
    });
  } catch (error) {
    console.error('Get public playlists error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public playlists'
    });
  }
};

export const followPlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid playlist ID'
      });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    if (!playlist.isPublic && !(playlist.owner as any).equals(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot follow private playlist'
      });
    }

    await playlist.toggleFollow(userId);

    // Add to user's favorite playlists
    let userLibrary = await UserLibrary.findOne({ user: userId });
    if (!userLibrary) {
      userLibrary = new UserLibrary({ user: userId });
      await userLibrary.save();
    }

    const isFollowing = playlist.followers.some((followerId: any) =>
      followerId.toString() === userId.toString()
    );

    if (isFollowing) {
      await userLibrary.addPlaylistToFavorites(playlist._id as Types.ObjectId);
    } else {
      await userLibrary.removePlaylistFromFavorites(playlist._id as Types.ObjectId);
    }

    res.json({
      success: true,
      data: {
        message: isFollowing ? 'Playlist followed' : 'Playlist unfollowed',
        playlistId: playlist._id,
        isFollowing
      }
    });
  } catch (error) {
    console.error('Follow playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to follow/unfollow playlist'
    });
  }
};

export const generateShareToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    if (!(playlist.owner as any).equals(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only playlist owner can generate share token'
      });
    }

    await playlist.generateShareToken();

    res.json({
      success: true,
      data: {
        shareToken: playlist.shareToken,
        shareUrl: `${req.protocol}://${req.get('host')}/api/playlists/shared/${playlist.shareToken}`
      }
    });
  } catch (error) {
    console.error('Generate share token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share token'
    });
  }
};

export const getSharedPlaylist = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const playlist = await Playlist.findOne({ shareToken: token })
      .populate('songs')
      .populate('owner', 'username');

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Shared playlist not found or token expired'
      });
    }

    res.json({
      success: true,
      data: playlist
    });
  } catch (error) {
    console.error('Get shared playlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shared playlist'
    });
  }
};