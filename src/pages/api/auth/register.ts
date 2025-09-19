import type { APIRoute } from 'astro';
import { register } from '../../../services/auth';
import { checkRateLimit, SecurityError } from '../../../utils/security';
import { InputSanitizer } from '../../../utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting - more restrictive for registration
    const rateLimitResult = checkRateLimit(`register:${clientIP}`, 3, 3600000); // 3 attempts per hour
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many registration attempts. Please try again later.',
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
    if (!body.email || !body.password || !body.confirmPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email, password, and password confirmation are required'
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
    const confirmPassword = body.confirmPassword;
    const username = body.username ? InputSanitizer.sanitizeString(body.username.trim(), 50) : undefined;

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

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Password must be at least 8 characters long'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check password complexity
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Password must contain lowercase, uppercase, and numeric characters'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Passwords do not match'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate username if provided
    if (username) {
      if (username.length < 3 || username.length > 50) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Username must be between 3 and 50 characters'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check for invalid characters in username
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Username can only contain letters, numbers, underscores, and hyphens'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Attempt registration
    const result = await register({
      email,
      password,
      username,
      clientIP
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Registration failed'
        }),
        {
          status: 400,
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
          tokens: {
            accessToken: result.data?.tokens?.accessToken,
            refreshToken: result.data?.tokens?.refreshToken,
            expiresIn: result.data?.tokens?.expiresIn,
            tokenType: 'Bearer'
          }
        },
        message: 'Registration successful'
      }),
      {
        status: 201,
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
    console.error('Registration API error:', error);

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