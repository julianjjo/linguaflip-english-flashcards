import { defineMiddleware } from 'astro:middleware';
import { SecurityAuditor } from './utils/security';

// Define protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/study',
  '/settings',
  '/data',
  '/profile'
];

// Define admin routes that require admin privileges
const ADMIN_ROUTES = [
  '/admin'
];

// Define public routes that should redirect authenticated users
const PUBLIC_ONLY_ROUTES = [
  '/login',
  '/register'
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, redirect, locals } = context;
  const pathname = url.pathname;

  // Skip middleware for API routes (they handle auth themselves)
  if (pathname.startsWith('/api/')) {
    return next();
  }

  // Skip middleware for static assets
  if (pathname.startsWith('/_astro/') || 
      pathname.startsWith('/favicon') || 
      pathname.includes('.')) {
    return next();
  }

  // Get access token from cookies or Authorization header
  let accessToken: string | null = null;

  // First try Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7);
  }

  // If no bearer token, try to get from cookies
  if (!accessToken) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      accessToken = cookies.accessToken || null;
    }
  }
  
  // Try to verify the token if it exists
  let isAuthenticated = false;
  let user: {
    userId: string;
    email?: string;
    username?: string;
    role?: string;
    [key: string]: unknown;
  } | null = null;

  if (accessToken) {
    try {
      // Only verify JWT signature without database lookup
      const jwt = await import('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'linguaflip-jwt-secret-dev-2024';
      
      const decoded = jwt.default.verify(accessToken, jwtSecret) as {
        userId: string;
        email?: string;
        username?: string;
        role?: string;
        type: string;
        iat?: number;
        exp?: number;
      };
      
      if (decoded.type === 'access' && decoded.userId) {
        isAuthenticated = true;
        user = {
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username,
          role: decoded.role
        };
      }
    } catch (error) {
      // Silently handle invalid tokens - common during development
      console.warn('Invalid token in middleware, continuing without auth');
    }
  }

  // Set auth state in locals
  locals.isAuthenticated = isAuthenticated;
  locals.user = user;

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  const isAdminRoute = ADMIN_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  const isPublicOnlyRoute = PUBLIC_ONLY_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // Handle protected routes - for now just log, don't redirect
  if (isProtectedRoute || isAdminRoute) {
    if (!isAuthenticated) {
      console.log(`Access to protected route ${pathname} without auth - allowing for development`);
    }
  }

  // Continue to the requested page
  return next();
});

// Export types for use in pages
export interface AuthLocals {
  isAuthenticated: boolean;
  user?: {
    userId: string;
    email?: string;
    username?: string;
    role?: string;
    [key: string]: unknown;
  } | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace App {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Locals extends AuthLocals {}
  }
}