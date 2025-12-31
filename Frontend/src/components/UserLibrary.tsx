import React, { useState, useEffect } from 'react';
import {
  Heart,
  Clock,
  Music,
  Play,
  MoreVertical,
  Search,
  Grid,
  List,
  Shuffle,
  Plus,
  Cloud,
  X,
  Share2,
} from 'lucide-react';
import { Song, UserLibrary as UserLibraryType } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import FallbackImage from './FallbackImage';
import ShareButton from './ShareButton';
import PlaylistPicker from './PlaylistPicker';

interface UserLibraryProps {
  className?: string;
}

type LibraryTab = 'favorites' | 'recent' | 'all';

const UserLibrary: React.FC<UserLibraryProps> = ({ className = '' }) => {
  const [library, setLibrary] = useState<UserLibraryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LibraryTab>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const { play, playPlaylist, playShuffleMode, addToQueue, state } = useAudioPlayer();

  useEffect(() => {
    loadUserLibrary();
  }, []);

  const loadUserLibrary = async () => {
    try {
      setLoading(true);
      const response = await musicService.getUserLibrary();
      if (response.success && response.data) {
        setLibrary({
          favorites: response.data.favorites || [],
          recentlyPlayed: response.data.recentlyPlayed || [],
          playlists: response.data.playlists || []
        });
      } else {
        setLibrary({
          favorites: [],
          recentlyPlayed: [],
          playlists: []
        });
      }
    } catch (err) {
      console.warn('User library not available:', err);
      setLibrary({
        favorites: [],
        recentlyPlayed: [],
        playlists: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFavorites = async (songId: string) => {
    try {
      await musicService.removeFromFavorites(songId);
      if (library) {
        setLibrary({
          ...library,
          favorites: library.favorites.filter(song => song.id !== songId)
        });
      }
    } catch (err) {
      console.warn('Remove from favorites not available:', err);
    }
  };

  const getCurrentSongs = (): Song[] => {
    if (!library) return [];

    let songs: Song[] = [];
    switch (activeTab) {
      case 'favorites':
        songs = library.favorites || [];
        break;
      case 'recent':
        songs = library.recentlyPlayed || [];
        break;
      case 'all':
        const favorites = library.favorites || [];
        const recent = library.recentlyPlayed || [];
        const allSongs = [...favorites, ...recent];
        const uniqueSongs = allSongs.filter((song, index, self) =>
          index === self.findIndex(s => s.id === song.id)
        );
        songs = uniqueSongs;
        break;
    }

    if (searchQuery) {
      songs = songs.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by date added (most recent first)
    songs.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return songs;
  };

  const handlePlayAll = () => {
    const songs = getCurrentSongs();
    if (songs.length > 0) {
      playPlaylist(songs);
    }
  };

  const handleShufflePlay = () => {
    const songs = getCurrentSongs();
    if (songs.length > 0) {
      playShuffleMode(songs);
    }
  };

  const currentSongs = getCurrentSongs();
  const getTabCount = (tab: LibraryTab) => {
    if (!library) return 0;
    switch (tab) {
      case 'favorites':
        return library.favorites?.length || 0;
      case 'recent':
        return library.recentlyPlayed?.length || 0;
      case 'all':
        const favorites = library.favorites || [];
        const recent = library.recentlyPlayed || [];
        const allSongs = [...favorites, ...recent];
        const uniqueSongs = allSongs.filter((song, index, self) =>
          index === self.findIndex(s => s.id === song.id)
        );
        return uniqueSongs.length;
    }
  };

  if (loading) {
    return (
      <div className={`p-4 sm:p-6 lg:p-8 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-music-black-light rounded-lg w-1/3"></div>
          <div className="flex space-x-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-music-black-light rounded-lg w-32"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-music-black-light rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${className}`}>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 font-display">
          Your Library
        </h1>
        <p className="text-music-gray text-sm sm:text-base">Your favorite songs and recently played</p>
      </div>

      {library && (
        <>
          {/* Tabs */}
          <div className="flex items-center space-x-1 mb-6 bg-music-black-light/50 rounded-lg p-1 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 sm:py-3 rounded-md transition-all font-semibold ${
                activeTab === 'favorites'
                  ? 'bg-gradient-to-r from-music-purple/20 to-music-blue/20 text-white border border-music-purple/30'
                  : 'text-music-gray hover:text-white hover:bg-white/5'
              }`}
            >
              <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
              <span className="text-sm sm:text-base">Liked Songs</span>
              {getTabCount('favorites') > 0 && (
                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">
                  {getTabCount('favorites')}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 sm:py-3 rounded-md transition-all font-semibold ${
                activeTab === 'recent'
                  ? 'bg-gradient-to-r from-music-purple/20 to-music-blue/20 text-white border border-music-purple/30'
                  : 'text-music-gray hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Recently Played</span>
              {getTabCount('recent') > 0 && (
                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">
                  {getTabCount('recent')}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 sm:py-3 rounded-md transition-all font-semibold ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-music-purple/20 to-music-blue/20 text-white border border-music-purple/30'
                  : 'text-music-gray hover:text-white hover:bg-white/5'
              }`}
            >
              <Music className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">All Songs</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-music-gray h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in your library..."
              className="w-full bg-music-black-light text-white pl-12 pr-12 py-3 sm:py-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-music-purple transition-all text-base placeholder:text-music-gray"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-music-gray hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          {currentSongs.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
              <button
                onClick={handlePlayAll}
                className="bg-gradient-to-r from-music-purple to-music-blue hover:from-music-purple-hover hover:to-music-blue-hover text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-music-purple/30 font-display touch-manipulation"
              >
                <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-white" />
                <span className="text-base sm:text-lg">Play All</span>
              </button>
              <button
                onClick={handleShufflePlay}
                className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 touch-manipulation"
              >
                <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-base sm:text-lg">Shuffle</span>
              </button>
              <div className="ml-auto flex items-center space-x-2 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-white/10 text-white'
                      : 'text-music-gray hover:text-white hover:bg-white/5'
                  }`}
                  title="List view"
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white/10 text-white'
                      : 'text-music-gray hover:text-white hover:bg-white/5'
                  }`}
                  title="Grid view"
                >
                  <Grid className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {currentSongs.length === 0 && (
            <div className="text-center py-16 sm:py-20">
              <div className="mb-6">
                {activeTab === 'favorites' && (
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-music-purple/20 to-music-blue/20 rounded-full flex items-center justify-center">
                    <Heart className="h-12 w-12 text-music-purple" />
                  </div>
                )}
                {activeTab === 'recent' && (
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-music-purple/20 to-music-blue/20 rounded-full flex items-center justify-center">
                    <Clock className="h-12 w-12 text-music-blue" />
                  </div>
                )}
                {activeTab === 'all' && (
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-music-purple/20 to-music-blue/20 rounded-full flex items-center justify-center">
                    <Music className="h-12 w-12 text-music-purple" />
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 font-display">
                {searchQuery ? 'No songs found' : getEmptyStateTitle(activeTab)}
              </h3>
              <p className="text-music-gray mb-6 max-w-md mx-auto">
                {searchQuery
                  ? `No songs match "${searchQuery}"`
                  : getEmptyStateDescription(activeTab)
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => window.location.href = '/platform'}
                  className="bg-gradient-to-r from-music-purple to-music-blue hover:from-music-purple-hover hover:to-music-blue-hover text-white px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
                >
                  Discover Music
                </button>
              )}
            </div>
          )}

          {/* Songs Display */}
          {currentSongs.length > 0 && (
            <>
              {viewMode === 'list' ? (
                <SongList
                  songs={currentSongs}
                  onPlay={play}
                  onAddToQueue={addToQueue}
                  onRemoveFromFavorites={activeTab === 'favorites' ? handleRemoveFromFavorites : undefined}
                  onAddToPlaylist={(song) => {
                    setSelectedSong(song);
                    setShowPlaylistPicker(true);
                  }}
                  isCurrentSong={(song) => state.currentSong?.id === song.id}
                  isPlaying={(song) => state.isPlaying && state.currentSong?.id === song.id}
                />
              ) : (
                <SongGrid
                  songs={currentSongs}
                  onPlay={play}
                  onAddToQueue={addToQueue}
                  onRemoveFromFavorites={activeTab === 'favorites' ? handleRemoveFromFavorites : undefined}
                  onAddToPlaylist={(song) => {
                    setSelectedSong(song);
                    setShowPlaylistPicker(true);
                  }}
                  isCurrentSong={(song) => state.currentSong?.id === song.id}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Playlist Picker Modal */}
      {showPlaylistPicker && selectedSong && (
        <PlaylistPicker
          song={selectedSong}
          onClose={() => {
            setShowPlaylistPicker(false);
            setSelectedSong(null);
          }}
        />
      )}
    </div>
  );
};

interface SongListProps {
  songs: Song[];
  onPlay: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onRemoveFromFavorites?: (songId: string) => void;
  onAddToPlaylist: (song: Song) => void;
  isCurrentSong: (song: Song) => boolean;
  isPlaying: (song: Song) => boolean;
}

const SongList: React.FC<SongListProps> = ({
  songs,
  onPlay,
  onAddToQueue,
  onRemoveFromFavorites,
  onAddToPlaylist,
  isCurrentSong,
  isPlaying,
}) => {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[16px,1fr,auto] gap-4 px-4 py-3 text-xs text-music-gray uppercase tracking-wider border-b border-white/10 sticky top-0 bg-music-black z-10">
        <div className="text-center">#</div>
        <div>Title</div>
        <div className="text-right pr-4">
          <Clock className="h-4 w-4 inline" />
        </div>
      </div>

      {/* Songs */}
      {songs.map((song, index) => (
        <SongListItem
          key={song.id}
          song={song}
          index={index + 1}
          onPlay={() => onPlay(song)}
          onAddToQueue={() => onAddToQueue(song)}
          onRemoveFromFavorites={onRemoveFromFavorites ? () => onRemoveFromFavorites(song.id) : undefined}
          onAddToPlaylist={() => onAddToPlaylist(song)}
          isCurrentSong={isCurrentSong(song)}
          isPlaying={isPlaying(song)}
        />
      ))}
    </div>
  );
};

interface SongListItemProps {
  song: Song;
  index: number;
  onPlay: () => void;
  onAddToQueue: () => void;
  onRemoveFromFavorites?: () => void;
  onAddToPlaylist: () => void;
  isCurrentSong: boolean;
  isPlaying: boolean;
}

const SongListItem: React.FC<SongListItemProps> = ({
  song,
  index,
  onPlay,
  onAddToQueue,
  onRemoveFromFavorites,
  onAddToPlaylist,
  isCurrentSong,
  isPlaying,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={`grid grid-cols-[16px,1fr,auto] gap-4 px-4 py-2 rounded-lg transition-colors group items-center ${
      isCurrentSong ? 'bg-white/10' : 'hover:bg-white/5'
    }`}>
      {/* Index / Play Button */}
      <div className="text-music-gray text-sm text-center">
        <span className={`group-hover:hidden ${isCurrentSong ? 'hidden' : ''}`}>{index}</span>
        <button
          onClick={onPlay}
          className={`hidden group-hover:flex items-center justify-center text-white ${isCurrentSong ? 'flex' : ''}`}
        >
          {isPlaying ? (
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-music-purple rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-4 bg-music-purple rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-4 bg-music-purple rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            <Play className="h-4 w-4 fill-white" />
          )}
        </button>
      </div>

      {/* Song Info */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
        <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14">
          <FallbackImage
            src={song.thumbnail}
            alt={song.title}
            className="w-full h-full rounded object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <p className={`font-medium truncate ${isCurrentSong ? 'text-music-purple' : 'text-white'}`}>
              {song.title}
            </p>
            {song.isCached && (
              <span className="flex items-center flex-shrink-0" title="Cached for faster playback">
                <Cloud className="h-3.5 w-3.5 text-music-blue" />
              </span>
            )}
          </div>
          <p className="text-sm text-music-gray truncate">{song.artist}</p>
        </div>
      </div>

      {/* Duration & Actions */}
      <div className="flex items-center justify-end space-x-2">
        <div className="text-sm text-music-gray pr-2">
          {musicService.formatDuration(song.duration)}
        </div>
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-music-gray hover:text-white" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-music-black-light rounded-lg shadow-2xl border border-white/10 py-1 z-20 w-48">
                <button
                  onClick={() => {
                    onPlay();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Play now</span>
                </button>
                <button
                  onClick={() => {
                    onAddToQueue();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to queue</span>
                </button>
                <button
                  onClick={() => {
                    onAddToPlaylist();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to playlist</span>
                </button>
                <div className="border-t border-white/10 my-1" />
                <div className="px-2 py-1">
                  <ShareButton type="song" id={song.id} className="w-full justify-start" />
                </div>
                {onRemoveFromFavorites && (
                  <>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={() => {
                        onRemoveFromFavorites();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 transition-colors flex items-center space-x-2"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                      <span>Remove from favorites</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface SongGridProps {
  songs: Song[];
  onPlay: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onRemoveFromFavorites?: (songId: string) => void;
  onAddToPlaylist: (song: Song) => void;
  isCurrentSong: (song: Song) => boolean;
}

const SongGrid: React.FC<SongGridProps> = ({
  songs,
  onPlay,
  onAddToQueue,
  onRemoveFromFavorites,
  onAddToPlaylist,
  isCurrentSong,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {songs.map((song) => (
        <SongGridItem
          key={song.id}
          song={song}
          onPlay={() => onPlay(song)}
          onAddToQueue={() => onAddToQueue(song)}
          onRemoveFromFavorites={onRemoveFromFavorites ? () => onRemoveFromFavorites(song.id) : undefined}
          onAddToPlaylist={() => onAddToPlaylist(song)}
          isCurrentSong={isCurrentSong(song)}
        />
      ))}
    </div>
  );
};

interface SongGridItemProps {
  song: Song;
  onPlay: () => void;
  onAddToQueue: () => void;
  onRemoveFromFavorites?: () => void;
  onAddToPlaylist: () => void;
  isCurrentSong: boolean;
}

const SongGridItem: React.FC<SongGridItemProps> = ({
  song,
  onPlay,
  onAddToQueue,
  onRemoveFromFavorites,
  onAddToPlaylist,
  isCurrentSong,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group cursor-pointer transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] bg-music-black-light rounded-lg p-2 sm:p-3 hover:bg-white/10 touch-manipulation" onClick={onPlay}>
      <div className="relative mb-2 sm:mb-3">
        <FallbackImage
          src={song.thumbnail}
          alt={song.title}
          className={`w-full aspect-square rounded-lg object-cover transition-all duration-300 shadow-lg ${
            isCurrentSong ? 'ring-2 ring-music-purple' : 'group-hover:shadow-2xl'
          }`}
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300 flex items-center justify-center">
          <div className="bg-gradient-to-r from-music-purple to-music-blue rounded-full p-2 sm:p-3 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white fill-white" />
          </div>
        </div>
        {isCurrentSong && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-music-purple to-music-blue text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1 shadow-lg">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            <span>Now</span>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center space-x-1 mb-0.5 sm:mb-1">
          <p className="text-white text-xs sm:text-sm font-semibold truncate group-hover:text-music-purple transition-colors">{song.title}</p>
          {song.isCached && (
            <span className="flex items-center flex-shrink-0" title="Cached for faster playback">
              <Cloud className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-music-blue" />
            </span>
          )}
        </div>
        <p className="text-gray-400 text-xs truncate leading-tight">{song.artist}</p>
      </div>
    </div>
  );
};

const getEmptyStateTitle = (tab: LibraryTab): string => {
  switch (tab) {
    case 'favorites':
      return 'No liked songs yet';
    case 'recent':
      return 'No recently played songs';
    case 'all':
      return 'Your library is empty';
    default:
      return 'No music found';
  }
};

const getEmptyStateDescription = (tab: LibraryTab): string => {
  switch (tab) {
    case 'favorites':
      return 'Like songs you love to see them here';
    case 'recent':
      return 'Songs you play will appear here';
    case 'all':
      return 'Start discovering and liking music to build your library';
    default:
      return '';
  }
};

export default UserLibrary;
