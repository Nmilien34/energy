import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Music, Play, Download, Search, Heart, X } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import AnonymousLimitModal from '../components/AnonymousLimitModal';
import ThemeSwitcher from '../components/ThemeSwitcher';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAnonymousLandingSession } from '../hooks/useAnonymousLandingSession';
import { searchMusicPublic } from '../services/anonymousSessionService';
import { Song } from '../types/models';
import FallbackImage from '../components/FallbackImage';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { play } = useAudioPlayer();
  const { session, trackPlay } = useAnonymousLandingSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Search music with debounce
  useEffect(() => {
    const searchMusic = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await searchMusicPublic(searchQuery, 'song', 20);
        if (response.success && response.data) {
          setSearchResults(response.data.songs);
          setShowSearchResults(true);
        } else {
          setSearchError(response.error || 'Failed to search music');
          setSearchResults([]);
        }
      } catch (err: any) {
        console.error('Search error:', err);
        setSearchError('Network error while searching');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchMusic();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle song play with anonymous session tracking
  const handlePlaySong = useCallback(async (song: Song) => {
    // If user is authenticated, play normally
    if (user) {
      play(song);
      return;
    }

    // For anonymous users, check and track the play
    if (!session) {
      console.error('No session available');
      return;
    }

    // Check if already at limit
    if (session.hasReachedLimit) {
      setIsLimitModalOpen(true);
      return;
    }

    // Track the play
    const success = await trackPlay(song.id);

    if (!success) {
      // Play limit reached
      setIsLimitModalOpen(true);
      return;
    }

    // Play the song
    play(song);
  }, [user, session, trackPlay, play]);

  const handleSignupClick = () => {
    setIsLimitModalOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleLoginClick = () => {
    setIsLimitModalOpen(false);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-music-black via-music-black-light to-music-black text-white overflow-hidden">
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_1px,_transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-music-purple/5 via-transparent to-transparent"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-music-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/logofortheapp.png" 
              alt="NRGFLOW Logo" 
              className="w-10 h-10 rounded-lg shadow-lg"
            />
            <h1 className="text-2xl font-black tracking-tight font-display">
              <span className="bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">
                NRG
              </span>
              <span className="text-white">FLOW</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform hover:bg-gray-200"
              >
                <User className="h-4 w-4" />
                <span>Log in</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">Your Music, Your Way</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-6 leading-tight font-display tracking-tight px-2">
            <span className="block">Music for</span>
            <span className="block bg-gradient-to-r from-music-purple via-purple-400 to-music-blue bg-clip-text text-transparent">
              Everyone
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed font-medium px-4">
            Discover, convert, and manage your music collection. 
            <span className="text-white font-medium"> All in one place.</span>
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8 sm:mb-12 px-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                placeholder="Search for songs, artists, or albums..."
                className="w-full bg-zinc-900/80 text-white pl-12 pr-12 py-3.5 sm:py-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-600 border border-zinc-800 hover:border-zinc-700 transition-all text-sm sm:text-base placeholder:text-zinc-600"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <div className="animate-spin w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (searchQuery || searchResults.length > 0) && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 max-h-[60vh] sm:max-h-96 overflow-y-auto z-50">
                {searchError && (
                  <div className="p-4 text-red-400/80 text-center text-sm">
                    <p>{searchError}</p>
                  </div>
                )}

                {isSearching && (
                  <div className="p-6 text-center text-zinc-500">
                    <div className="animate-spin w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full mx-auto mb-3"></div>
                    <p className="text-sm">Searching...</p>
                  </div>
                )}

                {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
                  <div className="p-6 text-center text-zinc-500">
                    <p className="text-sm">No results for "{searchQuery}"</p>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="py-1">
                    {searchResults.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => handlePlaySong(song)}
                        className="w-full px-3 py-2.5 hover:bg-zinc-800/50 transition-colors flex items-center space-x-3 text-left"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-zinc-800 rounded-md overflow-hidden">
                          <FallbackImage
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{song.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                        </div>
                        <Play className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-12 sm:mb-20 px-4">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="group relative px-6 py-3 sm:px-7 sm:py-3.5 rounded-full bg-white text-zinc-900 font-semibold text-sm sm:text-base hover:bg-gray-100 active:scale-[0.98] transition-all font-display touch-manipulation"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>Get Started</span>
                <span className="text-xs text-zinc-500">— it's free</span>
              </span>
            </button>
            <button
              onClick={() => navigate('/platform')}
              className="px-6 py-3 sm:px-7 sm:py-3.5 rounded-full bg-transparent border border-zinc-700 text-gray-300 font-medium text-sm sm:text-base hover:border-zinc-500 hover:text-white active:scale-[0.98] transition-all font-display touch-manipulation"
            >
              Explore Platform
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto animate-slide-up px-4">
          <div className="group bg-zinc-900/50 p-5 sm:p-6 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98] touch-manipulation">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-music-purple/50 transition-colors">
                <Download className="h-4 w-4 text-music-purple" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white">YouTube to MP3</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Convert YouTube videos to high-quality MP3 files. No limits.
            </p>
          </div>

          <div className="group bg-zinc-900/50 p-5 sm:p-6 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98] touch-manipulation">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-music-blue/50 transition-colors">
                <Music className="h-4 w-4 text-music-blue" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Song Recognition</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Identify any song instantly by uploading a short clip.
            </p>
          </div>

          <div className="group bg-zinc-900/50 p-5 sm:p-6 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98] touch-manipulation">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-music-purple/50 transition-colors">
                <Heart className="h-4 w-4 text-music-purple" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Personal Library</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Organize your music with playlists and favorites.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 sm:mt-32 pb-8 text-center">
          <p className="text-xs text-zinc-600">
            Built for music lovers
          </p>
        </footer>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <AnonymousLimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        onSignup={handleSignupClick}
        onLogin={handleLoginClick}
        message={`You've reached your 5-song preview limit. Create an account to continue listening!`}
        title="Create an Account to Continue"
      />
    </div>
  );
};

export default Welcome; 