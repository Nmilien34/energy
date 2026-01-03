import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

type ActiveView = 'dashboard' | 'search' | 'library' | 'playlists' | 'youtube' | 'settings';

const MusicPlatform: React.FC = () => {
  const { user, sessionExpired, sessionExpiredReason } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

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
    { id: 'dashboard' as ActiveView, icon: Home, label: 'Home', requiresAuth: false },
    { id: 'search' as ActiveView, icon: Search, label: 'Search', requiresAuth: false },
    { id: 'library' as ActiveView, icon: Library, label: 'Your Library', requiresAuth: true },
    { id: 'playlists' as ActiveView, icon: ListMusic, label: 'Playlists', requiresAuth: true },
    { id: 'youtube' as ActiveView, icon: Youtube, label: 'YouTube', requiresAuth: true },
  ];

  const handleViewChange = (view: ActiveView) => {
    const item = sidebarItems.find(item => item.id === view);
    if (item?.requiresAuth && !user) {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveView(view);
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
        fixed inset-y-0 left-0 z-50 w-64 bg-music-black-light transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6">
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

        <nav className="px-2 sm:px-3 py-2 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`
                w-full flex items-center space-x-3 sm:space-x-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all font-medium touch-manipulation
                ${activeView === item.id
                  ? 'bg-gradient-to-r from-music-purple/20 to-music-blue/20 text-white border-l-4 border-music-purple'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
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
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-white/10">
          {user ? (
            <UserMenu onNavigateToSettings={() => setActiveView('settings')} />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform hover:bg-gray-200 touch-manipulation"
            >
              <User className="h-5 w-5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-gradient-to-b from-music-black-light to-music-black min-w-0">
        {/* Top Navigation */}
        <header className="bg-music-black-light/80 backdrop-blur-xl border-b border-white/5 p-4 lg:hidden sticky top-0 z-40">
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
        <div className="flex-1 overflow-y-auto pb-24">
          <ErrorBoundary>
            {renderActiveView()}
          </ErrorBoundary>
        </div>
      </main>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Session Expired Modal */}
      {showSessionExpiredModal && (
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
      )}
    </div>
  );
};

export default MusicPlatform; 