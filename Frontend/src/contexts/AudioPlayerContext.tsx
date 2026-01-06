import React, { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react';
import { Song, PlayerState, YouTubeMode } from '../types/models';
import { musicService } from '../services/musicService';

// Generate a unique session ID for recommendation tracking
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Check if we're on a mobile device
const isMobileDevice = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Silent audio track (1 second of silence) to keep iOS Audio Session active
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAgZGF0YQQAAAAAAA==';


// Track if audio has been unlocked (required for iOS Safari)
let audioUnlocked = false;

// Unlock audio on first user interaction (required for iOS Safari only)
const unlockAudio = (audioElement: HTMLAudioElement | null): Promise<void> => {
  // Skip unlock on desktop - not needed and can cause issues
  if (!isMobileDevice()) {
    console.log('[Audio] Desktop detected, skipping audio unlock');
    return Promise.resolve();
  }

  if (audioUnlocked) return Promise.resolve();

  return new Promise((resolve) => {
    console.log('[Mobile] Attempting to unlock audio...');

    if (!audioElement) {
      resolve();
      return;
    }

    // Store original values
    const originalVolume = audioElement.volume;
    const originalMuted = audioElement.muted;

    // Try to play a silent sound to unlock audio context
    audioElement.volume = 0;
    audioElement.muted = true;

    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          audioElement.pause();
          // Restore original values
          audioElement.muted = originalMuted;
          audioElement.volume = originalVolume;
          audioUnlocked = true;
          console.log('[Mobile] Audio unlocked successfully');
          resolve();
        })
        .catch(() => {
          // Restore original values
          audioElement.muted = originalMuted;
          audioElement.volume = originalVolume;
          console.log('[Mobile] Audio still locked, will try again on next interaction');
          resolve();
        });
    } else {
      audioUnlocked = true;
      resolve();
    }
  });
};

// Check if we're on iOS
const isIOSDevice = (): boolean => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

interface AudioPlayerContextType {
  state: PlayerState;
  play: (song?: Song) => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  playPlaylist: (songs: Song[], startIndex?: number) => void;
  playShuffleMode: (songs: Song[]) => void;
  updateCurrentTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  // iOS audio unlock mechanism - MiniPlayer registers a callback to unlock YouTube player
  registerYouTubeUnlock: (callback: () => void) => void;
  // YouTube resume mechanism - MiniPlayer registers a callback to resume after background
  registerYouTubeResume: (callback: () => void) => void;
}

type AudioPlayerAction =
  | { type: 'SET_CURRENT_SONG'; payload: Song | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_PAUSED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_QUEUE'; payload: Song[] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_SHUFFLED'; payload: boolean }
  | { type: 'SET_REPEAT_MODE'; payload: 'none' | 'one' | 'all' }
  | { type: 'ADD_TO_QUEUE'; payload: Song }
  | { type: 'REMOVE_FROM_QUEUE'; payload: number }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'NEXT_SONG' }
  | { type: 'PREVIOUS_SONG' }
  | { type: 'SET_YOUTUBE_MODE'; payload: YouTubeMode }
  | { type: 'SET_SHUFFLE_SOURCE'; payload: Song[] };

const initialState: PlayerState = {
  currentSong: null,
  isPlaying: false,
  isPaused: false,
  isLoading: false,
  queue: [],
  currentIndex: 0,
  volume: 0.8,
  duration: 0,
  currentTime: 0,
  isShuffled: false,
  repeatMode: 'none',
  shuffleSource: [],
  youtubeMode: { isYoutube: false },
};

function audioPlayerReducer(state: PlayerState, action: AudioPlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_CURRENT_SONG':
      return { ...state, currentSong: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload, isPaused: !action.payload };
    case 'SET_PAUSED':
      return { ...state, isPaused: action.payload, isPlaying: !action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_QUEUE':
      return { ...state, queue: action.payload };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_SHUFFLED':
      return { ...state, isShuffled: action.payload };
    case 'SET_REPEAT_MODE':
      return { ...state, repeatMode: action.payload };
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.payload] };
    case 'REMOVE_FROM_QUEUE':
      const newQueue = state.queue.filter((_, index) => index !== action.payload);
      const newIndex = action.payload < state.currentIndex ? state.currentIndex - 1 : state.currentIndex;
      return {
        ...state,
        queue: newQueue,
        currentIndex: Math.max(0, Math.min(newIndex, newQueue.length - 1))
      };
    case 'CLEAR_QUEUE':
      return { ...state, queue: [], currentIndex: 0 };
    case 'NEXT_SONG':
      let nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        nextIndex = state.repeatMode === 'all' ? 0 : state.currentIndex;
      }
      return { ...state, currentIndex: nextIndex };
    case 'PREVIOUS_SONG':
      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = state.repeatMode === 'all' ? state.queue.length - 1 : 0;
      }
      return { ...state, currentIndex: prevIndex };
    case 'SET_YOUTUBE_MODE':
      return { ...state, youtubeMode: action.payload };
    case 'SET_SHUFFLE_SOURCE':
      return { ...state, shuffleSource: action.payload };
    default:
      return state;
  }
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

interface AudioPlayerProviderProps {
  children: React.ReactNode;
}

export const AudioPlayerProvider: React.FC<AudioPlayerProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(audioPlayerReducer, initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoplayNextLoad = useRef<boolean>(false);
  const youtubeModeRef = useRef<{ isYoutube: boolean } | null>(null);
  const retryCount = useRef<number>(0);
  const maxRetries = 3;
  const shuffleSourceRef = useRef<Song[]>([]);

  // Session tracking for recommendations
  const sessionIdRef = useRef<string>(generateSessionId());
  const sessionHistoryRef = useRef<string[]>([]);
  const isLoadingRecommendation = useRef<boolean>(false);
  const autoPlayEnabled = useRef<boolean>(true); // Enable auto-play by default

  // Ref to hold the latest next function (for use in event handlers)
  const nextRef = useRef<() => void>(() => { });

  // iOS YouTube unlock callback - MiniPlayer registers this to prime the player synchronously
  const youtubeUnlockCallbackRef = useRef<(() => void) | null>(null);

  // YouTube resume callback - MiniPlayer registers this to resume after background
  const youtubeResumeCallbackRef = useRef<(() => void) | null>(null);

  // Track if we were playing before going to background (for YouTube resume)
  const wasPlayingBeforeBackgroundRef = useRef<boolean>(false);

  const registerYouTubeUnlock = useCallback((callback: () => void) => {
    youtubeUnlockCallbackRef.current = callback;
  }, []);

  const registerYouTubeResume = useCallback((callback: () => void) => {
    youtubeResumeCallbackRef.current = callback;
  }, []);

  // Keep a ref of latest YouTube mode for event handlers
  useEffect(() => {
    youtubeModeRef.current = state.youtubeMode || { isYoutube: false };
  }, [state.youtubeMode]);

  // Keep a ref of shuffle source for continuous shuffle
  useEffect(() => {
    shuffleSourceRef.current = state.shuffleSource;
  }, [state.shuffleSource]);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;

    // Configure for better mobile/background playback
    audioRef.current.preload = 'auto';
    // @ts-ignore - webkitPreservesPitch is a Safari-specific property
    audioRef.current.webkitPreservesPitch = true;
    audioRef.current.preservesPitch = true;

    const audio = audioRef.current;

    // Event listeners
    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: audio.duration });
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handleCanPlay = () => {
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handlePlay = () => {
      dispatch({ type: 'SET_PLAYING', payload: true });
      startTimeUpdateInterval();
    };

    const handlePause = () => {
      dispatch({ type: 'SET_PLAYING', payload: false });
      stopTimeUpdateInterval();
    };

    const handleEnded = () => {
      if (state.repeatMode === 'one') {
        if (state.youtubeMode?.isYoutube) {
          // For YouTube mode, restart playback using the YouTube player
          dispatch({ type: 'SET_PLAYING', payload: true });
        } else {
          // For regular audio, restart playback
          audio.currentTime = 0;
          audio.play();
        }
      } else {
        // Use nextRef to always call the latest version of next()
        // This is important because next() may be async and fetch recommendations
        nextRef.current();
      }
    };

    const handleError = (event: Event) => {
      dispatch({ type: 'SET_LOADING', payload: false });
      // Ignore audio errors when using YouTube mode or when no audio src is set
      if (youtubeModeRef.current?.isYoutube || !audio.src) {
        return;
      }
      // Only log actual errors, not expected ones when switching to YouTube mode
      const audioElement = event.target as HTMLAudioElement;
      if (audioElement.src && audioElement.src !== '' && !audioElement.src.includes('blob:')) {
        console.error('Audio playback error for:', audioElement.src);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      stopTimeUpdateInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update current song when queue or index changes
  useEffect(() => {
    const currentSong = state.queue[state.currentIndex] || null;
    console.log('Queue effect triggered:', {
      currentIndex: state.currentIndex,
      queueLength: state.queue.length,
      currentSongId: currentSong?.id,
      currentSongTitle: currentSong?.title,
      existingSongId: state.currentSong?.id,
      existingSongTitle: state.currentSong?.title,
      shouldAutoplay: shouldAutoplayNextLoad.current,
      fullSong: currentSong
    });

    if (currentSong) {
      // Check if this is a new song - compare by ID if both have IDs, otherwise always load
      const existingSong = state.currentSong;
      const hasId = currentSong.id && existingSong?.id;
      const isNewSong = hasId && existingSong
        ? currentSong.id !== existingSong.id
        : currentSong !== existingSong; // Fallback to reference comparison

      console.log('Is new song?', isNewSong, {
        hasId,
        currentSongId: currentSong.id,
        existingSongId: existingSong?.id,
        songsEqual: currentSong === existingSong
      });

      if (isNewSong || !existingSong) {
        console.log('Loading new song:', currentSong.title || 'Unknown');
        dispatch({ type: 'SET_CURRENT_SONG', payload: currentSong });
        // Load the song; autoplay if requested by the play() call
        const autoplay = shouldAutoplayNextLoad.current;
        shouldAutoplayNextLoad.current = false;
        console.log('Loading song with autoplay:', autoplay);
        loadSong(currentSong, autoplay);
      } else {
        console.log('Song already loaded, skipping');
      }
    } else if (state.currentSong) {
      // Queue is empty but we have a current song - clear it
      console.log('Queue empty, clearing current song');
      dispatch({ type: 'SET_CURRENT_SONG', payload: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.queue, state.currentIndex]);

  // Update audio volume when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  // Media Session API for background playback and lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const currentSong = state.currentSong;
    if (!currentSong) {
      // Clear media session when no song is playing
      navigator.mediaSession.metadata = null;
      return;
    }

    // Set metadata for lock screen / media notification
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title || 'Unknown Title',
      artist: currentSong.artist || 'Unknown Artist',
      album: currentSong.album || 'NRGFLOW',
      artwork: currentSong.thumbnail ? [
        { src: currentSong.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '192x192', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '384x384', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ] : []
    });
  }, [state.currentSong]);

  // Media Session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Play handler
    navigator.mediaSession.setActionHandler('play', () => {
      if (state.youtubeMode?.isYoutube) {
        dispatch({ type: 'SET_PLAYING', payload: true });
      } else if (audioRef.current) {
        audioRef.current.play();
      }
    });

    // Pause handler
    navigator.mediaSession.setActionHandler('pause', () => {
      if (state.youtubeMode?.isYoutube) {
        dispatch({ type: 'SET_PLAYING', payload: false });
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
    });

    // Previous track handler
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      previous();
    });

    // Next track handler
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      next();
    });

    // Seek backward handler (10 seconds)
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skipTime, 0);
      }
    });

    // Seek forward handler (10 seconds)
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.currentTime + skipTime,
          audioRef.current.duration || 0
        );
      }
    });

    // Seek to specific position handler
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });

    // Stop handler
    navigator.mediaSession.setActionHandler('stop', () => {
      stop();
    });

    // Cleanup
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('stop', null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.youtubeMode]);

  // Update Media Session position state for scrubber
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;

    if (state.duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: state.duration,
          playbackRate: 1,
          position: Math.min(state.currentTime, state.duration)
        });
      } catch (e) {
        // Ignore errors from invalid position state
      }
    }
  }, [state.currentTime, state.duration]);

  // Update Media Session playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
  }, [state.isPlaying]);

  // Handle visibility change to maintain background playback
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When page becomes hidden (minimized, tab switch, phone locked)
      if (document.hidden) {
        console.log('[Background] Page hidden, isPlaying:', state.isPlaying, 'youtubeMode:', state.youtubeMode?.isYoutube);

        // Track if we were playing before going to background (for YouTube resume)
        wasPlayingBeforeBackgroundRef.current = state.isPlaying;

        // Ensure audio keeper stays alive (for both HTML5 and YouTube/Silent mode)
        if (state.isPlaying && audioRef.current) {
          // Check if audio was paused by the browser
          if (audioRef.current.paused) {
            console.log('[Background] Audio paused unexpectedly, resuming...');
            audioRef.current.play().catch(err => {
              console.warn('[Background] Failed to resume audio:', err);
            });
          }
        }
      } else {
        // Page became visible again
        console.log('[Background] Page visible again, wasPlaying:', wasPlayingBeforeBackgroundRef.current);

        // Resume audio if we were playing
        if (wasPlayingBeforeBackgroundRef.current && audioRef.current) {
          if (audioRef.current.paused) {
            console.log('[Background] Resuming audio keeper');
            audioRef.current.play().catch(e => console.warn('Audio resume failed:', e));
          }
        }

        // For YouTube mode, try to resume playback if we were playing before
        if (state.youtubeMode?.isYoutube && wasPlayingBeforeBackgroundRef.current) {
          console.log('[Background] Resuming YouTube playback after returning to foreground');

          // Call the YouTube resume callback (registered by MiniPlayer)
          if (youtubeResumeCallbackRef.current) {
            // Small delay to let the page fully restore
            setTimeout(() => {
              console.log('[Background] Calling YouTube resume callback');
              youtubeResumeCallbackRef.current?.();
            }, 300);
          }

          // Also ensure state is set to playing
          dispatch({ type: 'SET_PLAYING', payload: true });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isPlaying, state.youtubeMode?.isYoutube]);

  // Keep audio alive with periodic check (helps on some mobile browsers)
  useEffect(() => {
    if (!state.isPlaying || state.youtubeMode?.isYoutube) return;

    const keepAliveInterval = setInterval(() => {
      if (audioRef.current && state.isPlaying && audioRef.current.paused) {
        console.log('[KeepAlive] Audio paused unexpectedly, resuming...');
        audioRef.current.play().catch(() => { });
      }
    }, 1000);

    return () => clearInterval(keepAliveInterval);
  }, [state.isPlaying, state.youtubeMode?.isYoutube]);

  const startTimeUpdateInterval = () => {
    if (timeUpdateInterval.current) return;
    timeUpdateInterval.current = setInterval(() => {
      if (audioRef.current) {
        dispatch({ type: 'SET_CURRENT_TIME', payload: audioRef.current.currentTime });
      }
    }, 1000);
  };

  const stopTimeUpdateInterval = () => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  };

  const loadSong = async (song: Song, autoPlay = false) => {
    if (!audioRef.current) {
      console.error('Audio ref is null, cannot load song');
      return;
    }

    if (!song.id) {
      console.error('Song has no ID, cannot load:', song);
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    console.log('loadSong called:', {
      songId: song.id,
      songTitle: song.title,
      youtubeId: song.youtubeId,
      autoPlay,
      fullSong: song
    });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      console.log('[LoadSong] Fetching audio stream for song:', song.id);
      console.log('[LoadSong] User agent:', navigator.userAgent);
      console.log('[LoadSong] Is mobile:', /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

      const streamResponse = await musicService.getSongAudioStream(song.id);
      console.log('[LoadSong] Stream response received:', streamResponse);

      // Defensive extraction of possible URL fields from backend
      const data = streamResponse?.data as any;
      const candidateUrl: unknown = data?.audioUrl ?? data?.url ?? data?.streamUrl ?? data?.embedUrl;
      const audioUrl = typeof candidateUrl === 'string' ? candidateUrl : undefined;

      if (streamResponse.success && audioUrl) {
        console.log('Audio URL:', audioUrl);

        // Check if this is a YouTube embed URL
        const isYouTubeEmbed = audioUrl.includes('youtube.com/embed') || audioUrl.includes('youtu.be');
        console.log('Is YouTube embed?', isYouTubeEmbed);

        if (isYouTubeEmbed) {
          console.log('Using YouTube mode for:', song.youtubeId, 'autoPlay:', autoPlay);
          // Reset retry count on successful YouTube mode switch
          retryCount.current = 0;

          // For YouTube embeds, we need to extract the video ID and use YouTube Player API
          // Store the YouTube info in state for the MiniPlayer component to handle
          dispatch({
            type: 'SET_YOUTUBE_MODE', payload: {
              isYoutube: true,
              youtubeId: song.youtubeId,
              embedUrl: audioUrl
            }
          });

          // For iOS Background Playback: Play silent audio in the background
          if (audioRef.current) {
            console.log('Starting silent audio keeper for YouTube background playback');
            audioRef.current.src = SILENT_AUDIO_URI;
            audioRef.current.loop = true;
            audioRef.current.volume = 0; // Silent
            // Essential for iOS: maintain playback rate
            if ('webkitPreservesPitch' in audioRef.current) {
              // @ts-ignore
              audioRef.current.webkitPreservesPitch = true;
            }

            if (autoPlay) {
              audioRef.current.play().catch(e => console.warn('Silent audio play failed:', e));
            }
          }

          if (autoPlay) {
            console.log('Setting YouTube mode to autoplay');
            // YouTube player will handle autoplay
            dispatch({ type: 'SET_PLAYING', payload: true });
          }

          dispatch({ type: 'SET_LOADING', payload: false });

          // Increment play count after a delay to ensure YouTube player is ready
          setTimeout(async () => {
            try {
              // Prefer youtubeId for more reliable lookup
              const trackId = song.youtubeId || song.id;
              await musicService.incrementPlayCount(trackId, song.duration);
            } catch (error) {
              // Non-critical - don't log errors for play count
            }
          }, 1000);

          return;
        } else {
          console.log('Using HTML5 audio for:', audioUrl);
          // Reset retry count on successful HTML5 audio load
          retryCount.current = 0;

          // Use regular HTML5 audio for direct streams
          dispatch({ type: 'SET_YOUTUBE_MODE', payload: { isYoutube: false } });
          audioRef.current.src = audioUrl;
          audioRef.current.load();

          // If autoPlay is true, start playing when the audio is ready
          if (autoPlay) {
            const playWhenReady = () => {
              audioRef.current?.play().catch(error => {
                console.error('Failed to play audio:', error);
                // Try next song if playback fails
                if (retryCount.current < maxRetries) {
                  retryCount.current++;
                  setTimeout(() => next(), 1000);
                } else {
                  console.error('Max retries reached, stopping playback');
                  retryCount.current = 0;
                }
              });
              audioRef.current?.removeEventListener('canplay', playWhenReady);
            };
            audioRef.current.addEventListener('canplay', playWhenReady);
          }
        }

        // Increment play count (prefer youtubeId for reliable lookup)
        const trackId = song.youtubeId || song.id;
        await musicService.incrementPlayCount(trackId, song.duration).catch(() => {
          // Non-critical - silently ignore errors
        });
        dispatch({ type: 'SET_LOADING', payload: false });
      } else {
        console.error('Failed to get stream data - missing audio URL. Response:', streamResponse);
        console.error('Response data:', streamResponse?.data);
        console.error('Success flag:', streamResponse?.success);
        // Reset any YouTube mode to avoid inconsistent state
        dispatch({ type: 'SET_YOUTUBE_MODE', payload: { isYoutube: false } });
        dispatch({ type: 'SET_LOADING', payload: false });

        // Try next song if current song fails to load
        if (retryCount.current < maxRetries && state.queue.length > 1) {
          retryCount.current++;
          console.log(`Retrying with next song (attempt ${retryCount.current}/${maxRetries})`);
          setTimeout(() => next(), 1000);
        } else {
          retryCount.current = 0;
        }
      }
    } catch (error) {
      console.error('Failed to load song:', error);
      dispatch({ type: 'SET_LOADING', payload: false });

      // Try next song if current song fails to load
      if (retryCount.current < maxRetries && state.queue.length > 1) {
        retryCount.current++;
        console.log(`Retrying with next song (attempt ${retryCount.current}/${maxRetries})`);
        setTimeout(() => next(), 1000);
      } else {
        retryCount.current = 0;
      }
    }
  };

  const play = async (song?: Song) => {
    if (!audioRef.current) {
      console.error('Audio ref is null in play()');
      return;
    }

    // CRITICAL for iOS Safari: Call YouTube unlock callback SYNCHRONOUSLY before any async work
    // This must happen in the same call stack as the user gesture
    if (isIOSDevice() && youtubeUnlockCallbackRef.current) {
      console.log('[iOS] Calling YouTube unlock callback synchronously');
      youtubeUnlockCallbackRef.current();
    }

    // Try to unlock audio on mobile (must happen on user gesture)
    await unlockAudio(audioRef.current);

    console.log('Play called with song:', song?.title || 'current song', 'YouTube mode:', state.youtubeMode?.isYoutube);

    if (song) {
      // Validate song has required properties
      if (!song.id) {
        console.error('Song missing ID:', song);
        // Try to use youtubeId as fallback ID
        if (song.youtubeId) {
          song.id = song.youtubeId;
          console.log('Using youtubeId as ID:', song.id);
        } else {
          console.error('Song has no ID or youtubeId, cannot play');
          return;
        }
      }

      // Add song to queue and play immediately
      const newQueue = [song];
      console.log('Setting queue with song:', {
        id: song.id,
        title: song.title,
        youtubeId: song.youtubeId,
        fullSong: song
      });
      dispatch({ type: 'SET_QUEUE', payload: newQueue });
      dispatch({ type: 'SET_CURRENT_INDEX', payload: 0 });
      // Signal the effect to autoplay when it loads the song
      shouldAutoplayNextLoad.current = true;
      console.log('New song queued, will autoplay when loaded');
    } else if (state.currentSong) {
      // Resume current song - check if it's YouTube mode
      if (state.youtubeMode?.isYoutube) {
        console.log('Resuming YouTube playback');
        // Resume silent audio keeper if it exists
        if (audioRef.current && audioRef.current.src === SILENT_AUDIO_URI) {
          audioRef.current.play().catch(e => console.warn('Silent audio resume failed:', e));
        }
        // For YouTube mode, we'll let the MiniPlayer handle it
        dispatch({ type: 'SET_PLAYING', payload: true });
      } else {
        console.log('Resuming HTML5 audio playback');
        // Regular HTML5 audio
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error('Failed to play audio:', error);
        }
      }
    }
  };

  const pause = () => {
    if (state.youtubeMode?.isYoutube) {
      // Pause silent audio keeper
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // For YouTube mode, we'll let the MiniPlayer handle it
      dispatch({ type: 'SET_PLAYING', payload: false });
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
  };

  // Fallback: fetch a random trending song when recommendation fails
  const fetchTrendingFallback = useCallback(async (): Promise<Song | null> => {
    console.log('[AutoPlay] Fetching trending fallback...');
    try {
      const response = await musicService.getTrendingSongs(20);
      const songs = response.data?.songs;

      if (response.success && songs && songs.length > 0) {
        // Filter out songs already in session history
        const availableSongs = songs.filter(
          (song: Song) => !sessionHistoryRef.current.includes(song.youtubeId || song.id)
        );

        if (availableSongs.length > 0) {
          // Pick a random song from available trending
          const randomIndex = Math.floor(Math.random() * Math.min(10, availableSongs.length));
          const song = availableSongs[randomIndex];
          console.log('[AutoPlay] Trending fallback:', song.title);
          return song;
        } else {
          // All trending songs played, just pick a random one anyway
          const randomIndex = Math.floor(Math.random() * Math.min(10, songs.length));
          const song = songs[randomIndex];
          console.log('[AutoPlay] Trending fallback (repeat):', song.title);
          return song;
        }
      }
      console.warn('[AutoPlay] No trending songs available');
      return null;
    } catch (error) {
      console.error('[AutoPlay] Trending fallback failed:', error);
      return null;
    }
  }, []);

  // Fetch next recommendation from the API
  const fetchNextRecommendation = useCallback(async (currentSong: Song): Promise<Song | null> => {
    if (isLoadingRecommendation.current) {
      console.log('[AutoPlay] Already loading recommendation, skipping');
      return null;
    }

    isLoadingRecommendation.current = true;
    console.log('[AutoPlay] Fetching next recommendation for:', currentSong.title);

    try {
      const trackId = currentSong.youtubeId || currentSong.id;
      const response = await musicService.getNextRecommendation(
        trackId,
        sessionIdRef.current,
        sessionHistoryRef.current.slice(-20) // Send last 20 tracks for context
      );

      if (response.success && response.data?.nextTrack) {
        const nextTrack = response.data.nextTrack;
        // Update session ID if returned
        if (response.data.sessionId) {
          sessionIdRef.current = response.data.sessionId;
        }
        console.log('[AutoPlay] Got recommendation:', nextTrack.title);
        return nextTrack;
      } else {
        console.warn('[AutoPlay] No recommendation returned, trying trending fallback...');
        // Fallback to trending songs
        return await fetchTrendingFallback();
      }
    } catch (error) {
      console.error('[AutoPlay] Failed to fetch recommendation:', error);
      // Fallback to trending on error too
      console.log('[AutoPlay] Trying trending fallback after error...');
      return await fetchTrendingFallback();
    } finally {
      isLoadingRecommendation.current = false;
    }
  }, [fetchTrendingFallback]);

  // Record a transition between two tracks
  const recordTransition = useCallback(async (fromSong: Song, toSong: Song, source: 'auto' | 'manual' | 'shuffle' = 'auto') => {
    try {
      const fromId = fromSong.youtubeId || fromSong.id;
      const toId = toSong.youtubeId || toSong.id;

      await musicService.recordTransition(fromId, toId, sessionIdRef.current, {
        completed: true,
        skipped: false,
        source
      });
      console.log('[Transition] Recorded:', fromSong.title, '->', toSong.title);
    } catch (error) {
      // Don't fail playback if transition recording fails
      console.warn('[Transition] Failed to record:', error);
    }
  }, []);

  const next = async () => {
    console.log('[Next] Called. Queue:', state.queue.length, 'CurrentIndex:', state.currentIndex, 'Time:', new Date().toISOString());

    if (state.queue.length === 0) {
      console.log('[Next] Queue is empty, returning');
      return;
    }

    const currentSong = state.queue[state.currentIndex];
    let nextIndex = state.currentIndex + 1;
    console.log('[Next] Current song:', currentSong?.title, 'NextIndex:', nextIndex);

    // If we're approaching the end of the queue and have shuffle source, add more songs
    if (nextIndex >= state.queue.length - 1 && shuffleSourceRef.current.length > 0) {
      // Add a random song from the shuffle source to the end of the queue
      const availableSongs = shuffleSourceRef.current.filter(
        song => !state.queue.some(queueSong => queueSong.id === song.id)
      );

      if (availableSongs.length > 0) {
        const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        dispatch({ type: 'ADD_TO_QUEUE', payload: randomSong });
      } else {
        // If all songs have been played, reset the played songs and pick a random one
        const randomSong = shuffleSourceRef.current[Math.floor(Math.random() * shuffleSourceRef.current.length)];
        dispatch({ type: 'ADD_TO_QUEUE', payload: randomSong });
      }
    }

    if (nextIndex >= state.queue.length) {
      console.log('[Next] Reached end of queue. NextIndex:', nextIndex, 'QueueLength:', state.queue.length);
      console.log('[Next] RepeatMode:', state.repeatMode, 'ShuffleSource:', shuffleSourceRef.current.length, 'AutoPlayEnabled:', autoPlayEnabled.current);

      if (state.repeatMode === 'all') {
        console.log('[Next] Repeat all - wrapping to start');
        nextIndex = 0;
      } else if (shuffleSourceRef.current.length > 0) {
        // In shuffle mode, we should have added a song above, so continue
        console.log('[Next] Shuffle mode - continuing');
        nextIndex = state.currentIndex + 1;
      } else if (autoPlayEnabled.current && currentSong) {
        // *** AUTO-PLAY: Fetch next recommendation when queue ends ***
        console.log('[AutoPlay] Queue ended, fetching recommendation for:', currentSong.title);
        console.log('[AutoPlay] Current song details:', {
          id: currentSong.id,
          youtubeId: currentSong.youtubeId,
          title: currentSong.title
        });

        try {
          const recommendedSong = await fetchNextRecommendation(currentSong);
          console.log('[AutoPlay] Recommendation result:', recommendedSong ? recommendedSong.title : 'null');

          if (recommendedSong) {
            // Ensure the song has an ID (use youtubeId as fallback)
            if (!recommendedSong.id && recommendedSong.youtubeId) {
              recommendedSong.id = recommendedSong.youtubeId;
              console.log('[AutoPlay] Set id from youtubeId:', recommendedSong.id);
            }

            // Add to session history
            const currentId = currentSong.youtubeId || currentSong.id;
            if (currentId && !sessionHistoryRef.current.includes(currentId)) {
              sessionHistoryRef.current.push(currentId);
              // Keep history at reasonable size
              if (sessionHistoryRef.current.length > 50) {
                sessionHistoryRef.current = sessionHistoryRef.current.slice(-50);
              }
            }

            // Record the transition for future recommendations
            recordTransition(currentSong, recommendedSong, 'auto');

            // Add to queue and play
            console.log('[AutoPlay] Adding to queue. Current queue length:', state.queue.length);
            dispatch({ type: 'ADD_TO_QUEUE', payload: recommendedSong });
            nextIndex = state.queue.length; // Will be the new song's index
            shouldAutoplayNextLoad.current = true;

            console.log('[AutoPlay] Added to queue:', recommendedSong.title, 'at index:', nextIndex);
          } else {
            console.log('[AutoPlay] No recommendation available, stopping playback');
            return; // No recommendation available, stop playback
          }
        } catch (error) {
          console.error('[AutoPlay] Error fetching recommendation:', error);
          return; // Stop on error
        }
      } else {
        console.log('[Next] Not auto-playing. autoPlayEnabled:', autoPlayEnabled.current, 'currentSong:', !!currentSong);
        return; // Don't advance if we're at the end and not repeating
      }
    }

    // Record transition if moving to an existing song in queue
    if (currentSong && state.queue[nextIndex]) {
      recordTransition(currentSong, state.queue[nextIndex], 'auto');
    }

    dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
    shouldAutoplayNextLoad.current = true;
  };

  // Keep the nextRef updated so event handlers use the latest version
  useEffect(() => {
    nextRef.current = next;
  });

  const previous = () => {
    if (state.queue.length === 0) return;

    // If we're more than 3 seconds into the song, restart it
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevIndex = state.currentIndex - 1;
    if (prevIndex < 0) {
      if (state.repeatMode === 'all') {
        prevIndex = state.queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex });
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch({ type: 'SET_CURRENT_TIME', payload: time });
    }
  };

  const setVolume = (volume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: Math.max(0, Math.min(1, volume)) });
  };

  const toggleShuffle = () => {
    dispatch({ type: 'SET_SHUFFLED', payload: !state.isShuffled });
  };

  const setRepeatMode = (mode: 'none' | 'one' | 'all') => {
    dispatch({ type: 'SET_REPEAT_MODE', payload: mode });
  };

  const addToQueue = (song: Song) => {
    dispatch({ type: 'ADD_TO_QUEUE', payload: song });
  };

  const removeFromQueue = (index: number) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: index });
  };

  const clearQueue = () => {
    stop();
    dispatch({ type: 'CLEAR_QUEUE' });
    dispatch({ type: 'SET_CURRENT_SONG', payload: null });
  };

  const setQueue = (songs: Song[], startIndex = 0) => {
    dispatch({ type: 'SET_QUEUE', payload: songs });
    dispatch({ type: 'SET_CURRENT_INDEX', payload: startIndex });
  };

  const playPlaylist = (songs: Song[], startIndex = 0) => {
    if (songs.length === 0) return;

    const shuffledSongs = state.isShuffled ? [...songs].sort(() => Math.random() - 0.5) : songs;
    setQueue(shuffledSongs, startIndex);
  };

  const playShuffleMode = (songs: Song[]) => {
    if (songs.length === 0) return;

    // Set the shuffle source for continuous shuffle
    dispatch({ type: 'SET_SHUFFLE_SOURCE', payload: songs });

    // Start with a random song from the source
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    const initialQueue = [randomSong];

    setQueue(initialQueue, 0);

    // Signal that we want to autoplay when the song loads
    shouldAutoplayNextLoad.current = true;

    // Also set playing state immediately for YouTube player
    dispatch({ type: 'SET_PLAYING', payload: true });
  };

  const updateCurrentTime = (time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  };

  const updateDuration = (duration: number) => {
    dispatch({ type: 'SET_DURATION', payload: duration });
  };

  const contextValue: AudioPlayerContextType = {
    state,
    play,
    pause,
    stop,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    setRepeatMode,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueue,
    playPlaylist,
    playShuffleMode,
    updateCurrentTime,
    updateDuration,
    registerYouTubeUnlock,
    registerYouTubeResume,
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  );
};