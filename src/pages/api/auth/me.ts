import type { APIRoute } from 'astro';
import { verifyAccessToken, getUserById } from '../../../services/auth';
import { SecurityAuditor } from '../../../utils/security';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authorization header missing or invalid'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const accessToken = authHeader.substring(7);

    // Get client IP for logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Verify token
    const tokenResult = await verifyAccessToken(accessToken);

    if (!tokenResult.success || !tokenResult.data?.userId) {
      SecurityAuditor.logSecurityEvent(
        'USER_INFO_REQUEST_UNAUTHORIZED',
        { clientIP, error: tokenResult.error },
        'medium'
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user information
    const userResult = await getUserById(tokenResult.data.userId);

    if (!userResult.success) {
      SecurityAuditor.logSecurityEvent(
        'USER_INFO_FETCH_FAILED',
        { clientIP, userId: tokenResult.data.userId, error: userResult.error },
        'medium'
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch user information'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Remove sensitive information before sending
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, refreshTokens: _refreshTokens, ...safeUserData } = userResult.data as Record<string, unknown>;

    SecurityAuditor.logSecurityEvent(
      'USER_INFO_REQUEST_SUCCESS',
      { clientIP, userId: tokenResult.data.userId },
      'low'
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: safeUserData
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('User info API error:', error);

    SecurityAuditor.logSecurityEvent(
      'USER_INFO_REQUEST_ERROR',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'high'
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch user information'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};