import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  autoplay?: boolean;
  height?: number;
  width?: number;
  className?: string;
}

export interface YouTubePlayerHandle {
  playVideo: () => void;
  pauseVideo: () => void;
  unMute: () => void;
  mute: () => void;
  setVolume: (volume: number) => void;
}

interface YouTubePlayerApi {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (options: { videoId: string }) => void;
  cueVideoById: (options: { videoId: string }) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (element: string | HTMLElement, options: any) => YouTubePlayerApi;
      // Note: The Player constructor returns an object matching YouTubePlayerApi at runtime
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
      ready: (callback: () => void) => void;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(({
  videoId,
  onReady,
  onPlay,
  onPause,
  onEnd,
  onError,
  autoplay = false,
  height = 200,
  width = 300,
  className = ''
}, ref) => {
  const playerRef = useRef<YouTubePlayerApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);

  // Expose player controls to parent via ref
  useImperativeHandle(ref, () => ({
    playVideo: () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    },
    pauseVideo: () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    },
    unMute: () => {
      if (playerRef.current && typeof playerRef.current.unMute === 'function') {
        playerRef.current.unMute();
      }
    },
    mute: () => {
      if (playerRef.current && typeof playerRef.current.mute === 'function') {
        playerRef.current.mute();
      }
    },
    setVolume: (volume: number) => {
      if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
        playerRef.current.setVolume(volume);
      }
    }
  }), []);

  // Load YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player && window.YT.PlayerState) {
      console.log('YouTube API already loaded');
      setIsAPIReady(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (existingScript) {
      console.log('YouTube API script already loading, waiting...');
      // Script exists, just wait for the callback
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API ready callback fired');
        setIsAPIReady(true);
      };
      return;
    }

    console.log('Loading YouTube API script...');
    // Load YouTube API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);

    // Set global callback
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API loaded and ready');
      setIsAPIReady(true);
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize player once when API is ready
  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!isAPIReady || !container || !videoId) {
      console.log('Player init skipped:', { isAPIReady, hasContainer: !!container, videoId });
      return;
    }

    // Avoid creating multiple players on the same container
    if ((container as any)._ytPlayer) {
      console.log('Player already exists for container, skipping');
      return;
    }

    console.log('Creating YouTube player for video:', videoId);
    try {
      new window.YT.Player(containerRef.current, {
        height,
        width,
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          cc_load_policy: 0,
          mute: 1, // Start muted to avoid autoplay issues
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube player onReady called for video:', videoId);
            const playerInstance = event.target;
            playerRef.current = playerInstance;
            currentVideoIdRef.current = videoId; // Track the initial video

            // Expose instance on wrapper (parent) for external control since container gets replaced by iframe
            if (wrapper) {
              (wrapper as any)._ytPlayer = playerInstance;
            }
            // Also store on container in case it still exists
            if (container) {
              (container as any)._ytPlayer = playerInstance;
            }

            // Wait a moment for player methods to be fully available
            setTimeout(() => {
              try {
                console.log('Player methods available:', {
                  playVideo: typeof playerInstance.playVideo,
                  pauseVideo: typeof playerInstance.pauseVideo,
                  mute: typeof playerInstance.mute,
                  unMute: typeof playerInstance.unMute
                });

                // Set initial volume and mute state
                if (autoplay) {
                  console.log('YouTube autoplay enabled, starting muted playback');
                  // YouTube requires muted autoplay
                  if (typeof playerInstance.mute === 'function') {
                    playerInstance.mute();
                  }
                  if (typeof playerInstance.playVideo === 'function') {
                    playerInstance.playVideo();
                  }
                }
              } catch (error) {
                console.warn('Error in YouTube player onReady:', error);
              }

              onReady?.();
            }, 100);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            console.log('YouTube player state changed to:', state, 'for video:', videoId);
            try {
              switch (state) {
                case window.YT.PlayerState.PLAYING:
                  console.log('YouTube player started playing');
                  onPlay?.();
                  break;
                case window.YT.PlayerState.PAUSED:
                  console.log('YouTube player paused');
                  onPause?.();
                  break;
                case window.YT.PlayerState.ENDED:
                  console.log('YouTube player ended');
                  onEnd?.();
                  break;
                case window.YT.PlayerState.BUFFERING:
                  console.log('YouTube player buffering');
                  break;
                case window.YT.PlayerState.CUED:
                  console.log('YouTube player cued');
                  break;
              }
            } catch (error) {
              console.warn('Error in YouTube player state change:', error);
            }
          },
          onError: (event: any) => {
            console.warn('YouTube player error:', event.data);
            onError?.(event.data);
          },
        },
      });
    } catch (error) {
      console.error('Failed to create YouTube player:', error);
    }

    return () => {
      // Clean up player reference using the captured variables
      if (container) {
        (container as any)._ytPlayer = null;
      }
      if (wrapper) {
        (wrapper as any)._ytPlayer = null;
      }
      if (playerRef.current) {
        try {
          const player = playerRef.current as any;
          if (player.getPlayerState && player.getPlayerState() !== -1) {
            player.stopVideo?.();
          }
          player.destroy?.();
        } catch (error) {
          console.warn('Error destroying YouTube player:', error);
        } finally {
          playerRef.current = null;
        }
      }
    };
    // We intentionally only depend on isAPIReady to avoid re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAPIReady]);

  // When videoId changes, cue or load the new video without recreating the player
  useEffect(() => {
    if (!playerRef.current || !videoId) return;

    // Only switch videos if the videoId actually changed
    if (currentVideoIdRef.current === videoId) {
      console.log('Same video, not switching:', videoId);
      return;
    }

    const player = playerRef.current as any;

    // Check if player is ready before making API calls
    const tryUpdateVideo = () => {
      try {
        if (!player.getPlayerState || player.getPlayerState() === -1) {
          // Player not ready yet, skip this update
          console.log('Skipping video update, player not ready');
          return;
        }

        console.log('Switching to video:', videoId, 'autoplay:', autoplay);
        currentVideoIdRef.current = videoId;

        // Ensure player is muted for autoplay compliance
        if (autoplay) {
          player.mute?.();
          console.log('Loading and playing video:', videoId);
          player.loadVideoById?.({ videoId });
        } else {
          console.log('Cueing video (not autoplaying):', videoId);
          player.cueVideoById?.({ videoId });
        }
      } catch (err) {
        console.warn('Failed to switch YouTube video:', err);
      }
    };

    // If player is not ready, wait for it
    if (!player.getPlayerState || player.getPlayerState() === -1) {
      const readyCheckInterval = setInterval(() => {
        if (player.getPlayerState && player.getPlayerState() !== -1) {
          clearInterval(readyCheckInterval);
          tryUpdateVideo();
        }
      }, 100);

      // Clean up after 5 seconds if player never becomes ready
      const timeout = setTimeout(() => {
        clearInterval(readyCheckInterval);
      }, 5000);

      return () => {
        clearInterval(readyCheckInterval);
        clearTimeout(timeout);
      };
    } else {
      tryUpdateVideo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]); // Only depend on videoId, not autoplay to prevent double-switching

  // No separate effect needed; we set _ytPlayer on onReady

  return (
    <div className={className} ref={wrapperRef} data-yt-wrapper="true">
      <div ref={containerRef} data-yt-container="true" />
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;