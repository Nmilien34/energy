import React, { useState, useEffect } from 'react';
import {
  Search,
  Music,
  TrendingUp,
  Clock,
  Heart,
  Play,
  ChevronRight,
  Video,
  Headphones,
  Star,
  ListMusic,
  Cloud,
  User,
} from 'lucide-react';
import { Song, Playlist, Artist } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MusicSearch from './MusicSearch';
import FallbackImage from './FallbackImage';
import { useAnonymousLandingSession } from '../hooks/useAnonymousLandingSession';
import AnonymousLimitModal from './AnonymousLimitModal';
import AuthModal from './AuthModal';

interface DashboardProps {
  className?: string;
}

interface PlatformStats {
  songsPlayed: { value: number; label: string };
  playlists: { value: number; label: string };
  favorites: { value: number; label: string };
  hoursListened: { value: number; label: string };
}

const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [trendingArtists, setTrendingArtists] = useState<Artist[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userStats, setUserStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { play, state } = useAudioPlayer();
  const navigate = useNavigate();

  // Anonymous session tracking
  const { session, trackPlay } = useAnonymousLandingSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  // Handle song play with anonymous limits
  const handlePlaySong = async (song: Song) => {
    // If user is authenticated, play normally
    if (user) {
      play(song);
      return;
    }

    // For anonymous users, check and track the play
    if (!session) {
      // If session not ready, just play (fail open)
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

  useEffect(() => {
    loadDashboardData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps


  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Only load user-specific data if logged in
      if (user) {
        // Load recently played with error handling
        try {
          const recentResponse = await musicService.getRecentlyPlayed(6);
          if (recentResponse.success && recentResponse.data && Array.isArray(recentResponse.data)) {
            setRecentlyPlayed(recentResponse.data);
          } else {
            setRecentlyPlayed([]);
          }
        } catch (error) {
          console.warn('Recently played data not available:', error);
          setRecentlyPlayed([]);
        }

        // Load user playlists with error handling
        try {
          const playlistsResponse = await musicService.getUserPlaylists();
          if (playlistsResponse.success && playlistsResponse.data && Array.isArray(playlistsResponse.data)) {
            setUserPlaylists(playlistsResponse.data);
          } else {
            setUserPlaylists([]);
          }
        } catch (error) {
          console.warn('User playlists not available:', error);
          setUserPlaylists([]);
        }

        // Load user stats
        try {
          const stats = await musicService.getUserStats();
          setUserStats({
            songsPlayed: { value: stats.rawValues?.songsPlayed || 0, label: stats.songsPlayed },
            playlists: { value: stats.rawValues?.playlists || 0, label: stats.playlists },
            favorites: { value: stats.rawValues?.favorites || 0, label: stats.favorites },
            hoursListened: { value: stats.rawValues?.hoursListened || 0, label: stats.hoursListened }
          });
        } catch (error) {
          console.warn('User stats not available:', error);
        }
      } else {
        // Clear user data if logged out
        setRecentlyPlayed([]);
        setUserPlaylists([]);
        setUserStats(null);

        // Load platform stats for anonymous users
        setPlatformStats(musicService.getPlatformStats());
      }

      // ALWAYS Load trending music with error handling (Public Data)
      try {
        const trendingResponse = user
          ? await musicService.getTrendingSongs(20)
          : await musicService.getPublicTrendingSongs(20);

        if (trendingResponse.success && trendingResponse.data && Array.isArray(trendingResponse.data.songs)) {
          setTrendingSongs(trendingResponse.data.songs.slice(0, 12));
        } else {
          setTrendingSongs([]);
        }
      } catch (error) {
        console.warn('Trending music not available:', error);
        setTrendingSongs([]);
      }

      // ALWAYS Load trending artists with error handling (Public Data)
      try {
        const trendingArtistsResponse = user
          ? await musicService.getTrendingArtists(20)
          : await musicService.getPublicTrendingArtists(20);

        if (trendingArtistsResponse.success && trendingArtistsResponse.data && Array.isArray(trendingArtistsResponse.data.artists)) {
          setTrendingArtists(trendingArtistsResponse.data.artists.slice(0, 12));
        } else {
          setTrendingArtists([]);
        }
      } catch (error) {
        console.warn('Trending artists not available:', error);
        setTrendingArtists([]);
      }
    } catch (error) {
      console.warn('Dashboard data not fully available:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Extract first name from username
  const getFirstName = () => {
    if (!user?.username) return '';
    // Try to get first name if username contains numbers/special chars
    const name = user.username.replace(/[0-9]/g, '').trim();
    return name || user.username;
  };

  if (loading) {
    return (
      <div className={`p-8 ${className}`}>
        <DashboardSkeleton />
      </div>
    );
  }

  // Removed blocking view for anonymous users

  // Quick access items including playlists
  const quickAccessItems = [
    ...recentlyPlayed.slice(0, 3).map(song => ({
      type: 'song' as const,
      data: song,
      label: song.title,
      subtitle: song.artist,
      icon: Clock,
      action: () => handlePlaySong(song),
    })),
    ...userPlaylists.slice(0, 3 - Math.min(recentlyPlayed.length, 3)).map(playlist => ({
      type: 'playlist' as const,
      data: playlist,
      label: playlist.name,
      subtitle: `${playlist.songs?.length || 0} songs`,
      icon: ListMusic,
      action: () => navigate(`/playlist/${playlist.id}`),
    })),
  ];

  return (
    <div className={`px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-8 lg:py-12 space-y-6 sm:space-y-8 lg:space-y-12 ${className}`}>
      {/* Dynamic Greeting Section */}
      <section className="space-y-6 sm:space-y-8">
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tight font-display">
            {getGreeting()}
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-400 font-medium">What would you like to play today?</p>
        </div>

        {/* Quick Access Grid - Enhanced spacing and responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {quickAccessItems.map((item, index) => (
            <QuickAccessCard key={index} item={item} />
          ))}
        </div>

        {/* Search Bar - More prominent and responsive */}
        <div className="relative w-full sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <MusicSearch
            className=""
            onSongSelect={(song) => {
              handlePlaySong(song);
            }}
          />
        </div>
      </section>

      {/* Made for [Name] - User Playlists */}
      {userPlaylists && userPlaylists.length > 0 && (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight">
                Made for {getFirstName()}
              </h2>
              <p className="text-sm sm:text-base text-gray-400 font-medium">Your personalized playlists</p>
            </div>
            <button
              onClick={() => navigate('/platform')}
              className="group text-gray-400 hover:text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 touch-manipulation py-2"
            >
              <span>Show all</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {userPlaylists.slice(0, 6).map((playlist) => (
              <EnhancedPlaylistCard
                key={playlist.id}
                playlist={playlist}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Played - Moved below playlists */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <section className="space-y-4 sm:space-y-6">
          <div className="space-y-1 sm:space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight">
              Recently Played
            </h2>
            <p className="text-sm sm:text-base text-gray-400 font-medium">Pick up where you left off</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {recentlyPlayed.map((song) => (
              <EnhancedSongCard
                key={song.id}
                song={song}
                onPlay={() => handlePlaySong(song)}
                isCurrentSong={state.currentSong?.id === song.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Right Now */}
      {trendingSongs && trendingSongs.length > 0 && (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight">
                Trending Right Now
              </h2>
              <p className="text-sm sm:text-base text-gray-400 font-medium">What's hot in music right now</p>
            </div>
            <button className="group text-gray-400 hover:text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 touch-manipulation py-2">
              <span>Show all</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {trendingSongs.map((song) => (
              <EnhancedSongCard
                key={song.id}
                song={song}
                onPlay={() => handlePlaySong(song)}
                isCurrentSong={state.currentSong?.id === song.id}
                showTrendingBadge
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Artists */}
      {trendingArtists && trendingArtists.length > 0 && (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight">
                Popular Artists
              </h2>
              <p className="text-sm sm:text-base text-gray-400 font-medium">Top trending artists</p>
            </div>
            <button className="group text-gray-400 hover:text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 touch-manipulation py-2">
              <span>Show all</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {trendingArtists.map((artist, index) => (
              <ArtistCard
                key={artist.name || index}
                artist={artist}
                onClick={() => {
                  // Navigate to artist page or search for artist
                  navigate(`/platform/search?q=${encodeURIComponent(artist.name)}`);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Enhanced Stats Section */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Your Music Journey
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
          </h2>
          <p className="text-zinc-400 font-medium text-sm sm:text-base">Track your listening habits and achievements</p>
        </div>
        <div className="bg-gradient-to-br from-zinc-800/50 via-zinc-900/50 to-zinc-800/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-zinc-700/50 backdrop-blur-sm shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <EnhancedStatCard
              icon={Headphones}
              label="Songs Played"
              value={user ? (userStats?.songsPlayed.label || "0") : (platformStats?.songsPlayed.label || "0")}
              animateValue={user ? userStats?.songsPlayed.value : (platformStats?.songsPlayed.value)}
              gradient="from-blue-500 to-blue-600"
            />
            <EnhancedStatCard
              icon={Music}
              label="Playlists"
              value={user ? (userStats?.playlists.label || "0") : (platformStats?.playlists.label || "0")}
              animateValue={user ? userStats?.playlists.value : (platformStats?.playlists.value)}
              gradient="from-purple-500 to-purple-600"
            />
            <EnhancedStatCard
              icon={Heart}
              label="Favorites"
              value={user ? (userStats?.favorites.label || "0") : (platformStats?.favorites.label || "0")}
              animateValue={user ? userStats?.favorites.value : (platformStats?.favorites.value)}
              gradient="from-pink-500 to-red-500"
            />
            <EnhancedStatCard
              icon={Star}
              label="Hours Listened"
              value={user ? (userStats?.hoursListened.label || "0") : (platformStats?.hoursListened.label || "0")}
              animateValue={user ? userStats?.hoursListened.value : (platformStats?.hoursListened.value)}
              gradient="from-yellow-500 to-orange-500"
            />
          </div>
        </div>
      </section>

      {/* Getting Started */}
      {(!recentlyPlayed || recentlyPlayed.length === 0) && (!userPlaylists || userPlaylists.length === 0) && (
        <section>
          <div className="text-center py-16 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-2xl border border-zinc-800">
            <Music className="h-20 w-20 mx-auto mb-6 text-zinc-600" />
            <h3 className="text-2xl font-bold text-white mb-3">Start Your Music Journey</h3>
            <p className="text-zinc-400 text-lg mb-8 max-w-md mx-auto">
              Search for your favorite songs, create playlists, and discover new music tailored to your taste.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/20 hover:scale-105">
                <Search className="h-5 w-5" />
                <span>Search Music</span>
              </button>
              <button className="flex items-center space-x-2 bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105">
                <Video className="h-5 w-5" />
                <span>Import from YouTube</span>
              </button>
            </div>
          </div>
        </section>
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

// Enhanced Quick Access Card Component
interface QuickAccessCardProps {
  item: {
    type: 'song' | 'playlist';
    data: Song | Playlist;
    label: string;
    subtitle: string;
    icon: React.ComponentType<any>;
    action: () => void;
  };
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ item }) => {
  const getThumbnail = () => {
    if (item.type === 'song') {
      return (item.data as Song).thumbnail;
    } else {
      return (item.data as Playlist).thumbnail;
    }
  };

  return (
    <button
      onClick={item.action}
      className="group relative bg-music-black-light hover:bg-white/10 active:bg-white/5 rounded-lg p-3 sm:p-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden touch-manipulation"
    >
      <div className="relative flex items-center space-x-3 sm:space-x-4">
        <div className="relative flex-shrink-0">
          {getThumbnail() ? (
            <FallbackImage
              src={getThumbnail() || ''}
              alt={item.label}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shadow-lg group-hover:shadow-xl transition-all duration-300"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-music-purple to-music-blue flex items-center justify-center shadow-lg">
              <Music className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300 flex items-center justify-center">
            <div className="bg-gradient-to-r from-music-purple to-music-blue rounded-full p-1.5 sm:p-2 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white fill-white" />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-white text-sm sm:text-base truncate mb-0.5 sm:mb-1 group-hover:text-music-purple transition-colors">{item.label}</p>
          <p className="text-gray-400 text-xs sm:text-sm truncate mb-0.5 sm:mb-1 font-normal">{item.subtitle}</p>
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs text-gray-500">
            <item.icon className="h-3 w-3" />
            <span className="capitalize">{item.type}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

// Enhanced Song Card with better hover effects
interface EnhancedSongCardProps {
  song: Song;
  onPlay: () => void;
  isCurrentSong?: boolean;
  showTrendingBadge?: boolean;
}

const EnhancedSongCard: React.FC<EnhancedSongCardProps> = ({ song, onPlay, isCurrentSong, showTrendingBadge }) => {
  return (
    <div className="group cursor-pointer transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] bg-music-black-light rounded-lg p-2 sm:p-3 hover:bg-white/10 touch-manipulation" onClick={onPlay}>
      <div className="relative mb-2 sm:mb-3">
        <FallbackImage
          src={song.thumbnail}
          alt={song.title}
          className={`w-full aspect-square rounded-lg object-cover transition-all duration-300 shadow-lg ${isCurrentSong ? 'ring-2 ring-music-purple' : 'group-hover:shadow-2xl'
            }`}
        />
        {showTrendingBadge && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            <TrendingUp className="h-3 w-3 inline mr-1" />
            Hot
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300 flex items-center justify-center">
          <div className="bg-gradient-to-r from-music-purple to-music-blue rounded-full p-2 sm:p-3 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white fill-white" />
          </div>
        </div>
        {isCurrentSong && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-music-purple to-music-blue text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1 shadow-lg">
            <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div>
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

// Artist Card Component
interface ArtistCardProps {
  artist: Artist;
  onClick: () => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  return (
    <div
      className="group cursor-pointer transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] bg-music-black-light rounded-lg p-2 sm:p-3 hover:bg-white/10 touch-manipulation"
      onClick={onClick}
    >
      <div className="relative mb-2 sm:mb-3">
        {artist.thumbnail ? (
          <FallbackImage
            src={artist.thumbnail}
            alt={artist.name}
            className="w-full aspect-square rounded-full object-cover shadow-lg group-hover:shadow-2xl transition-all duration-300"
          />
        ) : (
          <div className="w-full aspect-square rounded-full bg-gradient-to-br from-music-purple via-purple-500 to-music-blue flex items-center justify-center shadow-lg">
            <User className="h-10 w-10 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-full transition-all duration-300 flex items-center justify-center">
          <div className="bg-gradient-to-r from-music-purple to-music-blue rounded-full p-2 sm:p-3 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Music className="h-4 w-4 sm:h-5 sm:w-5 text-white fill-white" />
          </div>
        </div>
      </div>
      <div>
        <p className="text-white text-xs sm:text-sm font-semibold truncate group-hover:text-music-purple transition-colors mb-0.5 sm:mb-1 leading-tight text-center">
          {artist.name}
        </p>
        {artist.playCount !== undefined && (
          <p className="text-gray-400 text-xs truncate leading-tight text-center">
            {artist.playCount.toLocaleString()} plays
          </p>
        )}
      </div>
    </div>
  );
};

// Enhanced Playlist Card
interface EnhancedPlaylistCardProps {
  playlist: Playlist;
  onClick: () => void;
}

const EnhancedPlaylistCard: React.FC<EnhancedPlaylistCardProps> = ({ playlist, onClick }) => {
  return (
    <div
      className="group cursor-pointer transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] bg-music-black-light rounded-lg p-2 sm:p-3 hover:bg-white/10 touch-manipulation"
      onClick={onClick}
    >
      <div className="relative mb-2 sm:mb-3">
        {playlist.thumbnail ? (
          <FallbackImage
            src={playlist.thumbnail}
            alt={playlist.name}
            className="w-full aspect-square rounded-lg object-cover shadow-lg group-hover:shadow-2xl transition-all duration-300"
          />
        ) : (
          <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-music-purple via-purple-500 to-music-blue flex items-center justify-center shadow-lg">
            <Music className="h-10 w-10 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300 flex items-center justify-center">
          <div className="bg-gradient-to-r from-music-purple to-music-blue rounded-full p-2 sm:p-3 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white fill-white" />
          </div>
        </div>
      </div>
      <div>
        <p className="text-white text-xs sm:text-sm font-semibold truncate group-hover:text-music-purple transition-colors mb-0.5 sm:mb-1 leading-tight">{playlist.name}</p>
        <p className="text-gray-400 text-xs truncate leading-tight">
          {playlist.songs ? playlist.songs.length : 0} songs
        </p>
      </div>
    </div>
  );
};

// Enhanced Stat Card
interface EnhancedStatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  animateValue?: number;
  gradient: string;
}

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({ icon: Icon, label, value, animateValue, gradient }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 } // Trigger when 10% visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  // Count up animation
  useEffect(() => {
    // Only animate if we have a value, have triggered animation, and haven't finished it
    if (animateValue === undefined || !hasAnimated) {
      // If waiting to animate, show start value (or could show initial '0'?)
      // For now, let's just keep previous value or handle it in rendering
      if (!hasAnimated && animateValue !== undefined) {
        const startValue = Math.floor(animateValue * 0.9);
        if (animateValue >= 1000) {
          setDisplayValue((startValue / 1000).toFixed(1) + 'k+');
        } else {
          setDisplayValue(Math.floor(startValue).toString());
        }
      }
      return;
    }

    const startValue = Math.floor(animateValue * 0.9); // Start from 90%
    const duration = 2000; // 2 seconds
    const fps = 60;
    const interval = 1000 / fps;
    const steps = duration / interval;
    const increment = (animateValue - startValue) / steps;

    let current = startValue;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;

      if (step >= steps) {
        setDisplayValue(value); // Ensure specific formatted end value (e.g. "10k+")
        clearInterval(timer);
      } else {
        // Format intermediate values
        if (current >= 1000) {
          setDisplayValue((current / 1000).toFixed(1) + 'k+');
        } else {
          setDisplayValue(Math.floor(current).toString());
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [animateValue, value, hasAnimated]);

  return (
    <div ref={cardRef} className="group text-center p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-500 hover:scale-105 border border-zinc-700/30 hover:border-zinc-600/50 backdrop-blur-sm">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500`}>
        <Icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
      </div>
      <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 sm:mb-2 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">{displayValue}</div>
      <div className="text-xs sm:text-sm text-zinc-400 font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
};

// Dashboard Skeleton Loader
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Greeting */}
      <div>
        <div className="h-12 bg-zinc-800 rounded-xl w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-12 bg-zinc-800 rounded-xl max-w-3xl"></div>
      </div>

      {/* Playlists */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-zinc-800 rounded-xl w-1/4"></div>
          <div className="h-6 bg-zinc-800 rounded-xl w-20"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-zinc-800 rounded-xl"></div>
              <div className="h-4 bg-zinc-800 rounded"></div>
              <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played */}
      <div>
        <div className="h-8 bg-zinc-800 rounded-xl w-1/4 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-zinc-800 rounded-xl"></div>
              <div className="h-4 bg-zinc-800 rounded"></div>
              <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
