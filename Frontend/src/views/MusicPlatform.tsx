import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';

const MusicPlatform: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <nav className="bg-zinc-800 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for songs..."
                className="w-full bg-zinc-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
          
          <div className="ml-4">
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 text-zinc-300 hover:text-white"
              >
                <User className="h-5 w-5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to NRGflow</h1>
          <p className="text-zinc-400">
            Discover, convert, and manage your music collection with ease
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Feature cards */}
          <div className="bg-zinc-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">YouTube to MP3</h3>
            <p className="text-zinc-400">Convert YouTube videos to high-quality MP3 files</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Song Recognition</h3>
            <p className="text-zinc-400">Identify songs by uploading audio or recording</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Your Library</h3>
            <p className="text-zinc-400">Access your converted and saved songs</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Recently Added</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Placeholder for recently added songs */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-zinc-800 p-4 rounded-lg">
                <div className="bg-zinc-700 w-full aspect-square rounded-md mb-2" />
                <p className="font-medium truncate">Song Title {i}</p>
                <p className="text-sm text-zinc-400 truncate">Artist Name</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default MusicPlatform; 