import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email?: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

interface AuthResult {
  success: boolean;
  data?: {
    userId: string;
    email?: string;
  };
  error?: string;
}

const AUTH_CONFIG = {
  jwtSecret:
    process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
};

/**
 * Extract token from Authorization header or cookies
 */
function extractToken(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookies as fallback
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    return cookies.accessToken || null;
  }

  return null;
}

/**
 * Verify JWT token for Astro API routes
 */
export async function verifyToken(request: Request): Promise<AuthResult> {
  try {
    const token = extractToken(request);

    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided',
      };
    }

    // Verify token
    const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret) as JWTPayload;

    if (!decoded || !decoded.userId) {
      return {
        success: false,
        error: 'Invalid token payload',
      };
    }

    return {
      success: true,
      data: {
        userId: decoded.userId,
        email: decoded.email,
      },
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid token',
      };
    }

    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Token expired',
      };
    }

    return {
      success: false,
      error: 'Authentication error',
    };
  }
}

/**
 * Get user ID from request without throwing errors
 */
export async function getUserId(request: Request): Promise<string | null> {
  const result = await verifyToken(request);
  return result.success ? result.data!.userId : null;
}
