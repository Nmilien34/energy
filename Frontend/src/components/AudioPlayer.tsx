import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  MoreHorizontal,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { musicService } from '../services/musicService';
import { useToast } from '../contexts/ToastContext';
import FallbackImage from './FallbackImage';

interface AudioPlayerProps {
  className?: string;
  variant?: 'full' | 'mini';
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ className = '', variant = 'full' }) => {
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
  } = useAudioPlayer();
  const { showToast } = useToast();

  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isExpanded, setIsExpanded] = useState(variant === 'full');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  // Check if current song is in favorites
  useEffect(() => {
    // TODO: Check if current song is in user's favorites
    setIsFavorite(false);
  }, [state.currentSong]);

  const handlePlayPause = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const seekToTime = (time: number) => {
    if (!state.duration || state.duration === 0) return;

    // For YouTube videos, we need to seek using the YouTube player API
    if (state.youtubeMode?.isYoutube) {
      // Find the YouTube player in the MiniPlayer component
      const miniPlayer = document.querySelector('[data-mini-player="true"]');
      const wrapper = miniPlayer?.querySelector('[data-yt-wrapper="true"]') as any;
      const container = miniPlayer?.querySelector('[data-yt-container="true"]') as any;
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

  const getTimeFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!progressRef.current || !state.duration) return 0;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    return percentage * state.duration;
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.duration || state.duration === 0) return;

    setIsDragging(true);
    const newTime = getTimeFromEvent(e);
    setDragTime(newTime);
    seekToTime(newTime);
  };

  const handleProgressMouseMove = (e: MouseEvent) => {
    if (!isDragging || !state.duration) return;

    const newTime = getTimeFromEvent(e);
    setDragTime(newTime);
  };

  const handleProgressMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);
    seekToTime(dragTime);
  };

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

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current) return;

    const rect = volumeRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));

    setVolume(percentage);
    if (percentage > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleRepeatToggle = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(state.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  };

  const handleToggleFavorite = async () => {
    if (!state.currentSong) return;

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    try {
      if (isFavorite) {
        await musicService.removeFromFavorites(state.currentSong.id);
        showToast('Removed from your library', 'info');
      } else {
        await musicService.addToFavorites(state.currentSong.id);
        showToast('Added to your library', 'success');
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.warn('Toggle favorite not available:', error);
      showToast('Action failed', 'error');
    }
  };


  // ... (existing code being kept)

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = isDragging ? dragTime : state.currentTime;
  const progressPercentage = state.duration > 0 ? (currentTime / state.duration) * 100 : 0;

  if (!state.currentSong) {
    return variant === 'mini' ? null : (
      <div className={`bg-zinc-800 border-t border-zinc-700 p-4 ${className}`}>
        <div className="flex items-center justify-center h-16 text-zinc-400">
          <div className="text-center">
            <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-2">
              <Play className="h-6 w-6" />
            </div>
            <p className="text-sm">No music playing</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'mini') {
    return (
      <div className={`bg-zinc-800 border-t border-zinc-700 p-3 ${className}`}>
        <div className="flex items-center space-x-3">
          {/* Song Info */}
          <FallbackImage
            src={state.currentSong.thumbnail}
            alt={state.currentSong.title}
            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{state.currentSong.title}</p>
            <p className="text-zinc-400 text-xs truncate">{state.currentSong.artist}</p>
          </div>

          {/* Mini Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={previous}
              className="p-1 hover:bg-zinc-700 rounded-full transition-colors"
            >
              <SkipBack className="h-4 w-4 text-zinc-400 hover:text-white" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            >
              {state.isPlaying ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white fill-white" />
              )}
            </button>
            <button
              onClick={next}
              className="p-1 hover:bg-zinc-700 rounded-full transition-colors"
            >
              <SkipForward className="h-4 w-4 text-zinc-400 hover:text-white" />
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 hover:bg-zinc-700 rounded-full transition-colors"
            >
              <Maximize2 className="h-4 w-4 text-zinc-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Mini Progress Bar */}
        <div className="mt-2">
          <div
            ref={progressRef}
            onMouseDown={handleProgressMouseDown}
            className="w-full h-1 bg-zinc-700 rounded-full cursor-pointer select-none"
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-800 border-t border-zinc-700 ${className}`}>
      {isExpanded && (
        <div className="p-6">
          {/* Expanded Player Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Now Playing</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
            >
              <Minimize2 className="h-5 w-5 text-zinc-400 hover:text-white" />
            </button>
          </div>

          {/* Album Art and Song Info */}
          <div className="flex items-center space-x-6 mb-6">
            <FallbackImage
              src={state.currentSong.thumbnailHd || state.currentSong.thumbnail}
              alt={state.currentSong.title}
              className="w-24 h-24 rounded-lg object-cover shadow-lg"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">{state.currentSong.title}</h2>
              <p className="text-zinc-400 text-lg mb-2">{state.currentSong.artist}</p>
              <div className="flex items-center space-x-4 text-sm text-zinc-500">
                <span>{musicService.formatViewCount(state.currentSong.viewCount)} views</span>
                <span>•</span>
                <span>{state.currentSong.channelTitle}</span>
              </div>
            </div>
            <button
              onClick={handleToggleFavorite}
              className={`p-3 rounded-full transition-colors ${isFavorite
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'hover:bg-zinc-700 text-zinc-400 hover:text-red-400'
                }`}
            >
              <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''} ${isAnimating ? 'animate-heartbeat' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Main Player Controls */}
      <div className="p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center space-x-3 text-sm text-zinc-400 mb-2">
            <span>{formatTime(currentTime)}</span>
            <div
              ref={progressRef}
              onMouseDown={handleProgressMouseDown}
              className="flex-1 h-2 bg-zinc-700 rounded-full cursor-pointer relative group select-none"
            >
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progressPercentage}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              />
            </div>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full transition-colors ${state.isShuffled
                ? 'bg-blue-600 text-white'
                : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={handleRepeatToggle}
              className={`p-2 rounded-full transition-colors ${state.repeatMode !== 'none'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
            >
              {state.repeatMode === 'one' ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Center Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={previous}
              className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
              disabled={state.queue.length === 0}
            >
              <SkipBack className="h-6 w-6 text-zinc-400 hover:text-white" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : state.isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white fill-white" />
              )}
            </button>
            <button
              onClick={next}
              className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
              disabled={state.queue.length === 0}
            >
              <SkipForward className="h-6 w-6 text-zinc-400 hover:text-white" />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
              >
                {isMuted || state.volume === 0 ? (
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
                  <div
                    ref={volumeRef}
                    onClick={handleVolumeClick}
                    className="w-20 h-2 bg-zinc-600 rounded-full cursor-pointer relative"
                  >
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${state.volume * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full"
                      style={{ left: `${state.volume * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button className="p-2 hover:bg-zinc-700 rounded-full transition-colors">
              <MoreHorizontal className="h-4 w-4 text-zinc-400 hover:text-white" />
            </button>

            {!isExpanded && variant === 'full' && (
              <button
                onClick={() => setIsExpanded(true)}
                className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
              >
                <Maximize2 className="h-4 w-4 text-zinc-400 hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Mini Song Info (when collapsed) */}
        {!isExpanded && (
          <div className="flex items-center mt-3">
            <FallbackImage
              src={state.currentSong.thumbnail}
              alt={state.currentSong.title}
              className="w-12 h-12 rounded-md object-cover mr-3"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{state.currentSong.title}</p>
              <p className="text-zinc-400 text-sm truncate">{state.currentSong.artist}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
