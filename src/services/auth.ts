/**
 * Authentication Service - Comprehensive user authentication and security
 *
 * This service provides complete authentication functionality including:
 * - Password hashing and verification
 * - JWT token generation and validation
 * - User registration and login
 * - Session management and token refresh
 * - Security monitoring and audit logging
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UsersService } from './users.ts';
import { SecurityAuditor, InputSanitizer } from '../utils/security.ts';
import type { UserDocument, DatabaseOperationResult } from '../types/database.ts';
import {
  DatabaseError,
  ValidationError,
  PermissionError,
  safeAsync,
  validateRequired
} from '../types/database.ts';

// Authentication configuration
const AUTH_CONFIG = {
  bcryptRounds: 12,
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30') * 60 * 1000, // Convert to milliseconds
  passwordResetTokenExpires: parseInt(process.env.PASSWORD_RESET_EXPIRES_HOURS || '24') * 60 * 60 * 1000,
  emailVerificationTokenExpires: parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || '48') * 60 * 60 * 1000,
};

// Authentication interfaces
export interface RegisterData {
  email: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResult {
  user: Partial<UserDocument>;
  tokens: AuthTokens;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordResetConfirmData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenData {
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
}

/**
 * Authentication Service Class
 */
export class AuthService {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  /**
   * Register a new user
   */
  async register(registerData: RegisterData, ipAddress?: string): Promise<DatabaseOperationResult<AuthResult>> {
    return safeAsync(async () => {
      // Validate required fields
      validateRequired(registerData, ['email', 'password', 'confirmPassword'], 'auth_register');

      // Validate email format
      if (!this.isValidEmail(registerData.email)) {
        throw new ValidationError(
          'Invalid email format',
          'register',
          'users',
          'email',
          registerData.email
        );
      }

      // Validate password strength
      this.validatePasswordStrength(registerData.password);

      // Check password confirmation
      if (registerData.password !== registerData.confirmPassword) {
        throw new ValidationError(
          'Passwords do not match',
          'register',
          'users',
          'confirmPassword'
        );
      }

      // Sanitize inputs
      const sanitizedEmail = InputSanitizer.sanitizeString(registerData.email);
      const sanitizedUsername = registerData.username ?
        InputSanitizer.sanitizeString(registerData.username) : undefined;

      // Check if user already exists
      const existingUser = await this.usersService.getUserByEmail(sanitizedEmail);
      if (existingUser.success && existingUser.data) {
        throw new ValidationError(
          'User with this email already exists',
          'register',
          'users',
          'email',
          sanitizedEmail
        );
      }

      // Hash password
      const hashedPassword = await this.hashPassword(registerData.password);

      // Generate email verification token
      const emailVerificationToken = this.generateSecureToken();

      // Create user data
      const userData = {
        userId: this.generateUserId(),
        email: sanitizedEmail,
        username: sanitizedUsername,
        preferences: {
          theme: 'light' as const,
          language: 'en',
          audioEnabled: true,
          studyReminders: true,
        },
        statistics: {
          totalCardsStudied: 0,
          totalStudyTime: 0,
          averageRecallRate: 0,
          streakDays: 0,
        },
        authentication: {
          password: hashedPassword,
          emailVerified: false,
          emailVerificationToken,
          refreshTokens: [],
        },
        security: {
          loginAttempts: 0,
          accountLocked: false,
          suspiciousActivity: [],
        },
        profile: {
          joinDate: new Date(),
        },
      };

      // Create user
      const createResult = await this.usersService.createUser(userData);
      if (!createResult.success) {
        throw new DatabaseError(
          createResult.error || 'Failed to create user',
          'USER_CREATION_FAILED',
          'register',
          'users'
        );
      }

      // Generate tokens
      const tokens = await this.generateTokens(createResult.data!, {
        deviceInfo: 'registration',
        ipAddress: ipAddress || 'unknown'
      });

      // Log successful registration
      SecurityAuditor.logSecurityEvent(
        'USER_REGISTERED',
        {
          userId: createResult.data!.userId,
          email: sanitizedEmail,
          ipAddress
        },
        'low'
      );

      return {
        success: true,
        data: {
          user: this.sanitizeUserForResponse(createResult.data!),
          tokens
        }
      };
    }, { operation: 'register', collection: 'users' });
  }

  /**
   * Authenticate user login
   */
  async login(loginData: LoginData): Promise<DatabaseOperationResult<AuthResult>> {
    return safeAsync(async () => {
      // Validate required fields
      validateRequired(loginData, ['email', 'password'], 'auth_login');

      // Sanitize email
      const sanitizedEmail = InputSanitizer.sanitizeString(loginData.email);

      // Get user by email
      const userResult = await this.usersService.getUserByEmail(sanitizedEmail);
      if (!userResult.success || !userResult.data) {
        // Don't reveal if email exists or not for security
        throw new ValidationError(
          'Invalid email or password',
          'login',
          'users'
        );
      }

      const user = userResult.data;

      // Check if account is locked
      if (user.security.accountLocked) {
        if (user.security.accountLockedUntil && user.security.accountLockedUntil > new Date()) {
          throw new PermissionError(
            'Account is temporarily locked due to too many failed login attempts',
            'login',
            'users',
            user.userId
          );
        } else {
          // Unlock account if lockout period has expired
          await this.unlockAccount(user.userId);
          user.security.accountLocked = false;
          user.security.loginAttempts = 0;
        }
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(loginData.password, user.authentication.password);
      if (!isPasswordValid) {
        // Increment login attempts
        await this.incrementLoginAttempts(user.userId, loginData.ipAddress);

        // Check if account should be locked
        if (user.security.loginAttempts + 1 >= AUTH_CONFIG.maxLoginAttempts) {
          await this.lockAccount(user.userId, AUTH_CONFIG.lockoutDuration);
          throw new PermissionError(
            `Account locked due to too many failed attempts. Try again in ${AUTH_CONFIG.lockoutDuration / (60 * 1000)} minutes.`,
            'login',
            'users',
            user.userId
          );
        }

        throw new ValidationError(
          'Invalid email or password',
          'login',
          'users'
        );
      }

      // Check if email is verified (optional - can be configured)
      if (!user.authentication.emailVerified) {
        throw new PermissionError(
          'Please verify your email address before logging in',
          'login',
          'users',
          user.userId
        );
      }

      // Reset login attempts on successful login
      await this.resetLoginAttempts(user.userId);

      // Update last login
      await this.updateLastLogin(user.userId, loginData.ipAddress);

      // Generate tokens
      const tokens = await this.generateTokens(user, {
        deviceInfo: loginData.deviceInfo || 'web',
        ipAddress: loginData.ipAddress || 'unknown'
      });

      // Log successful login
      SecurityAuditor.logSecurityEvent(
        'USER_LOGIN_SUCCESS',
        {
          userId: user.userId,
          email: user.email,
          ipAddress: loginData.ipAddress,
          deviceInfo: loginData.deviceInfo
        },
        'low'
      );

      return {
        success: true,
        data: {
          user: this.sanitizeUserForResponse(user),
          tokens
        }
      };
    }, { operation: 'login', collection: 'users' });
  }

  /**
   * Logout user and invalidate refresh token
   */
  async logout(userId: string, refreshToken: string): Promise<DatabaseOperationResult<{ message: string }>> {
    return safeAsync(async () => {
      // Remove refresh token from user's token list
      const userResult = await this.usersService.getUserById(userId);
      if (!userResult.success || !userResult.data) {
        throw new ValidationError(
          'User not found',
          'logout',
          'users',
          'userId',
          userId
        );
      }

      const user = userResult.data;
      const updatedTokens = user.authentication.refreshTokens.filter(
        token => token.token !== refreshToken
      );

      // Update user with removed token
      const updateResult = await this.usersService.updateUser(userId, {
        ...user,
        authentication: {
          ...user.authentication,
          refreshTokens: updatedTokens
        }
      }, userId);

      if (!updateResult.success) {
        throw new DatabaseError(
          'Failed to logout user',
          'LOGOUT_FAILED',
          'logout',
          'users'
        );
      }

      // Log logout
      SecurityAuditor.logSecurityEvent(
        'USER_LOGOUT',
        { userId },
        'low'
      );

      return {
        success: true,
        data: { message: 'Successfully logged out' }
      };
    }, { operation: 'logout', collection: 'users', userId });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshData: RefreshTokenData): Promise<DatabaseOperationResult<AuthTokens>> {
    return safeAsync(async () => {
      try {
        // Verify refresh token
        const decoded = jwt.verify(refreshData.refreshToken, AUTH_CONFIG.jwtRefreshSecret) as any;

        // Get user
        const userResult = await this.usersService.getUserById(decoded.userId);
        if (!userResult.success || !userResult.data) {
          throw new ValidationError(
            'Invalid refresh token',
            'refresh_token',
            'users'
          );
        }

        const user = userResult.data;

        // Check if refresh token exists in user's token list
        const tokenExists = user.authentication.refreshTokens.some(
          token => token.token === refreshData.refreshToken
        );

        if (!tokenExists) {
          throw new ValidationError(
            'Invalid refresh token',
            'refresh_token',
            'users'
          );
        }

        // Generate new tokens
        const tokens = await this.generateTokens(user, {
          deviceInfo: refreshData.deviceInfo || 'web',
          ipAddress: refreshData.ipAddress || 'unknown'
        });

        // Log token refresh
        SecurityAuditor.logSecurityEvent(
          'TOKEN_REFRESHED',
          {
            userId: user.userId,
            ipAddress: refreshData.ipAddress
          },
          'low'
        );

        return {
          success: true,
          data: tokens
        };
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          throw new ValidationError(
            'Invalid refresh token',
            'refresh_token',
            'users'
          );
        }
        throw error;
      }
    }, { operation: 'refresh_token', collection: 'users' });
  }

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(resetData: PasswordResetData): Promise<DatabaseOperationResult<{ message: string }>> {
    return safeAsync(async () => {
      // Validate email
      validateRequired(resetData, ['email'], 'password_reset');

      const sanitizedEmail = InputSanitizer.sanitizeString(resetData.email);

      // Get user by email
      const userResult = await this.usersService.getUserByEmail(sanitizedEmail);
      if (!userResult.success || !userResult.data) {
        // Don't reveal if email exists for security
        return {
          success: true,
          data: { message: 'If the email exists, a password reset link has been sent' }
        };
      }

      const user = userResult.data;

      // Generate password reset token
      const resetToken = this.generateSecureToken();
      const resetExpires = new Date(Date.now() + AUTH_CONFIG.passwordResetTokenExpires);

      // Update user with reset token
      const updateResult = await this.usersService.updateUser(user.userId, {
        ...user,
        authentication: {
          ...user.authentication,
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires
        }
      }, user.userId);

      if (!updateResult.success) {
        throw new DatabaseError(
          'Failed to initiate password reset',
          'PASSWORD_RESET_FAILED',
          'password_reset',
          'users'
        );
      }

      // Log password reset initiation
      SecurityAuditor.logSecurityEvent(
        'PASSWORD_RESET_INITIATED',
        { userId: user.userId, email: user.email },
        'medium'
      );

      // TODO: Send email with reset link
      // For now, just return success message
      return {
        success: true,
        data: { message: 'If the email exists, a password reset link has been sent' }
      };
    }, { operation: 'password_reset', collection: 'users' });
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(resetConfirmData: PasswordResetConfirmData): Promise<DatabaseOperationResult<{ message: string }>> {
    return safeAsync(async () => {
      // Validate required fields
      validateRequired(resetConfirmData, ['token', 'newPassword', 'confirmPassword'], 'password_reset_confirm');

      // Validate password strength
      this.validatePasswordStrength(resetConfirmData.newPassword);

      // Check password confirmation
      if (resetConfirmData.newPassword !== resetConfirmData.confirmPassword) {
        throw new ValidationError(
          'Passwords do not match',
          'password_reset_confirm',
          'users'
        );
      }

      // Find user with matching reset token
      // This would require a database query to find user by reset token
      // For now, we'll assume we have the user ID from the token
      const decoded = this.verifyPasswordResetToken(resetConfirmData.token);
      const userResult = await this.usersService.getUserById(decoded.userId);

      if (!userResult.success || !userResult.data) {
        throw new ValidationError(
          'Invalid or expired reset token',
          'password_reset_confirm',
          'users'
        );
      }

      const user = userResult.data;

      // Check if token is valid and not expired
      if (!user.authentication.passwordResetToken ||
          user.authentication.passwordResetToken !== resetConfirmData.token ||
          !user.authentication.passwordResetExpires ||
          user.authentication.passwordResetExpires < new Date()) {
        throw new ValidationError(
          'Invalid or expired reset token',
          'password_reset_confirm',
          'users'
        );
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(resetConfirmData.newPassword);

      // Update user password and clear reset token
      const updateResult = await this.usersService.updateUser(user.userId, {
        ...user,
        authentication: {
          ...user.authentication,
          password: hashedPassword,
          passwordChangedAt: new Date(),
          passwordResetToken: undefined,
          passwordResetExpires: undefined
        }
      }, user.userId);

      if (!updateResult.success) {
        throw new DatabaseError(
          'Failed to update password',
          'PASSWORD_UPDATE_FAILED',
          'password_reset_confirm',
          'users'
        );
      }

      // Log password change
      SecurityAuditor.logSecurityEvent(
        'PASSWORD_CHANGED',
        { userId: user.userId },
        'medium'
      );

      return {
        success: true,
        data: { message: 'Password successfully updated' }
      };
    }, { operation: 'password_reset_confirm', collection: 'users' });
  }

  /**
   * Verify JWT token and return user information
   */
  async verifyAccessToken(token: string): Promise<DatabaseOperationResult<Partial<UserDocument>>> {
    return safeAsync(async () => {
      try {
        const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret) as any;

        // Get user
        const userResult = await this.usersService.getUserById(decoded.userId);
        if (!userResult.success || !userResult.data) {
          throw new ValidationError(
            'User not found',
            'verify_token',
            'users'
          );
        }

        return {
          success: true,
          data: this.sanitizeUserForResponse(userResult.data!)
        };
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          throw new ValidationError(
            'Invalid access token',
            'verify_token',
            'users'
          );
        }
        throw error;
      }
    }, { operation: 'verify_token', collection: 'users' });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new ValidationError(
        'Password must be at least 8 characters long',
        'validate_password',
        'users',
        'password'
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new ValidationError(
        'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'validate_password',
        'users',
        'password'
      );
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: UserDocument, sessionInfo: { deviceInfo: string; ipAddress: string }): Promise<AuthTokens> {
    // Generate access token
    const accessToken = (jwt.sign as any)(
      {
        userId: user.userId,
        email: user.email,
        type: 'access'
      },
      AUTH_CONFIG.jwtSecret,
      { expiresIn: AUTH_CONFIG.jwtExpiresIn }
    );

    // Generate refresh token
    const refreshToken = (jwt.sign as any)(
      {
        userId: user.userId,
        type: 'refresh'
      },
      AUTH_CONFIG.jwtRefreshSecret,
      { expiresIn: AUTH_CONFIG.jwtRefreshExpiresIn }
    );

    // Calculate expiration time
    const expiresIn = this.parseExpiresIn(AUTH_CONFIG.jwtExpiresIn);

    // Store refresh token
    const tokenData = {
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.parseExpiresIn(AUTH_CONFIG.jwtRefreshExpiresIn)),
      deviceInfo: sessionInfo.deviceInfo,
      ipAddress: sessionInfo.ipAddress
    };

    // Add to user's refresh tokens (limit to 5 devices)
    const updatedTokens = [tokenData, ...user.authentication.refreshTokens].slice(0, 5);

    await this.usersService.updateUser(user.userId, {
      ...user,
      authentication: {
        ...user.authentication,
        refreshTokens: updatedTokens
      }
    }, user.userId);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer'
    };
  }

  /**
   * Parse expires in string to milliseconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }

  /**
   * Sanitize user data for API responses
   */
  private sanitizeUserForResponse(user: UserDocument): Partial<UserDocument> {
    const { authentication, security, ...sanitizedUser } = user;
    return {
      ...sanitizedUser,
      authentication: {
        password: '', // Never expose password
        emailVerified: authentication.emailVerified,
        emailVerifiedAt: authentication.emailVerifiedAt,
        passwordChangedAt: authentication.passwordChangedAt,
        refreshTokens: [] // Never expose refresh tokens
      } as any
    };
  }

  /**
   * Increment login attempts
   */
  private async incrementLoginAttempts(userId: string, ipAddress?: string): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (userResult.success && userResult.data) {
      const user = userResult.data;
      const newAttempts = user.security.loginAttempts + 1;

      await this.usersService.updateUserSecurity(userId, {
        ...user.security,
        loginAttempts: newAttempts,
        suspiciousActivity: [
          {
            type: 'FAILED_LOGIN_ATTEMPT',
            timestamp: new Date(),
            ipAddress: ipAddress || 'unknown',
            details: `Attempt ${newAttempts}`
          },
          ...user.security.suspiciousActivity.slice(0, 9) // Keep last 10 entries
        ]
      });
    }
  }

  /**
   * Reset login attempts
   */
  private async resetLoginAttempts(userId: string): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (userResult.success && userResult.data) {
      await this.usersService.updateUserSecurity(userId, {
        ...userResult.data.security,
        loginAttempts: 0
      });
    }
  }

  /**
   * Lock user account
   */
  private async lockAccount(userId: string, duration: number): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (userResult.success && userResult.data) {
      await this.usersService.updateUserSecurity(userId, {
        ...userResult.data.security,
        accountLocked: true,
        accountLockedUntil: new Date(Date.now() + duration)
      });
    }
  }

  /**
   * Unlock user account
   */
  private async unlockAccount(userId: string): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (userResult.success && userResult.data) {
      await this.usersService.updateUserSecurity(userId, {
        ...userResult.data.security,
        accountLocked: false,
        accountLockedUntil: undefined,
        loginAttempts: 0
      });
    }
  }

  /**
   * Update last login information
   */
  private async updateLastLogin(userId: string, ipAddress?: string): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (userResult.success && userResult.data) {
      await this.usersService.updateUserSecurity(userId, {
        ...userResult.data.security,
        lastLogin: new Date(),
        lastLoginIP: ipAddress
      });
    }
  }

  /**
   * Verify password reset token
   */
  private verifyPasswordResetToken(_token: string): { userId: string } {
    // For now, just return a mock decoded token
    // In production, this should verify the token properly
    return { userId: 'mock_user_id' };
  }
}

// Export singleton instance
export const authService = new AuthService();