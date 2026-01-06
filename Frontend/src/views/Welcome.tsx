import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Music, Play, Download, Search, Heart, X } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import AnonymousLimitModal from '../components/AnonymousLimitModal';
import ThemeSwitcher from '../components/ThemeSwitcher';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAnonymousLandingSession } from '../hooks/useAnonymousLandingSession';
import { searchMusicPublic } from '../services/anonymousSessionService';
import { Song } from '../types/models';
import FallbackImage from '../components/FallbackImage';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { play } = useAudioPlayer();

  // Theme-aware styling
  const isLight = theme === 'light';
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
    console.log('[Welcome] handlePlaySong called:', { songId: song.id, songTitle: song.title, hasUser: !!user, hasSession: !!session });

    // Validate song has required properties
    if (!song.id && song.youtubeId) {
      song.id = song.youtubeId;
      console.log('[Welcome] Using youtubeId as id:', song.id);
    }

    if (!song.id) {
      console.error('[Welcome] Song has no ID, cannot play:', song);
      return;
    }

    // If user is authenticated, play normally
    if (user) {
      console.log('[Welcome] User authenticated, playing directly');
      play(song);
      return;
    }

    // For anonymous users, check and track the play
    if (!session) {
      console.warn('[Welcome] No session available, playing anyway (session may still be initializing)');
      // Play anyway - session might still be initializing
      play(song);
      return;
    }

    // Check if already at limit
    if (session.hasReachedLimit) {
      console.log('[Welcome] Session limit reached, showing modal');
      setIsLimitModalOpen(true);
      return;
    }

    // Track the play
    console.log('[Welcome] Tracking play for song:', song.id);
    const success = await trackPlay(song.id);

    if (!success) {
      // Play limit reached
      console.log('[Welcome] trackPlay returned false, showing modal');
      setIsLimitModalOpen(true);
      return;
    }

    // Play the song
    console.log('[Welcome] Playing song:', song.title);
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
    <div className="min-h-screen overflow-hidden transition-colors pb-safe bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Gradient blobs for glass effect - smaller on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-20 -left-20 sm:-top-40 sm:-left-40 w-[250px] h-[250px] sm:w-[500px] sm:h-[500px] rounded-full blur-[80px] sm:blur-[120px] ${isLight ? 'bg-purple-400/30' : 'bg-purple-600/20'}`}></div>
        <div className={`absolute top-1/4 -right-10 sm:-right-20 w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] rounded-full blur-[80px] sm:blur-[120px] ${isLight ? 'bg-blue-400/25' : 'bg-blue-600/20'}`}></div>
        <div className={`absolute bottom-0 left-1/4 sm:left-1/3 w-[300px] h-[200px] sm:w-[600px] sm:h-[400px] rounded-full blur-[80px] sm:blur-[120px] ${isLight ? 'bg-purple-300/20' : 'bg-purple-500/15'}`}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 w-[150px] h-[150px] sm:w-[300px] sm:h-[300px] rounded-full blur-[60px] sm:blur-[100px] ${isLight ? 'bg-cyan-400/15' : 'bg-cyan-500/10'}`}></div>
      </div>

      {/* Navigation - Glass */}
      <nav className={`relative z-10 backdrop-blur-2xl border-b shadow-lg transition-colors ${isLight
        ? 'bg-black/5 border-black/10 shadow-black/5'
        : 'bg-white/5 border-white/10 shadow-black/5'
        }`}>
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-5 flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img
              src="/logofortheapp.png"
              alt="NRGFLOW Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-lg"
            />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight font-display">
              <span className="bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">
                NRG
              </span>
              <span className={isLight ? 'text-[var(--text-primary)]' : 'text-white'}>FLOW</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeSwitcher />
            {user ? (
              <UserMenu />
            ) : (
              <>
                {/* Mobile: Icon only */}
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`sm:hidden p-2.5 rounded-full backdrop-blur-xl border transition-all ${isLight
                    ? 'bg-black/5 border-black/10 text-[var(--text-primary)] hover:bg-black/10'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                >
                  <User className="h-4 w-4" />
                </button>
                {/* Desktop: Full button */}
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-xl font-medium transition-all ${isLight
                    ? 'bg-black/5 border border-black/10 text-[var(--text-primary)] hover:bg-black/10'
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                    }`}
                >
                  <User className="h-4 w-4" />
                  <span>Log in</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className={`inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-xl border mb-4 sm:mb-6 ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
            }`}>
            <span className={`text-[10px] sm:text-xs font-medium tracking-wide uppercase ${isLight ? 'text-[var(--text-secondary)]' : 'text-white/60'}`}>Your Music, Your Way</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-3 sm:mb-6 leading-[1.1] font-display tracking-tight">
            <span className="block">Music for</span>
            <span className="block bg-gradient-to-r from-music-purple via-purple-400 to-music-blue bg-clip-text text-transparent">
              Everyone
            </span>
          </h1>

          <p className={`text-sm sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-12 max-w-2xl mx-auto leading-relaxed font-medium px-2 ${isLight ? 'text-[var(--text-secondary)]' : 'text-gray-400'}`}>
            Discover, convert, and manage your music collection.
            <span className={isLight ? 'text-[var(--text-primary)] font-medium' : 'text-white font-medium'}> All in one place.</span>
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-6 sm:mb-12 px-2 sm:px-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                placeholder="Search songs, artists..."
                className={`w-full backdrop-blur-2xl pl-10 pr-10 sm:pl-12 sm:pr-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 border transition-all text-sm shadow-lg ${isLight
                  ? 'bg-black/5 text-[var(--text-primary)] border-black/10 hover:border-black/20 hover:bg-black/10 focus:ring-black/10 placeholder:text-black/30 shadow-black/5'
                  : 'bg-white/5 text-white border-white/10 hover:border-white/20 hover:bg-white/10 focus:ring-white/20 placeholder:text-white/40 shadow-black/10'
                  }`}
              />
              <Search className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none ${isLight ? 'text-[var(--text-tertiary)]' : 'text-gray-400'}`} />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 transition-colors ${isLight ? 'text-black/40 hover:text-black/70' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-10 sm:right-12 top-1/2 -translate-y-1/2">
                  <div className={`animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 rounded-full ${isLight ? 'border-black/20 border-t-black/60' : 'border-white/20 border-t-white/60'
                    }`}></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (searchQuery || searchResults.length > 0) && (
              <div className={`absolute top-full left-0 right-0 sm:left-4 sm:right-4 mt-2 backdrop-blur-2xl rounded-xl sm:rounded-2xl shadow-2xl border max-h-[50vh] sm:max-h-96 overflow-y-auto z-50 ${isLight ? 'bg-white/90 border-black/10' : 'bg-zinc-900/95 border-white/10'
                }`}>
                {searchError && (
                  <div className="p-4 text-red-500/80 text-center text-sm">
                    <p>{searchError}</p>
                  </div>
                )}

                {isSearching && (
                  <div className={`p-6 text-center ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                    <div className={`animate-spin w-5 h-5 border-2 rounded-full mx-auto mb-3 ${isLight ? 'border-black/20 border-t-black/60' : 'border-white/20 border-t-white/60'
                      }`}></div>
                    <p className="text-sm">Searching...</p>
                  </div>
                )}

                {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
                  <div className={`p-6 text-center ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                    <p className="text-sm">No results for "{searchQuery}"</p>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="py-1">
                    {searchResults.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => handlePlaySong(song)}
                        className={`w-full px-3 py-2.5 transition-colors flex items-center space-x-3 text-left ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                          }`}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden ${isLight ? 'bg-black/10' : 'bg-white/10'}`}>
                          <FallbackImage
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isLight ? 'text-[var(--text-primary)]' : 'text-white'}`}>{song.title}</p>
                          <p className={`text-xs truncate ${isLight ? 'text-black/40' : 'text-white/40'}`}>{song.artist}</p>
                        </div>
                        <Play className={`h-4 w-4 flex-shrink-0 ${isLight ? 'text-black/30' : 'text-white/30'}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-4 mb-10 sm:mb-20 px-2 sm:px-4">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`group relative px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-full backdrop-blur-xl font-semibold text-sm active:scale-[0.98] transition-all font-display touch-manipulation shadow-lg ${isLight
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-black/80 shadow-black/10'
                : 'bg-white/90 text-zinc-900 hover:bg-white shadow-white/10'
                }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <span>Get Started</span>
                <span className={`text-xs ${isLight ? 'text-white/60' : 'text-zinc-500'}`}>— it's free</span>
              </span>
            </button>
            <button
              onClick={() => navigate('/platform')}
              className={`px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-full backdrop-blur-xl border font-medium text-sm active:scale-[0.98] transition-all font-display touch-manipulation ${isLight
                ? 'bg-black/5 border-black/20 text-[var(--text-primary)] hover:bg-black/10 hover:border-black/30'
                : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                }`}
            >
              Explore Platform
            </button>
          </div>
        </div>

        {/* Feature Cards - Glass */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 max-w-5xl mx-auto animate-slide-up px-2 sm:px-4">
          <div className={`group backdrop-blur-2xl p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all active:scale-[0.98] touch-manipulation shadow-lg ${isLight
            ? 'bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10 shadow-black/5'
            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 shadow-black/5'
            }`}>
            <div className="flex items-center space-x-3 mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl backdrop-blur-xl border flex items-center justify-center ${isLight ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-500/20 border-purple-400/20'
                }`}>
                <Download className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLight ? 'text-purple-600' : 'text-purple-300'}`} />
              </div>
              <h3 className={`text-sm sm:text-lg font-semibold ${isLight ? 'text-[var(--text-primary)]' : 'text-white'}`}>YouTube to MP3</h3>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-[var(--text-secondary)]' : 'text-white/50'}`}>
              Convert YouTube videos to high-quality MP3 files. No limits.
            </p>
          </div>

          <div
            onClick={() => navigate('/recognize')}
            className={`group backdrop-blur-2xl p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all active:scale-[0.98] touch-manipulation shadow-lg cursor-pointer ${isLight
              ? 'bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10 shadow-black/5'
              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 shadow-black/5'
              }`}
          >
            <div className="flex items-center space-x-3 mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl backdrop-blur-xl border flex items-center justify-center ${isLight ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-500/20 border-blue-400/20'
                }`}>
                <Music className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLight ? 'text-blue-600' : 'text-blue-300'}`} />
              </div>
              <h3 className={`text-sm sm:text-lg font-semibold ${isLight ? 'text-[var(--text-primary)]' : 'text-white'}`}>Song Recognition</h3>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-[var(--text-secondary)]' : 'text-white/50'}`}>
              Shazam-like recognition. Record audio or hum a melody!
            </p>
          </div>

          <div className={`group backdrop-blur-2xl p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all active:scale-[0.98] touch-manipulation shadow-lg ${isLight
            ? 'bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10 shadow-black/5'
            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 shadow-black/5'
            }`}>
            <div className="flex items-center space-x-3 mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl backdrop-blur-xl border flex items-center justify-center ${isLight ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-500/20 border-cyan-400/20'
                }`}>
                <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLight ? 'text-cyan-600' : 'text-cyan-300'}`} />
              </div>
              <h3 className={`text-sm sm:text-lg font-semibold ${isLight ? 'text-[var(--text-primary)]' : 'text-white'}`}>Personal Library</h3>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-[var(--text-secondary)]' : 'text-white/50'}`}>
              Organize your music with playlists and favorites.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 sm:mt-32 pb-6 sm:pb-8 text-center">
          <p className={`text-[10px] sm:text-xs ${isLight ? 'text-black/30' : 'text-white/30'}`}>
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