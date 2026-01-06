import React from 'react';
import { X, Check, Music, ListMusic, Share2, Infinity } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { musicService } from '../services/musicService';

interface AnonymousLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: () => void;
  onLogin: () => void;
  message: string;
  title?: string;
}

const AnonymousLimitModal: React.FC<AnonymousLimitModalProps> = ({
  isOpen,
  onClose,
  onSignup,
  onLogin,
  message,
  title = 'Create an Account to Continue'
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const benefits = [
    { icon: Infinity, text: 'Unlimited song plays', color: 'text-purple-400' },
    { icon: ListMusic, text: 'Create your own playlists', color: 'text-blue-400' },
    { icon: Music, text: 'Access the full platform', color: 'text-cyan-400' },
    { icon: Share2, text: 'Share music with friends', color: 'text-purple-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 backdrop-blur-sm ${isLight ? 'bg-black/40' : 'bg-black/70'}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl border backdrop-blur-2xl shadow-2xl ${isLight
          ? 'bg-white/90 border-black/10'
          : 'bg-zinc-900/90 border-white/10'
        }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${isLight
              ? 'text-black/40 hover:text-black/70 hover:bg-black/5'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isLight ? 'bg-purple-100' : 'bg-purple-500/20'
              }`}>
              <Music className={`w-7 h-7 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isLight ? 'text-[var(--text-primary)]' : 'text-white'}`}>
              {title}
            </h2>
            <p className={`text-sm ${isLight ? 'text-[var(--text-secondary)]' : 'text-white/60'}`}>
              {message}
            </p>
          </div>

          {/* Benefits */}
          <div className={`rounded-xl p-4 mb-6 space-y-3 ${isLight ? 'bg-black/5' : 'bg-white/5'
            }`}>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isLight ? 'bg-green-100' : 'bg-green-500/20'
                  }`}>
                  <Check className={`w-3 h-3 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                </div>
                <span className={`text-sm ${isLight ? 'text-[var(--text-primary)]' : 'text-white/80'}`}>
                  {benefit.text}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onSignup}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all active:scale-[0.98] ${isLight
                  ? 'bg-[var(--text-primary)] text-white hover:bg-black/80'
                  : 'bg-white text-zinc-900 hover:bg-white/90'
                }`}
            >
              Create Free Account
            </button>
            <button
              onClick={onLogin}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all border ${isLight
                  ? 'bg-transparent border-black/10 text-[var(--text-primary)] hover:bg-black/5'
                  : 'bg-transparent border-white/10 text-white hover:bg-white/5'
                }`}
            >
              I Already Have an Account
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isLight ? 'border-black/10' : 'border-white/10'}`}></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className={`px-2 ${isLight ? 'bg-white text-[var(--text-secondary)]' : 'bg-zinc-900 text-zinc-400'}`}>
                  Or
                </span>
              </div>
            </div>

            <button
              onClick={() => musicService.initiateGoogleOAuth()}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all border flex items-center justify-center space-x-2 ${isLight
                  ? 'bg-white border-black/10 text-[var(--text-primary)] hover:bg-gray-50'
                  : 'bg-white text-zinc-900 hover:bg-zinc-100'
                }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnonymousLimitModal;
