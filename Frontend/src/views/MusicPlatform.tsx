import React, { useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';

type ActiveView = 'dashboard' | 'search' | 'library' | 'playlists' | 'youtube' | 'settings';

const MusicPlatform: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-6">Search Music</h1>
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
    <div className="min-h-screen bg-zinc-900 text-white flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zinc-800 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-all duration-200 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Music className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">NRG Flow</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`
                w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors
                ${activeView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
                }
                ${item.requiresAuth && !user ? 'opacity-50' : ''}
              `}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.requiresAuth && !user && (
                <span className="ml-auto text-xs bg-zinc-600 px-2 py-1 rounded">Login</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-700">
          {user ? (
            <UserMenu onNavigateToSettings={() => setActiveView('settings')} />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center space-x-3 px-3 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <User className="h-5 w-5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="bg-zinc-800 border-b border-zinc-700 p-4 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-zinc-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-all duration-200 group"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center group-hover:scale-105 transition-transform">
                <Music className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white group-hover:text-blue-400 transition-colors">NRG Flow</span>
            </button>
            {user ? (
              <UserMenu onNavigateToSettings={() => setActiveView('settings')} />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-zinc-300 hover:text-white"
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default MusicPlatform; 