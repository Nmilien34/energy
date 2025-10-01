import React, { useState, useEffect } from 'react';
import { Plus, Check, Loader } from 'lucide-react';
import { Playlist, Song } from '../types/models';
import { musicService } from '../services/musicService';

interface PlaylistPickerProps {
  song: Song;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

const PlaylistPicker: React.FC<PlaylistPickerProps> = ({ song, onClose, onSuccess, className = '' }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const response = await musicService.getUserPlaylists();
      if (response.success && response.data) {
        const playlistsData = Array.isArray(response.data) ? response.data : [];
        setPlaylists(playlistsData);
      } else {
        setPlaylists([]);
      }
    } catch (err) {
      console.warn('Failed to load playlists:', err);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      setAddingTo(playlistId);
      const response = await musicService.addSongToPlaylist(playlistId, song.id);

      if (response.success) {
        setAddedTo(prev => new Set(prev).add(playlistId));
        onSuccess?.();

        // Close after a brief delay to show success
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error('Failed to add song to playlist:', err);
      alert('Failed to add song to playlist. Please try again.');
    } finally {
      setAddingTo(null);
    }
  };

  const handleAddToFavorites = async () => {
    // Find or create "Favorites" playlist
    let favoritesPlaylist = playlists.find(p =>
      p.name.toLowerCase() === 'favorites' ||
      p.name.toLowerCase() === 'liked songs'
    );

    if (favoritesPlaylist) {
      await handleAddToPlaylist(favoritesPlaylist.id);
    } else {
      // Create Favorites playlist
      try {
        setAddingTo('favorites');
        const createResponse = await musicService.createPlaylist({
          name: 'Favorites',
          description: 'My favorite songs',
          isPublic: false,
        });

        if (createResponse.success && createResponse.data) {
          const newPlaylist = createResponse.data;
          await handleAddToPlaylist(newPlaylist.id);
          await loadPlaylists(); // Reload to show new playlist
        }
      } catch (err) {
        console.error('Failed to create Favorites playlist:', err);
        alert('Failed to create Favorites playlist. Please try again.');
      } finally {
        setAddingTo(null);
      }
    }
  };

  return (
    <div className={`absolute z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-64 ${className}`}>
      <div className="p-3 border-b border-zinc-700">
        <h3 className="text-sm font-semibold text-white">Add to Playlist</h3>
        <p className="text-xs text-zinc-400 mt-1 truncate">{song.title}</p>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <Loader className="h-5 w-5 text-zinc-400 animate-spin mx-auto" />
            <p className="text-xs text-zinc-400 mt-2">Loading playlists...</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-zinc-400">No playlists yet</p>
            <button
              onClick={handleAddToFavorites}
              disabled={addingTo === 'favorites'}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingTo === 'favorites' ? (
                <span className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Favorites Playlist'
              )}
            </button>
          </div>
        ) : (
          <div className="py-1">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                disabled={addingTo === playlist.id || addedTo.has(playlist.id)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center flex-shrink-0">
                    {playlist.thumbnail ? (
                      <img
                        src={playlist.thumbnail}
                        alt={playlist.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Plus className="h-5 w-5 text-zinc-400" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{playlist.name}</p>
                    <p className="text-xs text-zinc-400">
                      {playlist.songs?.length || 0} songs
                    </p>
                  </div>
                </div>
                {addingTo === playlist.id ? (
                  <Loader className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                ) : addedTo.has(playlist.id) ? (
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-zinc-700">
        <button
          onClick={onClose}
          className="w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PlaylistPicker;
