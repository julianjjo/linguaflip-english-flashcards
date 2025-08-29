import { useState, useEffect, useCallback } from 'react';
import type { DifficultyLevel, AudioSettings, VisualSettings } from '@/types/index';

interface UserPreferences {
  // Audio preferences
  voice: string;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  autoPlayAudio: boolean;

  // Study preferences
  difficulty: DifficultyLevel;
  dailyGoal: number;
  sessionDuration: number;
  showProgress: boolean;
  enableSound: boolean;

  // Accessibility
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;

  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
  compactMode: boolean;
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetToDefaults: () => void;
  isLoading: boolean;
}

const STORAGE_KEY = 'linguaflip-user-preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  // Audio
  voice: 'default',
  speechRate: 0.9,
  speechPitch: 1.0,
  speechVolume: 1.0,
  autoPlayAudio: true,

  // Study
  difficulty: 'medium',
  dailyGoal: 20,
  sessionDuration: 25,
  showProgress: true,
  enableSound: true,

  // Accessibility
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  screenReader: false,

  // UI
  theme: 'auto',
  language: 'es',
  compactMode: false,
};

export const useUserPreferences = (): UseUserPreferencesReturn => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preferences from localStorage on mount (client-side only)
  useEffect(() => {
    // Ensure we're on the client side to prevent hydration mismatches
    if (typeof window === 'undefined') {
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new preferences
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change (client-side only)
  useEffect(() => {
    if (!isLoading && isHydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.warn('Failed to save user preferences:', error);
      }
    }
  }, [preferences, isLoading, isHydrated]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetToDefaults,
    isLoading,
  };
};