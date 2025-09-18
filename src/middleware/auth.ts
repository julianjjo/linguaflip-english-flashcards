/**
 * Authentication Middleware for LinguaFlip API
 *
 * This middleware provides JWT token validation and user authentication
 * for API endpoints with different protection levels.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SecurityAuditor } from '../utils/security';
import { PermissionError, ValidationError } from '../types/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
        type: 'access';
      };
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  }
}

// Authentication configuration
const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
};

/**
 * Extract token from Authorization header
 */
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Extract client information from request
 */
function extractClientInfo(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    forwardedFor: req.get('X-Forwarded-For'),
    realIP: req.get('X-Real-IP'),
  };
}

/**
 * Authentication middleware - requires valid JWT token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      SecurityAuditor.logSecurityEvent(
        'MISSING_AUTH_TOKEN',
        { path: req.path, method: req.method },
        'low'
      );
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // Verify token
    const decoded = (jwt.verify as any)(token, AUTH_CONFIG.jwtSecret);

    if (!decoded || !decoded.userId) {
      SecurityAuditor.logSecurityEvent(
        'INVALID_AUTH_TOKEN',
        { path: req.path, method: req.method, tokenPreview: token.substring(0, 10) + '...' },
        'medium'
      );
      return res.status(401).json({
        success: false,
        error: 'Invalid access token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Attach user to request
    req.user = decoded;
    req.userId = decoded.userId;

    // Attach client info
    const clientInfo = extractClientInfo(req);
    req.ipAddress = clientInfo.ipAddress;
    req.userAgent = clientInfo.userAgent;

    // Log successful authentication
    SecurityAuditor.logSecurityEvent(
      'AUTH_SUCCESS',
      {
        userId: decoded.userId,
        path: req.path,
        method: req.method,
        ipAddress: clientInfo.ipAddress
      },
      'low'
    );

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      SecurityAuditor.logSecurityEvent(
        'JWT_VERIFICATION_FAILED',
        {
          path: req.path,
          method: req.method,
          error: error.message
        },
        'medium'
      );
      return res.status(401).json({
        success: false,
        error: 'Invalid access token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      SecurityAuditor.logSecurityEvent(
        'TOKEN_EXPIRED',
        {
          path: req.path,
          method: req.method
        },
        'low'
      );
      return res.status(401).json({
        success: false,
        error: 'Access token expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }

    SecurityAuditor.logSecurityEvent(
      'AUTH_MIDDLEWARE_ERROR',
      {
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      'high'
    );

    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Optional authentication middleware - doesn't require token but validates if present
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      // No token present, continue without authentication
      const clientInfo = extractClientInfo(req);
      req.ipAddress = clientInfo.ipAddress;
      req.userAgent = clientInfo.userAgent;
      return next();
    }

    // Verify token if present
    const decoded = (jwt.verify as any)(token, AUTH_CONFIG.jwtSecret);

    if (decoded && decoded.userId) {
      req.user = decoded;
      req.userId = decoded.userId;
    }

    // Attach client info
    const clientInfo = extractClientInfo(req);
    req.ipAddress = clientInfo.ipAddress;
    req.userAgent = clientInfo.userAgent;

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    // Just continue without authentication
    const clientInfo = extractClientInfo(req);
    req.ipAddress = clientInfo.ipAddress;
    req.userAgent = clientInfo.userAgent;
    next();
  }
}

/**
 * Admin authentication middleware - requires admin privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First check if user is authenticated
  requireAuth(req, res, (err?: any) => {
    if (err || !req.user) {
      return; // Error already handled by requireAuth
    }

    // TODO: Implement admin role checking
    // For now, just pass through - in production you'd check user roles/permissions
    next();
  });
}

/**
 * User ownership middleware - ensures user can only access their own data
 */
export function requireOwnership(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, (err?: any) => {
    if (err || !req.user) {
      return; // Error already handled by requireAuth
    }

    const requestedUserId = req.params.userId || req.params.id;
    const authenticatedUserId = req.user.userId;

    if (requestedUserId !== authenticatedUserId) {
      SecurityAuditor.logSecurityEvent(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        {
          requestedUserId,
          authenticatedUserId,
          path: req.path,
          method: req.method,
          ipAddress: req.ipAddress
        },
        'high'
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own data.',
        code: 'ACCESS_DENIED'
      });
    }

    next();
  });
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export function authRateLimit(req: Request, res: Response, next: NextFunction) {
  const clientInfo = extractClientInfo(req);
  const identifier = clientInfo.ipAddress;

  // Use the existing rate limiter from security utils
  const { DatabaseRateLimiter } = require('../utils/security');

  if (!DatabaseRateLimiter.checkRateLimit('auth', identifier)) {
    SecurityAuditor.logSecurityEvent(
      'RATE_LIMIT_EXCEEDED',
      {
        identifier,
        path: req.path,
        method: req.method,
        ipAddress: clientInfo.ipAddress
      },
      'medium'
    );

    return res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60 // seconds
    });
  }

  next();
}

/**
 * CORS middleware for authentication endpoints
 */
export function authCors(req: Request, res: Response, next: NextFunction) {
  // Set CORS headers for authentication endpoints
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}

/**
 * Security headers middleware
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // Set security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Request logging middleware for authentication endpoints
 */
export function authLogging(req: Request, res: Response, next: NextFunction) {
  const clientInfo = extractClientInfo(req);
  const startTime = Date.now();

  // Log request
  SecurityAuditor.logSecurityEvent(
    'AUTH_REQUEST',
    {
      method: req.method,
      path: req.path,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      hasAuth: !!req.headers.authorization
    },
    'low'
  );

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    SecurityAuditor.logSecurityEvent(
      'AUTH_RESPONSE',
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ipAddress: clientInfo.ipAddress,
        userId: req.user?.userId
      },
      'low'
    );
  });

  next();
}

/**
 * Combined authentication middleware with all security features
 */
export function secureAuth(required: boolean = true) {
  const middlewares = [
    securityHeaders,
    authCors,
    authLogging,
    authRateLimit
  ];

  if (required) {
    middlewares.push(requireAuth);
  } else {
    middlewares.push(optionalAuth);
  }

  return middlewares;
}

/**
 * Authentication error handler
 */
export function authErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof PermissionError) {
    SecurityAuditor.logSecurityEvent(
      'PERMISSION_DENIED',
      {
        userId: req.user?.userId,
        path: req.path,
        method: req.method,
        error: err.message
      },
      'medium'
    );

    return res.status(403).json({
      success: false,
      error: err.message,
      code: 'PERMISSION_DENIED'
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'VALIDATION_ERROR'
    });
  }

  // Pass to next error handler
  next(err);
}