import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';

class SecurityAuditor {
  static {
    this.auditLog = [];
  }
  static logSecurityEvent(action, details, severity = "low") {
    this.auditLog.push({
      timestamp: /* @__PURE__ */ new Date(),
      action,
      details,
      severity
    });
    if (this.auditLog.length > 1e3) {
      this.auditLog = this.auditLog.slice(-1e3);
    }
    if (severity === "high") {
      console.error(`[SECURITY AUDIT - HIGH] ${action}:`, details);
    }
  }
  static getAuditLog() {
    return [...this.auditLog];
  }
  static getHighSeverityEvents() {
    return this.auditLog.filter((entry) => entry.severity === "high");
  }
  static clearAuditLog() {
    this.auditLog = [];
  }
}
class InputSanitizer {
  // Sanitize MongoDB query objects
  static sanitizeQuery(query) {
    if (typeof query !== "object" || query === null) {
      return query;
    }
    const sanitized = { ...query };
    const dangerousOperators = [
      "$where",
      "$function",
      "$accumulator",
      "$function"
    ];
    for (const op of dangerousOperators) {
      if (sanitized[op]) {
        SecurityAuditor.logSecurityEvent(
          "DANGEROUS_OPERATOR_DETECTED",
          { operator: op, query: JSON.stringify(query) },
          "high"
        );
        delete sanitized[op];
      }
    }
    for (const key in sanitized) {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeQuery(
          sanitized[key]
        );
      }
    }
    return sanitized;
  }
  // Validate and sanitize string inputs
  static sanitizeString(input, maxLength = 1e3) {
    if (typeof input !== "string") {
      return "";
    }
    let sanitized = input.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
    sanitized = sanitized.trim();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  }
  // Validate ObjectId format
  static isValidObjectId(id) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }
}
class SecurityError extends Error {
  constructor(message, code = "SECURITY_ERROR") {
    super(message);
    this.name = "SecurityError";
    this.code = code;
  }
}
const rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(identifier, maxRequests = 50, windowMs = 6e4) {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  if (!record || now > record.resetTime) {
    const newRecord = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newRecord.resetTime
    };
  }
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime
  };
}
function validateGeminiApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }
  const geminiKeyRegex = /^AIza[0-9A-Za-z_-]{35}$/;
  return geminiKeyRegex.test(apiKey);
}
function sanitizeTextInput(input) {
  if (typeof input !== "string") {
    return "";
  }
  let sanitized = input.replace(/\p{Cc}/gu, "");
  sanitized = sanitized.replace(/<[^>]*>/g, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");
  sanitized = sanitized.replace(/\s+/g, " ").trim();
  return sanitized;
}
function loadSecurityConfig() {
  const config = {};
  if (process.env.GEMINI_API_KEY) {
    if (!validateGeminiApiKey(process.env.GEMINI_API_KEY)) {
      throw new SecurityError(
        "Invalid Gemini API key format in environment",
        "INVALID_API_KEY_FORMAT"
      );
    }
    config.geminiApiKey = process.env.GEMINI_API_KEY;
  }
  if (process.env.RATE_LIMIT_MAX_REQUESTS) {
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
    if (!isNaN(maxRequests) && maxRequests > 0) {
      config.rateLimitMaxRequests = maxRequests;
    }
  }
  if (process.env.RATE_LIMIT_WINDOW_MS) {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
    if (!isNaN(windowMs) && windowMs > 0) {
      config.rateLimitWindowMs = windowMs;
    }
  }
  if (process.env.ENCRYPTION_SECRET) {
    config.encryptionSecret = process.env.ENCRYPTION_SECRET;
  }
  return config;
}

const DEFAULT_DATABASE_FILENAME = "linguaflip-d1.sqlite";
class CloudflareD1Client {
  constructor() {
    this.remoteStatus = "unknown";
    this.localDb = null;
    this.schemaInitialized = false;
    this.remoteUrl = process.env.D1_URL ? process.env.D1_URL.replace(/\/$/, "") : null;
    this.apiKey = process.env.D1_API_KEY || null;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || null;
    this.databaseId = process.env.D1_DATABASE_ID || null;
    if (!this.remoteUrl && this.accountId && this.databaseId) {
      this.remoteUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
    }
  }
  async execute(sql, params = []) {
    if (this.shouldUseRemote()) {
      try {
        const result = await this.executeRemote(sql, params);
        this.remoteStatus = "available";
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Remote D1 query failed (${message}). Falling back to local SQLite.`
        );
        this.remoteStatus = "failed";
        this.ensureLocalDatabase();
      }
    }
    this.ensureLocalDatabase();
    return this.executeLocal(sql, params);
  }
  async executeBatch(queries) {
    const results = [];
    if (this.shouldUseRemote()) {
      try {
        const remoteResult = await this.executeRemoteBatch(queries);
        this.remoteStatus = "available";
        return remoteResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Remote D1 batch failed (${message}). Falling back to local SQLite.`
        );
        this.remoteStatus = "failed";
        this.ensureLocalDatabase();
      }
    }
    this.ensureLocalDatabase();
    const db = this.localDb;
    const transaction = db.transaction(
      (batchedQueries) => {
        for (const { sql, params } of batchedQueries) {
          const result = this.executeLocal(sql, params || []);
          results.push(result);
          if (!result.success) {
            throw new Error(result.error || "Unknown SQLite error");
          }
        }
      }
    );
    try {
      transaction(queries);
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [{ success: false, error: message }];
    }
  }
  isRemote() {
    return this.remoteStatus === "available";
  }
  async close() {
    if (this.localDb) {
      this.localDb.close();
      this.localDb = null;
    }
  }
  async initializeSchema(schemaStatements) {
    if (this.schemaInitialized) {
      return;
    }
    for (const statement of schemaStatements) {
      const result = await this.execute(statement);
      if (!result.success) {
        throw new Error(result.error || "Failed to initialize D1 schema");
      }
    }
    this.schemaInitialized = true;
  }
  shouldUseRemote() {
    if (!this.remoteUrl || !this.apiKey) {
      return false;
    }
    if (this.remoteStatus === "failed") {
      return false;
    }
    return true;
  }
  async executeRemote(sql, params) {
    const payload = Array.isArray(sql) ? { sql, params } : { sql, params };
    const response = await fetch(`${this.remoteUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Cloudflare D1 responded with ${response.status}: ${text}`
      );
    }
    const data = await response.json();
    if (Array.isArray(data?.result)) {
      const primary = data.result[0];
      return {
        success: true,
        results: primary?.results || [],
        meta: primary?.meta
      };
    }
    if (data?.result?.results) {
      return {
        success: true,
        results: data.result.results,
        meta: data.result.meta
      };
    }
    return {
      success: data?.success ?? false,
      results: Array.isArray(data?.result) ? data.result : [],
      meta: data?.result?.meta,
      error: data?.errors?.length ? JSON.stringify(data.errors) : void 0
    };
  }
  async executeRemoteBatch(queries) {
    const payload = queries.map((query) => ({
      sql: query.sql,
      params: query.params || []
    }));
    const response = await fetch(`${this.remoteUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Cloudflare D1 responded with ${response.status}: ${text}`
      );
    }
    const data = await response.json();
    if (Array.isArray(data?.result)) {
      return data.result.map((entry) => ({
        success: true,
        results: entry?.results || [],
        meta: entry?.meta
      }));
    }
    return [
      {
        success: data?.success ?? false,
        results: data?.result?.results || [],
        meta: data?.result?.meta,
        error: data?.errors?.length ? JSON.stringify(data.errors) : void 0
      }
    ];
  }
  executeLocal(sql, params) {
    if (!this.localDb) {
      throw new Error("Local SQLite database not initialized");
    }
    const normalizedParams = params.map((param) => this.normalizeParam(param));
    const trimmed = sql.trim().toLowerCase();
    const statement = this.localDb.prepare(sql);
    if (trimmed.startsWith("select") || trimmed.startsWith("with") || trimmed.startsWith("pragma")) {
      const rows = statement.all(...normalizedParams);
      return { success: true, results: rows };
    }
    const info = statement.run(...normalizedParams);
    return {
      success: true,
      meta: {
        changes: info.changes,
        lastInsertRowid: Number(info.lastInsertRowid || 0)
      }
    };
  }
  ensureLocalDatabase() {
    if (this.localDb) {
      return;
    }
    const cacheDir = path.join(process.cwd(), ".d1-cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const dbPath = path.join(cacheDir, DEFAULT_DATABASE_FILENAME);
    this.localDb = new Database(dbPath);
  }
  normalizeParam(param) {
    if (param === void 0) {
      return null;
    }
    if (param instanceof Date) {
      return param.toISOString();
    }
    if (Array.isArray(param)) {
      return JSON.stringify(param);
    }
    return param;
  }
}
const d1Client = new CloudflareD1Client();

const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";
process.env.NODE_ENV === "production";
const SECURITY_CONFIG = {
  rateLimit: {
    login: parseInt(
      process.env.RATE_LIMIT_LOGIN || (isDevelopment || isTest ? "100" : "5")
    ),
    register: parseInt(
      process.env.RATE_LIMIT_REGISTER || (isDevelopment || isTest ? "100" : "3")
    ),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "3600000")
    // 1 hour
  },
  auth: {
    bcryptRounds: parseInt(
      process.env.BCRYPT_ROUNDS || (isDevelopment ? "10" : isTest ? "8" : "12")
    ),
    maxLoginAttempts: parseInt(
      process.env.MAX_LOGIN_ATTEMPTS || (isDevelopment || isTest ? "100" : "5")
    ),
    lockoutDuration: parseInt(
      process.env.LOCKOUT_DURATION_MINUTES || (isDevelopment ? "5" : isTest ? "1" : "30")
    ) * 60 * 1e3,
    jwtSecret: process.env.JWT_SECRET || (isDevelopment ? "linguaflip-jwt-secret-dev-2024" : isTest ? "test_jwt_secret_placeholder" : "change-in-production"),
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (isDevelopment ? "linguaflip-refresh-secret-dev-2024" : isTest ? "test_refresh_secret_placeholder" : "change-in-production")
  }};
function getRateLimitConfig(operationType) {
  return {
    maxAttempts: SECURITY_CONFIG.rateLimit[operationType],
    windowMs: SECURITY_CONFIG.rateLimit.windowMs,
    message: `Too many ${operationType} attempts. Please try again later.`
  };
}
function getAuthConfig() {
  return SECURITY_CONFIG.auth;
}

const TOKEN_CONFIG = {
  accessTokenKey: "linguaflip_access_token",
  refreshTokenKey: "linguaflip_refresh_token",
  tokenExpiryKey: "linguaflip_token_expiry",
  storagePrefix: "linguaflip_secure_",
  encryptionKey: "linguaflip_token_encryption_key",
  // In production, this should be environment-specific
  maxRetries: 3,
  retryDelay: 1e3
  // 1 second
};
class SecureTokenStorage {
  static {
    this.encryptionKey = TOKEN_CONFIG.encryptionKey;
  }
  static {
    this.isEncryptionEnabled = true;
  }
  /**
   * Store access token securely
   */
  static async storeAccessToken(token, expiresIn) {
    try {
      const expiryTime = Date.now() + expiresIn * 1e3;
      const encryptedToken = this.isEncryptionEnabled ? await this.encryptData(token) : token;
      localStorage.setItem(TOKEN_CONFIG.accessTokenKey, encryptedToken);
      localStorage.setItem(TOKEN_CONFIG.tokenExpiryKey, expiryTime.toString());
      const checksum = await this.generateChecksum(token);
      localStorage.setItem(`${TOKEN_CONFIG.storagePrefix}checksum`, checksum);
      SecurityAuditor.logSecurityEvent(
        "ACCESS_TOKEN_STORED",
        { hasToken: !!token, expiresIn },
        "low"
      );
    } catch (error) {
      console.error("Failed to store access token:", error);
      SecurityAuditor.logSecurityEvent(
        "TOKEN_STORAGE_ERROR",
        { error: error instanceof Error ? error.message : "Unknown error" },
        "medium"
      );
      throw new Error("Failed to securely store access token");
    }
  }
  /**
   * Retrieve access token securely
   */
  static async getAccessToken() {
    try {
      const encryptedToken = localStorage.getItem(TOKEN_CONFIG.accessTokenKey);
      const expiryTime = localStorage.getItem(TOKEN_CONFIG.tokenExpiryKey);
      const storedChecksum = localStorage.getItem(
        `${TOKEN_CONFIG.storagePrefix}checksum`
      );
      if (!encryptedToken || !expiryTime) {
        return null;
      }
      const expiryTimestamp = parseInt(expiryTime);
      if (Date.now() > expiryTimestamp) {
        this.clearTokens();
        return null;
      }
      const token = this.isEncryptionEnabled ? await this.decryptData(encryptedToken) : encryptedToken;
      if (storedChecksum) {
        const calculatedChecksum = await this.generateChecksum(token);
        if (calculatedChecksum !== storedChecksum) {
          SecurityAuditor.logSecurityEvent(
            "TOKEN_INTEGRITY_CHECK_FAILED",
            {},
            "high"
          );
          this.clearTokens();
          return null;
        }
      }
      return token;
    } catch (error) {
      console.error("Failed to retrieve access token:", error);
      this.clearTokens();
      return null;
    }
  }
  /**
   * Store refresh token securely (in httpOnly cookie, but keep a reference)
   */
  static storeRefreshTokenReference(token) {
    try {
      const tokenHash = this.hashToken(token);
      localStorage.setItem(TOKEN_CONFIG.refreshTokenKey, tokenHash);
      SecurityAuditor.logSecurityEvent(
        "REFRESH_TOKEN_REFERENCE_STORED",
        { hasToken: !!token },
        "low"
      );
    } catch (error) {
      console.error("Failed to store refresh token reference:", error);
    }
  }
  /**
   * Check if refresh token exists
   */
  static hasRefreshToken() {
    return !!localStorage.getItem(TOKEN_CONFIG.refreshTokenKey);
  }
  /**
   * Clear all stored tokens
   */
  static clearTokens() {
    try {
      localStorage.removeItem(TOKEN_CONFIG.accessTokenKey);
      localStorage.removeItem(TOKEN_CONFIG.refreshTokenKey);
      localStorage.removeItem(TOKEN_CONFIG.tokenExpiryKey);
      localStorage.removeItem(`${TOKEN_CONFIG.storagePrefix}checksum`);
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(TOKEN_CONFIG.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
      SecurityAuditor.logSecurityEvent("TOKENS_CLEARED", {}, "low");
    } catch (error) {
      console.error("Failed to clear tokens:", error);
    }
  }
  /**
   * Check if access token is expired
   */
  static isAccessTokenExpired() {
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
  static getTimeUntilExpiry() {
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
  static async encryptData(data) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const key = await this.getEncryptionKey();
      const initializationVector = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initializationVector },
        key,
        dataBuffer
      );
      const encryptedBytes = new Uint8Array(encrypted);
      const combined = new Uint8Array(
        initializationVector.length + encryptedBytes.length
      );
      combined.set(initializationVector);
      combined.set(encryptedBytes, initializationVector.length);
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.warn("Encryption failed, falling back to plain storage:", error);
      this.isEncryptionEnabled = false;
      return data;
    }
  }
  /**
   * Decrypt data using Web Crypto API
   */
  static async decryptData(encryptedData) {
    try {
      const combined = Uint8Array.from(
        atob(encryptedData),
        (c) => c.charCodeAt(0)
      );
      if (combined.length <= 12) {
        throw new Error("Invalid encrypted data");
      }
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const key = await this.getEncryptionKey();
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.warn("Decryption failed:", error);
      throw new Error("Failed to decrypt data");
    }
  }
  /**
   * Get encryption key from password
   */
  static async getEncryptionKey() {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.encryptionKey),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("linguaflip_salt"),
        iterations: 1e5,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  /**
   * Generate checksum for data integrity
   */
  static async generateChecksum(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  /**
   * Hash token for reference storage
   */
  static hashToken(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}
class TokenRefreshManager {
  static {
    this.refreshPromise = null;
  }
  static {
    this.refreshTimer = null;
  }
  static {
    this.REFRESH_THRESHOLD = 5 * 60 * 1e3;
  }
  // 5 minutes before expiry
  /**
   * Start automatic token refresh
   */
  static startAutoRefresh() {
    this.stopAutoRefresh();
    const checkAndRefresh = async () => {
      try {
        const timeUntilExpiry = SecureTokenStorage.getTimeUntilExpiry();
        const hasAccessToken = !!await SecureTokenStorage.getAccessToken();
        const hasRefreshToken = SecureTokenStorage.hasRefreshToken();
        console.log("[TOKEN_DEBUG] Auto-refresh check:", {
          timeUntilExpiry,
          hasAccessToken,
          hasRefreshToken,
          refreshPromise: !!this.refreshPromise,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (timeUntilExpiry > 0 && timeUntilExpiry <= this.REFRESH_THRESHOLD) {
          console.log("[TOKEN_DEBUG] Token near expiry, attempting refresh:", {
            timeUntilExpiry,
            threshold: this.REFRESH_THRESHOLD
          });
          await this.refreshAccessToken();
        } else if (timeUntilExpiry <= 0) {
          console.log("[TOKEN_DEBUG] Token expired, clearing tokens");
          SecureTokenStorage.clearTokens();
        }
      } catch (error) {
        console.error("[TOKEN_DEBUG] Auto refresh failed:", error);
        SecurityAuditor.logSecurityEvent(
          "AUTO_REFRESH_ERROR",
          { error: error instanceof Error ? error.message : "Unknown error" },
          "medium"
        );
      }
      this.refreshTimer = setTimeout(checkAndRefresh, 6e4);
    };
    console.log("[TOKEN_DEBUG] Starting auto-refresh timer");
    checkAndRefresh();
  }
  /**
   * Stop automatic token refresh
   */
  static stopAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  /**
   * Refresh access token
   */
  static async refreshAccessToken() {
    if (this.refreshPromise) {
      console.log(
        "[TOKEN_DEBUG] Refresh already in progress, returning existing promise"
      );
      return this.refreshPromise;
    }
    console.log("[TOKEN_DEBUG] Starting token refresh process");
    this.refreshPromise = this.performTokenRefresh();
    try {
      const newToken = await this.refreshPromise;
      console.log("[TOKEN_DEBUG] Token refresh successful");
      return newToken;
    } catch (error) {
      console.error("[TOKEN_DEBUG] Token refresh failed:", error);
      throw error;
    } finally {
      console.log("[TOKEN_DEBUG] Clearing refresh promise");
      this.refreshPromise = null;
    }
  }
  /**
   * Perform the actual token refresh
   */
  static async performTokenRefresh() {
    try {
      console.log("[TOKEN_DEBUG] Making refresh request to server");
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
        // Include httpOnly cookies
      });
      console.log("[TOKEN_DEBUG] Refresh response status:", response.status);
      if (!response.ok) {
        if (response.status === 401) {
          console.log(
            "[TOKEN_DEBUG] Refresh token expired (401), clearing tokens"
          );
          SecureTokenStorage.clearTokens();
          throw new Error("Refresh token expired");
        }
        console.log(
          "[TOKEN_DEBUG] Refresh failed with status:",
          response.status
        );
        throw new Error(`Token refresh failed: ${response.status}`);
      }
      const data = await response.json();
      console.log("[TOKEN_DEBUG] Refresh response data:", {
        success: data.success,
        hasAccessToken: !!data.data?.accessToken,
        hasRefreshToken: !!data.data?.refreshToken
      });
      if (data.success && data.data.accessToken) {
        await SecureTokenStorage.storeAccessToken(
          data.data.accessToken,
          data.data.expiresIn / 1e3
          // Convert to seconds
        );
        SecurityAuditor.logSecurityEvent("ACCESS_TOKEN_REFRESHED", {}, "low");
        return data.data.accessToken;
      } else {
        console.error(
          "[TOKEN_DEBUG] Invalid refresh response structure:",
          data
        );
        throw new Error("Invalid refresh response");
      }
    } catch (error) {
      console.error("[TOKEN_DEBUG] Token refresh failed:", error);
      SecurityAuditor.logSecurityEvent(
        "TOKEN_REFRESH_FAILED",
        { error: error instanceof Error ? error.message : "Unknown error" },
        "medium"
      );
      throw error;
    }
  }
}
class AuthStateManager {
  static {
    this.listeners = [];
  }
  static {
    this.isAuthenticated = false;
  }
  /**
   * Check if user is authenticated
   */
  static async checkAuthentication() {
    try {
      console.log("[AUTH_DEBUG] Checking authentication status");
      const token = await SecureTokenStorage.getAccessToken();
      if (!token) {
        console.log("[AUTH_DEBUG] No access token found");
        this.setAuthenticated(false);
        return false;
      }
      console.log("[AUTH_DEBUG] Verifying token with server");
      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const isAuthenticated = response.ok;
      console.log("[AUTH_DEBUG] Server verification result:", {
        status: response.status,
        isAuthenticated,
        currentAuthState: this.isAuthenticated
      });
      this.setAuthenticated(isAuthenticated);
      if (!isAuthenticated) {
        console.log("[AUTH_DEBUG] Token verification failed, clearing tokens");
        SecureTokenStorage.clearTokens();
      }
      return isAuthenticated;
    } catch (error) {
      console.error("[AUTH_DEBUG] Authentication check failed:", error);
      this.setAuthenticated(false);
      SecureTokenStorage.clearTokens();
      return false;
    }
  }
  /**
   * Set authentication state
   */
  static setAuthenticated(isAuthenticated) {
    if (this.isAuthenticated !== isAuthenticated) {
      console.log("[AUTH_DEBUG] Authentication state changing:", {
        from: this.isAuthenticated,
        to: isAuthenticated,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      this.isAuthenticated = isAuthenticated;
      this.notifyListeners(isAuthenticated);
    } else {
      console.log(
        "[AUTH_DEBUG] Authentication state unchanged:",
        isAuthenticated
      );
    }
  }
  /**
   * Get current authentication state
   */
  static getIsAuthenticated() {
    return this.isAuthenticated;
  }
  /**
   * Subscribe to authentication state changes
   */
  static subscribe(listener) {
    this.listeners.push(listener);
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
  static notifyListeners(isAuthenticated) {
    this.listeners.forEach((listener) => {
      try {
        listener(isAuthenticated);
      } catch (error) {
        console.error("Auth state listener error:", error);
      }
    });
  }
}

const { jwtSecret } = getAuthConfig();
const AUTH_CONFIG = {
  jwtSecret: jwtSecret
};
function extractToken(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [rawKey, ...rawValue] = cookie.trim().split("=");
        if (!rawKey) {
          return acc;
        }
        const value = rawValue.join("=");
        acc[rawKey] = value ? decodeURIComponent(value) : "";
        return acc;
      },
      {}
    );
    return cookies.accessToken || null;
  }
  return null;
}
async function verifyToken(request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return {
        success: false,
        error: "No authentication token provided"
      };
    }
    const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret);
    if (!decoded || !decoded.userId) {
      return {
        success: false,
        error: "Invalid token payload"
      };
    }
    return {
      success: true,
      data: {
        userId: decoded.userId,
        email: decoded.email
      }
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: "Invalid token"
      };
    }
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: "Token expired"
      };
    }
    return {
      success: false,
      error: "Authentication error"
    };
  }
}

export { AuthStateManager as A, InputSanitizer as I, SecureTokenStorage as S, TokenRefreshManager as T, SecurityAuditor as a, SecurityError as b, checkRateLimit as c, getAuthConfig as d, validateGeminiApiKey as e, d1Client as f, getRateLimitConfig as g, loadSecurityConfig as l, sanitizeTextInput as s, verifyToken as v };
