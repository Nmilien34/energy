import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, loading } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes = [
    { id: 'dark', label: 'Lights Out', icon: Moon },
    { id: 'dim', label: 'Dim', icon: Monitor },
    { id: 'light', label: 'Off White', icon: Sun },
  ] as const;

  const isLight = theme === 'light';
  const currentTheme = themes.find(t => t.id === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Mobile: Dropdown */}
      <div className="sm:hidden relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className={`p-2.5 rounded-full backdrop-blur-xl border transition-all disabled:opacity-50 ${
            isLight
              ? 'bg-black/5 border-black/10 text-[var(--text-primary)] hover:bg-black/10'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          <CurrentIcon className="h-4 w-4" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className={`absolute right-0 top-full mt-2 rounded-xl border shadow-2xl overflow-hidden min-w-[140px] z-[100] ${
            isLight
              ? 'bg-[#f5f4f1] border-black/10 shadow-black/20'
              : 'bg-[#1a1a1a] border-white/10 shadow-black/40'
          }`}>
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  disabled={loading}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm font-medium transition-all disabled:opacity-50 ${
                    theme === t.id
                      ? isLight
                        ? 'bg-black/10 text-[var(--text-primary)]'
                        : 'bg-white/15 text-white'
                      : isLight
                        ? 'text-black/60 hover:bg-black/5 hover:text-black/90'
                        : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: Inline buttons */}
      <div className={`hidden sm:flex items-center gap-1 backdrop-blur-xl p-1 rounded-full border ${
        isLight
          ? 'bg-black/5 border-black/10'
          : 'bg-white/5 border-white/10'
      }`}>
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 ${
              theme === t.id
                ? isLight
                  ? 'bg-black/10 text-[var(--text-primary)]'
                  : 'bg-white/15 text-white'
                : isLight
                  ? 'text-black/50 hover:text-black/80'
                  : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default ThemeSwitcher;
