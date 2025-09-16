import React, { useState, useEffect } from 'react';
import {
  Search,
  Music,
  TrendingUp,
  Clock,
  Heart,
  Play,
  Shuffle,
  ChevronRight,
  Video,
  Headphones,
  Star,
} from 'lucide-react';
import { Song, Playlist } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAuth } from '../contexts/AuthContext';
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
  const { play, playPlaylist, state } = useAudioPlayer();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps


  const loadDashboardData = async () => {
    console.log('🏠 Dashboard loading data for user:', user?.email);
    if (!user) {
      console.log('❌ No user logged in, skipping dashboard data load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📊 Starting dashboard data load...');

      // Load recently played with error handling
      try {
        console.log('🕐 Fetching recently played...');
        const recentResponse = await musicService.getRecentlyPlayed(8);
        console.log('📀 Recent response:', recentResponse);
        if (recentResponse.success && recentResponse.data && Array.isArray(recentResponse.data)) {
          console.log(`✅ Loaded ${recentResponse.data.length} recently played songs`);
          setRecentlyPlayed(recentResponse.data);
        } else {
          console.log('⚠️ No recently played data available');
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
          setUserPlaylists(playlistsResponse.data.slice(0, 6));
        } else {
          setUserPlaylists([]);
        }
      } catch (error) {
        console.warn('User playlists not available:', error);
        setUserPlaylists([]);
      }

      // Load trending music with error handling
      try {
        console.log('🔥 Fetching trending songs...');
        const trendingResponse = await musicService.getTrendingSongs(20);
        console.log('📊 Trending response:', trendingResponse);
        if (trendingResponse.success && trendingResponse.data && Array.isArray(trendingResponse.data.songs)) {
          console.log(`✅ Loaded ${trendingResponse.data.songs.length} trending songs`);
          setTrendingSongs(trendingResponse.data.songs.slice(0, 8));
        } else {
          console.log('⚠️ No trending songs data available');
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

  const quickPlayActions = [
    {
      icon: Shuffle,
      label: 'Shuffle Play',
      action: () => {
        if (recentlyPlayed && recentlyPlayed.length > 0) {
          const shuffled = [...recentlyPlayed].sort(() => Math.random() - 0.5);
          playPlaylist(shuffled);
        }
      },
      disabled: !recentlyPlayed || recentlyPlayed.length === 0,
    },
    {
      icon: Heart,
      label: 'Liked Songs',
      action: () => {
        // Navigate to favorites
      },
    },
    {
      icon: Clock,
      label: 'Recently Played',
      action: () => {
        if (recentlyPlayed && recentlyPlayed.length > 0) {
          playPlaylist(recentlyPlayed);
        }
      },
      disabled: !recentlyPlayed || recentlyPlayed.length === 0,
    },
  ];

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <DashboardSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <Music className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-xl font-semibold text-white mb-2">Welcome to Music Platform</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Please log in to access your dashboard, playlists, and recently played music.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 ${className}`}>
      {/* Welcome Section */}
      <section>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back{user?.username ? `, ${user.username}` : ''}!
          </h1>
          <p className="text-zinc-400">Ready to discover your next favorite song?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {quickPlayActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={action.disabled}
              className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-lg transition-colors group"
            >
              <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-white">{action.label}</span>
              <ChevronRight className="h-4 w-4 text-zinc-400 ml-auto" />
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MusicSearch
            className="max-w-2xl"
            onSongSelect={(song) => {
              play(song);
            }}
          />
        </div>
      </section>

      {/* Recently Played */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recently Played
            </h2>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {recentlyPlayed.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPlay={() => play(song)}
                isCurrentSong={state.currentSong?.id === song.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* User Playlists */}
      {userPlaylists && userPlaylists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Music className="h-5 w-5 mr-2" />
              Your Playlists
            </h2>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              See all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onPlay={() => {
                  if (playlist.songs && playlist.songs.length > 0) {
                    playPlaylist(playlist.songs);
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Music */}
      {trendingSongs && trendingSongs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Trending Now
            </h2>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              Explore more
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {trendingSongs.map((song) => (
              <SongCard
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

      {/* Stats Section */}
      <section>
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-6 border border-zinc-700">
          <h2 className="text-xl font-semibold text-white mb-4">Your Music Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Headphones}
              label="Songs Played"
              value={recentlyPlayed && Array.isArray(recentlyPlayed) ? recentlyPlayed.length.toString() : "0"}
            />
            <StatCard
              icon={Music}
              label="Playlists"
              value={userPlaylists && Array.isArray(userPlaylists) ? userPlaylists.length.toString() : "0"}
            />
            <StatCard
              icon={Heart}
              label="Liked Songs"
              value="0" // This would come from favorites count
            />
            <StatCard
              icon={Star}
              label="Hours Listened"
              value="0" // This would be calculated from play history
            />
          </div>
        </div>
      </section>

      {/* Getting Started */}
      {(!recentlyPlayed || recentlyPlayed.length === 0) && (!userPlaylists || userPlaylists.length === 0) && (
        <section>
          <div className="text-center py-12 bg-zinc-800 rounded-lg">
            <Music className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold text-white mb-2">Start Your Music Journey</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Search for your favorite songs, create playlists, and discover new music tailored to your taste.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                <Search className="h-5 w-5" />
                <span>Search Music</span>
              </button>
              <button className="flex items-center space-x-2 bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg transition-colors">
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

interface SongCardProps {
  song: Song;
  onPlay: () => void;
  isCurrentSong?: boolean;
  showTrendingBadge?: boolean;
}

const SongCard: React.FC<SongCardProps> = ({ song, onPlay, isCurrentSong, showTrendingBadge }) => {
  return (
    <div className="group cursor-pointer" onClick={onPlay}>
      <div className="relative mb-2">
        <FallbackImage
          src={song.thumbnail}
          alt={song.title}
          className={`w-full aspect-square rounded-lg object-cover transition-all ${
            isCurrentSong ? 'ring-2 ring-blue-500' : ''
          }`}
        />
        {showTrendingBadge && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Trending
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg transition-all flex items-center justify-center">
          <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
        </div>
        {isCurrentSong && (
          <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            Now Playing
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-white text-sm font-medium truncate">{song.title}</p>
        <p className="text-zinc-400 text-xs truncate">{song.artist}</p>
      </div>
    </div>
  );
};

interface PlaylistCardProps {
  playlist: Playlist;
  onPlay: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onPlay }) => {
  return (
    <div
      className="bg-zinc-800 rounded-lg p-4 hover:bg-zinc-750 transition-colors cursor-pointer group"
      onClick={onPlay}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          {playlist.thumbnail ? (
            <FallbackImage
              src={playlist.thumbnail}
              alt={playlist.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Music className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg transition-all flex items-center justify-center">
            <Play className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{playlist.name}</p>
          <p className="text-zinc-400 text-sm truncate">
            {playlist.songs ? playlist.songs.length : 0} songs
            {playlist.description && ` • ${playlist.description}`}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value }) => {
  return (
    <div className="text-center">
      <Icon className="h-6 w-6 mx-auto mb-2 text-blue-400" />
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-zinc-400">{label}</div>
    </div>
  );
};

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Welcome Section */}
      <div>
        <div className="h-8 bg-zinc-700 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-zinc-700 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-zinc-700 rounded-lg"></div>
          ))}
        </div>
        <div className="h-12 bg-zinc-700 rounded-lg max-w-2xl"></div>
      </div>

      {/* Recently Played */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-zinc-700 rounded w-1/4"></div>
          <div className="h-4 bg-zinc-700 rounded w-16"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-zinc-700 rounded-lg"></div>
              <div className="h-4 bg-zinc-700 rounded"></div>
              <div className="h-3 bg-zinc-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Playlists */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-zinc-700 rounded w-1/4"></div>
          <div className="h-4 bg-zinc-700 rounded w-16"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-zinc-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;