import type { APIRoute } from 'astro';
import { verifyAccessToken } from '../../../services/auth';
import { SecurityAuditor } from '../../../utils/security';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authorization header missing or invalid',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const accessToken = authHeader.substring(7);

    // Get client IP for logging
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Verify token
    const result = await verifyAccessToken(accessToken);

    if (!result.success) {
      SecurityAuditor.logSecurityEvent(
        'TOKEN_VERIFICATION_FAILED',
        { clientIP, error: result.error },
        'medium'
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Token verification failed',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Token is valid
    SecurityAuditor.logSecurityEvent(
      'TOKEN_VERIFICATION_SUCCESS',
      { clientIP, userId: result.data?.userId },
      'low'
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          valid: true,
          payload: result.data,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Token verification API error:', error);

    SecurityAuditor.logSecurityEvent(
      'TOKEN_VERIFICATION_ERROR',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'high'
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Token verification failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
