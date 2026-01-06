import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  Music,
  User,
  Menu,
  X,
  Library,
  ListMusic,
  Youtube,
  AlertTriangle,
} from 'lucide-react';
import AuthModal from '../components/AuthModal';
import UserMenu from '../components/UserMenu';
import Dashboard from '../components/Dashboard';
import MusicSearch from '../components/MusicSearch';
import UserLibrary from '../components/UserLibrary';
import PlaylistManager from '../components/PlaylistManager';
import YouTubeIntegration from '../components/YouTubeIntegration';
import Settings from '../components/Settings';
import ErrorBoundary from '../components/ErrorBoundary';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { musicService } from '../services/musicService';

type ActiveView = 'dashboard' | 'search' | 'library' | 'playlists' | 'youtube' | 'settings';

const MusicPlatform: React.FC = () => {
  const { user, sessionExpired, sessionExpiredReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  // Sync active view with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/platform' || path === '/platform/') {
      setActiveView('dashboard');
    } else if (path.includes('/platform/search')) {
      setActiveView('search');
    } else if (path.includes('/platform/library')) {
      setActiveView('library');
    } else if (path.includes('/platform/playlists')) {
      setActiveView('playlists');
    } else if (path.includes('/platform/youtube')) {
      setActiveView('youtube');
    } else if (path.includes('/platform/settings')) {
      setActiveView('settings');
    }
  }, [location.pathname]);

  // Handle session expiry - show modal and redirect to home
  useEffect(() => {
    if (sessionExpired) {
      setShowSessionExpiredModal(true);
    }
  }, [sessionExpired]);

  // Get session expired message
  const getSessionExpiredMessage = () => {
    switch (sessionExpiredReason) {
      case 'token_expired':
        return 'Your session has expired due to inactivity.';
      case 'invalid_token':
        return 'Your session is no longer valid.';
      case 'user_not_found':
        return 'Your account could not be found.';
      default:
        return 'You have been logged out.';
    }
  };

  // Handle session expired modal close - redirect to login
  const handleSessionExpiredClose = () => {
    setShowSessionExpiredModal(false);
    navigate('/');
  };

  const sidebarItems = [
    { id: 'dashboard' as ActiveView, icon: Home, label: 'Home', requiresAuth: false, path: '/platform' },
    { id: 'search' as ActiveView, icon: Search, label: 'Search', requiresAuth: false, path: '/platform/search' },
    { id: 'library' as ActiveView, icon: Library, label: 'Your Library', requiresAuth: true, path: '/platform/library' },
    { id: 'playlists' as ActiveView, icon: ListMusic, label: 'Playlists', requiresAuth: true, path: '/platform/playlists' },
    { id: 'youtube' as ActiveView, icon: Youtube, label: 'YouTube', requiresAuth: true, path: '/platform/youtube' },
  ];

  const handleViewChange = (view: ActiveView) => {
    const item = sidebarItems.find(item => item.id === view);
    if (item?.requiresAuth && !user) {
      setIsAuthModalOpen(true);
      return;
    }

    // Navigate to the correct path
    if (item?.path) {
      navigate(item.path);
    } else if (view === 'settings') {
      navigate('/platform/settings');
    }

    setIsSidebarOpen(false);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'search':
        return (
          <div className="p-8">
            <h1 className="text-5xl font-black text-white mb-8">Search</h1>
            <MusicSearch className="max-w-4xl mx-auto" />
          </div>
        );
      case 'library':
        return user ? <UserLibrary /> : <div className="p-6 text-center text-zinc-400">Please log in to view your library</div>;
      case 'playlists':
        return user ? <PlaylistManager /> : <div className="p-6 text-center text-zinc-400">Please log in to manage playlists</div>;
      case 'youtube':
        return user ? <YouTubeIntegration /> : <div className="p-6 text-center text-zinc-400">Please log in to connect YouTube</div>;
      case 'settings':
        return user ? <Settings /> : <div className="p-6 text-center text-zinc-400">Please log in to access settings</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-music-black text-white flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-64 glass border-r border-white/5 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 flex flex-col h-full
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 group"
          >
            <img
              src="/logofortheapp.png"
              alt="NRGFLOW Logo"
              className="w-10 h-10 rounded-lg shadow-lg group-hover:scale-105 transition-transform"
            />
            <span className="text-xl font-black tracking-tight font-display">
              <span className="bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">NRG</span>
              <span className="text-white">FLOW</span>
            </span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-2 sm:px-3 py-2 space-y-1 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`
                w-full flex items-center space-x-3 sm:space-x-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all font-medium touch-manipulation
                ${activeView === item.id
                  ? 'bg-gradient-to-r from-music-purple/20 to-music-blue/20 text-white border-l-4 border-music-purple shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                  : 'text-gray-400 glass-hover'
                }
                ${item.requiresAuth && !user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${activeView === item.id ? 'text-white' : ''}`} />
              <span className="text-sm sm:text-base">{item.label}</span>
              {item.requiresAuth && !user && (
                <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-full text-gray-400">Login</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-white/5">
          {user ? (
            <UserMenu onNavigateToSettings={() => setActiveView('settings')} />
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform hover:bg-gray-200 touch-manipulation shadow-lg"
              >
                <User className="h-5 w-5" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => musicService.initiateGoogleOAuth()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 hover:scale-105 active:scale-95 transition-all touch-manipulation border border-white/10"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Google</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-transparent min-w-0 relative">
        {/* Subtle Overlay to ensure text readability over mesh gradient */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Top Navigation */}
        <header className="glass border-b border-white/5 p-4 lg:hidden sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-all duration-200 group"
            >
              <img
                src="/logofortheapp.png"
                alt="NRGFLOW Logo"
                className="w-8 h-8 rounded-lg group-hover:scale-105 transition-transform"
              />
              <span className="font-black text-white font-display">
                <span className="bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">NRG</span>FLOW
              </span>
            </button>
            {user ? (
              <UserMenu onNavigateToSettings={() => setActiveView('settings')} />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <User className="h-6 w-6" />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-24 relative z-10">
          <ErrorBoundary>
            {renderActiveView()}
          </ErrorBoundary>
        </div>
      </main>


      {/* Sidebar Overlay for Mobile */}
      {
        isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )
      }

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Session Expired Modal */}
      {
        showSessionExpiredModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-700">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-white text-center mb-2">Session Expired</h2>
              <p className="text-zinc-400 text-center mb-6">
                {getSessionExpiredMessage()}
                <br />
                <span className="text-sm">Please log in again to continue.</span>
              </p>
              <button
                onClick={handleSessionExpiredClose}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default MusicPlatform; 