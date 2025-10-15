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
} from 'lucide-react';
import { Song, Playlist } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MusicSearch from './MusicSearch';
import FallbackImage from './FallbackImage';

interface DashboardProps {
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { play, state } = useAudioPlayer();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps


  const loadDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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

      // Load trending music with error handling
      try {
        const trendingResponse = await musicService.getTrendingSongs(20);
        if (trendingResponse.success && trendingResponse.data && Array.isArray(trendingResponse.data.songs)) {
          setTrendingSongs(trendingResponse.data.songs.slice(0, 12));
        } else {
          setTrendingSongs([]);
        }
      } catch (error) {
        console.warn('Trending music not available:', error);
        setTrendingSongs([]);
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

  if (!user) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="text-center py-16">
          <Music className="h-20 w-20 mx-auto mb-6 text-zinc-600" />
          <h3 className="text-2xl font-bold text-white mb-3">Welcome to NRG Flow</h3>
          <p className="text-zinc-400 text-lg mb-8 max-w-md mx-auto">
            Please log in to access your dashboard, playlists, and recently played music.
          </p>
        </div>
      </div>
    );
  }

  // Quick access items including playlists
  const quickAccessItems = [
    ...recentlyPlayed.slice(0, 3).map(song => ({
      type: 'song' as const,
      data: song,
      label: song.title,
      subtitle: song.artist,
      icon: Clock,
      action: () => play(song),
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
    <div className={`px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16 ${className}`}>
      {/* Dynamic Greeting Section */}
      <section className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
            {getGreeting()}, {getFirstName()}
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 font-medium">What would you like to play today?</p>
        </div>

        {/* Quick Access Grid - Enhanced spacing and responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {quickAccessItems.map((item, index) => (
            <QuickAccessCard key={index} item={item} />
          ))}
        </div>

        {/* Search Bar - More prominent and responsive */}
        <div className="relative max-w-2xl sm:max-w-3xl lg:max-w-4xl">
          <MusicSearch
            className=""
            onSongSelect={(song) => {
              play(song);
            }}
          />
        </div>
      </section>

      {/* Made for [Name] - User Playlists */}
      {userPlaylists && userPlaylists.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Made for {getFirstName()}
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </h2>
              <p className="text-zinc-400 font-medium text-sm sm:text-base">Your personalized playlists</p>
            </div>
            <button
              onClick={() => navigate('/platform')}
              className="group bg-zinc-800/50 hover:bg-zinc-700/50 text-blue-400 hover:text-blue-300 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 hover:scale-105 border border-zinc-700/50 hover:border-zinc-600/50 self-start sm:self-auto"
            >
              <span className="text-sm sm:text-base">See all</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
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
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Recently Played
                </span>
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </h2>
              <p className="text-zinc-400 font-medium text-sm sm:text-base">Pick up where you left off</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {recentlyPlayed.map((song) => (
              <EnhancedSongCard
                key={song.id}
                song={song}
                onPlay={() => play(song)}
                isCurrentSong={state.currentSong?.id === song.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Right Now */}
      {trendingSongs && trendingSongs.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
                <span className="bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
                  Trending Right Now
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </h2>
              <p className="text-zinc-400 font-medium text-sm sm:text-base">What's hot in music right now</p>
            </div>
            <button className="group bg-zinc-800/50 hover:bg-zinc-700/50 text-pink-400 hover:text-pink-300 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 hover:scale-105 border border-zinc-700/50 hover:border-zinc-600/50 self-start sm:self-auto">
              <span className="text-sm sm:text-base">Explore</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {trendingSongs.map((song) => (
              <EnhancedSongCard
                key={song.id}
                song={song}
                onPlay={() => play(song)}
                isCurrentSong={state.currentSong?.id === song.id}
                showTrendingBadge
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
              value={recentlyPlayed && Array.isArray(recentlyPlayed) ? recentlyPlayed.length.toString() : "0"}
              gradient="from-blue-500 to-blue-600"
            />
            <EnhancedStatCard
              icon={Music}
              label="Playlists"
              value={userPlaylists && Array.isArray(userPlaylists) ? userPlaylists.length.toString() : "0"}
              gradient="from-purple-500 to-purple-600"
            />
            <EnhancedStatCard
              icon={Heart}
              label="Favorites"
              value="0"
              gradient="from-pink-500 to-red-500"
            />
            <EnhancedStatCard
              icon={Star}
              label="Hours Listened"
              value="0"
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
      className="group relative bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 hover:from-zinc-700/80 hover:to-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-500 hover:scale-[1.02] sm:hover:scale-[1.03] hover:shadow-2xl hover:shadow-blue-500/10 border border-zinc-700/50 hover:border-zinc-600/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative flex items-center space-x-3 sm:space-x-5">
        <div className="relative flex-shrink-0">
          {getThumbnail() ? (
            <FallbackImage
              src={getThumbnail() || ''}
              alt={item.label}
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl object-cover shadow-xl group-hover:shadow-2xl transition-all duration-500"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-500">
              <Music className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
            </div>
          )}
          {/* Enhanced play button overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-lg sm:rounded-xl transition-all duration-500 flex items-center justify-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-2 sm:p-3 lg:p-4 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
              <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white fill-white" />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-white text-sm sm:text-base lg:text-lg truncate mb-1 sm:mb-2 group-hover:text-blue-300 transition-colors duration-300">{item.label}</p>
          <p className="text-zinc-400 text-xs sm:text-sm truncate mb-1 sm:mb-2">{item.subtitle}</p>
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
            <item.icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="capitalize text-xs sm:text-xs">{item.type}</span>
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
    <div className="group cursor-pointer transition-all duration-200 hover:scale-105 w-[140px]" onClick={onPlay}>
      <div className="relative mb-2">
        <FallbackImage
          src={song.thumbnail}
          alt={song.title}
          className={`w-[140px] h-[140px] rounded-lg object-cover transition-all duration-200 ${
            isCurrentSong ? 'ring-1 ring-blue-500' : 'group-hover:opacity-90'
          }`}
        />
        {showTrendingBadge && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
            <TrendingUp className="h-2.5 w-2.5 inline mr-0.5" />
            Hot
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-200 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-2 shadow-lg">
            <Play className="h-4 w-4 text-black fill-black" />
          </div>
        </div>
        {isCurrentSong && (
          <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            <span>Now</span>
          </div>
        )}
      </div>
      <div className="px-0.5">
        <p className="text-white text-xs font-semibold truncate group-hover:text-blue-300 transition-colors duration-200">{song.title}</p>
        <p className="text-zinc-400 text-xs truncate">{song.artist}</p>
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
      className="group cursor-pointer transition-all duration-200 hover:scale-105 w-[140px]"
      onClick={onClick}
    >
      <div className="relative mb-2">
        {playlist.thumbnail ? (
          <FallbackImage
            src={playlist.thumbnail}
            alt={playlist.name}
            className="w-[140px] h-[140px] rounded-lg object-cover group-hover:opacity-90 transition-all duration-200"
          />
        ) : (
          <div className="w-[140px] h-[140px] rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Music className="h-8 w-8 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-200">
          <div className="absolute bottom-2 right-2 bg-white/90 rounded-full p-2 shadow-lg">
            <Play className="h-4 w-4 text-black fill-black" />
          </div>
        </div>
      </div>
      <div className="px-0.5">
        <p className="text-white text-xs font-semibold truncate group-hover:text-purple-300 transition-colors duration-200">{playlist.name}</p>
        <p className="text-zinc-400 text-xs truncate">
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
  gradient: string;
}

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({ icon: Icon, label, value, gradient }) => {
  return (
    <div className="group text-center p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-500 hover:scale-105 border border-zinc-700/30 hover:border-zinc-600/50 backdrop-blur-sm">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500`}>
        <Icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
      </div>
      <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 sm:mb-2 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">{value}</div>
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
