import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/hooks/useTheme';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import ToastContainer from './ToastContainer';
import UserSettings from './UserSettings';
import ThemeToggle from './ThemeToggle';

interface AppContextType {
  // Toast system
  showToast: ReturnType<typeof useToast>['showToast'];
  showSuccess: ReturnType<typeof useToast>['showSuccess'];
  showError: ReturnType<typeof useToast>['showError'];
  showWarning: ReturnType<typeof useToast>['showWarning'];
  showInfo: ReturnType<typeof useToast>['showInfo'];
  showLoading: ReturnType<typeof useToast>['showLoading'];

  // Theme system
  theme: ReturnType<typeof useTheme>['theme'];
  actualTheme: ReturnType<typeof useTheme>['actualTheme'];
  setTheme: ReturnType<typeof useTheme>['setTheme'];
  toggleTheme: ReturnType<typeof useTheme>['toggleTheme'];
  isDark: ReturnType<typeof useTheme>['isDark'];
  isLight: ReturnType<typeof useTheme>['isLight'];

  // User preferences
  preferences: ReturnType<typeof useUserPreferences>['preferences'];
  updatePreference: ReturnType<typeof useUserPreferences>['updatePreference'];
  updatePreferences: ReturnType<typeof useUserPreferences>['updatePreferences'];
  resetToDefaults: ReturnType<typeof useUserPreferences>['resetToDefaults'];
  isLoadingPreferences: ReturnType<typeof useUserPreferences>['isLoading'];

  // UI state
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  // Initialize all systems
  const toastSystem = useToast();
  const themeSystem = useTheme();
  const preferencesSystem = useUserPreferences();

  const contextValue: AppContextType = {
    // Toast system
    showToast: toastSystem.showToast,
    showSuccess: toastSystem.showSuccess,
    showError: toastSystem.showError,
    showWarning: toastSystem.showWarning,
    showInfo: toastSystem.showInfo,
    showLoading: toastSystem.showLoading,

    // Theme system
    theme: themeSystem.theme,
    actualTheme: themeSystem.actualTheme,
    setTheme: themeSystem.setTheme,
    toggleTheme: themeSystem.toggleTheme,
    isDark: themeSystem.isDark,
    isLight: themeSystem.isLight,

    // User preferences
    preferences: preferencesSystem.preferences,
    updatePreference: preferencesSystem.updatePreference,
    updatePreferences: preferencesSystem.updatePreferences,
    resetToDefaults: preferencesSystem.resetToDefaults,
    isLoadingPreferences: preferencesSystem.isLoading,

    // UI state
    isSettingsOpen,
    setIsSettingsOpen,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}

      {/* Global UI Components */}
      <ToastContainer toasts={toastSystem.toasts} onRemoveToast={toastSystem.removeToast} />

      {/* Settings Panel */}
      <UserSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Global Theme Toggle (can be positioned anywhere) */}
      <div className="fixed top-4 right-4 z-40">
        <ThemeToggle variant="minimal" />
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="Abrir configuración de usuario"
        title="Configuración"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </AppContext.Provider>
  );
};

export default AppProvider;