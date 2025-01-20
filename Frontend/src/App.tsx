import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './views/Welcome';
import MusicPlatform from './views/MusicPlatform';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/platform" element={<MusicPlatform />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
