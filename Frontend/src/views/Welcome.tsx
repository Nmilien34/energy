import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Music, Play, Download, Search, Heart, Sparkles, X, Cloud } from 'lucide-react';
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
                className="w-full bg-music-black-light/80 backdrop-blur-sm text-white pl-12 pr-12 py-4 sm:py-4.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-music-purple border border-white/10 transition-all text-base sm:text-lg placeholder:text-gray-500"
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
                  <div className="animate-spin w-5 h-5 border-2 border-music-blue border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (searchQuery || searchResults.length > 0) && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-music-black-light rounded-xl shadow-2xl border border-white/10 max-h-[60vh] sm:max-h-96 overflow-y-auto z-50">
                {searchError && (
                  <div className="p-4 text-red-400 text-center">
                    <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{searchError}</p>
                  </div>
                )}

                {isSearching && (
                  <div className="p-8 text-center text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-music-blue border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Searching...</p>
                  </div>
                )}

                {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
                  <div className="p-8 text-center text-gray-400">
                    <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No songs found for "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try searching for a different song or artist</p>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-white/10">
                      {searchResults.length} Results
                    </div>
                    {searchResults.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => handlePlaySong(song)}
                        className="w-full px-4 py-3 hover:bg-white/5 transition-colors flex items-center space-x-3 text-left"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-music-black-lighter rounded-lg overflow-hidden">
                          <FallbackImage
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-white truncate">{song.title}</p>
                            {song.isCached && (
                              <Cloud className="h-3.5 w-3.5 text-music-blue flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                        </div>
                        <Play className="h-5 w-5 text-gray-400 flex-shrink-0" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto animate-slide-up px-4">
          <div className="group relative bg-gradient-to-br from-music-black-light to-music-black-lighter p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 hover:border-music-purple/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-music-purple/10 active:scale-[0.98] touch-manipulation">
            <div className="absolute inset-0 bg-gradient-to-br from-music-purple/0 to-music-purple/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-music-purple to-purple-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white font-display">YouTube to MP3</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
                Convert your favorite YouTube videos to high-quality MP3 files instantly. 
                <span className="text-white font-medium"> No limits, no hassle.</span>
              </p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-music-black-light to-music-black-lighter p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 hover:border-music-blue/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-music-blue/10 active:scale-[0.98] touch-manipulation">
            <div className="absolute inset-0 bg-gradient-to-br from-music-blue/0 to-music-blue/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-music-blue to-blue-500 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Search className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white font-display">Song Recognition</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
                Identify any song instantly by uploading a clip. 
                <span className="text-white font-medium"> Powered by AI.</span>
              </p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-music-black-light to-music-black-lighter p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 hover:border-music-purple/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-music-purple/10 active:scale-[0.98] touch-manipulation">
            <div className="absolute inset-0 bg-gradient-to-br from-music-purple/0 to-music-purple/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-music-purple to-purple-500 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-white fill-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white font-display">Personal Library</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
                Organize and manage your music collection with playlists, favorites, and more.
                <span className="text-white font-medium"> Your music, organized.</span>
              </p>
            </div>
          </div>
        </div>
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