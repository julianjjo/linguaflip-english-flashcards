/**
 * Authentication Hook for LinguaFlip
 *
 * This hook provides authentication state management and methods
 * for React components to interact with the authentication system.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  SecureTokenStorage,
  TokenRefreshManager,
  AuthStateManager,
} from '../utils/tokenStorage';
import { SecurityAuditor } from '../utils/security';

interface User {
  userId: string;
  email?: string;
  username?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    audioEnabled: boolean;
    studyReminders: boolean;
  };
  statistics?: {
    totalCardsStudied: number;
    totalStudyTime: number;
    averageRecallRate: number;
    streakDays: number;
  };
  authentication?: {
    emailVerified: boolean;
    emailVerifiedAt?: Date;
    passwordChangedAt?: Date;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
  deviceInfo?: string;
}

interface RegisterData {
  email: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

interface AuthHookReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
}

/**
 * Main authentication hook
 */
export function useAuth(): AuthHookReturn {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * Update authentication state
   */
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Clear any authentication errors
   */
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  /**
   * Update user data
   */
  const updateUser = useCallback((userData: Partial<User>) => {
    setAuthState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null,
    }));
  }, []);

  /**
   * Login user
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      try {
        updateAuthState({ isLoading: true, error: null });

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
          updateAuthState({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
          });

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
          data.data.expiresIn / 1000 // Convert to seconds
        );

        // Store refresh token reference
        SecureTokenStorage.storeRefreshTokenReference(data.data.refreshToken);

        // Update authentication state
        updateAuthState({
          user: data.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Start automatic token refresh
        TokenRefreshManager.startAutoRefresh();

        SecurityAuditor.logSecurityEvent(
          'LOGIN_SUCCESS',
          { userId: data.data.user.userId, email: data.data.user.email },
          'low'
        );

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Login failed';
        updateAuthState({
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
          user: null,
        });

        SecurityAuditor.logSecurityEvent(
          'LOGIN_ERROR',
          { error: errorMessage },
          'medium'
        );

        return false;
      }
    },
    [updateAuthState]
  );

  /**
   * Register new user
   */
  const register = useCallback(
    async (registerData: RegisterData): Promise<boolean> => {
      try {
        updateAuthState({ isLoading: true, error: null });

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
          updateAuthState({
            isLoading: false,
            error: errorMessage,
          });

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

        SecureTokenStorage.storeRefreshTokenReference(
          data.data.tokens.refreshToken
        );

        // Update authentication state
        updateAuthState({
          user: data.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Start automatic token refresh
        TokenRefreshManager.startAutoRefresh();

        SecurityAuditor.logSecurityEvent(
          'REGISTRATION_SUCCESS',
          { userId: data.data.user.userId, email: data.data.user.email },
          'low'
        );

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Registration failed';
        updateAuthState({
          isLoading: false,
          error: errorMessage,
        });

        SecurityAuditor.logSecurityEvent(
          'REGISTRATION_ERROR',
          { error: errorMessage },
          'medium'
        );

        return false;
      }
    },
    [updateAuthState]
  );

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      updateAuthState({ isLoading: true });

      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear local tokens
      SecureTokenStorage.clearTokens();

      // Stop automatic token refresh
      TokenRefreshManager.stopAutoRefresh();

      // Update authentication state
      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      SecurityAuditor.logSecurityEvent(
        'LOGOUT_SUCCESS',
        { userId: authState.user?.userId },
        'low'
      );
    } catch (error) {
      console.error('Logout error:', error);

      // Clear tokens anyway
      SecureTokenStorage.clearTokens();
      TokenRefreshManager.stopAutoRefresh();

      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      SecurityAuditor.logSecurityEvent(
        'LOGOUT_ERROR',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'medium'
      );
    }
  }, [authState.user, updateAuthState]);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const newToken = await TokenRefreshManager.refreshAccessToken();

      if (newToken) {
        // Get updated user info
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          updateAuthState({
            user: data.data,
            isAuthenticated: true,
          });
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, [updateAuthState]);

  /**
   * Check authentication status
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true });

      const isAuthenticated = await AuthStateManager.checkAuthentication();

      if (isAuthenticated) {
        // Get user info
        const token = await SecureTokenStorage.getAccessToken();
        if (token) {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            updateAuthState({
              user: data.data,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
        }
      }

      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth check error:', error);
      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [updateAuthState]);

  /**
   * Initialize authentication
   */
  useEffect(() => {
    checkAuthStatus();

    // Subscribe to authentication state changes
    const unsubscribe = AuthStateManager.subscribe((isAuthenticated) => {
      if (!isAuthenticated) {
        updateAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  }, [checkAuthStatus, updateAuthState]);

  return {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    updateUser,
  };
}

/**
 * Hook for checking authentication status only
 */
export function useAuthStatus(): {
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const checkStatus = async () => {
      const isAuthenticated = await AuthStateManager.checkAuthentication();
      setAuthStatus({ isAuthenticated, isLoading: false });
    };

    checkStatus();

    const unsubscribe = AuthStateManager.subscribe((isAuthenticated) => {
      setAuthStatus({ isAuthenticated, isLoading: false });
    });

    return unsubscribe;
  }, []);

  return authStatus;
}

/**
 * Hook for protected routes
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading } = useAuthStatus();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook for getting current user
 */
export function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = await SecureTokenStorage.getAccessToken();
        if (token) {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.data);
            return;
          }
        }
        setUser(null);
      } catch (error) {
        console.error('Failed to get current user:', error);
        setUser(null);
      }
    };

    getCurrentUser();
  }, []);

  return user;
}

/**
 * Hook for token management
 */
export function useTokenManager() {
  const [tokenInfo, setTokenInfo] = useState({
    hasAccessToken: false,
    hasRefreshToken: false,
    timeUntilExpiry: 0,
    isExpired: true,
  });

  const updateTokenInfo = useCallback(async () => {
    const hasAccessToken = !!(await SecureTokenStorage.getAccessToken());
    const hasRefreshToken = SecureTokenStorage.hasRefreshToken();
    const timeUntilExpiry = SecureTokenStorage.getTimeUntilExpiry();
    const isExpired = SecureTokenStorage.isAccessTokenExpired();

    setTokenInfo({
      hasAccessToken,
      hasRefreshToken,
      timeUntilExpiry,
      isExpired,
    });
  }, []);

  useEffect(() => {
    updateTokenInfo();

    // Update token info periodically
    const interval = setInterval(updateTokenInfo, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [updateTokenInfo]);

  return {
    ...tokenInfo,
    refreshToken: TokenRefreshManager.refreshAccessToken,
    clearTokens: SecureTokenStorage.clearTokens,
  };
}
