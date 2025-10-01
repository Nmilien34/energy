import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Music,
  Clock,
  Play,
  MoreVertical,
  Edit,
  Trash2,
  Share,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';
import { Playlist, CreatePlaylistRequest, Song } from '../types/models';
import { musicService } from '../services/musicService';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface PlaylistManagerProps {
  onPlaylistSelect?: (playlist: Playlist) => void;
  className?: string;
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ onPlaylistSelect, className = '' }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const { playPlaylist } = useAudioPlayer();

  useEffect(() => {
    loadUserPlaylists();
  }, []);

  const loadUserPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await musicService.getUserPlaylists();
      if (response.success && response.data) {
        // Ensure data is an array
        const playlistsData = Array.isArray(response.data) ? response.data : [];
        setPlaylists(playlistsData);
      } else {
        // Set empty playlists instead of error for missing backend
        setPlaylists([]);
      }
    } catch (err) {
      console.warn('User playlists not available:', err);
      // Set empty playlists instead of showing error
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (data: CreatePlaylistRequest) => {
    try {
      const response = await musicService.createPlaylist(data);
      if (response.success && response.data) {
        setPlaylists([response.data, ...playlists]);
        setShowCreateModal(false);
      } else {
        throw new Error(response.error || 'Failed to create playlist');
      }
    } catch (err) {
      console.warn('Playlist creation not available:', err);
      alert('Failed to create playlist. Please try again.');
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;

    try {
      const response = await musicService.deletePlaylist(playlistId);
      if (response.success) {
        setPlaylists(playlists.filter(p => p.id !== playlistId));
      } else {
        throw new Error(response.error || 'Failed to delete playlist');
      }
    } catch (err) {
      console.warn('Playlist deletion not available:', err);
      alert('Failed to delete playlist. Please try again.');
    }
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.songs.length > 0) {
      playPlaylist(playlist.songs);
    }
  };

  // Ensure playlists is always an array before filtering
  const playlistsArray = Array.isArray(playlists) ? playlists : [];
  const filteredPlaylists = playlistsArray.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-zinc-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">My Playlists</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search playlists..."
          className="w-full bg-zinc-800 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">
            <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{error}</p>
          </div>
          <button
            onClick={loadUserPlaylists}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredPlaylists.length === 0 && (
        <div className="text-center py-12">
          <Music className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'No playlists found' : 'No playlists yet'}
          </h3>
          <p className="text-zinc-400 mb-6">
            {searchQuery
              ? `No playlists match "${searchQuery}"`
              : 'Create your first playlist to get started'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Create Your First Playlist
            </button>
          )}
        </div>
      )}

      {/* Playlists Grid */}
      {!loading && !error && filteredPlaylists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onPlay={() => handlePlayPlaylist(playlist)}
              onEdit={() => {
                setSelectedPlaylist(playlist);
                setShowPlaylistModal(true);
              }}
              onDelete={() => handleDeletePlaylist(playlist.id)}
              onSelect={() => onPlaylistSelect?.(playlist)}
            />
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePlaylist}
        />
      )}

      {/* Playlist Detail Modal */}
      {showPlaylistModal && selectedPlaylist && (
        <PlaylistDetailModal
          playlist={selectedPlaylist}
          onClose={() => {
            setShowPlaylistModal(false);
            setSelectedPlaylist(null);
          }}
          onUpdate={(updatedPlaylist) => {
            setPlaylists(playlists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
            setSelectedPlaylist(updatedPlaylist);
          }}
        />
      )}
    </div>
  );
};

interface PlaylistCardProps {
  playlist: Playlist;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPlay,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatDuration = (songs: Song[]) => {
    const totalSeconds = songs.reduce((acc, song) => acc + song.duration, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-4 hover:bg-zinc-750 transition-colors group cursor-pointer">
      <div onClick={onSelect}>
        {/* Playlist Thumbnail */}
        <div className="relative mb-4">
          {playlist.thumbnail ? (
            <img
              src={playlist.thumbnail}
              alt={playlist.name}
              className="w-full aspect-square rounded-lg object-cover"
            />
          ) : (
            <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Music className="h-12 w-12 text-white" />
            </div>
          )}

          {/* Play Button Overlay */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="h-12 w-12 text-white fill-white" />
          </button>
        </div>

        {/* Playlist Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-white truncate flex-1 mr-2">{playlist.name}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-zinc-700 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4 text-zinc-400" />
            </button>

            {/* Context Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-6 bg-zinc-700 rounded-md shadow-lg border border-zinc-600 py-1 z-20 w-48">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Play</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(window.location.origin + `/playlist/${playlist.id}`);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                  >
                    <Share className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                  <div className="border-t border-zinc-600 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-600 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {playlist.description && (
            <p className="text-sm text-zinc-400 line-clamp-2">{playlist.description}</p>
          )}

          <div className="flex items-center space-x-4 text-xs text-zinc-500">
            <span className="flex items-center">
              <Music className="h-3 w-3 mr-1" />
              {playlist.songs.length} songs
            </span>
            {playlist.songs.length > 0 && (
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(playlist.songs)}
              </span>
            )}
            <span className="flex items-center">
              {playlist.isPublic ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Public
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Private
                </>
              )}
            </span>
            {playlist.isCollaborative && (
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                Collaborative
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (data: CreatePlaylistRequest) => void;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        isCollaborative,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Create New Playlist</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Playlist Name*
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter playlist name"
                className="w-full bg-zinc-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter playlist description"
                className="w-full bg-zinc-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-300">Make this playlist public</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isCollaborative}
                  onChange={(e) => setIsCollaborative(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-300">Allow others to add songs</span>
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface PlaylistDetailModalProps {
  playlist: Playlist;
  onClose: () => void;
  onUpdate: (playlist: Playlist) => void;
}

const PlaylistDetailModal: React.FC<PlaylistDetailModalProps> = ({ playlist, onClose, onUpdate }) => {
  // This will be implemented as a detailed playlist view/editor
  // For now, just close the modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">{playlist.name}</h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="text-zinc-400">
            <p>Playlist details and song management will be implemented here.</p>
            <p className="mt-2">{playlist.songs.length} songs</p>
            {playlist.description && <p className="mt-2">{playlist.description}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistManager;