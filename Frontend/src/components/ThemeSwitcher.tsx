import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, loading } = useTheme();

  const themes = [
    { id: 'dark', label: 'Lights Out' },
    { id: 'dim', label: 'Dim' },
    { id: 'light', label: 'Off White' },
  ] as const;

  return (
    <div className="flex items-center gap-1 bg-white/5 backdrop-blur-xl p-1 rounded-full border border-white/10">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          disabled={loading}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 ${
            theme === t.id
              ? 'bg-white/15 text-white'
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
