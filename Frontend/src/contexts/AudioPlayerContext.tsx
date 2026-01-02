import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import { Song, PlayerState, YouTubeMode } from '../types/models';
import { musicService } from '../services/musicService';

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
        next();
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
      console.log('Fetching audio stream for song:', song.id);
      const streamResponse = await musicService.getSongAudioStream(song.id);
      console.log('Stream response received:', streamResponse);

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
          dispatch({ type: 'SET_YOUTUBE_MODE', payload: {
            isYoutube: true,
            youtubeId: song.youtubeId,
            embedUrl: audioUrl
          }});

          // Clear any existing audio source and pause to prevent conflicts
          if (audioRef.current.src) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current.load();
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
              await musicService.incrementPlayCount(song.id, song.duration);
            } catch (error) {
              console.warn('Failed to increment play count:', error);
            }
          }, 1000);

          return;
        } else {
          console.log('Using HTML5 audio for:', audioUrl);
          // Reset retry count on successful HTML5 audio load
          retryCount.current = 0;

          // Use regular HTML5 audio for direct streams
          dispatch({ type: 'SET_YOUTUBE_MODE', payload: { isYoutube: false }});
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

        // Increment play count
        await musicService.incrementPlayCount(song.id, song.duration);
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

  const next = () => {
    if (state.queue.length === 0) return;

    let nextIndex = state.currentIndex + 1;
    
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
      if (state.repeatMode === 'all') {
        nextIndex = 0;
      } else if (shuffleSourceRef.current.length > 0) {
        // In shuffle mode, we should have added a song above, so continue
        nextIndex = state.currentIndex + 1;
      } else {
        return; // Don't advance if we're at the end and not repeating
      }
    }

    dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
  };

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
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  );
};