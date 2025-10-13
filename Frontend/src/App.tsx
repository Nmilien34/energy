import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AudioPlayerProvider, useAudioPlayer } from './contexts/AudioPlayerContext';
import MiniPlayer from './components/MiniPlayer';
import './App.css';

const AppContent: React.FC = () => {
  const { state } = useAudioPlayer();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <AppRoutes />

      {/* Global Audio Player - persists across all routes */}
      {state.currentSong && (
        <MiniPlayer
          onExpand={() => setIsExpanded(true)}
          onCollapse={() => setIsExpanded(false)}
          isExpanded={isExpanded}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioPlayerProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </Router>
        </AudioPlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
