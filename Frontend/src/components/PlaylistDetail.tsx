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
  Cloud,
  Heart,
  Edit3,
  Download,
  Share2,
  Clock,
  GripVertical,
  Check,
} from 'lucide-react';
import { Playlist, Song } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import ShareButton from './ShareButton';
import FallbackImage from './FallbackImage';

const PlaylistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { play, playPlaylist, playShuffleMode, addToQueue, state } = useAudioPlayer();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

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
        setEditName(response.data.name);
        setEditDescription(response.data.description || '');
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
      loadPlaylist(playlist.id);
    } catch (err) {
      console.error('Failed to remove song:', err);
      alert('Failed to remove song from playlist');
    }
  };

  const handleToggleLike = async () => {
    if (!playlist) return;
    try {
      if (isLiked) {
        // await musicService.unfollowPlaylist(playlist.id);
      } else {
        await musicService.followPlaylist(playlist.id);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!playlist) return;
    try {
      await musicService.updatePlaylist(playlist.id, {
        name: editName,
        description: editDescription || undefined,
      });
      setIsEditing(false);
      loadPlaylist(playlist.id);
    } catch (err) {
      console.error('Failed to update playlist:', err);
      alert('Failed to update playlist');
    }
  };

  const handleCancelEdit = () => {
    if (playlist) {
      setEditName(playlist.name);
      setEditDescription(playlist.description || '');
    }
    setIsEditing(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      <div className="flex items-center justify-center h-screen bg-music-black">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-music-purple border-t-transparent"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-music-black">
        <Music className="h-16 w-16 text-music-gray mb-4" />
        <p className="text-white text-xl mb-4">{error || 'Playlist not found'}</p>
        <button
          onClick={() => navigate('/platform')}
          className="bg-gradient-to-r from-music-purple to-music-blue hover:from-music-purple-hover hover:to-music-blue-hover text-white px-6 py-2 rounded-full font-semibold transition-all"
        >
          Back to Platform
        </button>
      </div>
    );
  }

  // Determine gradient color based on playlist thumbnail (similar to Spotify)
  const gradientColor = playlist.thumbnail ? 'from-purple-900/50' : 'from-music-purple/30';

  return (
    <div className="min-h-screen bg-music-black text-white flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-music-black-light transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 group"
          >
            <img 
              src="/logofortheapp.png" 
              alt="NRGFLOW Logo" 
              className="w-10 h-10 rounded-lg shadow-lg group-hover:scale-105 transition-transform"
            />
            <span className="text-xl font-black tracking-tight font-display">
              <span className="bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">NRG</span>
              <span className="text-white">FLOW</span>
            </span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-2 sm:px-3 py-2 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path, item.requiresAuth)}
              className={`
                w-full flex items-center space-x-3 sm:space-x-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all font-medium touch-manipulation
                text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10
                ${item.requiresAuth && !user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="text-sm sm:text-base">{item.label}</span>
              {item.requiresAuth && !user && (
                <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-full text-gray-400">Login</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-white/10">
          {user ? (
            <UserMenu onNavigateToSettings={() => navigate('/platform')} />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform hover:bg-gray-200 touch-manipulation"
            >
              <User className="h-5 w-5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation for Mobile */}
        <header className="bg-music-black-light/80 backdrop-blur-xl border-b border-white/5 p-4 lg:hidden sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-all duration-200 group"
            >
              <img 
                src="/logofortheapp.png" 
                alt="NRGFLOW Logo" 
                className="w-8 h-8 rounded-lg group-hover:scale-105 transition-transform"
              />
            </button>
            {user ? (
              <UserMenu onNavigateToSettings={() => navigate('/platform')} />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-gray-300 hover:text-white"
              >
                <User className="h-6 w-6" />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Gradient Header */}
          <div className={`bg-gradient-to-b ${gradientColor} via-music-black-light to-music-black px-4 sm:px-6 lg:px-8 pt-8 pb-8`}>
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-music-gray hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>

            {/* Playlist Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Playlist Cover */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                <div className="w-full sm:w-56 md:w-64 aspect-square max-w-xs mx-auto sm:mx-0">
                  {playlist.thumbnail ? (
                    <FallbackImage
                      src={playlist.thumbnail}
                      alt={playlist.name}
                      className="w-full h-full rounded-lg shadow-2xl object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg shadow-2xl bg-gradient-to-br from-music-purple via-purple-600 to-music-blue flex items-center justify-center">
                      <Music className="h-24 w-24 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Details */}
              <div className="flex-1 w-full min-w-0">
                <p className="text-sm text-music-gray font-medium uppercase tracking-wide mb-2">
                  Playlist
                </p>
                {isEditing ? (
                  <div className="space-y-4 mb-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-3xl md:text-4xl lg:text-5xl font-black text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-music-purple"
                      placeholder="Playlist name"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-base text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-music-purple resize-none"
                      placeholder="Add a description"
                      rows={2}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-white text-black rounded-full font-semibold hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 break-words font-display">
                      {playlist.name}
                    </h1>
                    {playlist.description && (
                      <p className="text-music-gray mb-4 text-sm sm:text-base">{playlist.description}</p>
                    )}
                  </>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm text-music-gray">
                  <span className="font-medium text-white">{playlist.songs.length} songs</span>
                  {playlist.songs.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{getTotalDuration()}</span>
                    </>
                  )}
                  {playlist.createdAt && (
                    <>
                      <span>•</span>
                      <span>Created {formatDate(playlist.createdAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 bg-music-black-light/50 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Play Button */}
              <button
                onClick={handlePlayAll}
                disabled={playlist.songs.length === 0}
                className="bg-gradient-to-r from-music-purple to-music-blue hover:from-music-purple-hover hover:to-music-blue-hover disabled:from-music-gray disabled:to-music-gray disabled:cursor-not-allowed text-white px-8 py-3 sm:px-10 sm:py-4 rounded-full font-bold flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-music-purple/30 font-display touch-manipulation"
              >
                <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-white" />
                <span className="text-base sm:text-lg">Play</span>
              </button>

              {/* Shuffle Button */}
              <button
                onClick={handleShufflePlay}
                disabled={playlist.songs.length === 0}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 touch-manipulation"
              >
                <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Shuffle</span>
              </button>

              {/* Like Button */}
              {user && (
                <button
                  onClick={handleToggleLike}
                  className={`p-3 sm:p-4 rounded-full transition-all hover:scale-110 active:scale-95 touch-manipulation ${
                    isLiked ? 'text-music-purple' : 'text-music-gray hover:text-white'
                  }`}
                  title={isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart className={`h-6 w-6 sm:h-7 sm:w-7 ${isLiked ? 'fill-current' : ''}`} />
                </button>
              )}

              {/* Share Button */}
              {user && playlist.songs.length > 0 && (
                <div className="flex items-center">
                  <ShareButton type="playlist" id={playlist.id} />
                </div>
              )}

              {/* Edit Button (if owner) */}
              {user && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-3 sm:p-4 text-music-gray hover:text-white rounded-full transition-all hover:scale-110 active:scale-95 touch-manipulation"
                  title="Edit playlist"
                >
                  <Edit3 className="h-6 w-6 sm:h-7 sm:w-7" />
                </button>
              )}

              {/* More Options */}
              <div className="ml-auto">
                <button className="p-3 sm:p-4 text-music-gray hover:text-white rounded-full transition-all hover:scale-110 active:scale-95 touch-manipulation">
                  <MoreVertical className="h-6 w-6 sm:h-7 sm:w-7" />
                </button>
              </div>
            </div>
          </div>

          {/* Songs List */}
          <div className="px-4 sm:px-6 lg:px-8 pb-32">
            {playlist.songs.length === 0 ? (
              <div className="text-center py-20">
                <Music className="h-20 w-20 mx-auto text-music-gray mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2 font-display">No songs yet</h3>
                <p className="text-music-gray mb-6">Start adding songs to this playlist</p>
                <button
                  onClick={() => navigate('/platform')}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
                >
                  Browse Music
                </button>
              </div>
            ) : (
              <div>
                {/* Header Row */}
                <div className="grid grid-cols-[16px,1fr,minmax(120px,1fr),auto] gap-4 px-4 py-2 text-xs text-music-gray uppercase tracking-wider border-b border-white/10 sticky top-0 bg-music-black z-10">
                  <div className="text-center">#</div>
                  <div>Title</div>
                  <div className="hidden sm:block">Date added</div>
                  <div className="text-right pr-4">
                    <Clock className="h-4 w-4 inline" />
                  </div>
                </div>

                {/* Song Rows */}
                <div className="mt-2">
                  {playlist.songs.map((song, index) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={index + 1}
                      isCurrentSong={state.currentSong?.id === song.id}
                      isPlaying={state.isPlaying && state.currentSong?.id === song.id}
                      onPlay={() => play(song)}
                      onAddToQueue={() => addToQueue(song)}
                      onRemove={user ? () => handleRemoveSong(song.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
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
  isCurrentSong?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
  onAddToQueue: () => void;
  onRemove?: () => void;
}

const SongRow: React.FC<SongRowProps> = ({ song, index, isCurrentSong, isPlaying, onPlay, onAddToQueue, onRemove }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`grid grid-cols-[16px,1fr,minmax(120px,1fr),auto] gap-4 px-4 py-2 rounded-lg transition-colors group items-center ${
      isCurrentSong ? 'bg-white/10' : 'hover:bg-white/5'
    }`}>
      {/* Index / Play Button */}
      <div className="text-music-gray text-sm text-center">
        <span className={`group-hover:hidden ${isCurrentSong ? 'hidden' : ''}`}>{index}</span>
        <button
          onClick={onPlay}
          className={`hidden group-hover:flex items-center justify-center text-white ${isCurrentSong ? 'flex' : ''}`}
        >
          {isPlaying ? (
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-music-purple rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-4 bg-music-purple rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-4 bg-music-purple rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            <Play className="h-4 w-4 fill-white" />
          )}
        </button>
      </div>

      {/* Song Info */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14">
          <FallbackImage
            src={song.thumbnail}
            alt={song.title}
            className="w-full h-full rounded object-cover"
          />
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <p className={`font-medium truncate ${isCurrentSong ? 'text-music-purple' : 'text-white'}`}>
              {song.title}
            </p>
            {song.isCached && (
              <span className="flex items-center flex-shrink-0" title="Cached for faster playback">
                <Cloud className="h-3.5 w-3.5 text-music-blue" />
              </span>
            )}
          </div>
          <p className="text-sm text-music-gray truncate">{song.artist}</p>
        </div>
      </div>

      {/* Date Added */}
      <div className="hidden sm:block text-sm text-music-gray">
        {song.createdAt ? formatDate(song.createdAt) : ''}
      </div>

      {/* Duration & Actions */}
      <div className="flex items-center justify-end space-x-2">
        <div className="text-sm text-music-gray pr-2">
          {musicService.formatDuration(song.duration)}
        </div>

        {/* Actions Menu */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-music-gray hover:text-white" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-music-black-light rounded-lg shadow-2xl border border-white/10 py-1 z-20 w-48">
                <button
                  onClick={() => {
                    onPlay();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Play now</span>
                </button>
                <button
                  onClick={() => {
                    onAddToQueue();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to queue</span>
                </button>
                {user && (
                  <>
                    <div className="border-t border-white/10 my-1" />
                    <div className="px-2 py-1">
                      <ShareButton type="song" id={song.id} className="w-full justify-start" />
                    </div>
                    {onRemove && (
                      <>
                        <div className="border-t border-white/10 my-1" />
                        <button
                          onClick={() => {
                            onRemove();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Remove from playlist</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistDetail;
