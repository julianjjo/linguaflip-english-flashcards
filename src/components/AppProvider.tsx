// App Provider for global application context
import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface AppContextType {
  showError: (message: string, description?: string) => void;
  showInfo: (message: string, description?: string) => void;
  preferences: {
    enableSound: boolean;
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
  };
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
  const contextValue: AppContextType = {
    showError: (message: string, description?: string) => {
      console.log('Error:', message, description);
    },
    showInfo: (message: string, description?: string) => {
      console.log('Info:', message, description);
    },
    preferences: {
      enableSound: true,
      highContrast: false,
      largeText: false,
      reduceMotion: false,
    },
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export default AppProvider;
