/**
 * Authentication Store for LinguaFlip
 *
 * This store manages authentication state using Nano Stores,
 * providing reactive state management for authentication across the app.
 */

import { atom, computed } from 'nanostores';
import {
  SecureTokenStorage,
  TokenRefreshManager,
  AuthStateManager
} from '../utils/tokenStorage';
import { SecurityAuditor } from '../utils/security';

// Types
interface User {
  userId: string;
  email?: string;
  username?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    audioEnabled: boolean;
    studyReminders: boolean;
    dailyCardLimit?: number;
    sessionDuration?: number;
  };
  statistics?: {
    totalCardsStudied: number;
    totalStudyTime: number;
    averageRecallRate: number;
    streakDays: number;
    lastStudyDate?: Date;
    cardsMastered?: number;
    totalSessions?: number;
  };
  authentication?: {
    emailVerified: boolean;
    emailVerifiedAt?: Date;
    passwordChangedAt?: Date;
  };
  profile?: {
    avatar?: string;
    bio?: string;
    timezone?: string;
    joinDate?: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: Date | null;
}

// Store atoms
const userAtom = atom<User | null>(null);
const tokensAtom = atom<AuthTokens | null>(null);
const isLoadingAtom = atom<boolean>(true);
const errorAtom = atom<string | null>(null);
const lastActivityAtom = atom<Date | null>(null);

// Computed stores
const isAuthenticatedAtom = computed([userAtom, tokensAtom], (user, tokens) => {
  return !!(user && tokens && tokens.accessToken);
});

const authStateAtom = computed(
  [userAtom, tokensAtom, isAuthenticatedAtom, isLoadingAtom, errorAtom, lastActivityAtom],
  (user, tokens, isAuthenticated, isLoading, error, lastActivity) => ({
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    lastActivity
  })
);

// Actions
const setUser = (user: User | null) => {
  userAtom.set(user);
  lastActivityAtom.set(new Date());

  if (user) {
    SecurityAuditor.logSecurityEvent(
      'USER_STATE_UPDATED',
      { userId: user.userId },
      'low'
    );
  }
};

const setTokens = (tokens: AuthTokens | null) => {
  tokensAtom.set(tokens);
  lastActivityAtom.set(new Date());
};

const setLoading = (isLoading: boolean) => {
  isLoadingAtom.set(isLoading);
};

const setError = (error: string | null) => {
  errorAtom.set(error);
  lastActivityAtom.set(new Date());
};

const updateLastActivity = () => {
  lastActivityAtom.set(new Date());
};

const clearAuth = () => {
  userAtom.set(null);
  tokensAtom.set(null);
  errorAtom.set(null);
  lastActivityAtom.set(new Date());

  SecurityAuditor.logSecurityEvent(
    'AUTH_STATE_CLEARED',
    {},
    'low'
  );
};

// Authentication actions
const login = async (credentials: {
  email: string;
  password: string;
  deviceInfo?: string;
}): Promise<boolean> => {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || 'Login failed';
      setError(errorMessage);
      setLoading(false);

      SecurityAuditor.logSecurityEvent(
        'LOGIN_FAILED',
        { email: credentials.email, error: errorMessage },
        'medium'
      );

      return false;
    }

    // Store tokens securely
    await SecureTokenStorage.storeAccessToken(
      data.data.accessToken,
      data.data.expiresIn / 1000
    );

    SecureTokenStorage.storeRefreshTokenReference(data.data.refreshToken);

    // Update store
    setUser(data.data.user);
    setTokens({
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      expiresIn: data.data.expiresIn,
      tokenType: 'Bearer'
    });

    setLoading(false);

    // Start automatic token refresh
    TokenRefreshManager.startAutoRefresh();

    SecurityAuditor.logSecurityEvent(
      'LOGIN_SUCCESS',
      { userId: data.data.user.userId, email: data.data.user.email },
      'low'
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    setError(errorMessage);
    setLoading(false);

    SecurityAuditor.logSecurityEvent(
      'LOGIN_ERROR',
      { error: errorMessage },
      'medium'
    );

    return false;
  }
};

const register = async (registerData: {
  email: string;
  username?: string;
  password: string;
  confirmPassword: string;
}): Promise<boolean> => {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || 'Registration failed';
      setError(errorMessage);
      setLoading(false);

      SecurityAuditor.logSecurityEvent(
        'REGISTRATION_FAILED',
        { email: registerData.email, error: errorMessage },
        'medium'
      );

      return false;
    }

    // Store tokens securely
    await SecureTokenStorage.storeAccessToken(
      data.data.tokens.accessToken,
      data.data.tokens.expiresIn / 1000
    );

    SecureTokenStorage.storeRefreshTokenReference(data.data.tokens.refreshToken);

    // Update store
    setUser(data.data.user);
    setTokens(data.data.tokens);

    setLoading(false);

    // Start automatic token refresh
    TokenRefreshManager.startAutoRefresh();

    SecurityAuditor.logSecurityEvent(
      'REGISTRATION_SUCCESS',
      { userId: data.data.user.userId, email: data.data.user.email },
      'low'
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    setError(errorMessage);
    setLoading(false);

    SecurityAuditor.logSecurityEvent(
      'REGISTRATION_ERROR',
      { error: errorMessage },
      'medium'
    );

    return false;
  }
};

const logout = async (): Promise<void> => {
  try {
    setLoading(true);

    // Call logout endpoint
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    // Clear local tokens
    SecureTokenStorage.clearTokens();

    // Stop automatic token refresh
    TokenRefreshManager.stopAutoRefresh();

    // Clear store
    clearAuth();

    setLoading(false);

    SecurityAuditor.logSecurityEvent(
      'LOGOUT_SUCCESS',
      {},
      'low'
    );
  } catch (error) {
    console.error('Logout error:', error);

    // Clear tokens anyway
    SecureTokenStorage.clearTokens();
    TokenRefreshManager.stopAutoRefresh();

    clearAuth();
    setLoading(false);

    SecurityAuditor.logSecurityEvent(
      'LOGOUT_ERROR',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'medium'
    );
  }
};

const refreshToken = async (): Promise<boolean> => {
  try {
    setLoading(true);
    setError(null);

    const newToken = await TokenRefreshManager.refreshAccessToken();

    if (newToken) {
      // Get current tokens
      const currentTokens = tokensAtom.get();
      if (currentTokens) {
        // Update with new access token
        const updatedTokens = {
          ...currentTokens,
          accessToken: newToken
        };
        setTokens(updatedTokens);

        // Store updated token securely
        await SecureTokenStorage.storeAccessToken(
          newToken,
          currentTokens.expiresIn / 1000
        );
      }

      setLoading(false);
      return true;
    }

    setLoading(false);
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    setError(errorMessage);
    setLoading(false);
    return false;
  }
};

const checkAuth = async (): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const isAuthenticated = await AuthStateManager.checkAuthentication();

    if (isAuthenticated) {
      // Get user info
      const token = await SecureTokenStorage.getAccessToken();
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.data);

          // Get token info
          const timeUntilExpiry = SecureTokenStorage.getTimeUntilExpiry();
          setTokens({
            accessToken: token,
            refreshToken: '', // We don't store refresh token in memory
            expiresIn: timeUntilExpiry,
            tokenType: 'Bearer'
          });
        }
      }
    } else {
      clearAuth();
    }

    setLoading(false);
  } catch (error) {
    console.error('Auth check error:', error);
    clearAuth();
    setLoading(false);
  }
};

// Initialize store
const initializeAuthStore = async (): Promise<() => void> => {
  // Check authentication status on app start
  await checkAuth();

  // Subscribe to authentication state changes
  const unsubscribe = AuthStateManager.subscribe((isAuthenticated) => {
    if (!isAuthenticated) {
      clearAuth();
    }
  });

  return unsubscribe;
};

// Export store and actions
export {
  // Store atoms
  userAtom,
  tokensAtom,
  isAuthenticatedAtom,
  isLoadingAtom,
  errorAtom,
  lastActivityAtom,
  authStateAtom,

  // Actions
  setUser,
  setTokens,
  setLoading,
  setError,
  clearAuth,
  login,
  register,
  logout,
  refreshToken,
  checkAuth,
  initializeAuthStore,

  // Types
  type User,
  type AuthTokens,
  type AuthState
};

// Default export for convenience
export default {
  // Atoms
  user: userAtom,
  tokens: tokensAtom,
  isAuthenticated: isAuthenticatedAtom,
  isLoading: isLoadingAtom,
  error: errorAtom,
  lastActivity: lastActivityAtom,
  authState: authStateAtom,

  // Actions
  setUser,
  setTokens,
  setLoading,
  setError,
  clearAuth,
  login,
  register,
  logout,
  refreshToken,
  checkAuth,
  initializeAuthStore
};