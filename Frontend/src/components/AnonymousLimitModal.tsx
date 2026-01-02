import React from 'react';
import { X, Check, Music, ListMusic, Share2, Infinity } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

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
      <div className={`relative w-full max-w-md rounded-2xl border backdrop-blur-2xl shadow-2xl ${
        isLight
          ? 'bg-white/90 border-black/10'
          : 'bg-zinc-900/90 border-white/10'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${
            isLight
              ? 'text-black/40 hover:text-black/70 hover:bg-black/5'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              isLight ? 'bg-purple-100' : 'bg-purple-500/20'
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
          <div className={`rounded-xl p-4 mb-6 space-y-3 ${
            isLight ? 'bg-black/5' : 'bg-white/5'
          }`}>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isLight ? 'bg-green-100' : 'bg-green-500/20'
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
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all active:scale-[0.98] ${
                isLight
                  ? 'bg-[var(--text-primary)] text-white hover:bg-black/80'
                  : 'bg-white text-zinc-900 hover:bg-white/90'
              }`}
            >
              Create Free Account
            </button>
            <button
              onClick={onLogin}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all border ${
                isLight
                  ? 'bg-transparent border-black/10 text-[var(--text-primary)] hover:bg-black/5'
                  : 'bg-transparent border-white/10 text-white hover:bg-white/5'
              }`}
            >
              I Already Have an Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnonymousLimitModal;
