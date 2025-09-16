import React, { useEffect, useRef, useState } from 'react';

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

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
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
}) => {
  const playerRef = useRef<YouTubePlayerApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);

  // Load YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsAPIReady(true);
      return;
    }

    // Load YouTube API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);

    // Set global callback
    window.onYouTubeIframeAPIReady = () => {
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
    if (!isAPIReady || !containerRef.current || !videoId) return;

    // Avoid creating multiple players on the same container
    if ((containerRef.current as any)._ytPlayer) {
      return;
    }

    try {
      const player = new window.YT.Player(containerRef.current, {
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
            playerRef.current = event.target;
            // Expose instance on container for external control
            (containerRef.current as any)._ytPlayer = playerRef.current;

            try {
              // Set initial volume and mute state
              if (autoplay) {
                console.log('YouTube autoplay enabled, starting muted playback');
                // YouTube requires muted autoplay
                playerRef.current?.mute?.();
                playerRef.current?.playVideo?.();
              }
            } catch (error) {
              console.warn('Error in YouTube player onReady:', error);
            }

            onReady?.();
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
      // Clean up player reference
      if (containerRef.current) {
        (containerRef.current as any)._ytPlayer = null;
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

  // When videoId or autoplay changes, cue or load the new video without recreating the player
  useEffect(() => {
    if (!playerRef.current || !videoId) return;

    const player = playerRef.current as any;

    // Check if player is ready before making API calls
    const tryUpdateVideo = () => {
      try {
        if (!player.getPlayerState || player.getPlayerState() === -1) {
          // Player not ready yet, skip this update
          return;
        }

        // Ensure player is muted for autoplay compliance
        if (autoplay) {
          player.mute?.();
          player.loadVideoById?.({ videoId });
        } else {
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
  }, [videoId, autoplay]);

  // No separate effect needed; we set _ytPlayer on onReady

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
};

export default YouTubePlayer;