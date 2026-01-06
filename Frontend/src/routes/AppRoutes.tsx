import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Welcome from '../views/Welcome';
import MusicPlatform from '../views/MusicPlatform';
import PlaylistDetail from '../components/PlaylistDetail';
import SharedContent from '../views/SharedContent';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/platform/*" element={<MusicPlatform />} />
      <Route path="/playlist/:id" element={<PlaylistDetail />} />
      <Route path="/share/:shareId" element={<SharedContent />} />
      <Route path="/auth/success" element={<AuthSuccess />} />
    </Routes>
  );
};

const AuthSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract token from URL
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');

        if (token) {
          // Use the auth context to handle the callback
          await handleOAuthCallback(token);
          navigate('/platform', { replace: true });
        } else {
          setError('No authentication token received');
          setTimeout(() => navigate('/', { replace: true }), 3000);
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate, location, handleOAuthCallback]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-xl">✕</span>
            </div>
            <p className="text-red-400 mb-2">Authentication Failed</p>
            <p className="text-zinc-400 text-sm">{error}</p>
            <p className="text-zinc-500 text-xs mt-2">Redirecting to home...</p>
          </>
        ) : (
          <>
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Completing authentication...</p>
            <p className="text-zinc-400 text-sm mt-2">Please wait while we log you in</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AppRoutes;   