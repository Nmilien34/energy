import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Heart,
  ListPlus,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import FallbackImage from './FallbackImage';
import YouTubePlayer from './YouTubePlayer';
import PlaylistPicker from './PlaylistPicker';
import { musicService } from '../services/musicService';

interface MiniPlayerProps {
  onExpand?: () => void;
  onCollapse?: () => void;
  onClose?: () => void;
  isExpanded?: boolean;
  className?: string;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand, onCollapse, onClose, isExpanded = false, className = '' }) => {
  const {
    state,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    setRepeatMode,
    updateCurrentTime,
    updateDuration,
  } = useAudioPlayer();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [activeProgressBar, setActiveProgressBar] = useState<React.RefObject<HTMLDivElement> | null>(null);
  const youtubePlayerRef = useRef<HTMLDivElement>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const miniProgressBarRef = useRef<HTMLDivElement>(null);

  // Effect to update progress from YouTube player
  useEffect(() => {
    if (!state.youtubeMode?.isYoutube) {
      // Clear interval if not in YouTube mode
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      return;
    }

    // Start interval to update time from YouTube player
    if (!timeUpdateIntervalRef.current) {
      timeUpdateIntervalRef.current = setInterval(() => {
        const wrapper = youtubePlayerRef.current?.querySelector('[data-yt-wrapper="true"]') as any;
        const container = youtubePlayerRef.current?.querySelector('[data-yt-container="true"]') as any;
        const ytPlayer = wrapper?._ytPlayer || container?._ytPlayer;

        if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.getDuration === 'function') {
          try {
            const currentTime = ytPlayer.getCurrentTime();
            const duration = ytPlayer.getDuration();

            // Update context with current time and duration
            if (duration > 0 && currentTime >= 0) {
              updateCurrentTime(currentTime);
              if (state.duration !== duration) {
                updateDuration(duration);
              }
            }
          } catch (err) {
            // Ignore errors when player isn't ready
          }
        }
      }, 250); // Update 4 times per second
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };
  }, [state.youtubeMode?.isYoutube, state.duration, updateCurrentTime, updateDuration]);

  // Effect to sync YouTube player with state
  useEffect(() => {
    if (!state.youtubeMode?.isYoutube || !youtubePlayerRef.current) return;

    // Wait a bit for DOM to be ready and retry if player methods aren't available
    const syncPlayer = (retryCount = 0) => {
      // Try wrapper first, then container
      const wrapper = youtubePlayerRef.current?.querySelector('[data-yt-wrapper="true"]') as any;
      const container = youtubePlayerRef.current?.querySelector('[data-yt-container="true"]') as any;
      const ytPlayer = wrapper?._ytPlayer || container?._ytPlayer;

      console.log('YouTube sync effect (attempt', retryCount + 1, '):', {
        hasPlayer: !!ytPlayer,
        hasPlayMethod: !!(ytPlayer?.playVideo),
        hasPauseMethod: !!(ytPlayer?.pauseVideo),
        hasGetStateMethod: !!(ytPlayer?.getPlayerState),
        isPlaying: state.isPlaying,
        youtubeId: state.youtubeMode?.youtubeId
      });

      if (!ytPlayer) {
        console.log('YouTube player not found');
        if (retryCount < 10) {
          setTimeout(() => syncPlayer(retryCount + 1), 200);
        }
        return;
      }

      // Check if essential methods are available
      if (!ytPlayer.getPlayerState || !ytPlayer.playVideo || !ytPlayer.pauseVideo) {
        console.log('YouTube player methods not ready yet');
        if (retryCount < 10) {
          setTimeout(() => syncPlayer(retryCount + 1), 200);
        }
        return;
      }

      try {
        const playerState = ytPlayer.getPlayerState();
        console.log('Current YouTube player state:', playerState);

        // Only sync if player is ready (state !== -1)
        if (playerState !== -1) {
          if (state.isPlaying && playerState !== 1) { // 1 = playing
            console.log('Starting YouTube playback');
            // Start playback first
            if (typeof ytPlayer.playVideo === 'function') {
              ytPlayer.playVideo();
            }
            // Unmute after starting (YouTube requires muted autoplay, but we unmute immediately after)
            setTimeout(() => {
              if (typeof ytPlayer.unMute === 'function') {
                console.log('Unmuting YouTube player in sync effect');
                ytPlayer.unMute();
                if (typeof ytPlayer.setVolume === 'function') {
                  ytPlayer.setVolume(100);
                }
              }
            }, 100);
          } else if (!state.isPlaying && playerState === 1) {
            console.log('Pausing YouTube playback');
            if (typeof ytPlayer.pauseVideo === 'function') {
              ytPlayer.pauseVideo();
            }
          }
        } else {
          console.log('Player not ready yet, state:', playerState);
          if (retryCount < 5) {
            setTimeout(() => syncPlayer(retryCount + 1), 500);
          }
        }
      } catch (error) {
        console.warn('Failed to sync YouTube player state:', error);
      }
    };

    syncPlayer();
  }, [state.isPlaying, state.youtubeMode?.isYoutube, state.youtubeMode?.youtubeId]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleProgressMouseMove);
      document.addEventListener('mouseup', handleProgressMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleProgressMouseMove);
        document.removeEventListener('mouseup', handleProgressMouseUp);
      };
    }
  }, [isDragging, dragTime, state.duration]);

  if (!state.currentSong) return null;

  const handlePlayPause = () => {
    // This will trigger the appropriate player via the context and useEffect
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const currentTime = isDragging ? dragTime : state.currentTime;
  const progressPercentage = state.duration > 0 ? (currentTime / state.duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seekToTime = (time: number) => {
    if (!state.duration || state.duration === 0) return;

    // For YouTube videos, we need to seek using the YouTube player API
    if (state.youtubeMode?.isYoutube) {
      const wrapper = youtubePlayerRef.current?.querySelector('[data-yt-wrapper="true"]') as any;
      const container = youtubePlayerRef.current?.querySelector('[data-yt-container="true"]') as any;
      const ytPlayer = wrapper?._ytPlayer || container?._ytPlayer;

      if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
        try {
          console.log('Seeking YouTube video to:', time);
          ytPlayer.seekTo(time, true); // true = allowSeekAhead
        } catch (error) {
          console.warn('Failed to seek YouTube video:', error);
        }
      }
    } else {
      // For regular audio, use the context seek function
      seek(time);
    }
  };

  const getTimeFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent, targetRef?: React.RefObject<HTMLDivElement>) => {
    const ref = targetRef || progressBarRef;
    if (!ref.current || !state.duration) return 0;

    const rect = ref.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    return percentage * state.duration;
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>, targetRef?: React.RefObject<HTMLDivElement>) => {
    if (!state.duration || state.duration === 0) return;

    setIsDragging(true);
    setActiveProgressBar(targetRef || progressBarRef);
    const newTime = getTimeFromEvent(e, targetRef);
    setDragTime(newTime);
    seekToTime(newTime);
  };

  const handleProgressMouseMove = (e: MouseEvent) => {
    if (!isDragging || !state.duration || !activeProgressBar) return;

    const newTime = getTimeFromEvent(e, activeProgressBar);
    setDragTime(newTime);
  };

  const handleProgressMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);
    setActiveProgressBar(null);
    seekToTime(dragTime);
  };

  const handleAddToFavorites = async () => {
    if (!state.currentSong) return;
    try {
      await musicService.addToFavorites(state.currentSong.id);
      // Could show success message here when backend is ready
    } catch (err) {
      console.warn('Add to favorites not available:', err);
      // Silently fail for now since backend endpoint doesn't exist
    }
  };

  const handleRepeatToggle = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(state.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  };

  return (
    <>
      {/* Fullscreen overlay view */}
      {isExpanded && (
        <div className="fixed inset-0 bg-zinc-900 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">Now Playing</h2>
            <button
              onClick={onCollapse}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <Minimize2 className="h-6 w-6 text-zinc-400 hover:text-white" />
            </button>
          </div>

          {/* Main Content - Centered Album Art */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            {/* Large Album Cover */}
            <div className="w-full max-w-md aspect-square">
              <FallbackImage
                src={state.currentSong.thumbnailHd || state.currentSong.thumbnail}
                alt={state.currentSong.title}
                className="w-full h-full rounded-2xl object-cover shadow-2xl"
              />
            </div>

            {/* Song Info */}
            <div className="text-center space-y-2 max-w-md">
              <h1 className="text-3xl font-bold text-white">{state.currentSong.title}</h1>
              <p className="text-xl text-zinc-400">{state.currentSong.artist}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div 
                ref={progressBarRef}
                className="w-full h-2 bg-zinc-800 rounded-full cursor-pointer select-none"
                onMouseDown={handleProgressMouseDown}
              >
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(state.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-8">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={`p-3 rounded-full transition-colors ${
                  state.isShuffled
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Shuffle className="h-5 w-5" />
              </button>

              {/* Previous */}
              <button
                onClick={previous}
                className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
                disabled={state.queue.length <= 1}
              >
                <SkipBack className="h-7 w-7 text-zinc-400 hover:text-white" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="p-6 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : state.isPlaying ? (
                  <Pause className="h-8 w-8 text-white" />
                ) : (
                  <Play className="h-8 w-8 text-white fill-white" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={next}
                className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
                disabled={state.queue.length <= 1}
              >
                <SkipForward className="h-7 w-7 text-zinc-400 hover:text-white" />
              </button>

              {/* Repeat */}
              <button
                onClick={handleRepeatToggle}
                className={`p-3 rounded-full transition-colors ${
                  state.repeatMode !== 'none'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {state.repeatMode === 'one' ? (
                  <Repeat1 className="h-5 w-5" />
                ) : (
                  <Repeat className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleAddToFavorites}
                className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
                title="Add to favorites"
              >
                <Heart className="h-6 w-6 text-zinc-400 hover:text-red-400" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowPlaylistPicker(!showPlaylistPicker)}
                  className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
                  title="Add to playlist"
                >
                  <ListPlus className="h-6 w-6 text-zinc-400 hover:text-white" />
                </button>
                {showPlaylistPicker && state.currentSong && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowPlaylistPicker(false)}
                    />
                    <PlaylistPicker
                      song={state.currentSong}
                      onClose={() => setShowPlaylistPicker(false)}
                      onSuccess={() => {
                        // Optional: Show a success message
                      }}
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2"
                    />
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  {state.volume === 0 ? (
                    <VolumeX className="h-6 w-6 text-zinc-400 hover:text-white" />
                  ) : (
                    <Volume2 className="h-6 w-6 text-zinc-400 hover:text-white" />
                  )}
                </button>

                {showVolumeSlider && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-zinc-800 rounded-lg p-3 shadow-lg"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <VolumeX className="h-4 w-4 text-zinc-400" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={state.volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 accent-blue-500"
                      />
                      <Volume2 className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="text-xs text-zinc-400 text-center mt-1">
                      {Math.round(state.volume * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini player view (bottom bar) - hidden when expanded */}
      {!isExpanded && (
        <div className={`fixed bottom-0 left-0 right-0 bg-zinc-800 border-t border-zinc-700 shadow-lg z-50 ${className}`}>
      {/* Progress Bar */}
      <div 
        ref={miniProgressBarRef}
        className="w-full h-1 bg-zinc-700 cursor-pointer select-none"
        onMouseDown={(e) => handleProgressMouseDown(e, miniProgressBarRef)}
      >
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex items-center px-4 py-3">
        {/* Song Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div onClick={onExpand} className="cursor-pointer">
            <FallbackImage
              src={state.currentSong.thumbnail}
              alt={state.currentSong.title}
              className="w-12 h-12 rounded-md object-cover flex-shrink-0"
            />
          </div>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={onExpand}>
            <p className="text-white font-medium truncate text-sm">{state.currentSong.title}</p>
            <p className="text-zinc-400 text-xs truncate">{state.currentSong.artist}</p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={previous}
            className="p-1.5 hover:bg-zinc-700 rounded-full transition-colors"
            disabled={state.queue.length <= 1}
          >
            <SkipBack className="h-4 w-4 text-zinc-400 hover:text-white" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            disabled={state.isLoading}
          >
            {state.isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : state.isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white fill-white" />
            )}
          </button>

          <button
            onClick={next}
            className="p-1.5 hover:bg-zinc-700 rounded-full transition-colors"
            disabled={state.queue.length <= 1}
          >
            <SkipForward className="h-4 w-4 text-zinc-400 hover:text-white" />
          </button>
        </div>

        {/* Time Display */}
        <div className="hidden sm:flex items-center text-xs text-zinc-400 mx-4">
          <span>{formatTime(state.currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(state.duration)}</span>
        </div>

        {/* Volume Control */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            onMouseEnter={() => setShowVolumeSlider(true)}
            className="p-1.5 hover:bg-zinc-700 rounded-full transition-colors"
          >
            {state.volume === 0 ? (
              <VolumeX className="h-4 w-4 text-zinc-400 hover:text-white" />
            ) : (
              <Volume2 className="h-4 w-4 text-zinc-400 hover:text-white" />
            )}
          </button>

          {/* Volume Slider */}
          {showVolumeSlider && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-700 rounded-lg p-2 shadow-lg"
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <div className="flex items-center space-x-2">
                <VolumeX className="h-3 w-3 text-zinc-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={state.volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 accent-blue-500"
                />
                <Volume2 className="h-3 w-3 text-zinc-400" />
              </div>
              <div className="text-xs text-zinc-400 text-center mt-1">
                {Math.round(state.volume * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleAddToFavorites}
            className="p-1.5 hover:bg-zinc-700 rounded-full transition-colors"
            title="Add to favorites"
          >
            <Heart className="h-4 w-4 text-zinc-400 hover:text-red-400" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowPlaylistPicker(!showPlaylistPicker)}
              className="p-1.5 hover:bg-zinc-700 rounded-full transition-colors"
              title="Add to playlist"
            >
              <ListPlus className="h-4 w-4 text-zinc-400 hover:text-white" />
            </button>
            {showPlaylistPicker && state.currentSong && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPlaylistPicker(false)}
                />
                <PlaylistPicker
                  song={state.currentSong}
                  onClose={() => setShowPlaylistPicker(false)}
                  onSuccess={() => {
                    // Optional: Show a success message
                  }}
                  className="absolute right-0 bottom-full mb-2"
                />
              </>
            )}
          </div>

          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1.5 hover:bg-zinc-700 rounded-full transition-colors"
              title="Expand player"
            >
              <Maximize2 className="h-4 w-4 text-zinc-400 hover:text-white" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-700 rounded-full transition-colors"
              title="Close player"
            >
              <X className="h-4 w-4 text-zinc-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
      )}

      {/* YouTube Player - small but visible for iOS compatibility */}
      {/* iOS Safari requires visible players for autoplay to work */}
      {state.youtubeMode?.isYoutube && state.youtubeMode.youtubeId && (
        <div
          ref={youtubePlayerRef}
          data-mini-player="true"
          style={{
            position: 'fixed',
            bottom: isExpanded ? '20px' : '80px',
            right: '20px',
            width: '100px',
            height: '56px',
            zIndex: 40,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}
        >
          <YouTubePlayer
            videoId={state.youtubeMode.youtubeId}
            autoplay={state.isPlaying} // Auto-play if music should be playing
            width={100}
            height={56}
            onReady={() => {
              console.log('YouTube player ready in MiniPlayer, isPlaying:', state.isPlaying);

              // Wait a moment for methods to be fully available, then sync state
              setTimeout(() => {
                // Try wrapper first, then container
                const wrapper = youtubePlayerRef.current?.querySelector('[data-yt-wrapper="true"]') as any;
                const container = youtubePlayerRef.current?.querySelector('[data-yt-container="true"]') as any;
                const ytPlayer = wrapper?._ytPlayer || container?._ytPlayer;

                console.log('Player ready - checking methods:', {
                  hasPlayer: !!ytPlayer,
                  playVideo: typeof ytPlayer?.playVideo,
                  pauseVideo: typeof ytPlayer?.pauseVideo,
                  unMute: typeof ytPlayer?.unMute,
                  getPlayerState: typeof ytPlayer?.getPlayerState
                });

                if (state.isPlaying && ytPlayer) {
                  console.log('Player is ready and should be playing, starting playback');
                  if (typeof ytPlayer.unMute === 'function') {
                    ytPlayer.unMute();
                  }
                  if (typeof ytPlayer.playVideo === 'function') {
                    ytPlayer.playVideo();
                  }
                }
              }, 150);
            }}
            onPlay={() => {
              console.log('YouTube player onPlay event fired');
              // Unmute the player as soon as it starts playing
              const wrapper = youtubePlayerRef.current?.querySelector('[data-yt-wrapper="true"]') as any;
              const container = youtubePlayerRef.current?.querySelector('[data-yt-container="true"]') as any;
              const ytPlayer = wrapper?._ytPlayer || container?._ytPlayer;

              if (ytPlayer && typeof ytPlayer.unMute === 'function') {
                console.log('Unmuting YouTube player');
                ytPlayer.unMute();
                // Also set volume to ensure it's audible
                if (typeof ytPlayer.setVolume === 'function') {
                  ytPlayer.setVolume(100);
                }
              }

              // Sync state when YouTube player starts playing
              if (!state.isPlaying) {
                play();
              }
            }}
            onPause={() => {
              // Sync state when YouTube player pauses
              if (state.isPlaying) {
                pause();
              }
            }}
            onEnd={() => {
              // Handle song end
              next();
            }}
            onError={(error) => {
              console.warn('YouTube player error in MiniPlayer:', error);
              // Fallback to next song on error
              next();
            }}
          />
        </div>
      )}
    </>
  );
};

export default MiniPlayer;