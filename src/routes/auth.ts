/**
 * Authentication Routes for LinguaFlip API
 *
 * This file contains all authentication-related API endpoints:
 * - User registration
 * - User login
 * - User logout
 * - Token refresh
 * - Password reset
 */

import express from 'express';
import { authService } from '../services/auth';
import {
  requireAuth,
  authRateLimit,
  authCors,
  authLogging,
  securityHeaders,
  authErrorHandler
} from '../middleware/auth';
import { InputSanitizer } from '../utils/security';
import { ValidationError } from '../types/database';

const router = express.Router();

// Apply common middleware to all auth routes
router.use(securityHeaders);
router.use(authCors);
router.use(authLogging);

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', authRateLimit, async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    // Validate required fields
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and confirmPassword are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Sanitize inputs
    const sanitizedData = {
      email: InputSanitizer.sanitizeString(email),
      username: username ? InputSanitizer.sanitizeString(username) : undefined,
      password,
      confirmPassword
    };

    // Register user
    const result = await authService.register(sanitizedData, req.ip);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Registration failed',
        code: 'REGISTRATION_FAILED'
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during registration',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos obligatorios deben ser completados',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Sanitize inputs
    const sanitizedData = {
      email: InputSanitizer.sanitizeString(email),
      password,
      deviceInfo: deviceInfo ? InputSanitizer.sanitizeString(deviceInfo) : undefined,
      ipAddress: req.ip
    };

    // Authenticate user
    const result = await authService.login(sanitizedData);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error || 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.data!.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.data!.user,
        accessToken: result.data!.tokens.accessToken,
        expiresIn: result.data!.tokens.expiresIn
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof ValidationError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during login',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate tokens
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Logout from authentication service
      await authService.logout(userId, refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);

    // Still clear the cookie even if logout fails
    res.clearCookie('refreshToken');

    res.status(500).json({
      success: false,
      error: 'Internal server error during logout',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Refresh tokens
    const result = await authService.refreshToken({
      refreshToken,
      deviceInfo: req.body.deviceInfo,
      ipAddress: req.ip
    });

    if (!result.success) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');

      return res.status(401).json({
        success: false,
        error: result.error || 'Token refresh failed',
        code: 'REFRESH_FAILED'
      });
    }

    // Set new refresh token cookie
    res.cookie('refreshToken', result.data!.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.data!.accessToken,
        expiresIn: result.data!.expiresIn
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    // Clear potentially invalid refresh token cookie
    res.clearCookie('refreshToken');

    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 */
router.post('/forgot-password', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    // Sanitize email
    const sanitizedEmail = InputSanitizer.sanitizeString(email);

    // Initiate password reset
    await authService.initiatePasswordReset({
      email: sanitizedEmail
    });

    // Always return success for security (don't reveal if email exists)
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    // Still return success for security
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
router.post('/reset-password', authRateLimit, async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token, newPassword, and confirmPassword are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Reset password
    const result = await authService.confirmPasswordReset({
      token,
      newPassword,
      confirmPassword
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Password reset failed',
        code: 'RESET_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during password reset',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return user information
 */
router.get('/verify', requireAuth, async (req, res) => {
  try {
    // Token is already verified by middleware
    // Just return user information
    res.json({
      success: true,
      data: {
        user: req.user,
        authenticated: true
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error during token verification',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get user details from auth service
    const result = await authService.verifyAccessToken(`dummy_token_user_${userId}`);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Get current user error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/validate-password
 * Validate password strength (public endpoint)
 */
router.post('/validate-password', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
        code: 'MISSING_PASSWORD'
      });
    }

    // Basic password validation
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    res.json({
      success: true,
      data: {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : null,
        strength: errors.length === 0 ? 'strong' :
                 errors.length <= 2 ? 'medium' : 'weak'
      }
    });

  } catch (error) {
    console.error('Password validation error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error during password validation',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Apply error handler to all routes
router.use(authErrorHandler);

export default router;