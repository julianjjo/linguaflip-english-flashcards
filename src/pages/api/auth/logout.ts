import type { APIRoute } from 'astro';
import { logout } from '../../../services/auth';
import { SecurityAuditor } from '../../../utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    let accessToken: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    // Get refresh token from cookies
    const cookieHeader = request.headers.get('Cookie');
    let refreshToken: string | null = null;

    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      refreshToken = cookies.refreshToken || null;
    }

    // Get client IP for logging
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Attempt logout
    await logout(accessToken, refreshToken, clientIP);

    // Create response
    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Clear refresh token cookie
    response.headers.set(
      'Set-Cookie',
      'refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    );

    // Log security event
    SecurityAuditor.logSecurityEvent(
      'LOGOUT_API_SUCCESS',
      {
        clientIP,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      },
      'low'
    );

    return response;
  } catch (error) {
    console.error('Logout API error:', error);

    // Log security event
    SecurityAuditor.logSecurityEvent(
      'LOGOUT_API_ERROR',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'medium'
    );

    // Even if logout fails on server, we should clear the client-side cookie
    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out (client-side cleanup)',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Clear refresh token cookie
    response.headers.set(
      'Set-Cookie',
      'refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    );

    return response;
  }
};
