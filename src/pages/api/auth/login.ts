import type { APIRoute } from 'astro';
import { login } from '../../../services/auth';
import { checkRateLimit, SecurityError } from '../../../utils/security';
import { InputSanitizer } from '../../../utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting
    const rateLimitResult = checkRateLimit(`login:${clientIP}`, 5, 900000); // 5 attempts per 15 minutes
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email and password are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Sanitize inputs
    const email = InputSanitizer.sanitizeString(body.email.toLowerCase().trim(), 254);
    const password = body.password;
    const deviceInfo = body.deviceInfo ? InputSanitizer.sanitizeString(body.deviceInfo, 200) : undefined;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email format'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Attempt login
    const result = await login(email, password, clientIP, deviceInfo);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Login failed'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Set refresh token as httpOnly cookie
    const response = new Response(
      JSON.stringify({
        success: true,
        data: {
          user: result.data?.user,
          accessToken: result.data?.tokens?.accessToken,
          expiresIn: result.data?.tokens?.expiresIn,
          refreshToken: result.data?.tokens?.refreshToken
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Set refresh token cookie
    if (result.data?.tokens?.refreshToken) {
      response.headers.set(
        'Set-Cookie',
        `refreshToken=${result.data.tokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      );
    }

    return response;

  } catch (error) {
    console.error('Login API error:', error);

    if (error instanceof SecurityError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};