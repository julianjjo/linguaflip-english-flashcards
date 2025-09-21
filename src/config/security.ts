/**
 * Centralized Security Configuration
 * 
 * This module provides environment-specific security settings for authentication,
 * rate limiting, and other security-related configurations.
 */

interface SecurityConfig {
  rateLimit: {
    login: number;
    register: number;
    windowMs: number;
  };
  auth: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    jwtSecret: string;
    jwtRefreshSecret: string;
  };
  environment: {
    isDevelopment: boolean;
    isTest: boolean;
    isProduction: boolean;
  };
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

export const SECURITY_CONFIG: SecurityConfig = {
  rateLimit: {
    login: parseInt(process.env.RATE_LIMIT_LOGIN || (isDevelopment || isTest ? '100' : '5')),
    register: parseInt(process.env.RATE_LIMIT_REGISTER || (isDevelopment || isTest ? '100' : '3')),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000') // 1 hour
  },
  auth: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || (isDevelopment ? '10' : isTest ? '8' : '12')),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || (isDevelopment || isTest ? '100' : '5')),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || (isDevelopment ? '5' : isTest ? '1' : '30')) * 60 * 1000,
    jwtSecret: process.env.JWT_SECRET || (isDevelopment ? 'linguaflip-jwt-secret-dev-2024' : isTest ? 'test_jwt_secret_placeholder' : 'change-in-production'),
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (isDevelopment ? 'linguaflip-refresh-secret-dev-2024' : isTest ? 'test_refresh_secret_placeholder' : 'change-in-production')
  },
  environment: {
    isDevelopment,
    isTest,
    isProduction
  }
};

/**
 * Environment-specific rate limit configuration
 * @param operationType The type of operation (login, register, etc.)
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(operationType: 'login' | 'register') {
  return {
    maxAttempts: SECURITY_CONFIG.rateLimit[operationType],
    windowMs: SECURITY_CONFIG.rateLimit.windowMs,
    message: `Too many ${operationType} attempts. Please try again later.`
  };
}

/**
 * Get authentication configuration
 * @returns Authentication configuration
 */
export function getAuthConfig() {
  return SECURITY_CONFIG.auth;
}

/**
 * Check if current environment allows higher rate limits
 * @returns Boolean indicating if development-level limits should be applied
 */
export function isDevelopmentEnvironment(): boolean {
  return SECURITY_CONFIG.environment.isDevelopment || SECURITY_CONFIG.environment.isTest;
}

/**
 * Validate security configuration on startup
 */
export function validateSecurityConfig(): void {
  const config = SECURITY_CONFIG;
  
  // Validate JWT secrets are not defaults in production
  if (config.environment.isProduction) {
    if (config.auth.jwtSecret === 'change-in-production' || 
        config.auth.jwtRefreshSecret === 'change-in-production') {
      throw new Error('JWT secrets must be configured for production environment');
    }
    
    if (config.auth.bcryptRounds < 12) {
      console.warn('Warning: bcrypt rounds should be at least 12 in production');
    }
    
    if (config.rateLimit.login > 10 || config.rateLimit.register > 5) {
      console.warn('Warning: Rate limits may be too permissive for production');
    }
  }
  
  console.log(`Security config loaded for ${process.env.NODE_ENV} environment:`, {
    rateLimits: config.rateLimit,
    bcryptRounds: config.auth.bcryptRounds,
    maxLoginAttempts: config.auth.maxLoginAttempts,
    lockoutDuration: config.auth.lockoutDuration / 1000 / 60 + ' minutes'
  });
}

export default SECURITY_CONFIG;