import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Cloud,
} from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import FallbackImage from './FallbackImage';
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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const miniProgressBarRef = useRef<HTMLDivElement>(null);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !state.duration || !activeProgressBar) return;
      const rect = activeProgressBar.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      setDragTime(percentage * state.duration);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setActiveProgressBar(null);
        seek(dragTime);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragTime, state.duration, activeProgressBar, seek]);

  if (!state.currentSong) return null;

  const handlePlayPause = () => {
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

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    if (!state.duration || state.duration === 0) return;
    setIsDragging(true);
    setActiveProgressBar(targetRef);

    const rect = targetRef.current?.getBoundingClientRect();
    if (rect) {
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * state.duration;
      setDragTime(newTime);
      seek(newTime);
    }
  };

  const handleAddToFavorites = async () => {
    if (!state.currentSong) return;
    try {
      await musicService.addToFavorites(state.currentSong.id);
    } catch (err) {
      console.warn('Add to favorites not available:', err);
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
              <div className="flex items-center justify-center space-x-2">
                <h1 className="text-3xl font-bold text-white">{state.currentSong.title}</h1>
                {state.currentSong.isCached && (
                  <span className="flex items-center" title="Cached for faster playback">
                    <Cloud className="h-6 w-6 text-blue-400" />
                  </span>
                )}
              </div>
              <p className="text-xl text-zinc-400">{state.currentSong.artist}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div
                ref={progressBarRef}
                className="w-full h-2 bg-zinc-800 rounded-full cursor-pointer select-none"
                onMouseDown={(e) => handleProgressMouseDown(e, progressBarRef)}
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
              <button
                onClick={toggleShuffle}
                className={`p-3 rounded-full transition-colors ${state.isShuffled
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
              >
                <Shuffle className="h-5 w-5" />
              </button>

              <button
                onClick={previous}
                className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
                disabled={state.queue.length <= 1}
              >
                <SkipBack className="h-7 w-7 text-zinc-400 hover:text-white" />
              </button>

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

              <button
                onClick={next}
                className="p-3 hover:bg-zinc-800 rounded-full transition-colors"
                disabled={state.queue.length <= 1}
              >
                <SkipForward className="h-7 w-7 text-zinc-400 hover:text-white" />
              </button>

              <button
                onClick={handleRepeatToggle}
                className={`p-3 rounded-full transition-colors ${state.repeatMode !== 'none'
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
                      onSuccess={() => { }}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini player view (bottom bar) - hidden when expanded */}
      {!isExpanded && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${className}
          lg:bottom-4 lg:left-4 lg:right-4 lg:w-auto lg:rounded-2xl
          glass border-t border-white/10 shadow-2xl backdrop-blur-xl
        `}>
          {/* Progress Bar */}
          <div
            ref={miniProgressBarRef}
            className="w-full h-1 bg-white/10 cursor-pointer select-none touch-none"
            onMouseDown={(e) => handleProgressMouseDown(e, miniProgressBarRef)}
          >
            <div
              className="h-full bg-gradient-to-r from-music-purple to-music-blue transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex items-center px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div onClick={onExpand} className="cursor-pointer touch-manipulation">
                <FallbackImage
                  src={state.currentSong.thumbnail}
                  alt={state.currentSong.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover flex-shrink-0"
                />
              </div>
              <div className="min-w-0 flex-1 cursor-pointer touch-manipulation" onClick={onExpand}>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <p className="text-white font-medium truncate text-xs sm:text-sm">{state.currentSong.title}</p>
                  {state.currentSong.isCached && (
                    <span className="flex items-center flex-shrink-0" title="Cached for faster playback">
                      <Cloud className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-music-blue" />
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs truncate leading-tight">{state.currentSong.artist}</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
              <button
                onClick={previous}
                className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                disabled={state.queue.length <= 1}
              >
                <SkipBack className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />
              </button>

              <button
                onClick={handlePlayPause}
                className="p-2.5 sm:p-2 bg-gradient-to-r from-music-purple to-music-blue rounded-full transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : state.isPlaying ? (
                  <Pause className="h-5 w-5 sm:h-4 sm:w-4 text-white" />
                ) : (
                  <Play className="h-5 w-5 sm:h-4 sm:w-4 text-white fill-white" />
                )}
              </button>

              <button
                onClick={next}
                className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                disabled={state.queue.length <= 1}
              >
                <SkipForward className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />
              </button>
            </div>

            <div className="hidden md:flex items-center text-xs text-gray-400 mx-2 lg:mx-4">
              <span>{formatTime(state.currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(state.duration)}</span>
            </div>

            <div className="hidden sm:flex items-center space-x-2 ml-2 md:ml-4">
              <button
                onClick={handleAddToFavorites}
                className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                title="Add to favorites"
              >
                <Heart className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />
              </button>

              {onExpand && (
                <button
                  onClick={onExpand}
                  className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                  title="Expand player"
                >
                  <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />
                </button>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                  title="Close player"
                >
                  <X className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MiniPlayer;