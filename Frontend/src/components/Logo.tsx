import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle for contrast */}
        <circle cx="32" cy="32" r="30" fill="#18181b" />
        
        {/* Female figure silhouette */}
        <path
          d="M20 45 C20 40, 22 38, 24 38 C26 38, 28 40, 28 45 L28 48 C28 50, 26 52, 24 52 C22 52, 20 50, 20 48 Z"
          fill="#f4f4f5"
        />
        
        {/* Body */}
        <path
          d="M24 38 C24 32, 28 28, 32 28 C36 28, 40 32, 40 38 L40 42 C40 44, 38 46, 36 46 L28 46 C26 46, 24 44, 24 42 Z"
          fill="#f4f4f5"
        />
        
        {/* Head */}
        <circle cx="32" cy="24" r="6" fill="#f4f4f5" />
        
        {/* Left arm (raised) */}
        <path
          d="M32 32 C30 32, 28 30, 26 28 C24 26, 22 24, 20 22 C18 20, 16 18, 16 16 C16 14, 18 12, 20 12 C22 12, 24 14, 26 16 C28 18, 30 20, 32 22 C34 20, 36 18, 38 16 C40 14, 42 12, 44 12 C46 12, 48 14, 48 16 C48 18, 46 20, 44 22 C42 24, 40 26, 38 28 C36 30, 34 32, 32 32 Z"
          fill="#f4f4f5"
        />
        
        {/* Right arm (resting on leg) */}
        <path
          d="M40 38 C42 38, 44 40, 46 42 C48 44, 50 46, 50 48 C50 50, 48 52, 46 52 C44 52, 42 50, 40 48 C38 46, 36 44, 34 42 C32 40, 30 38, 28 38 C26 38, 24 40, 24 42 C24 44, 26 46, 28 48 C30 50, 32 52, 34 52 C36 52, 38 50, 40 48 C42 46, 44 44, 46 42 C48 40, 50 38, 52 38 C54 38, 56 40, 56 42 C56 44, 54 46, 52 48 C50 50, 48 52, 46 52 C44 52, 42 50, 40 48 C38 46, 36 44, 34 42 C32 40, 30 38, 28 38 Z"
          fill="#f4f4f5"
        />
        
        {/* Left orb (magenta to purple gradient) */}
        <defs>
          <linearGradient id="leftOrb" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          
          {/* Center orb (blue to purple gradient) */}
          <linearGradient id="centerOrb" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          
          {/* Right orb (magenta to purple gradient) */}
          <linearGradient id="rightOrb" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        
        {/* Orbs with glow effect */}
        <circle cx="24" cy="16" r="4" fill="url(#leftOrb)" className="drop-shadow-lg" />
        <circle cx="32" cy="12" r="4" fill="url(#centerOrb)" className="drop-shadow-lg" />
        <circle cx="40" cy="16" r="4" fill="url(#rightOrb)" className="drop-shadow-lg" />
        
        {/* Glow effects for orbs */}
        <circle cx="24" cy="16" r="6" fill="url(#leftOrb)" opacity="0.3" />
        <circle cx="32" cy="12" r="6" fill="url(#centerOrb)" opacity="0.3" />
        <circle cx="40" cy="16" r="6" fill="url(#rightOrb)" opacity="0.3" />
      </svg>
    </div>
  );
};

export default Logo;

