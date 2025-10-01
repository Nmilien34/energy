import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import ThemeSwitcher from '../components/ThemeSwitcher';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]`}>
      <nav className="bg-[var(--bg-secondary)]/50 backdrop-blur-sm border-b border-[var(--border-color)]/50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            NRGFLOW
          </h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <User className="h-5 w-5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            Welcome to NRGFLOW
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto">
            Your all-in-one music platform for discovering, converting, and managing your music collection
          </p>

          <div className="flex justify-center gap-6">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/platform')}
              className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg border border-[var(--border-color)]"
            >
              Explore Platform
            </button>
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[var(--bg-secondary)]/50 p-8 rounded-xl shadow-xl backdrop-blur-sm border border-[var(--border-color)]/50 transform transition-all hover:scale-105">
            <h3 className="text-2xl font-bold mb-4 text-blue-400">YouTube to MP3</h3>
            <p className="text-[var(--text-secondary)]">
              Convert your favorite YouTube videos to high-quality MP3 files with just a few clicks.
            </p>
          </div>
          <div className="bg-[var(--bg-secondary)]/50 p-8 rounded-xl shadow-xl backdrop-blur-sm border border-[var(--border-color)]/50 transform transition-all hover:scale-105">
            <h3 className="text-2xl font-bold mb-4 text-purple-400">Song Recognition</h3>
            <p className="text-[var(--text-secondary)]">
              Identify any song by uploading a clip or recording directly through our platform.
            </p>
          </div>
          <div className="bg-[var(--bg-secondary)]/50 p-8 rounded-xl shadow-xl backdrop-blur-sm border border-[var(--border-color)]/50 transform transition-all hover:scale-105">
            <h3 className="text-2xl font-bold mb-4 text-pink-400">Personal Library</h3>
            <p className="text-[var(--text-secondary)]">
              Organize and manage your music collection with our intuitive library system.
            </p>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default Welcome; 