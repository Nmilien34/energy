import mongoose, { Document, Schema, Types } from 'mongoose';
import { ISong } from './Song';
import { IPlaylist } from './Playlist';
import { IUser } from './User';

export interface IUserLibrary extends Document {
  user: Types.ObjectId | IUser;
  favoriteSongs: (Types.ObjectId | ISong)[];
  favoritePlaylists: (Types.ObjectId | IPlaylist)[];
  recentlyPlayed: {
    song: Types.ObjectId | ISong;
    playedAt: Date;
  }[];
  listeningHistory: {
    song: Types.ObjectId | ISong;
    playedAt: Date;
    duration: number; // how long they listened (in seconds)
    completed: boolean; // if they listened to the full song
  }[];
  preferences: {
    autoplay: boolean;
    shuffle: boolean;
    repeat: 'none' | 'one' | 'all';
    volume: number; // 0-100
    quality: 'low' | 'medium' | 'high';
    crossfade: number; // crossfade duration in seconds (0-12)
  };
  followedArtists: string[]; // YouTube channel IDs
  blockedSongs: (Types.ObjectId | ISong)[];
  createdAt: Date;
  updatedAt: Date;
  addToFavorites(songId: Types.ObjectId): Promise<IUserLibrary>;
  removeFromFavorites(songId: Types.ObjectId): Promise<IUserLibrary>;
  addPlaylistToFavorites(playlistId: Types.ObjectId): Promise<IUserLibrary>;
  removePlaylistFromFavorites(playlistId: Types.ObjectId): Promise<IUserLibrary>;
  addToRecentlyPlayed(songId: Types.ObjectId): Promise<IUserLibrary>;
  addToHistory(songId: Types.ObjectId, duration: number, completed?: boolean): Promise<IUserLibrary>;
  followArtist(channelId: string): Promise<IUserLibrary>;
  unfollowArtist(channelId: string): Promise<IUserLibrary>;
  blockSong(songId: Types.ObjectId): Promise<IUserLibrary>;
  unblockSong(songId: Types.ObjectId): Promise<IUserLibrary>;
  updatePreferences(newPreferences: Partial<IUserLibrary['preferences']>): Promise<IUserLibrary>;
  getListeningStats(): any;
}

const userLibrarySchema = new Schema<IUserLibrary>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  favoriteSongs: [{
    type: Schema.Types.ObjectId,
    ref: 'Song'
  }],
  favoritePlaylists: [{
    type: Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  recentlyPlayed: [{
    song: {
      type: Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    playedAt: {
      type: Date,
      default: Date.now
    }
  }],
  listeningHistory: [{
    song: {
      type: Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    playedAt: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: Number,
      required: true,
      min: 0
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  preferences: {
    autoplay: {
      type: Boolean,
      default: true
    },
    shuffle: {
      type: Boolean,
      default: false
    },
    repeat: {
      type: String,
      enum: ['none', 'one', 'all'],
      default: 'none'
    },
    volume: {
      type: Number,
      default: 80,
      min: 0,
      max: 100
    },
    quality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    crossfade: {
      type: Number,
      default: 0,
      min: 0,
      max: 12
    }
  },
  followedArtists: [{
    type: String,
    trim: true
  }],
  blockedSongs: [{
    type: Schema.Types.ObjectId,
    ref: 'Song'
  }]
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
userLibrarySchema.index({ 'recentlyPlayed.playedAt': -1 });
userLibrarySchema.index({ 'listeningHistory.playedAt': -1 });

// Method to add song to favorites
userLibrarySchema.methods.addToFavorites = function(songId: Types.ObjectId) {
  if (!this.favoriteSongs.includes(songId)) {
    this.favoriteSongs.push(songId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove song from favorites
userLibrarySchema.methods.removeFromFavorites = function(songId: Types.ObjectId) {
  this.favoriteSongs = this.favoriteSongs.filter((id: Types.ObjectId) => !id.equals(songId));
  return this.save();
};

// Method to add playlist to favorites
userLibrarySchema.methods.addPlaylistToFavorites = function(playlistId: Types.ObjectId) {
  if (!this.favoritePlaylists.includes(playlistId)) {
    this.favoritePlaylists.push(playlistId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove playlist from favorites
userLibrarySchema.methods.removePlaylistFromFavorites = function(playlistId: Types.ObjectId) {
  this.favoritePlaylists = this.favoritePlaylists.filter((id: Types.ObjectId) => !id.equals(playlistId));
  return this.save();
};

// Method to add to recently played (with limit)
userLibrarySchema.methods.addToRecentlyPlayed = function(songId: Types.ObjectId) {
  // Remove if already exists
  this.recentlyPlayed = this.recentlyPlayed.filter((item: any) => !item.song.equals(songId));

  // Add to beginning
  this.recentlyPlayed.unshift({
    song: songId,
    playedAt: new Date()
  });

  // Keep only last 50 songs
  this.recentlyPlayed = this.recentlyPlayed.slice(0, 50);

  return this.save();
};

// Method to add to listening history
userLibrarySchema.methods.addToHistory = function(
  songId: Types.ObjectId,
  duration: number,
  completed: boolean = false
) {
  this.listeningHistory.push({
    song: songId,
    playedAt: new Date(),
    duration,
    completed
  });

  // Keep only last 1000 history entries
  if (this.listeningHistory.length > 1000) {
    this.listeningHistory = this.listeningHistory.slice(-1000);
  }

  return this.save();
};

// Method to follow artist
userLibrarySchema.methods.followArtist = function(channelId: string) {
  if (!this.followedArtists.includes(channelId)) {
    this.followedArtists.push(channelId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to unfollow artist
userLibrarySchema.methods.unfollowArtist = function(channelId: string) {
  this.followedArtists = this.followedArtists.filter((id: string) => id !== channelId);
  return this.save();
};

// Method to block song
userLibrarySchema.methods.blockSong = function(songId: Types.ObjectId) {
  if (!this.blockedSongs.includes(songId)) {
    this.blockedSongs.push(songId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to unblock song
userLibrarySchema.methods.unblockSong = function(songId: Types.ObjectId) {
  this.blockedSongs = this.blockedSongs.filter((id: Types.ObjectId) => !id.equals(songId));
  return this.save();
};

// Method to update preferences
userLibrarySchema.methods.updatePreferences = function(newPreferences: Partial<IUserLibrary['preferences']>) {
  this.preferences = { ...this.preferences, ...newPreferences };
  return this.save();
};

// Method to get listening statistics
userLibrarySchema.methods.getListeningStats = function() {
  const totalListeningTime = this.listeningHistory.reduce((total: number, entry: any) => total + entry.duration, 0);
  const completedSongs = this.listeningHistory.filter((entry: any) => entry.completed).length;
  const totalSongs = this.listeningHistory.length;

  return {
    totalListeningTime, // in seconds
    totalSongs,
    completedSongs,
    completionRate: totalSongs > 0 ? (completedSongs / totalSongs) * 100 : 0
  };
};

export const UserLibrary = mongoose.model<IUserLibrary>('UserLibrary', userLibrarySchema);