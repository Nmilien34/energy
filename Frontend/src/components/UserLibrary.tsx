import React, { useState, useEffect } from 'react';
import {
  Heart,
  Clock,
  Music,
  Play,
  MoreVertical,
  Search,
  Filter,
  Grid,
  List,
  Shuffle,
  Plus,
} from 'lucide-react';
import { Song, UserLibrary as UserLibraryType } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface UserLibraryProps {
  className?: string;
}

type LibraryTab = 'favorites' | 'recent' | 'all';
type ViewMode = 'grid' | 'list';

const UserLibrary: React.FC<UserLibraryProps> = ({ className = '' }) => {
  const [library, setLibrary] = useState<UserLibraryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'artist' | 'dateAdded' | 'playCount'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { play, playPlaylist, addToQueue } = useAudioPlayer();

  useEffect(() => {
    loadUserLibrary();
  }, []);

  const loadUserLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await musicService.getUserLibrary();
      if (response.success && response.data) {
        // Ensure all required fields exist with defaults
        setLibrary({
          favorites: response.data.favorites || [],
          recentlyPlayed: response.data.recentlyPlayed || [],
          playlists: response.data.playlists || []
        });
      } else {
        // Set empty library instead of error for missing backend
        setLibrary({
          favorites: [],
          recentlyPlayed: [],
          playlists: []
        });
      }
    } catch (err) {
      console.warn('User library not available:', err);
      // Set empty library instead of showing error
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
      // Silently fail for now since backend endpoint doesn't exist
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
        // Combine all songs (favorites + recent) and remove duplicates
        const favorites = library.favorites || [];
        const recent = library.recentlyPlayed || [];
        const allSongs = [...favorites, ...recent];
        const uniqueSongs = allSongs.filter((song, index, self) =>
          index === self.findIndex(s => s.id === song.id)
        );
        songs = uniqueSongs;
        break;
    }

    // Filter by search query
    if (searchQuery) {
      songs = songs.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort songs
    songs.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = a.artist.localeCompare(b.artist);
          break;
        case 'dateAdded':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'playCount':
          comparison = a.playCount - b.playCount;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
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
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playPlaylist(shuffled);
    }
  };

  const currentSongs = getCurrentSongs();

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-700 rounded w-1/3"></div>
          <div className="flex space-x-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-zinc-700 rounded w-20"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-zinc-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Your Library</h2>
        <p className="text-zinc-400">All your music in one place</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">
            <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{error}</p>
          </div>
          <button
            onClick={loadUserLibrary}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {library && (
        <>
          {/* Tabs */}
          <div className="flex items-center space-x-6 mb-6 border-b border-zinc-700">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'favorites'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>Favorites</span>
                <span className="bg-zinc-700 text-xs px-2 py-1 rounded-full">
                  {library.favorites?.length || 0}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'recent'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Recently Played</span>
                <span className="bg-zinc-700 text-xs px-2 py-1 rounded-full">
                  {library.recentlyPlayed?.length || 0}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Music className="h-4 w-4" />
                <span>All Songs</span>
              </div>
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your music..."
                  className="bg-zinc-800 text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dateAdded">Date Added</option>
                <option value="name">Song Name</option>
                <option value="artist">Artist</option>
                <option value="playCount">Play Count</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Filter className={`h-4 w-4 text-zinc-400 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Play Actions */}
              {currentSongs.length > 0 && (
                <>
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    <span>Play All</span>
                  </button>
                  <button
                    onClick={handleShufflePlay}
                    className="flex items-center space-x-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Shuffle className="h-4 w-4" />
                    <span>Shuffle</span>
                  </button>
                </>
              )}

              {/* View Mode */}
              <div className="flex items-center space-x-1 bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {currentSongs.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-4">
                {activeTab === 'favorites' && <Heart className="h-16 w-16 mx-auto text-zinc-600" />}
                {activeTab === 'recent' && <Clock className="h-16 w-16 mx-auto text-zinc-600" />}
                {activeTab === 'all' && <Music className="h-16 w-16 mx-auto text-zinc-600" />}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No songs found' : getEmptyStateTitle(activeTab)}
              </h3>
              <p className="text-zinc-400 mb-6">
                {searchQuery
                  ? `No songs match "${searchQuery}"`
                  : getEmptyStateDescription(activeTab)
                }
              </p>
              {!searchQuery && (
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                  Discover Music
                </button>
              )}
            </div>
          )}

          {/* Songs Display */}
          {currentSongs.length > 0 && (
            <>
              {viewMode === 'grid' ? (
                <SongGrid
                  songs={currentSongs}
                  onPlay={play}
                  onAddToQueue={addToQueue}
                  onRemoveFromFavorites={activeTab === 'favorites' ? handleRemoveFromFavorites : undefined}
                />
              ) : (
                <SongList
                  songs={currentSongs}
                  onPlay={play}
                  onAddToQueue={addToQueue}
                  onRemoveFromFavorites={activeTab === 'favorites' ? handleRemoveFromFavorites : undefined}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

interface SongGridProps {
  songs: Song[];
  onPlay: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onRemoveFromFavorites?: (songId: string) => void;
}

const SongGrid: React.FC<SongGridProps> = ({ songs, onPlay, onAddToQueue, onRemoveFromFavorites }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
      {songs.map((song) => (
        <SongCard
          key={song.id}
          song={song}
          onPlay={() => onPlay(song)}
          onAddToQueue={() => onAddToQueue(song)}
          onRemoveFromFavorites={onRemoveFromFavorites ? () => onRemoveFromFavorites(song.id) : undefined}
        />
      ))}
    </div>
  );
};

interface SongListProps {
  songs: Song[];
  onPlay: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onRemoveFromFavorites?: (songId: string) => void;
}

const SongList: React.FC<SongListProps> = ({ songs, onPlay, onAddToQueue, onRemoveFromFavorites }) => {
  return (
    <div className="space-y-1">
      {songs.map((song, index) => (
        <SongRow
          key={song.id}
          song={song}
          index={index + 1}
          onPlay={() => onPlay(song)}
          onAddToQueue={() => onAddToQueue(song)}
          onRemoveFromFavorites={onRemoveFromFavorites ? () => onRemoveFromFavorites(song.id) : undefined}
        />
      ))}
    </div>
  );
};

interface SongCardProps {
  song: Song;
  onPlay: () => void;
  onAddToQueue: () => void;
  onRemoveFromFavorites?: () => void;
}

const SongCard: React.FC<SongCardProps> = ({ song, onPlay, onAddToQueue, onRemoveFromFavorites }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-zinc-800 rounded-lg p-2.5 hover:bg-zinc-750 transition-colors group w-full max-w-[200px] mx-auto">
      <div className="relative mb-2">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full aspect-square rounded-md object-cover"
        />
        <button
          onClick={onPlay}
          className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play className="h-7 w-7 text-white fill-white" />
        </button>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-white truncate leading-tight">{song.title}</h4>
        <p className="text-zinc-400 truncate text-xs">{song.artist}</p>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{musicService.formatDuration(song.duration)}</span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-0.5 hover:bg-zinc-700 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-3 w-3" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 bg-zinc-700 rounded-md shadow-lg border border-zinc-600 py-1 z-20 w-32">
                  <button
                    onClick={() => {
                      onAddToQueue();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1 text-left text-xs text-white hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add to Queue</span>
                  </button>
                  {onRemoveFromFavorites && (
                    <button
                      onClick={() => {
                        onRemoveFromFavorites();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1 text-left text-xs text-red-400 hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                    >
                      <Heart className="h-3 w-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SongRowProps {
  song: Song;
  index: number;
  onPlay: () => void;
  onAddToQueue: () => void;
  onRemoveFromFavorites?: () => void;
}

const SongRow: React.FC<SongRowProps> = ({ song, index, onPlay, onAddToQueue, onRemoveFromFavorites }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center p-3 hover:bg-zinc-800 rounded-lg transition-colors group">
      <div className="w-8 text-zinc-400 text-sm mr-4">
        <span className="group-hover:hidden">{index}</span>
        <button onClick={onPlay} className="hidden group-hover:block text-white">
          <Play className="h-4 w-4" />
        </button>
      </div>

      <img
        src={song.thumbnail}
        alt={song.title}
        className="w-10 h-10 rounded-md object-cover mr-4"
      />

      <div className="flex-1 min-w-0 mr-4">
        <p className="font-medium text-white truncate">{song.title}</p>
        <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
      </div>

      <div className="hidden md:block text-sm text-zinc-400 mr-4">
        {musicService.formatDuration(song.duration)}
      </div>

      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onAddToQueue}
          className="p-1 hover:bg-zinc-700 rounded-full transition-colors"
          title="Add to queue"
        >
          <Plus className="h-4 w-4 text-zinc-400 hover:text-white" />
        </button>

        {onRemoveFromFavorites && (
          <button
            onClick={onRemoveFromFavorites}
            className="p-1 hover:bg-zinc-700 rounded-full transition-colors"
            title="Remove from favorites"
          >
            <Heart className="h-4 w-4 text-red-400 fill-red-400" />
          </button>
        )}

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-zinc-700 rounded-full transition-colors relative"
        >
          <MoreVertical className="h-4 w-4 text-zinc-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
};

const getEmptyStateTitle = (tab: LibraryTab): string => {
  switch (tab) {
    case 'favorites':
      return 'No favorite songs yet';
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
      return 'Heart songs you love to see them here';
    case 'recent':
      return 'Songs you play will appear here';
    case 'all':
      return 'Start discovering and favoriting music to build your library';
    default:
      return '';
  }
};

export default UserLibrary;