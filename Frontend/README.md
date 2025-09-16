# 🎵 NRG Flow - Music Platform Frontend

A comprehensive React-based music streaming platform that transforms YouTube's video-centric experience into a music-focused streaming service similar to Spotify or Apple Music, powered by YouTube's vast music library.

## 🚀 Features

### 🎼 Core Music Features
- **YouTube Music Search** - Real-time search with YouTube API integration
- **Audio Streaming** - High-quality audio playback with background support
- **Full-Featured Player** - Play, pause, skip, volume control, shuffle, repeat modes
- **Queue Management** - Add, remove, and reorder songs in playback queue
- **Mini Player** - Persistent bottom player for background music

### 📋 Playlist Management
- **Create & Edit Playlists** - Unlimited playlist creation with descriptions
- **Drag & Drop Interface** - Reorder songs within playlists
- **Public/Private Playlists** - Control playlist visibility
- **Collaborative Playlists** - Allow others to add songs
- **Playlist Sharing** - Share playlists via links

### 👤 User Library
- **Favorites System** - Heart songs you love
- **Recently Played** - Track and display listening history
- **User Dashboard** - Personalized music discovery
- **Library Organization** - Grid and list view modes
- **Advanced Search & Filtering** - Find your music quickly

### 🎯 YouTube Integration
- **OAuth Authentication** - Secure YouTube account connection
- **Playlist Import** - Import YouTube playlists seamlessly
- **Playlist Sync** - Keep playlists synchronized
- **Channel Integration** - Access your YouTube music content

### 🎨 User Experience
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Beautiful dark interface optimized for music
- **Mobile-First** - Touch-optimized controls and navigation
- **Progressive Web App** - Installable with offline support

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Backend API running (see backend documentation)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd energy/frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables
```env
REACT_APP_API_URL=https://api.yfhnrg.com
# Add other environment variables as needed
```

### Development
```bash
# Start development server
npm start

# Open http://localhost:3000
```

### Production Build
```bash
# Create optimized production build
npm run build

# Serve the build
npm install -g serve
serve -s build
```

## 🏗️ Architecture

### Frontend Stack
- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client for API communication
- **React Router** - Client-side routing

### Component Structure
```
src/
├── components/           # Reusable UI components
│   ├── AudioPlayer.tsx  # Full-featured audio player
│   ├── MiniPlayer.tsx   # Compact player for background
│   ├── MusicSearch.tsx  # YouTube music search interface
│   ├── PlaylistManager.tsx # Playlist CRUD operations
│   ├── UserLibrary.tsx  # User's music collection
│   ├── YouTubeIntegration.tsx # OAuth and playlist import
│   ├── Dashboard.tsx    # Main dashboard with discovery
│   └── ...              # Additional UI components
├── contexts/            # React context providers
│   ├── AudioPlayerContext.tsx # Global player state
│   ├── AuthContext.tsx  # User authentication
│   └── ThemeContext.tsx # Theme management
├── services/            # API service layers
│   ├── musicService.ts  # Music and playlist operations
│   ├── authService.ts   # Authentication services
│   └── api.ts           # HTTP client configuration
├── types/               # TypeScript type definitions
│   └── models.ts        # API response types
└── views/               # Page-level components
    ├── Welcome.tsx      # Landing page
    └── MusicPlatform.tsx # Main application
```

## 🎯 Usage Guide

### Getting Started
1. **Launch the Application** - Open the platform in your browser
2. **Sign Up/Login** - Create an account or sign in
3. **Connect YouTube** (Optional) - Import your existing playlists
4. **Search Music** - Use the search bar to find songs
5. **Create Playlists** - Organize your favorite music
6. **Start Listening** - Enjoy your music with our full-featured player

### Key Features Guide

#### Music Discovery
- Use the search bar to find any song on YouTube
- Browse trending music on the dashboard
- Discover new music through recommendations
- Import playlists from your YouTube account

#### Player Controls
- **Play/Pause** - Click the play button or spacebar
- **Skip Tracks** - Use next/previous buttons or arrow keys
- **Volume Control** - Adjust with volume slider or mouse wheel
- **Shuffle/Repeat** - Toggle modes in the player controls
- **Queue Management** - Add songs to queue or rearrange

#### Playlist Management
- **Create** - Click "Create Playlist" and add songs
- **Edit** - Modify playlist name, description, and privacy
- **Share** - Get shareable links for public playlists
- **Import** - Connect YouTube to import existing playlists

## 📱 Mobile Support

### Responsive Design
- **Breakpoints**: Mobile-first approach with sm/md/lg/xl
- **Touch Gestures**: Optimized for touch interactions
- **Mobile Navigation**: Collapsible sidebar with hamburger menu
- **Progressive Web App**: Installable on mobile devices

## 🎨 Customization

### Styling
The application uses Tailwind CSS for styling. Key color scheme:
- **Background**: zinc-900, zinc-800
- **Text**: white, zinc-400
- **Accent**: blue-600, purple-600
- **Interactive**: hover states with opacity changes

## 🤝 Contributing

### Development Guidelines
1. **Code Style** - Follow TypeScript and React best practices
2. **Components** - Create reusable, accessible components
3. **State Management** - Use appropriate state management patterns
4. **Testing** - Write tests for new features
5. **Documentation** - Update README for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**NRG Flow** - Transforming YouTube into the ultimate music streaming experience! 🎶
