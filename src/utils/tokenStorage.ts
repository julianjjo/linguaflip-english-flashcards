/**
 * Secure Token Storage Utilities for LinguaFlip
 *
 * This module provides secure client-side token storage with encryption,
 * automatic refresh, and protection against XSS attacks.
 */

import { SecurityAuditor } from './security';

// Token storage configuration
const TOKEN_CONFIG = {
  accessTokenKey: 'linguaflip_access_token',
  refreshTokenKey: 'linguaflip_refresh_token',
  tokenExpiryKey: 'linguaflip_token_expiry',
  storagePrefix: 'linguaflip_secure_',
  encryptionKey: 'linguaflip_token_encryption_key', // In production, this should be environment-specific
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Secure token storage class
 */
export class SecureTokenStorage {
  private static encryptionKey = TOKEN_CONFIG.encryptionKey;
  private static isEncryptionEnabled = true;

  /**
   * Store access token securely
   */
  static async storeAccessToken(token: string, expiresIn: number): Promise<void> {
    try {
      const expiryTime = Date.now() + (expiresIn * 1000);

      // Encrypt token if encryption is enabled
      const encryptedToken = this.isEncryptionEnabled ?
        await this.encryptData(token) : token;

      // Store in localStorage with additional security measures
      localStorage.setItem(TOKEN_CONFIG.accessTokenKey, encryptedToken);
      localStorage.setItem(TOKEN_CONFIG.tokenExpiryKey, expiryTime.toString());

      // Store a checksum for integrity verification
      const checksum = await this.generateChecksum(token);
      localStorage.setItem(`${TOKEN_CONFIG.storagePrefix}checksum`, checksum);

      SecurityAuditor.logSecurityEvent(
        'ACCESS_TOKEN_STORED',
        { hasToken: !!token, expiresIn },
        'low'
      );

    } catch (error) {
      console.error('Failed to store access token:', error);
      SecurityAuditor.logSecurityEvent(
        'TOKEN_STORAGE_ERROR',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'medium'
      );
      throw new Error('Failed to securely store access token');
    }
  }

  /**
   * Retrieve access token securely
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      const encryptedToken = localStorage.getItem(TOKEN_CONFIG.accessTokenKey);
      const expiryTime = localStorage.getItem(TOKEN_CONFIG.tokenExpiryKey);
      const storedChecksum = localStorage.getItem(`${TOKEN_CONFIG.storagePrefix}checksum`);

      if (!encryptedToken || !expiryTime) {
        return null;
      }

      // Check if token has expired
      const expiryTimestamp = parseInt(expiryTime);
      if (Date.now() > expiryTimestamp) {
        // Token expired, clean up
        this.clearTokens();
        return null;
      }

      // Decrypt token
      const token = this.isEncryptionEnabled ?
        await this.decryptData(encryptedToken) : encryptedToken;

      // Verify integrity
      if (storedChecksum) {
        const calculatedChecksum = await this.generateChecksum(token);
        if (calculatedChecksum !== storedChecksum) {
          // Integrity check failed, possible tampering
          SecurityAuditor.logSecurityEvent(
            'TOKEN_INTEGRITY_CHECK_FAILED',
            {},
            'high'
          );
          this.clearTokens();
          return null;
        }
      }

      return token;
    } catch (error) {
      console.error('Failed to retrieve access token:', error);
      // Clear potentially corrupted tokens
      this.clearTokens();
      return null;
    }
  }

  /**
   * Store refresh token securely (in httpOnly cookie, but keep a reference)
   */
  static storeRefreshTokenReference(token: string): void {
    try {
      // We don't store the actual refresh token in localStorage
      // It's stored in httpOnly cookies by the server
      // We just keep a reference that it exists
      const tokenHash = this.hashToken(token);
      localStorage.setItem(TOKEN_CONFIG.refreshTokenKey, tokenHash);

      SecurityAuditor.logSecurityEvent(
        'REFRESH_TOKEN_REFERENCE_STORED',
        { hasToken: !!token },
        'low'
      );
    } catch (error) {
      console.error('Failed to store refresh token reference:', error);
    }
  }

  /**
   * Check if refresh token exists
   */
  static hasRefreshToken(): boolean {
    return !!localStorage.getItem(TOKEN_CONFIG.refreshTokenKey);
  }

  /**
   * Clear all stored tokens
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(TOKEN_CONFIG.accessTokenKey);
      localStorage.removeItem(TOKEN_CONFIG.refreshTokenKey);
      localStorage.removeItem(TOKEN_CONFIG.tokenExpiryKey);
      localStorage.removeItem(`${TOKEN_CONFIG.storagePrefix}checksum`);

      // Clear any other secure storage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(TOKEN_CONFIG.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });

      SecurityAuditor.logSecurityEvent(
        'TOKENS_CLEARED',
        {},
        'low'
      );
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if access token is expired
   */
  static isAccessTokenExpired(): boolean {
    try {
      const expiryTime = localStorage.getItem(TOKEN_CONFIG.tokenExpiryKey);
      if (!expiryTime) return true;

      const expiryTimestamp = parseInt(expiryTime);
      return Date.now() > expiryTimestamp;
    } catch {
      return true;
    }
  }

  /**
   * Get time until token expiry in milliseconds
   */
  static getTimeUntilExpiry(): number {
    try {
      const expiryTime = localStorage.getItem(TOKEN_CONFIG.tokenExpiryKey);
      if (!expiryTime) return 0;

      const expiryTimestamp = parseInt(expiryTime);
      return Math.max(0, expiryTimestamp - Date.now());
    } catch {
      return 0;
    }
  }

  /**
   * Encrypt data using Web Crypto API
   */
  private static async encryptData(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const key = await this.getEncryptionKey();

      // Generate a random IV that we can store alongside the ciphertext
      const initializationVector = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: initializationVector },
        key,
        dataBuffer
      );

      const encryptedBytes = new Uint8Array(encrypted);

      // Combine IV and encrypted data so it can be recovered during decryption
      const combined = new Uint8Array(initializationVector.length + encryptedBytes.length);
      combined.set(initializationVector);
      combined.set(encryptedBytes, initializationVector.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.warn('Encryption failed, falling back to plain storage:', error);
      this.isEncryptionEnabled = false;
      return data;
    }
  }

  /**
   * Decrypt data using Web Crypto API
   */
  private static async decryptData(encryptedData: string): Promise<string> {
    try {
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      if (combined.length <= 12) {
        throw new Error('Invalid encrypted data');
      }

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const key = await this.getEncryptionKey();

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.warn('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Get encryption key from password
   */
  private static async getEncryptionKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.encryptionKey),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('linguaflip_salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate checksum for data integrity
   */
  private static async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash token for reference storage
   */
  private static hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

/**
 * Token refresh manager
 */
export class TokenRefreshManager {
  private static refreshPromise: Promise<string> | null = null;
  private static refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  /**
   * Start automatic token refresh
   */
  static startAutoRefresh(): void {
    this.stopAutoRefresh(); // Clear any existing timer

    const checkAndRefresh = async () => {
      try {
        const timeUntilExpiry = SecureTokenStorage.getTimeUntilExpiry();
        const hasAccessToken = !!(await SecureTokenStorage.getAccessToken());
        const hasRefreshToken = SecureTokenStorage.hasRefreshToken();

        console.log('[TOKEN_DEBUG] Auto-refresh check:', {
          timeUntilExpiry,
          hasAccessToken,
          hasRefreshToken,
          refreshPromise: !!this.refreshPromise,
          timestamp: new Date().toISOString()
        });

        if (timeUntilExpiry > 0 && timeUntilExpiry <= this.REFRESH_THRESHOLD) {
          console.log('[TOKEN_DEBUG] Token near expiry, attempting refresh:', {
            timeUntilExpiry,
            threshold: this.REFRESH_THRESHOLD
          });
          await this.refreshAccessToken();
        } else if (timeUntilExpiry <= 0) {
          console.log('[TOKEN_DEBUG] Token expired, clearing tokens');
          SecureTokenStorage.clearTokens();
        }
      } catch (error) {
        console.error('[TOKEN_DEBUG] Auto refresh failed:', error);
        SecurityAuditor.logSecurityEvent(
          'AUTO_REFRESH_ERROR',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'medium'
        );
      }

      // Schedule next check
      this.refreshTimer = setTimeout(checkAndRefresh, 60000); // Check every minute
    };

    // Start checking immediately
    console.log('[TOKEN_DEBUG] Starting auto-refresh timer');
    checkAndRefresh();
  }

  /**
   * Stop automatic token refresh
   */
  static stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      console.log('[TOKEN_DEBUG] Refresh already in progress, returning existing promise');
      return this.refreshPromise;
    }

    console.log('[TOKEN_DEBUG] Starting token refresh process');
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      console.log('[TOKEN_DEBUG] Token refresh successful');
      return newToken;
    } catch (error) {
      console.error('[TOKEN_DEBUG] Token refresh failed:', error);
      throw error;
    } finally {
      console.log('[TOKEN_DEBUG] Clearing refresh promise');
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private static async performTokenRefresh(): Promise<string> {
    try {
      console.log('[TOKEN_DEBUG] Making refresh request to server');

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include httpOnly cookies
      });

      console.log('[TOKEN_DEBUG] Refresh response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[TOKEN_DEBUG] Refresh token expired (401), clearing tokens');
          // Refresh token is invalid, user needs to login again
          SecureTokenStorage.clearTokens();
          throw new Error('Refresh token expired');
        }
        console.log('[TOKEN_DEBUG] Refresh failed with status:', response.status);
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[TOKEN_DEBUG] Refresh response data:', {
        success: data.success,
        hasAccessToken: !!data.data?.accessToken,
        hasRefreshToken: !!data.data?.refreshToken
      });

      if (data.success && data.data.accessToken) {
        // Store the new access token
        await SecureTokenStorage.storeAccessToken(
          data.data.accessToken,
          data.data.expiresIn / 1000 // Convert to seconds
        );

        SecurityAuditor.logSecurityEvent(
          'ACCESS_TOKEN_REFRESHED',
          {},
          'low'
        );

        return data.data.accessToken;
      } else {
        console.error('[TOKEN_DEBUG] Invalid refresh response structure:', data);
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('[TOKEN_DEBUG] Token refresh failed:', error);
      SecurityAuditor.logSecurityEvent(
        'TOKEN_REFRESH_FAILED',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'medium'
      );
      throw error;
    }
  }
}

/**
 * Authentication state manager
 */
export class AuthStateManager {
  private static listeners: Array<(isAuthenticated: boolean) => void> = [];
  private static isAuthenticated = false;

  /**
   * Check if user is authenticated
   */
  static async checkAuthentication(): Promise<boolean> {
    try {
      console.log('[AUTH_DEBUG] Checking authentication status');
      const token = await SecureTokenStorage.getAccessToken();

      if (!token) {
        console.log('[AUTH_DEBUG] No access token found');
        this.setAuthenticated(false);
        return false;
      }

      console.log('[AUTH_DEBUG] Verifying token with server');
      // Verify token with server
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const isAuthenticated = response.ok;
      console.log('[AUTH_DEBUG] Server verification result:', {
        status: response.status,
        isAuthenticated,
        currentAuthState: this.isAuthenticated
      });

      this.setAuthenticated(isAuthenticated);

      if (!isAuthenticated) {
        console.log('[AUTH_DEBUG] Token verification failed, clearing tokens');
        SecureTokenStorage.clearTokens();
      }

      return isAuthenticated;
    } catch (error) {
      console.error('[AUTH_DEBUG] Authentication check failed:', error);
      this.setAuthenticated(false);
      SecureTokenStorage.clearTokens();
      return false;
    }
  }

  /**
   * Set authentication state
   */
  static setAuthenticated(isAuthenticated: boolean): void {
    if (this.isAuthenticated !== isAuthenticated) {
      console.log('[AUTH_DEBUG] Authentication state changing:', {
        from: this.isAuthenticated,
        to: isAuthenticated,
        timestamp: new Date().toISOString()
      });
      this.isAuthenticated = isAuthenticated;
      this.notifyListeners(isAuthenticated);
    } else {
      console.log('[AUTH_DEBUG] Authentication state unchanged:', isAuthenticated);
    }
  }

  /**
   * Get current authentication state
   */
  static getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Subscribe to authentication state changes
   */
  static subscribe(listener: (isAuthenticated: boolean) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state change
   */
  private static notifyListeners(isAuthenticated: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isAuthenticated);
      } catch (error) {
        console.error('Auth state listener error:', error);
      }
    });
  }
}

/**
 * Initialize secure token storage
 */
export function initializeSecureTokenStorage(): void {
  console.log('[INIT_DEBUG] Initializing secure token storage');

  // Start automatic token refresh
  TokenRefreshManager.startAutoRefresh();

  // Check authentication on page load
  AuthStateManager.checkAuthentication();

  // Handle visibility change to refresh tokens when tab becomes active
  document.addEventListener('visibilitychange', () => {
    console.log('[VISIBILITY_DEBUG] Tab visibility changed:', {
      hidden: document.hidden,
      timestamp: new Date().toISOString()
    });

    if (!document.hidden) {
      console.log('[VISIBILITY_DEBUG] Tab became active, checking authentication');
      AuthStateManager.checkAuthentication();
    }
  });

  // Handle storage events (for multi-tab synchronization)
  window.addEventListener('storage', (event) => {
    console.log('[STORAGE_DEBUG] Storage event detected:', {
      key: event.key,
      oldValue: event.oldValue ? 'present' : 'null',
      newValue: event.newValue ? 'present' : 'null',
      url: event.url,
      timestamp: new Date().toISOString()
    });

    if (event.key?.startsWith('linguaflip')) {
      console.log('[STORAGE_DEBUG] LinguaFlip storage change, checking authentication');
      AuthStateManager.checkAuthentication();
    }
  });

  SecurityAuditor.logSecurityEvent(
    'SECURE_TOKEN_STORAGE_INITIALIZED',
    {},
    'low'
  );
}

// Export utilities
export {
  SecureTokenStorage as TokenStorage,
  TokenRefreshManager as TokenManager,
  AuthStateManager as AuthManager
};