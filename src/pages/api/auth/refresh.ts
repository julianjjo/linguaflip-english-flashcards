import type { APIRoute } from 'astro';
import { refreshAccessToken } from '../../../services/auth';
import { SecurityAuditor } from '../../../utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get refresh token from cookies
    const cookieHeader = request.headers.get('Cookie');
    let refreshToken: string | null = null;

    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      refreshToken = cookies.refreshToken || null;
    }

    if (!refreshToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Refresh token not found'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get client IP for logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Attempt token refresh
    const result = await refreshAccessToken(refreshToken, clientIP);

    if (!result.success) {
      // Clear invalid refresh token
      const response = new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Token refresh failed'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      response.headers.set(
        'Set-Cookie',
        'refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
      );

      return response;
    }

    // Create response with new tokens
    const response = new Response(
      JSON.stringify({
        success: true,
        data: {
          accessToken: result.data?.accessToken,
          expiresIn: result.data?.expiresIn
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Update refresh token cookie if a new one was provided
    if (result.data?.refreshToken) {
      response.headers.set(
        'Set-Cookie',
        `refreshToken=${result.data.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      );
    }

    // Log security event
    SecurityAuditor.logSecurityEvent(
      'TOKEN_REFRESH_SUCCESS',
      { clientIP },
      'low'
    );

    return response;

  } catch (error) {
    console.error('Token refresh API error:', error);

    // Log security event
    SecurityAuditor.logSecurityEvent(
      'TOKEN_REFRESH_ERROR',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'medium'
    );

    // Clear potentially corrupted refresh token
    const response = new Response(
      JSON.stringify({
        success: false,
        error: 'Token refresh failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    response.headers.set(
      'Set-Cookie',
      'refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    );

    return response;
  }
};