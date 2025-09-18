import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface UseThemeReturn {
  theme: Theme;
  actualTheme: 'light' | 'dark'; // Resolved theme (auto becomes light/dark based on system)
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

const THEME_STORAGE_KEY = 'linguaflip-theme';

export const useTheme = (): UseThemeReturn => {
  const [theme, setThemeState] = useState<Theme>('auto');

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');


  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Handle mounting and localStorage sync
  useEffect(() => {
    setMounted(true);

    // Read theme from localStorage
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
      setThemeState(stored as Theme);
    }

    // Read system theme
    setSystemTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);

  // Resolve actual theme
  const actualTheme = theme === 'auto' ? systemTheme : theme;
  const isDark = actualTheme === 'dark';
  const isLight = actualTheme === 'light';

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#ffffff');
    }
  }, [isDark]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    if (theme === 'auto') {
      // If auto, toggle to opposite of system theme
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // If explicit, toggle between light/dark
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  }, [theme, systemTheme, setTheme]);

  return {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
  };
};