import mongoose, { Document, Schema, Types } from 'mongoose';
import { ISong } from './Song';
import { IUser } from './User';

export interface IPlaylist extends Document {
  name: string;
  description?: string;
  coverImage?: string;
  thumbnail?: string;
  owner: Types.ObjectId | IUser;
  songs: (Types.ObjectId | ISong)[];
  isPublic: boolean;
  isCollaborative: boolean;
  collaborators: (Types.ObjectId | IUser)[];
  followers: (Types.ObjectId | IUser)[];
  tags: string[];
  playCount: number;
  lastPlayed?: Date;
  shareToken?: string; // for sharing playlists via link
  youtubePlaylistId?: string; // YouTube playlist ID for syncing
  importedAt?: Date; // when playlist was imported from YouTube
  lastSyncedAt?: Date; // last time playlist was synced with YouTube
  createdAt: Date;
  updatedAt: Date;
  addSong(songId: Types.ObjectId): Promise<IPlaylist>;
  removeSong(songId: Types.ObjectId): Promise<IPlaylist>;
  reorderSongs(songIds: Types.ObjectId[]): Promise<IPlaylist>;
  incrementPlayCount(): Promise<IPlaylist>;
  generateShareToken(): Promise<IPlaylist>;
  canEdit(userId: Types.ObjectId): boolean;
  toggleFollow(userId: Types.ObjectId): Promise<IPlaylist>;
}

const playlistSchema = new Schema<IPlaylist>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  coverImage: {
    type: String,
    default: null
  },
  thumbnail: {
    type: String,
    default: null
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  songs: [{
    type: Schema.Types.ObjectId,
    ref: 'Song'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isCollaborative: {
    type: Boolean,
    default: false
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  playCount: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  youtubePlaylistId: {
    type: String,
    sparse: true,
    index: true
  },
  importedAt: {
    type: Date
  },
  lastSyncedAt: {
    type: Date
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

// Indexes for efficient querying
playlistSchema.index({ owner: 1, name: 1 });
playlistSchema.index({ isPublic: 1, playCount: -1 });
playlistSchema.index({ tags: 1 });
playlistSchema.index({ createdAt: -1 });
playlistSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual for song count
playlistSchema.virtual('songCount').get(function() {
  return this.songs ? this.songs.length : 0;
});

// Virtual for total duration (requires populated songs)
playlistSchema.virtual('totalDuration').get(function() {
  if (!this.songs || this.songs.length === 0) return 0;
  return this.songs.reduce((total: number, song: ISong | Types.ObjectId) => {
    if (typeof song === 'object' && 'duration' in song) {
      return total + (song.duration || 0);
    }
    return total;
  }, 0);
});

// Method to add song to playlist
playlistSchema.methods.addSong = function(songId: Types.ObjectId) {
  if (!this.songs.includes(songId)) {
    this.songs.push(songId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove song from playlist
playlistSchema.methods.removeSong = function(songId: Types.ObjectId) {
  this.songs = this.songs.filter((id: Types.ObjectId) => !id.equals(songId));
  return this.save();
};

// Method to reorder songs
playlistSchema.methods.reorderSongs = function(songIds: Types.ObjectId[]) {
  // Validate that all provided IDs exist in the playlist
  const currentSongIds = this.songs.map((id: Types.ObjectId) => id.toString());
  const newSongIds = songIds.map((id: Types.ObjectId) => id.toString());

  if (currentSongIds.length !== newSongIds.length ||
      !currentSongIds.every((id: string) => newSongIds.includes(id))) {
    throw new Error('Invalid song order: song IDs do not match playlist contents');
  }

  this.songs = songIds;
  return this.save();
};

// Method to increment play count
playlistSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  this.lastPlayed = new Date();
  return this.save();
};

// Method to generate share token
playlistSchema.methods.generateShareToken = function() {
  this.shareToken = Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15);
  return this.save();
};

// Method to check if user can edit playlist
playlistSchema.methods.canEdit = function(userId: Types.ObjectId) {
  if (this.owner.equals(userId)) return true;
  if (this.isCollaborative && this.collaborators.some((id: Types.ObjectId | IUser) => {
    const objectId = typeof id === 'object' && '_id' in id ? id._id : id;
    return objectId.equals(userId);
  })) {
    return true;
  }
  return false;
};

// Method to follow/unfollow playlist
playlistSchema.methods.toggleFollow = function(userId: Types.ObjectId) {
  const isFollowing = this.followers.some((id: Types.ObjectId | IUser) => {
    const objectId = typeof id === 'object' && '_id' in id ? id._id : id;
    return objectId.equals(userId);
  });

  if (isFollowing) {
    this.followers = this.followers.filter((id: Types.ObjectId | IUser) => {
      const objectId = typeof id === 'object' && '_id' in id ? id._id : id;
      return !objectId.equals(userId);
    });
  } else {
    this.followers.push(userId);
  }

  return this.save();
};

// Ensure virtuals are included in JSON output
playlistSchema.set('toJSON', { virtuals: true });

export const Playlist = mongoose.model<IPlaylist>('Playlist', playlistSchema);