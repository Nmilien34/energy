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
import YouTubePlayer, { YouTubePlayerHandle } from './YouTubePlayer';
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
    registerYouTubeUnlock,
    registerYouTubeResume,
  } = useAudioPlayer();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [activeProgressBar, setActiveProgressBar] = useState<React.RefObject<HTMLDivElement> | null>(null);
  const [showMobileTapToPlay, setShowMobileTapToPlay] = useState(false);
  const youtubePlayerRef = useRef<YouTubePlayerHandle>(null); // Direct player control ref
  const youtubeWrapperRef = useRef<HTMLDivElement>(null); // Wrapper div for DOM queries
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mobilePlayCheckRef = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const miniProgressBarRef = useRef<HTMLDivElement>(null);

  // Check if we're on mobile/iOS
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Track if audio has been unlocked by user gesture
  const audioUnlockedRef = useRef(false);
  const pendingVideoIdRef = useRef<string | null>(null);

  // Keep a ref to the next function to ensure YouTube callbacks always use the latest version
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });

  // Stable callback for YouTube player end event
  const handleYouTubeEnd = useCallback(() => {
    console.log('[MiniPlayer] YouTube video ended, calling next()');
    nextRef.current();
  }, []);

  // Stable callback for YouTube player error event
  const handleYouTubeError = useCallback((error: any) => {
    console.warn('[MiniPlayer] YouTube player error:', error);
    // Fallback to next song on error
    nextRef.current();
  }, []);

  // iOS Audio Unlock: Must be called synchronously during user gesture
  const unlockAudioAndPlay = useCallback(() => {
    const ytPlayer = youtubePlayerRef.current;
    if (!ytPlayer) return false;

    console.log('[iOS] Unlocking audio with user gesture');

    try {
      // These calls must happen synchronously within user gesture
      ytPlayer.playVideo();
      ytPlayer.unMute();
      ytPlayer.setVolume(100);
      audioUnlockedRef.current = true;

      // If there's a pending video to load, load it now
      if (pendingVideoIdRef.current && ytPlayer.isReady()) {
        console.log('[iOS] Loading pending video:', pendingVideoIdRef.current);
        // Small delay to ensure play started first
        setTimeout(() => {
          const player = youtubePlayerRef.current;
          if (player && pendingVideoIdRef.current) {
            (player as any).loadVideoById?.({ videoId: pendingVideoIdRef.current });
            pendingVideoIdRef.current = null;
          }
        }, 100);
      }

      return true;
    } catch (error) {
      console.warn('[iOS] Failed to unlock audio:', error);
      return false;
    }
  }, []);

  // Resume YouTube playback after returning from background
  const resumeYouTubePlayback = useCallback(() => {
    const ytPlayer = youtubePlayerRef.current;
    if (!ytPlayer) {
      console.log('[Resume] No YouTube player ref available');
      return;
    }

    console.log('[Resume] Attempting to resume YouTube playback');

    try {
      if (ytPlayer.isReady()) {
        const playerState = ytPlayer.getPlayerState();
        console.log('[Resume] YouTube player state:', playerState);

        // If player is not playing (state !== 1) and not buffering (state !== 3), resume
        if (playerState !== 1 && playerState !== 3) {
          ytPlayer.playVideo();
          ytPlayer.unMute();
          ytPlayer.setVolume(100);
          console.log('[Resume] Playback resumed');
        }
      } else {
        // Player not ready, retry in a moment
        setTimeout(() => {
          const player = youtubePlayerRef.current;
          if (player?.isReady()) {
            player.playVideo();
            player.unMute();
          }
        }, 500);
      }
    } catch (error) {
      console.warn('[Resume] Failed to resume:', error);
    }
  }, []);

  // Register the iOS unlock callback with the audio player context
  // This gets called synchronously when play() is triggered by user gesture
  useEffect(() => {
    if (isIOS) {
      console.log('[iOS] Registering YouTube unlock callback');
      registerYouTubeUnlock(unlockAudioAndPlay);
    }
  }, [isIOS, registerYouTubeUnlock, unlockAudioAndPlay]);

  // Register the YouTube resume callback for visibility change handling
  useEffect(() => {
    console.log('[MiniPlayer] Registering YouTube resume callback');
    registerYouTubeResume(resumeYouTubePlayback);
  }, [registerYouTubeResume, resumeYouTubePlayback]);

  // Mobile-specific: Check if YouTube player is stuck and needs user interaction
  useEffect(() => {
    if (!isMobile || !state.youtubeMode?.isYoutube || !state.isPlaying) {
      setShowMobileTapToPlay(false);
      return;
    }

    // Clear any existing check
    if (mobilePlayCheckRef.current) {
      clearTimeout(mobilePlayCheckRef.current);
    }

    // On iOS, check more quickly (1 second) since we know it often gets stuck
    const checkDelay = isIOS ? 1000 : 2000;

    // Wait a bit for player to initialize, then check if it's stuck
    mobilePlayCheckRef.current = setTimeout(() => {
      const ytPlayer = youtubePlayerRef.current;
      if (ytPlayer && ytPlayer.isReady()) {
        const playerState = ytPlayer.getPlayerState();
        // -1 = unstarted, 5 = cued - these are stuck states
        // Also check if we should be playing but aren't
        if (playerState === -1 || playerState === 5) {
          console.log('[Mobile] YouTube player stuck, showing tap to play overlay. State:', playerState);
          setShowMobileTapToPlay(true);
        } else if (state.isPlaying && playerState !== 1 && playerState !== 3) {
          // 1 = playing, 3 = buffering (ok)
          console.log('[Mobile] Player should be playing but state is:', playerState);
          setShowMobileTapToPlay(true);
        }
      } else if (!ytPlayer?.isReady()) {
        // Player not ready yet, show overlay anyway on iOS
        if (isIOS) {
          console.log('[iOS] Player not ready, showing tap to play');
          setShowMobileTapToPlay(true);
        }
      }
    }, checkDelay);

    return () => {
      if (mobilePlayCheckRef.current) {
        clearTimeout(mobilePlayCheckRef.current);
      }
    };
  }, [isMobile, isIOS, state.youtubeMode?.isYoutube, state.isPlaying, state.youtubeMode?.youtubeId]);

  // Handle mobile tap to play - MUST be synchronous with user gesture
  const handleMobileTapToPlay = useCallback(() => {
    console.log('[Mobile] User tapped to play');
    setShowMobileTapToPlay(false);

    const ytPlayer = youtubePlayerRef.current;
    if (!ytPlayer) {
      console.log('[Mobile] No player ref available');
      return;
    }

    // Mark audio as unlocked
    audioUnlockedRef.current = true;

    // CRITICAL: All these calls must be synchronous within user gesture context
    try {
      // First, try to play
      ytPlayer.playVideo();

      // Unmute immediately
      ytPlayer.unMute();
      ytPlayer.setVolume(100);

      // If player is still stuck after 500ms, try reloading the video
      setTimeout(() => {
        const currentState = ytPlayer.getPlayerState?.();
        if (currentState === -1 || currentState === 5) {
          console.log('[Mobile] Player still stuck after tap, reloading video');
          const videoId = state.youtubeMode?.youtubeId;
          if (videoId && (ytPlayer as any).loadVideoById) {
            (ytPlayer as any).loadVideoById({ videoId });
          }
        }
      }, 500);
    } catch (error) {
      console.error('[Mobile] Error during tap to play:', error);
    }

    // Also try to resume via the play function
    play();
  }, [state.youtubeMode?.youtubeId, play]);

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
        const ytPlayer = youtubePlayerRef.current;

        if (ytPlayer && ytPlayer.isReady()) {
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
    if (!state.youtubeMode?.isYoutube) return;

    // Wait a bit for player to be ready and retry if methods aren't available
    const syncPlayer = (retryCount = 0) => {
      const ytPlayer = youtubePlayerRef.current;

      // Only log on first attempt or when something changes
      if (retryCount === 0 || retryCount === 5) {
        console.log('YouTube sync effect (attempt', retryCount + 1, '):', {
          hasPlayer: !!ytPlayer,
          isReady: ytPlayer?.isReady?.() ?? false,
          isPlaying: state.isPlaying,
          youtubeId: state.youtubeMode?.youtubeId,
          audioUnlocked: audioUnlockedRef.current
        });
      }

      if (!ytPlayer) {
        if (retryCount < 10) {
          setTimeout(() => syncPlayer(retryCount + 1), 200);
        }
        return;
      }

      // Check if player is ready
      if (!ytPlayer.isReady()) {
        if (retryCount < 10) {
          setTimeout(() => syncPlayer(retryCount + 1), 200);
        }
        return;
      }

      try {
        const playerState = ytPlayer.getPlayerState();

        // On iOS, if audio hasn't been unlocked and we're trying to play,
        // don't try to auto-play - show the tap overlay instead
        if (isIOS && !audioUnlockedRef.current && state.isPlaying && playerState !== 1) {
          console.log('[iOS] Audio not unlocked, showing tap to play');
          setShowMobileTapToPlay(true);
          return;
        }

        // Only sync if player is ready (state !== -1) or audio is unlocked
        if (playerState !== -1 || audioUnlockedRef.current) {
          if (state.isPlaying && playerState !== 1 && playerState !== 3) { // 1 = playing, 3 = buffering
            console.log('Starting YouTube playback, current state:', playerState);
            ytPlayer.playVideo();
            // Unmute after starting
            setTimeout(() => {
              ytPlayer.unMute();
              ytPlayer.setVolume(100);
            }, 100);
          } else if (!state.isPlaying && playerState === 1) {
            console.log('Pausing YouTube playback');
            ytPlayer.pauseVideo();
          }
        } else {
          // Player stuck in -1 state
          if (isIOS && state.isPlaying) {
            // On iOS, show tap overlay
            setShowMobileTapToPlay(true);
          } else if (retryCount < 5) {
            setTimeout(() => syncPlayer(retryCount + 1), 500);
          }
        }
      } catch (error) {
        console.warn('Failed to sync YouTube player state:', error);
      }
    };

    syncPlayer();
  }, [state.isPlaying, state.youtubeMode?.isYoutube, state.youtubeMode?.youtubeId, isIOS]);

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
    // Hide tap to play overlay if it was showing
    setShowMobileTapToPlay(false);

    // CRITICAL for iOS Safari: Call YouTube player IMMEDIATELY (synchronous with user gesture)
    // before ANY state updates or async operations
    if (state.youtubeMode?.isYoutube && youtubePlayerRef.current) {
      // Mark audio as unlocked since this is a user gesture
      audioUnlockedRef.current = true;

      if (state.isPlaying) {
        // Pause YouTube player synchronously
        youtubePlayerRef.current.pauseVideo();
      } else {
        // Play YouTube player synchronously - this is the iOS Safari fix!
        youtubePlayerRef.current.playVideo();
        youtubePlayerRef.current.unMute();
        youtubePlayerRef.current.setVolume(100);

        // On iOS, if player is stuck, try reloading
        if (isIOS) {
          setTimeout(() => {
            const ytPlayer = youtubePlayerRef.current;
            if (ytPlayer) {
              const currentState = ytPlayer.getPlayerState?.();
              if (currentState === -1 || currentState === 5) {
                console.log('[iOS] Player stuck after play tap, reloading video');
                const videoId = state.youtubeMode?.youtubeId;
                if (videoId && (ytPlayer as any).loadVideoById) {
                  (ytPlayer as any).loadVideoById({ videoId });
                }
              }
            }
          }, 300);
        }
      }
    }

    // THEN update state (async is fine after synchronous player call)
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
      const ytPlayer = youtubePlayerRef.current;

      if (ytPlayer && ytPlayer.isReady()) {
        try {
          console.log('Seeking YouTube video to:', time);
          ytPlayer.seekTo(time);
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
                className={`p-3 rounded-full transition-colors ${state.isShuffled
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

      {/* Mobile Tap to Play Banner - shows above mini player when stuck */}
      {showMobileTapToPlay && !isExpanded && (
        <button
          onClick={handleMobileTapToPlay}
          className="fixed bottom-[72px] left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-4 flex items-center justify-center space-x-2 animate-pulse"
        >
          <Play className="h-5 w-5 text-white fill-white" />
          <span className="text-white font-medium">Tap to Start Playback</span>
        </button>
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
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const syntheticEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
              } as React.MouseEvent<HTMLDivElement>;
              handleProgressMouseDown(syntheticEvent, miniProgressBarRef);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-music-purple to-music-blue transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex items-center px-3 sm:px-4 py-2.5 sm:py-3">
            {/* Song Info */}
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

            {/* Control Buttons */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
              <button
                onClick={previous}
                className="p-2 sm:p-1.5 hover:bg-white/10 active:bg-white/5 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                disabled={state.queue.length <= 1}
              >
                <SkipBack className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 hover:text-white" />
              </button>

              <button
                onClick={handlePlayPause}
                className="p-2.5 sm:p-2 bg-gradient-to-r from-music-purple to-music-blue hover:from-music-purple-hover hover:to-music-blue-hover active:scale-95 rounded-full transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                className="p-2 sm:p-1.5 hover:bg-white/10 active:bg-white/5 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                disabled={state.queue.length <= 1}
              >
                <SkipForward className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Time Display */}
            <div className="hidden md:flex items-center text-xs text-gray-400 mx-2 lg:mx-4">
              <span>{formatTime(state.currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(state.duration)}</span>
            </div>

            {/* Volume Control */}
            <div className="relative hidden lg:block">
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
            <div className="hidden sm:flex items-center space-x-2 ml-2 md:ml-4">
              <button
                onClick={handleAddToFavorites}
                className="p-2 sm:p-1.5 hover:bg-white/10 active:bg-white/5 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                title="Add to favorites"
              >
                <Heart className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 hover:text-red-400" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowPlaylistPicker(!showPlaylistPicker)}
                  className="p-2 sm:p-1.5 hover:bg-white/10 active:bg-white/5 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                  title="Add to playlist"
                >
                  <ListPlus className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 hover:text-white" />
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
                  className="p-2 sm:p-1.5 hover:bg-white/10 active:bg-white/5 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                  title="Expand player"
                >
                  <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 hover:text-white" />
                </button>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 sm:p-1.5 hover:bg-white/10 active:bg-white/5 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                  title="Close player"
                >
                  <X className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 hover:text-white" />
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
          ref={youtubeWrapperRef}
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
          {/* Mobile Tap to Play Overlay */}
          {showMobileTapToPlay && (
            <button
              onClick={handleMobileTapToPlay}
              className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
              style={{ borderRadius: '8px' }}
            >
              <div className="flex flex-col items-center">
                <Play className="h-8 w-8 text-white fill-white animate-pulse" />
                <span className="text-[10px] text-white mt-1">Tap</span>
              </div>
            </button>
          )}
          <YouTubePlayer
            ref={youtubePlayerRef}
            videoId={state.youtubeMode.youtubeId}
            autoplay={state.isPlaying} // Auto-play if music should be playing
            width={100}
            height={56}
            onReady={() => {
              console.log('YouTube player ready in MiniPlayer, isPlaying:', state.isPlaying);

              // Wait a moment for methods to be fully available, then sync state
              setTimeout(() => {
                const ytPlayer = youtubePlayerRef.current;

                console.log('Player ready - checking methods:', {
                  hasPlayer: !!ytPlayer,
                  isReady: ytPlayer?.isReady?.() ?? false
                });

                if (state.isPlaying && ytPlayer && ytPlayer.isReady()) {
                  console.log('Player is ready and should be playing, starting playback');
                  ytPlayer.unMute();
                  ytPlayer.playVideo();
                }
              }, 150);
            }}
            onPlay={() => {
              console.log('YouTube player onPlay event fired');
              // Hide mobile tap overlay since playback started
              setShowMobileTapToPlay(false);

              // Unmute the player as soon as it starts playing
              const ytPlayer = youtubePlayerRef.current;

              if (ytPlayer && ytPlayer.isReady()) {
                console.log('Unmuting YouTube player');
                ytPlayer.unMute();
                ytPlayer.setVolume(100);
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
            onEnd={handleYouTubeEnd}
            onError={handleYouTubeError}
          />
        </div>
      )}
    </>
  );
};

export default MiniPlayer;