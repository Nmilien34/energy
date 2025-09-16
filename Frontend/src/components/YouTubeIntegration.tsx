import React, { useState, useEffect } from 'react';
import {
  Youtube,
  ExternalLink,
  User,
  Eye,
  Video,
  Music,
  Import,
  Unlink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  YouTubeProfile,
  YouTubePlaylist,
  YouTubeVideo,
  Playlist,
} from '../types/models';
import { musicService } from '../services/musicService';

interface YouTubeIntegrationProps {
  className?: string;
}

const YouTubeIntegration: React.FC<YouTubeIntegrationProps> = ({ className = '' }) => {
  const [profile, setProfile] = useState<YouTubeProfile | null>(null);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [importStatus, setImportStatus] = useState<Record<string, 'idle' | 'importing' | 'success' | 'error'>>({});

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await musicService.getYouTubeProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setIsConnected(true);
        await loadPlaylists();
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const response = await musicService.getYouTubePlaylists();
      if (response.success && response.data) {
        setPlaylists(response.data.playlists);
      }
    } catch (err) {
      console.warn('YouTube playlists not available:', err);
    }
  };

  const loadPlaylistVideos = async (playlistId: string) => {
    try {
      const response = await musicService.getYouTubePlaylistVideos(playlistId);
      if (response.success && response.data) {
        setPlaylistVideos(response.data.videos);
      }
    } catch (err) {
      console.warn('YouTube playlist videos not available:', err);
      setPlaylistVideos([]);
    }
  };

  const handleConnect = () => {
    musicService.initiateGoogleOAuth();
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your YouTube account? This will not affect your imported playlists.')) {
      return;
    }

    try {
      await musicService.disconnectYouTube();
      setProfile(null);
      setPlaylists([]);
      setIsConnected(false);
      setSelectedPlaylist(null);
      setPlaylistVideos([]);
    } catch (err) {
      console.warn('YouTube disconnect not available:', err);
      alert('Failed to disconnect YouTube account. Please try again.');
    }
  };

  const handleImportPlaylist = async (youtubePlaylist: YouTubePlaylist, customName?: string) => {
    const playlistId = youtubePlaylist.id;
    setImportStatus(prev => ({ ...prev, [playlistId]: 'importing' }));

    try {
      const response = await musicService.importYouTubePlaylist({
        youtubePlaylistId: playlistId,
        customName: customName || youtubePlaylist.title,
      });

      if (response.success) {
        setImportStatus(prev => ({ ...prev, [playlistId]: 'success' }));
        // Auto-clear success status after 3 seconds
        setTimeout(() => {
          setImportStatus(prev => ({ ...prev, [playlistId]: 'idle' }));
        }, 3000);
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (err) {
      console.warn('YouTube playlist import not available:', err);
      setImportStatus(prev => ({ ...prev, [playlistId]: 'error' }));
      // Auto-clear error status after 5 seconds
      setTimeout(() => {
        setImportStatus(prev => ({ ...prev, [playlistId]: 'idle' }));
      }, 5000);
    }
  };

  const handleSyncPlaylist = async (playlistId: string) => {
    try {
      await musicService.syncYouTubePlaylist(playlistId);
      alert('Playlist synced successfully!');
    } catch (err) {
      console.warn('YouTube playlist sync not available:', err);
      alert('Failed to sync playlist. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-700 rounded w-1/3"></div>
          <div className="h-32 bg-zinc-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Youtube className="h-8 w-8 text-red-500" />
          <div>
            <h2 className="text-2xl font-bold text-white">YouTube Integration</h2>
            <p className="text-zinc-400">Import your YouTube playlists and sync your music</p>
          </div>
        </div>

        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Unlink className="h-4 w-4" />
            <span>Disconnect</span>
          </button>
        )}
      </div>

      {/* Not Connected State */}
      {!isConnected && (
        <div className="text-center py-12 bg-zinc-800 rounded-lg">
          <Youtube className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Connect Your YouTube Account</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Import your YouTube playlists and discover music from your favorite creators.
            Your playlists will stay synced across both platforms.
          </p>
          <button
            onClick={handleConnect}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors mx-auto"
          >
            <Youtube className="h-5 w-5" />
            <span>Connect with YouTube</span>
            <ExternalLink className="h-4 w-4" />
          </button>

          <div className="mt-8 text-sm text-zinc-500 max-w-md mx-auto">
            <p className="mb-2">✓ Import all your playlists</p>
            <p className="mb-2">✓ Keep playlists in sync</p>
            <p className="mb-2">✓ Discover music from subscriptions</p>
            <p>✓ Your data stays secure</p>
          </div>
        </div>
      )}

      {/* Connected State */}
      {isConnected && profile && (
        <>
          {/* Profile Info */}
          <div className="bg-zinc-800 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4">
              <img
                src={profile.thumbnail}
                alt={profile.title}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{profile.title}</h3>
                <p className="text-zinc-400 mb-2">{profile.description}</p>
                <div className="flex items-center space-x-6 text-sm text-zinc-500">
                  <span className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {profile.subscriberCount} subscribers
                  </span>
                  <span className="flex items-center">
                    <Video className="h-4 w-4 mr-1" />
                    {profile.videoCount} videos
                  </span>
                  <span className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {profile.viewCount} views
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Connected</span>
              </div>
            </div>
          </div>

          {/* Playlists */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Your YouTube Playlists</h3>
              <span className="text-sm text-zinc-400">{playlists.length} playlists found</span>
            </div>

            {playlists.length === 0 ? (
              <div className="text-center py-8 bg-zinc-800 rounded-lg">
                <Music className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">No playlists found on your YouTube account</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <YouTubePlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    importStatus={importStatus[playlist.id] || 'idle'}
                    onImport={(customName) => handleImportPlaylist(playlist, customName)}
                    onViewDetails={() => {
                      setSelectedPlaylist(playlist);
                      loadPlaylistVideos(playlist.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Playlist Detail Modal */}
      {selectedPlaylist && (
        <PlaylistDetailModal
          playlist={selectedPlaylist}
          videos={playlistVideos}
          onClose={() => {
            setSelectedPlaylist(null);
            setPlaylistVideos([]);
          }}
          onImport={(customName) => handleImportPlaylist(selectedPlaylist, customName)}
          importStatus={importStatus[selectedPlaylist.id] || 'idle'}
        />
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface YouTubePlaylistCardProps {
  playlist: YouTubePlaylist;
  importStatus: 'idle' | 'importing' | 'success' | 'error';
  onImport: (customName?: string) => void;
  onViewDetails: () => void;
}

const YouTubePlaylistCard: React.FC<YouTubePlaylistCardProps> = ({
  playlist,
  importStatus,
  onImport,
  onViewDetails,
}) => {
  const [showImportDialog, setShowImportDialog] = useState(false);

  const getStatusIcon = () => {
    switch (importStatus) {
      case 'importing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (importStatus) {
      case 'importing':
        return 'Importing...';
      case 'success':
        return 'Imported!';
      case 'error':
        return 'Import failed';
      default:
        return '';
    }
  };

  return (
    <>
      <div className="bg-zinc-800 rounded-lg p-4 hover:bg-zinc-750 transition-colors">
        <div className="relative mb-3">
          <img
            src={playlist.thumbnail}
            alt={playlist.title}
            className="w-full aspect-video rounded-md object-cover"
          />
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {playlist.videoCount} videos
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-white truncate">{playlist.title}</h4>
          <p className="text-sm text-zinc-400 line-clamp-2">{playlist.description}</p>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{playlist.privacy}</span>
            <span>{new Date(playlist.publishedAt).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={onViewDetails}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm py-2 px-3 rounded transition-colors"
            >
              View Details
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              disabled={importStatus === 'importing'}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm py-2 px-3 rounded transition-colors"
            >
              {getStatusIcon() || <Import className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {getStatusText() || 'Import'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showImportDialog && (
        <ImportDialog
          playlist={playlist}
          onImport={onImport}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </>
  );
};

interface PlaylistDetailModalProps {
  playlist: YouTubePlaylist;
  videos: YouTubeVideo[];
  importStatus: 'idle' | 'importing' | 'success' | 'error';
  onClose: () => void;
  onImport: (customName?: string) => void;
}

const PlaylistDetailModal: React.FC<PlaylistDetailModalProps> = ({
  playlist,
  videos,
  importStatus,
  onClose,
  onImport,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-zinc-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <img
                src={playlist.thumbnail}
                alt={playlist.title}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{playlist.title}</h3>
                <p className="text-zinc-400 mb-2">{playlist.description}</p>
                <div className="flex items-center space-x-4 text-sm text-zinc-500">
                  <span>{playlist.videoCount} videos</span>
                  <span>•</span>
                  <span>{playlist.privacy}</span>
                  <span>•</span>
                  <span>{new Date(playlist.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onImport()}
                disabled={importStatus === 'importing'}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Import className="h-4 w-4" />
                <span>{importStatus === 'importing' ? 'Importing...' : 'Import Playlist'}</span>
              </button>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-2"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          <h4 className="text-lg font-semibold text-white mb-4">Videos ({videos.length})</h4>
          {videos.length === 0 ? (
            <p className="text-zinc-400 text-center py-8">Loading videos...</p>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <div key={video.youtubeId} className="flex items-center space-x-3 p-2 hover:bg-zinc-700 rounded">
                  <span className="text-zinc-500 text-sm w-8">{video.position + 1}</span>
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-16 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{video.title}</p>
                    <p className="text-zinc-400 text-sm truncate">{video.channelTitle}</p>
                  </div>
                  <span className="text-zinc-500 text-sm">
                    {musicService.parseYouTubeDuration(video.duration) ?
                      musicService.formatDuration(musicService.parseYouTubeDuration(video.duration)) :
                      '--:--'
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ImportDialogProps {
  playlist: YouTubePlaylist;
  onImport: (customName?: string) => void;
  onClose: () => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ playlist, onImport, onClose }) => {
  const [customName, setCustomName] = useState(playlist.title);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onImport(customName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Import Playlist</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Playlist Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-zinc-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={100}
                required
              />
            </div>

            <div className="bg-zinc-700 p-3 rounded-lg">
              <p className="text-sm text-zinc-400 mb-2">This will import:</p>
              <ul className="text-sm text-zinc-300 space-y-1">
                <li>• {playlist.videoCount} videos from YouTube</li>
                <li>• Keep original order and metadata</li>
                <li>• Create a new playlist in your library</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Import Playlist
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default YouTubeIntegration;