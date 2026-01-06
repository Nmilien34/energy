import React, { useState } from 'react';
import { Music } from 'lucide-react';

interface FallbackImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

const FallbackImage: React.FC<FallbackImageProps> = ({
  src,
  alt,
  className = '',
  fallbackIcon
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for obviously invalid URLs to avoid network requests
  const isInvalidUrl = !src ||
    src.includes('via.placeholder.com') ||
    src.includes('placeholder') ||
    src.includes('Demo+Song') ||
    src.startsWith('blob:') ||
    !src.startsWith('http');

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError || isInvalidUrl) {
    return (
      <div className={`bg-zinc-700 flex items-center justify-center ${className}`}>
        {fallbackIcon || <Music className="h-8 w-8 text-zinc-500" />}
      </div>
    );
  }

  const isYoutubeHq = src && src.includes('hqdefault.jpg');

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-700 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ transform: isYoutubeHq ? 'scale(1.35)' : 'none' }}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
};

export default FallbackImage;