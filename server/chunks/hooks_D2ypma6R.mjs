import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = "linguaflip-theme";
const useTheme = () => {
  const [theme, setThemeState] = useState("auto");
  const [mounted, setMounted] = useState(false);
  const [systemTheme, setSystemTheme] = useState("light");
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (stored === "light" || stored === "dark" || stored === "auto")) {
      setThemeState(stored);
    }
    setSystemTheme(
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    );
  }, []);
  const actualTheme = theme === "auto" ? systemTheme : theme;
  const isDark = actualTheme === "dark";
  const isLight = actualTheme === "light";
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", isDark ? "#1f2937" : "#ffffff");
    }
  }, [isDark]);
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);
  const toggleTheme = useCallback(() => {
    if (theme === "auto") {
      setTheme(systemTheme === "dark" ? "light" : "dark");
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  }, [theme, systemTheme, setTheme]);
  return {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
    mounted
  };
};

export { useTheme as u };
