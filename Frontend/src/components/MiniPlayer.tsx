import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  X,
} from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import FallbackImage from './FallbackImage';
import YouTubePlayer from './YouTubePlayer';

interface MiniPlayerProps {
  onExpand?: () => void;
  onClose?: () => void;
  className?: string;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand, onClose, className = '' }) => {
  const {
    state,
    play,
    pause,
    next,
    previous,
    setVolume,
  } = useAudioPlayer();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const youtubePlayerRef = useRef<HTMLDivElement>(null);

  // Effect to sync YouTube player with state
  useEffect(() => {
    if (!state.youtubeMode?.isYoutube || !youtubePlayerRef.current) return;

    // Wait a bit for DOM to be ready
    const timeoutId = setTimeout(() => {
      const container = youtubePlayerRef.current?.querySelector('div') as any;
      const ytPlayer = container?._ytPlayer;

      console.log('YouTube sync effect:', {
        hasPlayer: !!ytPlayer,
        isPlaying: state.isPlaying,
        youtubeId: state.youtubeMode?.youtubeId
      });

      if (!ytPlayer || !ytPlayer.getPlayerState) {
        console.log('YouTube player not ready yet');
        return;
      }

      try {
        const playerState = ytPlayer.getPlayerState();
        console.log('Current YouTube player state:', playerState);

        // Only sync if player is ready (state !== -1) and not unstarted (state !== 5)
        if (playerState !== -1 && playerState !== 5) {
          if (state.isPlaying && playerState !== 1) {
            console.log('Starting YouTube playback');
            // Ensure player is unmuted when user initiates play
            ytPlayer.unMute?.();
            ytPlayer.playVideo?.();
          } else if (!state.isPlaying && playerState === 1) {
            console.log('Pausing YouTube playback');
            ytPlayer.pauseVideo?.();
          }
        }
      } catch (error) {
        console.warn('Failed to sync YouTube player state:', error);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [state.isPlaying, state.youtubeMode?.isYoutube, state.youtubeMode?.youtubeId]);

  if (!state.currentSong) return null;

  const handlePlayPause = () => {
    // This will trigger the appropriate player via the context and useEffect
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const progressPercentage = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-zinc-800 border-t border-zinc-700 shadow-lg z-50 ${className}`}>
      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-700">
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

      {/* Hidden YouTube Player for audio-only playback */}
      {state.youtubeMode?.isYoutube && state.youtubeMode.youtubeId && (
        <div className="hidden" ref={youtubePlayerRef}>
          <YouTubePlayer
            videoId={state.youtubeMode.youtubeId}
            autoplay={false} // We'll handle play/pause through sync effect
            width={1}
            height={1}
            onReady={() => {
              console.log('YouTube player ready in MiniPlayer, isPlaying:', state.isPlaying);
              // Player is ready, sync with current state
              if (state.isPlaying) {
                console.log('Player is ready and should be playing, starting playback');
                const container = youtubePlayerRef.current?.querySelector('div') as any;
                const ytPlayer = container?._ytPlayer;
                if (ytPlayer?.playVideo) {
                  ytPlayer.unMute?.();
                  ytPlayer.playVideo();
                } else {
                  console.warn('YouTube player methods not available');
                }
              }
            }}
            onPlay={() => {
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
    </div>
  );
};

export default MiniPlayer;