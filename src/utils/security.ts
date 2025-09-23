// Security utilities for LinguaFlip Cloudflare D1 connection

import crypto from 'crypto';

// Environment variable validation
export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate Cloudflare D1 environment variables
export function validateD1Environment(): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const endpoint = process.env.D1_URL;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.D1_DATABASE_ID;
  const apiKey = process.env.D1_API_KEY;

  if (!endpoint && (!accountId || !databaseId)) {
    errors.push(
      'D1_URL or the pair CLOUDFLARE_ACCOUNT_ID and D1_DATABASE_ID must be provided'
    );
  }

  if (!apiKey) {
    errors.push('D1_API_KEY environment variable is required');
  } else if (apiKey.toLowerCase() === 'token') {
    warnings.push(
      'D1_API_KEY appears to be a placeholder token. Replace it with a valid API token.'
    );
  }

  if (endpoint && !endpoint.startsWith('https://')) {
    warnings.push('D1_URL should use https:// for secure communication');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function buildD1Endpoint(): string {
  const endpoint = process.env.D1_URL;
  if (endpoint) {
    return endpoint.replace(/\/$/, '');
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.D1_DATABASE_ID;

  if (!accountId || !databaseId) {
    throw new Error(
      'Either D1_URL or CLOUDFLARE_ACCOUNT_ID and D1_DATABASE_ID must be set'
    );
  }

  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
}

export function sanitizeD1Url(url: string): string {
  if (!url) return '';
  return url.replace(/([?&]api_key=)[^&]+/i, '$1****');
}

// Environment variable encryption/decryption utilities (for sensitive data)
export class EnvironmentEncryptor {
  private static algorithm = 'aes-256-cbc';
  private static keyLength = 32;
  private static ivLength = 16;

  // Generate encryption key from environment variable
  private static getEncryptionKey(): Buffer {
    const secret =
      process.env.ENCRYPTION_SECRET || 'default-secret-key-for-development';
    return Buffer.from(
      secret.padEnd(this.keyLength, '0').slice(0, this.keyLength)
    );
  }

  // Encrypt sensitive data
  static encrypt(text: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive data
  static decrypt(encryptedText: string): string {
    const key = this.getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Security audit utilities
export class SecurityAuditor {
  private static auditLog: Array<{
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
    severity: 'low' | 'medium' | 'high';
  }> = [];

  static logSecurityEvent(
    action: string,
    details: Record<string, unknown>,
    severity: 'low' | 'medium' | 'high' = 'low'
  ): void {
    this.auditLog.push({
      timestamp: new Date(),
      action,
      details,
      severity,
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Log high severity events immediately
    if (severity === 'high') {
      console.error(`[SECURITY AUDIT - HIGH] ${action}:`, details);
    }
  }

  static getAuditLog(): typeof this.auditLog {
    return [...this.auditLog];
  }

  static getHighSeverityEvents(): typeof this.auditLog {
    return this.auditLog.filter((entry) => entry.severity === 'high');
  }

  static clearAuditLog(): void {
    this.auditLog = [];
  }
}

// Rate limiting for database operations
export class DatabaseRateLimiter {
  private static operationCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private static readonly WINDOW_MS = 60000; // 1 minute
  private static readonly MAX_OPERATIONS = 1000; // Max operations per minute

  static checkRateLimit(
    operationType: string,
    identifier: string = 'global'
  ): boolean {
    const key = `${operationType}:${identifier}`;
    const now = Date.now();
    const record = this.operationCounts.get(key);

    if (!record || now > record.resetTime) {
      // Reset or initialize counter
      this.operationCounts.set(key, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    if (record.count >= this.MAX_OPERATIONS) {
      SecurityAuditor.logSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        { operationType, identifier, count: record.count },
        'high'
      );
      return false;
    }

    record.count++;
    return true;
  }

  static getRemainingOperations(
    operationType: string,
    identifier: string = 'global'
  ): number {
    const key = `${operationType}:${identifier}`;
    const record = this.operationCounts.get(key);

    if (!record || Date.now() > record.resetTime) {
      return this.MAX_OPERATIONS;
    }

    return Math.max(0, this.MAX_OPERATIONS - record.count);
  }
}

// Input sanitization utilities
export class InputSanitizer {
  // Sanitize MongoDB query objects
  static sanitizeQuery(
    query: Record<string, unknown>
  ): Record<string, unknown> {
    if (typeof query !== 'object' || query === null) {
      return query;
    }

    const sanitized = { ...query };

    // Remove potentially dangerous operators
    const dangerousOperators = [
      '$where',
      '$function',
      '$accumulator',
      '$function',
    ];
    for (const op of dangerousOperators) {
      if (sanitized[op]) {
        SecurityAuditor.logSecurityEvent(
          'DANGEROUS_OPERATOR_DETECTED',
          { operator: op, query: JSON.stringify(query) },
          'high'
        );
        delete sanitized[op];
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeQuery(
          sanitized[key] as Record<string, unknown>
        );
      }
    }

    return sanitized;
  }

  // Validate and sanitize string inputs
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove null bytes and other dangerous characters
    // eslint-disable-next-line no-control-regex
    let sanitized = input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Trim and limit length
    sanitized = sanitized.trim();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  // Validate ObjectId format
  static isValidObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }
}

// Additional security utilities for Gemini TTS

// Rate limiting interface
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Custom SecurityError class
export class SecurityError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
  }
}

// Rate limiting for API calls
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 50,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // Reset or initialize counter
    const newRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// Validate Gemini API key format
export function validateGeminiApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Gemini API keys typically start with 'AIza' and are 39 characters long
  const geminiKeyRegex = /^AIza[0-9A-Za-z_-]{35}$/;
  return geminiKeyRegex.test(apiKey);
}

// Sanitize text input for TTS
export function sanitizeTextInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove control characters, null bytes, and other dangerous characters
  let sanitized = input.replace(/\p{Cc}/gu, '');

  // Remove potentially dangerous HTML/XML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove script-related content
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

// Security configuration loader
export interface SecurityConfig {
  geminiApiKey?: string;
  rateLimitMaxRequests?: number;
  rateLimitWindowMs?: number;
  encryptionSecret?: string;
}

export function loadSecurityConfig(): SecurityConfig {
  const config: SecurityConfig = {};

  // Load API key from environment
  if (process.env.GEMINI_API_KEY) {
    if (!validateGeminiApiKey(process.env.GEMINI_API_KEY)) {
      throw new SecurityError(
        'Invalid Gemini API key format in environment',
        'INVALID_API_KEY_FORMAT'
      );
    }
    config.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  // Load rate limiting configuration
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

  // Load encryption secret
  if (process.env.ENCRYPTION_SECRET) {
    config.encryptionSecret = process.env.ENCRYPTION_SECRET;
  }

  return config;
}

// Security utilities are exported as class declarations above
