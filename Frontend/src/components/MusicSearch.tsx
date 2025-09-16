import React, { useState, useEffect, useCallback } from 'react';
import { Search, Music, Clock, Eye, Plus, Play, Heart, MoreVertical } from 'lucide-react';
import { Song } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import FallbackImage from './FallbackImage';

interface MusicSearchProps {
  onSongSelect?: (song: Song) => void;
  className?: string;
}

const MusicSearch: React.FC<MusicSearchProps> = ({ onSongSelect, className = '' }) => {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const { play, addToQueue, state } = useAudioPlayer();

  const searchMusic = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSongs([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await musicService.searchMusic(searchQuery, 'song', 20);
      if (response.success && response.data) {
        setSongs(response.data.songs);
        setShowResults(true);
      } else {
        setError(response.error || 'Failed to search music');
        setSongs([]);
      }
    } catch (err) {
      setError('Network error while searching');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchMusic(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, searchMusic]);

  const handlePlaySong = (song: Song) => {
    play(song);
    onSongSelect?.(song);
  };

  const handleAddToQueue = (song: Song) => {
    addToQueue(song);
  };

  const handleAddToFavorites = async (song: Song) => {
    try {
      await musicService.addToFavorites(song.id);
      // Could show success message here when backend is ready
    } catch (err) {
      console.warn('Add to favorites not available:', err);
      // Silently fail for now since backend endpoint doesn't exist
    }
  };

  const formatDuration = (seconds: number | undefined | null) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number | undefined | null) => {
    if (!count || isNaN(count)) return '0';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, artists, or albums..."
          className="w-full bg-zinc-800 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          onFocus={() => query && setShowResults(true)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (query || songs.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-h-96 overflow-y-auto z-50">
          {error && (
            <div className="p-4 text-red-400 text-center">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{error}</p>
            </div>
          )}

          {loading && (
            <div className="p-8 text-center text-zinc-400">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Searching...</p>
            </div>
          )}

          {!loading && !error && songs.length === 0 && query && (
            <div className="p-8 text-center text-zinc-400">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No songs found for "{query}"</p>
              <p className="text-sm mt-2">Try searching for a different song or artist</p>
            </div>
          )}

          {!loading && songs.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs text-zinc-400 uppercase tracking-wide border-b border-zinc-700">
                {songs.length} Results
              </div>
              {songs.map((song) => (
                <SongItem
                  key={song.id}
                  song={song}
                  isCurrentSong={state.currentSong?.id === song.id}
                  onPlay={() => handlePlaySong(song)}
                  onAddToQueue={() => handleAddToQueue(song)}
                  onAddToFavorites={() => handleAddToFavorites(song)}
                />
              ))}
            </div>
          )}

          {/* Close button */}
          <div className="sticky bottom-0 bg-zinc-800 border-t border-zinc-700 p-2">
            <button
              onClick={() => setShowResults(false)}
              className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Close Results
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showResults && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

interface SongItemProps {
  song: Song;
  isCurrentSong: boolean;
  onPlay: () => void;
  onAddToQueue: () => void;
  onAddToFavorites: () => void;
}

const SongItem: React.FC<SongItemProps> = ({
  song,
  isCurrentSong,
  onPlay,
  onAddToQueue,
  onAddToFavorites,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatDuration = (seconds: number | undefined | null) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number | undefined | null) => {
    if (!count || isNaN(count)) return '0';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div
      className={`group flex items-center p-3 hover:bg-zinc-700 transition-colors relative ${
        isCurrentSong ? 'bg-zinc-700 border-l-4 border-blue-500' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 mr-3">
        <FallbackImage
          src={song.thumbnail}
          alt={song.title}
          className="w-12 h-12 rounded-md object-cover"
        />
        <button
          onClick={onPlay}
          className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play className="h-5 w-5 text-white fill-white" />
        </button>
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0 mr-3">
        <h4 className="font-medium text-white truncate">{song.title}</h4>
        <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
        <div className="flex items-center space-x-3 text-xs text-zinc-500 mt-1">
          <span className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(song.duration)}
          </span>
          <span className="flex items-center">
            <Eye className="h-3 w-3 mr-1" />
            {formatViewCount(song.viewCount)}
          </span>
          {song.playCount > 0 && (
            <span className="flex items-center">
              <Music className="h-3 w-3 mr-1" />
              {song.playCount} plays
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onAddToFavorites}
          className="p-2 hover:bg-zinc-600 rounded-full transition-colors"
          title="Add to favorites"
        >
          <Heart className="h-4 w-4 text-zinc-400 hover:text-red-400" />
        </button>
        <button
          onClick={onAddToQueue}
          className="p-2 hover:bg-zinc-600 rounded-full transition-colors"
          title="Add to queue"
        >
          <Plus className="h-4 w-4 text-zinc-400 hover:text-white" />
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-zinc-600 rounded-full transition-colors relative"
          title="More options"
        >
          <MoreVertical className="h-4 w-4 text-zinc-400 hover:text-white" />
        </button>

        {/* Context Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 bg-zinc-700 rounded-md shadow-lg border border-zinc-600 py-1 z-20 w-48">
              <button
                onClick={() => {
                  onPlay();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors"
              >
                Play Now
              </button>
              <button
                onClick={() => {
                  onAddToQueue();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors"
              >
                Add to Queue
              </button>
              <button
                onClick={() => {
                  onAddToFavorites();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors"
              >
                Add to Favorites
              </button>
              <div className="border-t border-zinc-600 my-1" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://youtube.com/watch?v=${song.youtubeId}`);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors"
              >
                Copy YouTube Link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MusicSearch;