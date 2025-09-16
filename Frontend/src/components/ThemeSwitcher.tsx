import React from 'react';
import { Sun, Moon, Sunset, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, loading } = useTheme();

  return (
    <div className="flex items-center gap-2 bg-zinc-800/50 p-1 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        disabled={loading}
        className={`p-2 rounded-md transition-colors disabled:opacity-50 ${
          theme === 'light'
            ? 'bg-white text-black'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="Light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dim')}
        disabled={loading}
        className={`p-2 rounded-md transition-colors disabled:opacity-50 ${
          theme === 'dim'
            ? 'bg-zinc-700 text-white'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="Dim mode"
      >
        <Sunset className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        disabled={loading}
        className={`p-2 rounded-md transition-colors disabled:opacity-50 ${
          theme === 'dark'
            ? 'bg-zinc-900 text-white'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        disabled={loading}
        className={`p-2 rounded-md transition-colors disabled:opacity-50 ${
          theme === 'system'
            ? 'bg-blue-600 text-white'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="System preference"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ThemeSwitcher; 