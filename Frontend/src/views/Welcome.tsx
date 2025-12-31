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
    <div className="min-h-screen bg-gradient-to-b from-spotify-black via-spotify-black-light to-spotify-black text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-spotify-green/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-spotify-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-spotify-green to-green-600 rounded-lg flex items-center justify-center shadow-lg">
              <Music className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-spotify-green to-green-400 bg-clip-text text-transparent">
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
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <Sparkles className="h-4 w-4 text-spotify-green" />
            <span className="text-sm font-medium">Your Music, Your Way</span>
          </div>
          
          <h1 className="text-7xl md:text-8xl font-black mb-6 leading-tight">
            <span className="block">Music for</span>
            <span className="block bg-gradient-to-r from-spotify-green via-green-400 to-emerald-400 bg-clip-text text-transparent">
              Everyone
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Discover, convert, and manage your music collection. 
            <span className="text-white font-medium"> All in one place.</span>
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="group relative px-8 py-4 rounded-full bg-spotify-green text-black font-bold text-lg hover:scale-105 transition-all hover:bg-spotify-green-hover shadow-lg shadow-spotify-green/30"
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <Play className="h-5 w-5 fill-black" />
                <span>Get Started Free</span>
              </span>
            </button>
            <button
              onClick={() => navigate('/platform')}
              className="px-8 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all hover:scale-105"
            >
              Explore Platform
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto animate-slide-up">
          <div className="group relative bg-gradient-to-br from-spotify-black-light to-spotify-black-lighter p-8 rounded-2xl border border-white/10 hover:border-spotify-green/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-spotify-green/10">
            <div className="absolute inset-0 bg-gradient-to-br from-spotify-green/0 to-spotify-green/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-spotify-green to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Download className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">YouTube to MP3</h3>
              <p className="text-gray-400 leading-relaxed">
                Convert your favorite YouTube videos to high-quality MP3 files instantly. 
                <span className="text-white font-medium"> No limits, no hassle.</span>
              </p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-spotify-black-light to-spotify-black-lighter p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Search className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Song Recognition</h3>
              <p className="text-gray-400 leading-relaxed">
                Identify any song instantly by uploading a clip. 
                <span className="text-white font-medium"> Powered by AI.</span>
              </p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-spotify-black-light to-spotify-black-lighter p-8 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="h-7 w-7 text-white fill-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Personal Library</h3>
              <p className="text-gray-400 leading-relaxed">
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