import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Music, Play, Download, Search, Heart, Sparkles } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import ThemeSwitcher from '../components/ThemeSwitcher';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-music-black via-music-black-light to-music-black text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-music-purple/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-music-blue/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-music-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/logofortheapp.png" 
              alt="NRGFLOW Logo" 
              className="w-10 h-10 rounded-lg shadow-lg"
            />
            <h1 className="text-2xl font-black tracking-tight font-display">
              <span className="bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">
                NRG
              </span>
              <span className="text-white">FLOW</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform hover:bg-gray-200"
              >
                <User className="h-4 w-4" />
                <span>Log in</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <Sparkles className="h-4 w-4 text-music-purple" />
            <span className="text-sm font-medium">Your Music, Your Way</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-6 leading-tight font-display tracking-tight px-2">
            <span className="block">Music for</span>
            <span className="block bg-gradient-to-r from-music-purple via-purple-400 to-music-blue bg-clip-text text-transparent">
              Everyone
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed font-medium px-4">
            Discover, convert, and manage your music collection. 
            <span className="text-white font-medium"> All in one place.</span>
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-12 sm:mb-20 px-4">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="group relative px-6 py-3.5 sm:px-8 sm:py-4 rounded-full bg-gradient-to-r from-music-purple to-music-blue text-white font-bold text-base sm:text-lg hover:scale-105 active:scale-95 transition-all hover:from-music-purple-hover hover:to-music-blue-hover shadow-lg shadow-music-purple/30 font-display touch-manipulation"
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-white" />
                <span>Get Started Free</span>
              </span>
            </button>
            <button
              onClick={() => navigate('/platform')}
              className="px-6 py-3.5 sm:px-8 sm:py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-base sm:text-lg hover:bg-white/20 active:scale-95 transition-all hover:scale-105 font-display touch-manipulation"
            >
              Explore Platform
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto animate-slide-up px-4">
          <div className="group relative bg-gradient-to-br from-music-black-light to-music-black-lighter p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 hover:border-music-purple/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-music-purple/10 active:scale-[0.98] touch-manipulation">
            <div className="absolute inset-0 bg-gradient-to-br from-music-purple/0 to-music-purple/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-music-purple to-purple-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Download className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white font-display">YouTube to MP3</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
                Convert your favorite YouTube videos to high-quality MP3 files instantly. 
                <span className="text-white font-medium"> No limits, no hassle.</span>
              </p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-music-black-light to-music-black-lighter p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 hover:border-music-blue/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-music-blue/10 active:scale-[0.98] touch-manipulation">
            <div className="absolute inset-0 bg-gradient-to-br from-music-blue/0 to-music-blue/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-music-blue to-blue-500 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Search className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white font-display">Song Recognition</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
                Identify any song instantly by uploading a clip. 
                <span className="text-white font-medium"> Powered by AI.</span>
              </p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-music-black-light to-music-black-lighter p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 hover:border-music-purple/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-music-purple/10 active:scale-[0.98] touch-manipulation">
            <div className="absolute inset-0 bg-gradient-to-br from-music-purple/0 to-music-purple/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-music-purple to-purple-500 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-white fill-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white font-display">Personal Library</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
                Organize and manage your music collection with playlists, favorites, and more.
                <span className="text-white font-medium"> Your music, organized.</span>
              </p>
            </div>
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