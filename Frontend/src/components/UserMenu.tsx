import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserMenuProps {
  className?: string;
  onNavigateToSettings?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ className = '', onNavigateToSettings }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <User className="h-5 w-5" />
        <span>{user.username}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-zinc-800 border border-zinc-700 py-1">
          <button
            onClick={() => {
              setIsOpen(false);
              onNavigateToSettings?.();
            }}
            className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu; 