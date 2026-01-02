import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, loading } = useTheme();

  const themes = [
    { id: 'dark', label: 'Lights Out' },
    { id: 'dim', label: 'Dim' },
    { id: 'light', label: 'Off White' },
  ] as const;

  const isLight = theme === 'light';

  return (
    <div className={`flex items-center gap-1 backdrop-blur-xl p-1 rounded-full border ${
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
  );
};

export default ThemeSwitcher;
