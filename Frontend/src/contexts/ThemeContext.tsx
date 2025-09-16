import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';
import { useAuth } from './AuthContext';

type Theme = 'dark' | 'light' | 'dim' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Fallback to localStorage while loading
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'dark';
  });
  const [loading, setLoading] = useState(false);

  // Load user's theme preference from backend when user is available
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = await settingsService.getUserSettings();
        if (response.success && response.data) {
          const userTheme = response.data.theme as Theme;
          setThemeState(userTheme);
          localStorage.setItem('theme', userTheme);
          document.documentElement.setAttribute('data-theme', userTheme);
        }
      } catch (error) {
        console.warn('Failed to load user theme settings:', error);
        // Keep using localStorage fallback
      } finally {
        setLoading(false);
      }
    };

    loadUserTheme();
  }, [user]);

  // Apply theme to document when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    try {
      // Optimistically update the UI
      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);

      // Save to backend if user is logged in
      if (user) {
        await settingsService.updateTheme(newTheme);
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Theme is already applied locally, so no need to revert
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 