import React, { createContext, useContext, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { 
  authStateAtom, 
  initializeAuthStore, 
  setUser, 
  type User, 
  type AuthState 
} from '../stores/auth';
import { flashcardsActions, setCurrentUser } from '../stores/flashcards';

interface AuthContextType extends AuthState {
  initializeAuth: () => Promise<void>;
  loadUserFlashcards: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authState = useStore(authStateAtom);

  const initializeAuth = async () => {
    try {
      await initializeAuthStore();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  };

  const loadUserFlashcards = async () => {
    if (authState.user?.userId) {
      try {
        setCurrentUser(authState.user.userId);
        await flashcardsActions.loadFlashcards(authState.user.userId);
      } catch (error) {
        console.error('Failed to load user flashcards:', error);
      }
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      loadUserFlashcards();
    }
  }, [authState.isAuthenticated, authState.user?.userId]);

  const contextValue: AuthContextType = {
    ...authState,
    initializeAuth,
    loadUserFlashcards
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  // During SSR, return a default state to prevent errors
  if (!context) {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Return default state for SSR
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        initializeAuth: async () => {},
        loadUserFlashcards: async () => {}
      };
    }
    
    // In browser, throw error as before
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthProvider;