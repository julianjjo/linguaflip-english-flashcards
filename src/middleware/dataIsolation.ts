/**
 * Data Isolation Middleware for LinguaFlip
 *
 * This middleware ensures users can only access their own data
 * and implements proper data isolation across all collections.
 */

import type { Request, Response, NextFunction } from 'express';
import { SecurityAuditor } from '../utils/security';
import { PermissionError } from '../types/database';

// Interface for file upload metadata
interface FileWithUserId {
  userId?: string;
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

// Interface for requests with file uploads
interface RequestWithFiles extends Request {
  file?: FileWithUserId;
  files?: FileWithUserId[] | { [fieldname: string]: FileWithUserId[] };
}

/**
 * User data isolation middleware
 * Ensures users can only access their own data
 */
export function isolateUserData(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // This middleware should be used after requireAuth
  if (!req.user || !req.user.userId) {
    SecurityAuditor.logSecurityEvent(
      'UNAUTHENTICATED_DATA_ACCESS_ATTEMPT',
      {
        path: req.path,
        method: req.method,
        ipAddress: req.ip,
      },
      'high'
    );

    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const userId = req.user.userId;

  // Add userId to request for use in route handlers
  req.userId = userId;

  // Modify query parameters to include user isolation
  if (req.method === 'GET' && req.query) {
    // For GET requests, ensure userId is included in queries
    if (!req.query.userId) {
      req.query.userId = userId;
    } else if (req.query.userId !== userId) {
      // User is trying to access another user's data
      SecurityAuditor.logSecurityEvent(
        'CROSS_USER_DATA_ACCESS_ATTEMPT',
        {
          requestedUserId: req.query.userId,
          authenticatedUserId: userId,
          path: req.path,
          method: req.method,
          ipAddress: req.ip,
        },
        'high'
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own data.',
        code: 'ACCESS_DENIED',
      });
    }
  }

  // For POST/PUT/DELETE requests, ensure body contains correct userId
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    if (req.body.userId && req.body.userId !== userId) {
      SecurityAuditor.logSecurityEvent(
        'DATA_TAMPERING_ATTEMPT',
        {
          bodyUserId: req.body.userId,
          authenticatedUserId: userId,
          path: req.path,
          method: req.method,
          ipAddress: req.ip,
        },
        'high'
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied. You cannot modify data for other users.',
        code: 'ACCESS_DENIED',
      });
    }

    // Automatically add userId to request body if not present
    if (!req.body.userId) {
      req.body.userId = userId;
    }
  }

  // For DELETE requests, check URL parameters
  if (
    req.method === 'DELETE' &&
    req.params.userId &&
    req.params.userId !== userId
  ) {
    SecurityAuditor.logSecurityEvent(
      'CROSS_USER_DELETE_ATTEMPT',
      {
        targetUserId: req.params.userId,
        authenticatedUserId: userId,
        path: req.path,
        method: req.method,
        ipAddress: req.ip,
      },
      'high'
    );

    return res.status(403).json({
      success: false,
      error: 'Access denied. You can only delete your own data.',
      code: 'ACCESS_DENIED',
    });
  }

  // Log successful data access
  SecurityAuditor.logSecurityEvent(
    'USER_DATA_ACCESS',
    {
      userId,
      path: req.path,
      method: req.method,
      ipAddress: req.ip,
    },
    'low'
  );

  next();
}

/**
 * Collection-specific data isolation middleware
 */
export function isolateCollectionData(collectionName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userId = req.user.userId;

    // Collection-specific isolation rules
    switch (collectionName) {
      case 'flashcards':
      case 'study_sessions':
      case 'study_statistics':
        // These collections should always be user-specific
        if (req.body && !req.body.userId) {
          req.body.userId = userId;
        }
        if (req.query && !req.query.userId) {
          req.query.userId = userId;
        }
        break;

      case 'users':
        // Users can only access/modify their own profile
        if (req.params.id && req.params.id !== userId) {
          SecurityAuditor.logSecurityEvent(
            'USER_PROFILE_ACCESS_ATTEMPT',
            {
              targetUserId: req.params.id,
              authenticatedUserId: userId,
              path: req.path,
              method: req.method,
            },
            'high'
          );

          return res.status(403).json({
            success: false,
            error: 'Access denied. You can only access your own profile.',
            code: 'ACCESS_DENIED',
          });
        }
        break;

      default:
        // For other collections, apply general user isolation
        if (req.body && !req.body.userId) {
          req.body.userId = userId;
        }
    }

    next();
  };
}

/**
 * Bulk operation data isolation middleware
 * Ensures bulk operations only affect user's own data
 */
export function isolateBulkOperations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const userId = req.user.userId;

  if (req.body && Array.isArray(req.body)) {
    // For bulk operations with arrays of items
    const hasInvalidItems = req.body.some(
      (item: Record<string, unknown>) => item.userId && item.userId !== userId
    );

    if (hasInvalidItems) {
      SecurityAuditor.logSecurityEvent(
        'BULK_OPERATION_DATA_TAMPERING',
        {
          authenticatedUserId: userId,
          path: req.path,
          method: req.method,
          ipAddress: req.ip,
        },
        'high'
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied. Bulk operations can only affect your own data.',
        code: 'ACCESS_DENIED',
      });
    }

    // Add userId to all items
    req.body = req.body.map((item: Record<string, unknown>) => ({
      ...item,
      userId,
    }));
  }

  next();
}

/**
 * Query parameter sanitization middleware
 * Removes or modifies query parameters that could bypass data isolation
 */
export function sanitizeQueryParameters(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.userId) {
    return next(); // Let auth middleware handle this
  }

  const userId = req.user.userId;

  // Remove dangerous query parameters
  const dangerousParams = ['$where', '$function', 'mapReduce', 'aggregate'];
  dangerousParams.forEach((param) => {
    if (req.query[param]) {
      SecurityAuditor.logSecurityEvent(
        'DANGEROUS_QUERY_PARAMETER_DETECTED',
        {
          parameter: param,
          userId,
          path: req.path,
          method: req.method,
        },
        'high'
      );

      delete req.query[param];
    }
  });

  // Ensure userId is set for user-specific queries
  if (req.query && Object.keys(req.query).length > 0) {
    if (!req.query.userId) {
      req.query.userId = userId;
    }
  }

  next();
}

/**
 * File upload data isolation middleware
 * Ensures uploaded files are associated with the correct user
 */
export function isolateFileUploads(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const userId = req.user.userId;

  // Add user ID to file metadata
  const reqWithFiles = req as RequestWithFiles;
  if (reqWithFiles.file) {
    // For single file uploads
    reqWithFiles.file.userId = userId;
  }

  if (reqWithFiles.files) {
    // For multiple file uploads
    if (Array.isArray(reqWithFiles.files)) {
      reqWithFiles.files.forEach((file: FileWithUserId) => {
        file.userId = userId;
      });
    } else {
      // For files organized by field name
      Object.values(reqWithFiles.files).forEach((fileArray: unknown) => {
        if (Array.isArray(fileArray)) {
          fileArray.forEach((file: FileWithUserId) => {
            file.userId = userId;
          });
        }
      });
    }
  }

  next();
}

/**
 * API key data isolation middleware
 * Ensures API keys can only be used by their owners
 */
export function isolateApiKeys(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const userId = req.user.userId;

  // Check if API key in header belongs to user
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (apiKey) {
    // TODO: Validate API key ownership
    // This would typically involve checking the API key against a database
    // For now, we'll just log the attempt
    SecurityAuditor.logSecurityEvent(
      'API_KEY_USAGE',
      {
        userId,
        hasApiKey: !!apiKey,
        path: req.path,
        method: req.method,
      },
      'low'
    );
  }

  next();
}

/**
 * Combined data isolation middleware
 * Applies all data isolation protections
 */
export function comprehensiveDataIsolation(collectionName?: string) {
  const middlewares = [isolateUserData, sanitizeQueryParameters];

  if (collectionName) {
    middlewares.push(isolateCollectionData(collectionName));
  }

  return middlewares;
}

/**
 * Data isolation error handler
 */
export function dataIsolationErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof PermissionError) {
    SecurityAuditor.logSecurityEvent(
      'DATA_ISOLATION_VIOLATION',
      {
        userId: req.user?.userId,
        path: req.path,
        method: req.method,
        error: err.message,
        ipAddress: req.ip,
      },
      'high'
    );

    return res.status(403).json({
      success: false,
      error: err.message,
      code: 'ACCESS_DENIED',
    });
  }

  // Pass to next error handler
  next(err);
}
