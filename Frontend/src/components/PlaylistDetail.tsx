import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Music,
  Plus,
  MoreVertical,
  Shuffle,
  ArrowLeft,
  Trash2,
  Home,
  Search,
  Library,
  ListMusic,
  Youtube,
  Menu,
  X,
  User,
} from 'lucide-react';
import { Playlist, Song } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import Logo from './Logo';
import ShareButton from './ShareButton';

const PlaylistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { play, playPlaylist, playShuffleMode, addToQueue } = useAudioPlayer();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlaylist(id);
    }
  }, [id]);

  const loadPlaylist = async (playlistId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await musicService.getPlaylistById(playlistId);
      if (response.success && response.data) {
        setPlaylist(response.data);
      } else {
        setError('Failed to load playlist');
      }
    } catch (err) {
      console.error('Error loading playlist:', err);
      setError('Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (playlist && playlist.songs.length > 0) {
      playPlaylist(playlist.songs);
    }
  };

  const handleShufflePlay = () => {
    if (playlist && playlist.songs.length > 0) {
      playShuffleMode(playlist.songs);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!playlist) return;

    try {
      await musicService.removeSongFromPlaylist(playlist.id, songId);
      // Reload playlist to get updated song list
      loadPlaylist(playlist.id);
    } catch (err) {
      console.error('Failed to remove song:', err);
      alert('Failed to remove song from playlist');
    }
  };

  const getTotalDuration = () => {
    if (!playlist) return '0:00';
    const totalSeconds = playlist.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const sidebarItems = [
    { id: 'dashboard', icon: Home, label: 'Home', path: '/platform', requiresAuth: false },
    { id: 'search', icon: Search, label: 'Search', path: '/platform', requiresAuth: false },
    { id: 'library', icon: Library, label: 'Your Library', path: '/platform', requiresAuth: true },
    { id: 'playlists', icon: ListMusic, label: 'Playlists', path: '/platform', requiresAuth: true },
    { id: 'youtube', icon: Youtube, label: 'YouTube', path: '/platform', requiresAuth: true },
  ];

  const handleNavigate = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSidebarOpen(false);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-900">
        <Music className="h-16 w-16 text-zinc-600 mb-4" />
        <p className="text-white text-xl mb-4">{error || 'Playlist not found'}</p>
        <button
          onClick={() => navigate('/playlists')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zinc-800 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-all duration-200 group"
          >
            <div className="group-hover:scale-105 transition-transform">
              <Logo size="md" />
            </div>
            <span className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">NRG Flow</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path, item.requiresAuth)}
              className={`
                w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors
                text-zinc-300 hover:text-white hover:bg-zinc-700
                ${item.requiresAuth && !user ? 'opacity-50' : ''}
              `}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.requiresAuth && !user && (
                <span className="ml-auto text-xs bg-zinc-600 px-2 py-1 rounded">Login</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-700">
          {user ? (
            <UserMenu onNavigateToSettings={() => navigate('/platform')} />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center space-x-3 px-3 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <User className="h-5 w-5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Navigation for Mobile */}
        <header className="bg-zinc-800 border-b border-zinc-700 p-4 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-zinc-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-all duration-200 group"
            >
              <div className="group-hover:scale-105 transition-transform">
                <Logo size="sm" />
              </div>
              <span className="font-bold text-white group-hover:text-blue-400 transition-colors">NRG Flow</span>
            </button>
            {user ? (
              <UserMenu onNavigateToSettings={() => navigate('/platform')} />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-zinc-300 hover:text-white"
              >
                <User className="h-6 w-6" />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="min-h-screen bg-zinc-900 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 px-6 pt-6 pb-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        {/* Playlist Info */}
        <div className="flex items-end space-x-6">
          {/* Playlist Cover */}
          <div className="flex-shrink-0">
            {playlist.thumbnail ? (
              <img
                src={playlist.thumbnail}
                alt={playlist.name}
                className="w-48 h-48 rounded-lg shadow-2xl object-cover"
              />
            ) : (
              <div className="w-48 h-48 rounded-lg shadow-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Music className="h-20 w-20 text-white" />
              </div>
            )}
          </div>

          {/* Playlist Details */}
          <div className="flex-1 pb-2">
            <p className="text-sm text-zinc-400 font-medium uppercase tracking-wide mb-2">
              Playlist
            </p>
            <h1 className="text-5xl font-bold text-white mb-4 break-words">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-zinc-300 mb-4">{playlist.description}</p>
            )}
            <div className="flex items-center space-x-2 text-sm text-zinc-400">
              <span className="font-medium text-white">{playlist.songs.length} songs</span>
              <span>•</span>
              <span>{getTotalDuration()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-6 flex items-center space-x-4">
        <button
          onClick={handlePlayAll}
          disabled={playlist.songs.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-semibold flex items-center space-x-2 transition-colors"
        >
          <Play className="h-5 w-5 fill-white" />
          <span>Play</span>
        </button>
        <button
          onClick={handleShufflePlay}
          disabled={playlist.songs.length === 0}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full font-semibold flex items-center space-x-2 transition-colors"
        >
          <Shuffle className="h-5 w-5" />
          <span>Shuffle</span>
        </button>
        {user && playlist.songs.length > 0 && (
          <ShareButton type="playlist" id={playlist.id} />
        )}
      </div>

      {/* Songs List */}
      <div className="px-6">
        {playlist.songs.length === 0 ? (
          <div className="text-center py-16">
            <Music className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No songs yet</h3>
            <p className="text-zinc-400">Start adding songs to this playlist</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-[auto,1fr,auto,auto] gap-4 px-4 py-2 text-xs text-zinc-400 uppercase tracking-wide border-b border-zinc-800">
              <div className="w-12">#</div>
              <div>Title</div>
              <div className="text-right pr-4">Duration</div>
              <div className="w-12"></div>
            </div>

            {/* Song Rows */}
            {playlist.songs.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                index={index + 1}
                onPlay={() => play(song)}
                onAddToQueue={() => addToQueue(song)}
                onRemove={() => handleRemoveSong(song.id)}
              />
            ))}
          </div>
        )}
      </div>
          </div>
        </div>
      </main>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

interface SongRowProps {
  song: Song;
  index: number;
  onPlay: () => void;
  onAddToQueue: () => void;
  onRemove: () => void;
}

const SongRow: React.FC<SongRowProps> = ({ song, index, onPlay, onAddToQueue, onRemove }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();

  return (
    <div className="grid grid-cols-[auto,1fr,auto,auto] gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition-colors group items-center">
      {/* Index / Play Button */}
      <div className="w-12 text-zinc-400 text-sm">
        <span className="group-hover:hidden">{index}</span>
        <button
          onClick={onPlay}
          className="hidden group-hover:flex items-center justify-center text-white"
        >
          <Play className="h-4 w-4 fill-white" />
        </button>
      </div>

      {/* Song Info */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Thumbnail */}
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-14 h-14 rounded object-cover flex-shrink-0"
        />

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate">{song.title}</p>
          <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
        </div>
      </div>

      {/* Duration */}
      <div className="text-sm text-zinc-400 pr-4">
        {musicService.formatDuration(song.duration)}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onAddToQueue}
          className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
          title="Add to queue"
        >
          <Plus className="h-4 w-4 text-zinc-400 hover:text-white" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-zinc-400 hover:text-white" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-zinc-700 rounded-md shadow-lg border border-zinc-600 py-1 z-20 w-48">
                <button
                  onClick={() => {
                    onAddToQueue();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to queue</span>
                </button>
{user && (
                  <div
                    onClick={() => setShowMenu(false)}
                    className="px-2 py-1"
                  >
                    <ShareButton type="song" id={song.id} className="w-full justify-start" />
                  </div>
                )}
                <div className="border-t border-zinc-600 my-1" />
                <button
                  onClick={() => {
                    onRemove();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove from playlist</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistDetail;
