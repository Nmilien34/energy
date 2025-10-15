import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSharedContent } from '../services/shareService';
import { ShareContent, Song, Playlist } from '../types/models';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useAnonymousSession } from '../hooks/useAnonymousSession';
import AnonymousLimitModal from '../components/AnonymousLimitModal';
import LoadingSpinner from '../components/LoadingSpinner';
import FallbackImage from '../components/FallbackImage';
import MiniPlayer from '../components/MiniPlayer';

const SharedContent: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playPlaylist, play, state: playerState } = useAudioPlayer();
  const { session, trackPlay } = useAnonymousSession(shareId || null);

  const [content, setContent] = useState<ShareContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [expandedYoutubeId, setExpandedYoutubeId] = useState<string | null>(null);
  const [hasNavigatedBack, setHasNavigatedBack] = useState(false);

  // Load shared content
  useEffect(() => {
    const loadContent = async () => {
      if (!shareId) return;

      try {
        setIsLoading(true);
        const data = await getSharedContent(shareId);
        setContent(data);

        // If it's a song share, automatically expand the YouTube player
        if (data.type === 'song') {
          const song = data.content as Song;
          setExpandedYoutubeId(song.youtubeId);
        }
      } catch (err: any) {
        console.error('Failed to load shared content:', err);
        setError(err.response?.data?.error || 'Failed to load shared content');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [shareId]);

  // Handle song play with anonymous session tracking
  const handlePlaySong = useCallback(async (song: Song, songs?: Song[], startIndex?: number) => {
    // If user is authenticated, play normally
    if (user) {
      if (songs && startIndex !== undefined) {
        playPlaylist(songs, startIndex);
      } else {
        play(song);
      }
      return;
    }

    // For anonymous users, track the play
    if (!session) {
      console.error('No session available');
      return;
    }

    // Check if already at limit
    if (session.hasReachedLimit) {
      setAuthModalMessage(
        "You've reached your 3-song preview limit. Create an account to continue listening!"
      );
      setShowAuthModal(true);
      return;
    }

    // Track the play
    const success = await trackPlay(song.id);

    if (!success) {
      // Play limit reached
      setAuthModalMessage(
        "You've reached your 3-song preview limit. Create an account to continue listening!"
      );
      setShowAuthModal(true);
      return;
    }

    // Play the song
    if (songs && startIndex !== undefined) {
      playPlaylist(songs, startIndex);
    } else {
      play(song);
    }
  }, [user, session, trackPlay, play, playPlaylist]);

  // Handle navigation attempts by anonymous users
  const handleNavigationAttempt = useCallback(() => {
    if (user) {
      // Authenticated users can navigate freely
      navigate('/platform');
      return;
    }

    // For song shares, allow one "back" to see the full playlist
    if (content?.type === 'song' && expandedYoutubeId && !hasNavigatedBack) {
      setExpandedYoutubeId(null);
      setHasNavigatedBack(true);
      return;
    }

    // Show auth modal for further navigation
    setAuthModalMessage(
      'Create an account to explore the full music platform and access all features!'
    );
    setShowAuthModal(true);
  }, [user, content, expandedYoutubeId, hasNavigatedBack, navigate]);

  // Block browser back button for anonymous users
  useEffect(() => {
    if (user) return; // Don't block for authenticated users

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleNavigationAttempt();
      window.history.pushState(null, '', window.location.href);
    };

    // Push initial state
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, handleNavigationAttempt]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-red-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Content Not Found</h2>
          <p className="text-zinc-400">{error || 'This share link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  const isPlaylist = content.type === 'playlist';
  const playlist = isPlaylist ? (content.content as Playlist) : null;
  const song = !isPlaylist ? (content.content as Song) : null;

  // For song shares with expanded YouTube player
  if (content.type === 'song' && expandedYoutubeId && song) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col">
        {/* Header with back button */}
        <div className="bg-zinc-800/50 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleNavigationAttempt}
            className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
          <div className="text-sm text-zinc-400">
            Shared by <span className="text-white font-medium">{content.share.owner.username}</span>
          </div>
        </div>

        {/* Expanded YouTube Player */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl">
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${expandedYoutubeId}?autoplay=1`}
                title={song.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">{song.title}</h1>
              <p className="text-lg text-zinc-400">{song.artist}</p>
            </div>
          </div>
        </div>

        {/* Play limit indicator for anonymous users */}
        {!user && session && (
          <div className="bg-zinc-800 border-t border-zinc-700 px-4 py-3">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className="text-zinc-400">
                {session.remainingPlays !== undefined && session.remainingPlays > 0 ? (
                  <>Preview mode: {session.remainingPlays} {session.remainingPlays === 1 ? 'play' : 'plays'} remaining</>
                ) : (
                  <>Preview limit reached</>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Mini Player */}
        {playerState.currentSong && <MiniPlayer />}

        {/* Auth Modal */}
        <AnonymousLimitModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSignup={() => navigate('/?action=signup')}
          onLogin={() => navigate('/?action=login')}
          message={authModalMessage}
        />
      </div>
    );
  }

  // Regular playlist/song list view
  const songs = isPlaylist ? playlist?.songs || [] : (song ? [song] : []);

  return (
    <div className="min-h-screen bg-zinc-900 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 pt-8 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Navigation bar */}
        <div className="max-w-7xl mx-auto mb-6">
          <button
            onClick={handleNavigationAttempt}
            className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{user ? 'Back to Platform' : 'Explore Platform'}</span>
          </button>
        </div>

        {/* Content Header */}
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
            {/* Thumbnail */}
            <div className="w-48 h-48 rounded-lg shadow-2xl overflow-hidden flex-shrink-0">
              <FallbackImage
                src={content.share.thumbnail || '/default-playlist.png'}
                alt={content.share.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="text-sm font-medium text-zinc-400 mb-2">
                {isPlaylist ? 'SHARED PLAYLIST' : 'SHARED SONG'}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
                {content.share.title}
              </h1>
              {content.share.description && (
                <p className="text-zinc-400 mb-4">{content.share.description}</p>
              )}
              <div className="flex items-center justify-center md:justify-start space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  {content.share.owner.profilePicture ? (
                    <img
                      src={content.share.owner.profilePicture}
                      alt={content.share.owner.username}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      {content.share.owner.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-white">{content.share.owner.username}</span>
                </div>
                {isPlaylist && (
                  <>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">{songs.length} songs</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-4">
          {/* Play button */}
          {songs.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => handlePlaySong(songs[0], songs, 0)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-full transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                <span>Play {isPlaylist ? 'Playlist' : 'Song'}</span>
              </button>
            </div>
          )}

          {/* Play limit indicator for anonymous users */}
          {!user && session && session.playCount > 0 && (
            <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-400">
                  {session.remainingPlays !== undefined && session.remainingPlays > 0 ? (
                    <>Preview mode: {session.remainingPlays} {session.remainingPlays === 1 ? 'play' : 'plays'} remaining</>
                  ) : (
                    <>Preview limit reached - Create an account to continue</>
                  )}
                </span>
                <button
                  onClick={() => {
                    setAuthModalMessage('Create an account to enjoy unlimited music streaming!');
                    setShowAuthModal(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium underline"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* Songs table */}
          <div className="space-y-1">
            {songs.map((s, index) => (
              <div
                key={s.id}
                className="group flex items-center space-x-4 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors cursor-pointer"
                onClick={() => handlePlaySong(s, songs, index)}
              >
                {/* Index / Play button */}
                <div className="w-8 text-center">
                  <span className="text-zinc-400 group-hover:hidden">{index + 1}</span>
                  <svg
                    className="w-5 h-5 text-white hidden group-hover:block mx-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>

                {/* Thumbnail */}
                <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                  <FallbackImage
                    src={s.thumbnail}
                    alt={s.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{s.title}</div>
                  <div className="text-sm text-zinc-400 truncate">{s.artist}</div>
                </div>

                {/* Duration */}
                <div className="text-sm text-zinc-400">
                  {Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>

          {songs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-400">No songs in this {isPlaylist ? 'playlist' : 'share'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mini Player */}
      {playerState.currentSong && <MiniPlayer />}

      {/* Auth Modal */}
      <AnonymousLimitModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignup={() => navigate('/?action=signup')}
        onLogin={() => navigate('/?action=login')}
        message={authModalMessage}
      />
    </div>
  );
};

export default SharedContent;
