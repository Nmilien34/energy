import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Music, Clock, Eye, Play, Heart, MoreVertical, ListPlus, Cloud, CheckCircle2, Sparkles } from 'lucide-react';
import { Song } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import FallbackImage from './FallbackImage';
import PlaylistPicker from './PlaylistPicker';
import { useAuth } from '../contexts/AuthContext';
import { useAnonymousLandingSession } from '../hooks/useAnonymousLandingSession';
import AnonymousLimitModal from './AnonymousLimitModal';
import AuthModal from './AuthModal';
import { useToast } from '../contexts/ToastContext';

interface MusicSearchProps {
  onSongSelect?: (song: Song) => void;
  className?: string;
}

const MusicSearch: React.FC<MusicSearchProps> = ({ onSongSelect, className = '' }) => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  // Removed local showSuccessMessage state
  const { play, addToQueue, state } = useAudioPlayer();
  const { user } = useAuth();
  const { session, trackPlay } = useAnonymousLandingSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const { showToast } = useToast(); // Add toast hook

  // Load liked songs from library on mount
  useEffect(() => {
    const loadLikedSongs = async () => {
      try {
        const response = await musicService.getUserLibrary();
        if (response.success && response.data?.favorites) {
          const favoriteIds = new Set(response.data.favorites.map((song: Song) => song.id));
          setLikedSongs(favoriteIds);
        }
      } catch (err) {
        // Silently fail - library might not be available
      }
    };
    loadLikedSongs();
  }, []);

  // Cache for search results
  const searchCache = React.useRef<Map<string, Song[]>>(new Map());
  const activeRequestRef = React.useRef<string>('');

  const searchMusic = useCallback(async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setSongs([]);
      setShowResults(false);
      return;
    }

    // Check cache first
    if (searchCache.current.has(trimmedQuery)) {
      console.log('Search cache hit for:', trimmedQuery);
      setSongs(searchCache.current.get(trimmedQuery) || []);
      setShowResults(true);
      return;
    }

    setLoading(true);
    setError(null);
    activeRequestRef.current = trimmedQuery;

    try {
      // Reduced limit to 10 for faster response
      const response = await musicService.searchMusic(trimmedQuery, 'song', 10);

      // Prevent race conditions - only update if this is still the active request
      if (activeRequestRef.current === trimmedQuery) {
        if (response.success && response.data) {
          const results = response.data.songs;
          setSongs(results);
          setShowResults(true);
          // Cache the results
          searchCache.current.set(trimmedQuery, results);
        } else {
          setError(response.error || 'Failed to search music');
          setSongs([]);
        }
      }
    } catch (err) {
      if (activeRequestRef.current === trimmedQuery) {
        setError('Network error while searching');
        setSongs([]);
      }
    } finally {
      if (activeRequestRef.current === trimmedQuery) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchMusic(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, searchMusic]);

  const handlePlaySong = async (song: Song) => {
    // If a parent handler is provided, delegate to it (e.g. Dashboard handles its own limits)
    if (onSongSelect) {
      onSongSelect(song);
      return;
    }

    // If no parent handler, we must enforce limits internally
    if (user) {
      play(song);
      return;
    }

    if (!session) {
      play(song);
      return;
    }

    if (session.hasReachedLimit) {
      setIsLimitModalOpen(true);
      return;
    }

    const success = await trackPlay(song.id);
    if (!success) {
      setIsLimitModalOpen(true);
      return;
    }

    play(song);
  };

  const handleAddToQueue = (song: Song) => {
    addToQueue(song);
  };

  const handleAddToFavorites = async (song: Song) => {
    const isLiked = likedSongs.has(song.id);

    // Optimistic update
    if (!isLiked) {
      setLikedSongs(prev => new Set(prev).add(song.id));
      showToast('Added to your library', 'success');
    }

    try {
      if (isLiked) {
        await musicService.removeFromFavorites(song.id);
        setLikedSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(song.id);
          return newSet;
        });
        showToast('Removed from your library', 'info');
      } else {
        await musicService.addToFavorites(song.id);
      }
    } catch (err) {
      console.error('Failed to update favorites:', err);
      // Revert optimistic update on error
      if (!isLiked) {
        setLikedSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(song.id);
          return newSet;
        });
        showToast('Failed to add to library', 'error');
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, artists, or albums..."
          className="w-full bg-music-black-light text-white pl-10 pr-4 py-3 sm:py-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-music-purple transition-all text-base"
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-music-black-light rounded-lg shadow-xl border border-white/10 max-h-[60vh] sm:max-h-96 overflow-y-auto z-[60]">
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
              <div className="px-4 py-2 text-xs text-zinc-400 uppercase tracking-wide border-b border-zinc-700 flex items-center justify-between">
                <span>{songs.length} Results</span>
                {songs.some(s => s.isBestMatch) && (
                  <span className="flex items-center space-x-1 text-music-purple normal-case">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Best match verified</span>
                  </span>
                )}
              </div>
              {songs.map((song) => (
                <SongItem
                  key={song.id}
                  song={song}
                  isCurrentSong={state.currentSong?.id === song.id}
                  isLiked={likedSongs.has(song.id)}
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

      {/* Modals for Anonymous Users */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <AnonymousLimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        onSignup={() => {
          setIsLimitModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onLogin={() => {
          setIsLimitModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        message={`You've reached your 5-song preview limit. Create an account to continue listening!`}
        title="Create an Account to Continue"
      />
    </div>
  );
};

interface SongItemProps {
  song: Song;
  isCurrentSong: boolean;
  isLiked: boolean;
  onPlay: () => void;
  onAddToQueue: () => void;
  onAddToFavorites: () => void;
}

const SongItem: React.FC<SongItemProps> = ({
  song,
  isCurrentSong,
  isLiked,
  onPlay,
  onAddToQueue,
  onAddToFavorites,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); // Add animation state

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
    onAddToFavorites();
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
    <div
      className={`group flex items-center p-3 hover:bg-zinc-700 transition-colors relative ${isCurrentSong ? 'bg-zinc-700 border-l-4 border-blue-500' : ''
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
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-white truncate">{song.title}</h4>
          {song.isBestMatch && (
            <span className="flex items-center flex-shrink-0" title="Verified best match">
              <CheckCircle2 className="h-4 w-4 text-music-purple" />
            </span>
          )}
          {song.matchScore && song.matchScore > 80 && !song.isBestMatch && (
            <span className="flex items-center flex-shrink-0" title={`High quality match (${song.matchScore}%)`}>
              <Sparkles className="h-3.5 w-3.5 text-music-blue" />
            </span>
          )}
          {song.isCached && (
            <span className="flex items-center flex-shrink-0" title="Cached for faster playback">
              <Cloud className="h-3.5 w-3.5 text-music-blue" />
            </span>
          )}
        </div>
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
      <div className="flex items-center space-x-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleLikeClick}
          className="p-2 hover:bg-zinc-600 rounded-full transition-colors"
          title={isLiked ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'text-red-400 fill-red-400' : 'text-zinc-400 hover:text-red-400'} ${isAnimating ? 'animate-heartbeat' : ''}`} />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowPlaylistPicker(!showPlaylistPicker)}
            className="p-2 hover:bg-zinc-600 rounded-full transition-colors"
            title="Add to playlist"
          >
            <ListPlus className="h-4 w-4 text-zinc-400 hover:text-white" />
          </button>
          {showPlaylistPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPlaylistPicker(false)}
              />
              <PlaylistPicker
                song={song}
                onClose={() => setShowPlaylistPicker(false)}
                onSuccess={() => {
                  // Optional: Show a success message
                }}
                className="absolute right-0 top-full mt-2"
              />
            </>
          )}
        </div>
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
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors flex items-center space-x-2"
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current text-red-400' : ''}`} />
                <span>{isLiked ? 'Remove from Favorites' : 'Add to Favorites'}</span>
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
