import { defineMiddleware } from 'astro:middleware';
import { verifyAccessToken } from './services/auth';
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

  // Get client IP for logging
  const clientIP = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown';

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

  // If no bearer token, try to get from localStorage (client-side)
  // For SSR, we'll rely on the auth state being passed from client
  
  // Try to verify the token if it exists
  let isAuthenticated = false;
  let user: any = null;

  if (accessToken) {
    try {
      const tokenResult = await verifyAccessToken(accessToken);
      if (tokenResult.success && tokenResult.data) {
        isAuthenticated = true;
        user = tokenResult.data;
        
        // Store user info in locals for use in pages
        locals.user = user;
        locals.isAuthenticated = true;
      }
    } catch (error) {
      console.warn('Token verification failed in middleware:', error);
      SecurityAuditor.logSecurityEvent(
        'MIDDLEWARE_TOKEN_VERIFICATION_FAILED',
        { pathname, clientIP, error: error instanceof Error ? error.message : 'Unknown' },
        'medium'
      );
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

  // Handle protected routes
  if (isProtectedRoute || isAdminRoute) {
    if (!isAuthenticated) {
      SecurityAuditor.logSecurityEvent(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        { pathname, clientIP },
        'medium'
      );
      
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(pathname + url.search);
      return redirect(`/login?returnUrl=${returnUrl}`);
    }

    // Check admin privileges for admin routes
    if (isAdminRoute && user?.role !== 'admin') {
      SecurityAuditor.logSecurityEvent(
        'ADMIN_ACCESS_DENIED',
        { pathname, clientIP, userId: user?.userId },
        'high'
      );
      
      return redirect('/dashboard');
    }

    // Log successful access to protected routes
    SecurityAuditor.logSecurityEvent(
      'PROTECTED_ROUTE_ACCESS',
      { pathname, clientIP, userId: user?.userId },
      'low'
    );
  }

  // Handle public-only routes (redirect authenticated users)
  if (isPublicOnlyRoute && isAuthenticated) {
    // Get return URL from query params
    const returnUrl = url.searchParams.get('returnUrl');
    const redirectTo = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard';
    
    SecurityAuditor.logSecurityEvent(
      'AUTHENTICATED_USER_REDIRECTED',
      { pathname, redirectTo, clientIP, userId: user?.userId },
      'low'
    );
    
    return redirect(redirectTo);
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
    [key: string]: any;
  } | null;
}

declare global {
  namespace App {
    interface Locals extends AuthLocals {}
  }
}