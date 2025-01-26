import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Welcome from '../views/Welcome';
import MusicPlatform from '../views/MusicPlatform';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/platform" element={<MusicPlatform />} />
    </Routes>
  );
};

export default AppRoutes;   