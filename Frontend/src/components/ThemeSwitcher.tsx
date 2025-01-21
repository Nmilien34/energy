import React from 'react';
import { Sun, Moon, Sunset } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 bg-zinc-800/50 p-1 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-colors ${
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
        className={`p-2 rounded-md transition-colors ${
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
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-zinc-900 text-white'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ThemeSwitcher; 