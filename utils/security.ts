/**
 * Security utilities for API key validation and input sanitization
 */

export interface SecurityConfig {
  geminiApiKey: string;
  maxPromptLength: number;
  maxRetries: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validates Gemini API key format
 * Gemini API keys start with 'AIza' and are 39 characters long
 */
export function validateGeminiApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Gemini API keys follow the pattern: AIza[39 chars total]
  const geminiKeyPattern = /^AIza[0-9A-Za-z_-]{35}$/;
  return geminiKeyPattern.test(apiKey);
}

/**
 * Sanitizes text input to prevent injection attacks
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeTextInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Escape HTML entities
    .replace(/[&<>"']/g, (char) => {
      const entityMap: Record<string, string> = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#x27;'
      };
      return entityMap[char] || char;
    })
    // Remove potential script injection patterns
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Validates prompt length and content
 */
export function validatePrompt(prompt: string, maxLength: number = 10000): { isValid: boolean; error?: string } {
  if (!prompt || typeof prompt !== 'string') {
    return { isValid: false, error: 'Prompt must be a non-empty string' };
  }

  if (prompt.length > maxLength) {
    return { isValid: false, error: `Prompt exceeds maximum length of ${maxLength} characters` };
  }

  // Check for potentially malicious patterns
  const maliciousPatterns = [
    /\b(eval|exec|system|shell_exec|passthru|popen|proc_open)\b/i,
    /\b(unlink|rmdir|chmod|chown)\b/i,
    /\b(include|require|include_once|require_once)\b/i,
    /<\?php/i,
    /<%.*%>/i
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(prompt)) {
      return { isValid: false, error: 'Prompt contains potentially malicious content' };
    }
  }

  return { isValid: true };
}

/**
 * Loads and validates security configuration from environment
 */
export function loadSecurityConfig(): SecurityConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new SecurityError(
      'GEMINI_API_KEY environment variable is not set. Please configure it securely.',
      'MISSING_API_KEY'
    );
  }

  if (!validateGeminiApiKey(geminiApiKey)) {
    throw new SecurityError(
      'Invalid GEMINI_API_KEY format. Please check your API key.',
      'INVALID_API_KEY_FORMAT'
    );
  }

  return {
    geminiApiKey,
    maxPromptLength: parseInt(process.env.MAX_PROMPT_LENGTH || '10000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10)
  };
}

/**
 * Rate limiting store (in-memory for now, should be replaced with Redis in production)
 */
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  checkLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const key = identifier;
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const record = this.store.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return 0;
    }
    return Math.max(0, record.count);
  }

  logAttempt(identifier: string, allowed: boolean): void {
    const timestamp = new Date().toISOString();
    const status = allowed ? 'ALLOWED' : 'BLOCKED';

    console.log(`[SECURITY] Rate limit ${status} for ${identifier} at ${timestamp}`);

    if (!allowed) {
      console.warn(`[SECURITY] Suspicious activity detected: ${identifier} exceeded rate limit`);
    }
  }
}

export const rateLimitStore = new RateLimitStore();

/**
 * Checks if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remainingRequests: number } {
  const allowed = rateLimitStore.checkLimit(identifier, maxRequests, windowMs);
  const remainingRequests = rateLimitStore.getRemainingRequests(identifier);

  rateLimitStore.logAttempt(identifier, allowed);

  return { allowed, remainingRequests };
}