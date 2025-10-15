import React, { useState } from 'react';
import { createPlaylistShare, createSongShare } from '../services/shareService';

interface ShareButtonProps {
  type: 'playlist' | 'song';
  id: string;
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ type, id, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      setIsLoading(true);
      setError(null);

      const response = type === 'playlist'
        ? await createPlaylistShare(id)
        : await createSongShare(id);

      // Copy to clipboard
      await navigator.clipboard.writeText(response.shareUrl);

      // Show copied message
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err: any) {
      console.error('Failed to create share:', err);
      setError(err.response?.data?.error || 'Failed to create share link');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
          isLoading
            ? 'bg-zinc-700 cursor-not-allowed'
            : 'bg-zinc-800 hover:bg-zinc-700 active:scale-95'
        } ${className}`}
      >
        {isLoading ? (
          <svg
            className="animate-spin w-5 h-5 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-zinc-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        )}
        <span className="text-sm font-medium text-zinc-300">Share</span>
      </button>

      {/* Copied notification */}
      {showCopied && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap z-50">
          Link copied to clipboard!
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
};

export default ShareButton;
