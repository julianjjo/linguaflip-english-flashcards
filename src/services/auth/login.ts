import { InputSanitizer, SecurityAuditor } from '../../utils/security.ts';
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  safeAsync,
  validateRequired,
} from '../../types/database.ts';
import type { UsersService } from '../users.ts';
import type { UserDocument } from '../../types/database.ts';
import { AUTH_CONFIG } from './config.ts';
import { verifyPassword } from './passwordManager.ts';
import { sanitizeUserForResponse } from './userSanitizer.ts';
import type { LoginData } from './types.ts';
import type { TokenManager } from './tokenManager.ts';
import type { AccountSecurityManager } from './accountSecurityManager.ts';

interface LoginDependencies {
  usersService: UsersService;
  tokenManager: TokenManager;
  accountSecurity: AccountSecurityManager;
}

export function createLoginHandler({
  usersService,
  tokenManager,
  accountSecurity,
}: LoginDependencies) {
  return (loginData: LoginData) =>
    safeAsync(
      async () => {
        validateRequired(loginData, ['email', 'password'], 'auth_login');

        const sanitizedEmail = InputSanitizer.sanitizeString(loginData.email);

        let user: UserDocument;
        try {
          const userResult = await usersService.getUserByEmail(sanitizedEmail);
          if (!userResult.success || !userResult.data) {
            throw new ValidationError(
              'Invalid email or password',
              'login',
              'users'
            );
          }
          user = userResult.data;
        } catch (error) {
          if (error instanceof NotFoundError) {
            throw new ValidationError(
              'Invalid email or password',
              'login',
              'users'
            );
          }
          throw error;
        }

        if (user.security.accountLocked) {
          if (
            user.security.accountLockedUntil &&
            user.security.accountLockedUntil > new Date()
          ) {
            throw new PermissionError(
              'Account is temporarily locked due to too many failed login attempts',
              'login',
              'users',
              user.userId
            );
          }

          await accountSecurity.unlockAccount(user.userId);
          user.security.accountLocked = false;
          user.security.loginAttempts = 0;
        }

        const isPasswordValid = await verifyPassword(
          loginData.password,
          user.authentication.password
        );

        if (!isPasswordValid) {
          await accountSecurity.incrementLoginAttempts(
            user.userId,
            loginData.ipAddress
          );

          if (user.security.loginAttempts + 1 >= AUTH_CONFIG.maxLoginAttempts) {
            await accountSecurity.lockAccount(
              user.userId,
              AUTH_CONFIG.lockoutDuration
            );
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

        if (!user.authentication.emailVerified) {
          throw new PermissionError(
            'Please verify your email address before logging in',
            'login',
            'users',
            user.userId
          );
        }

        await accountSecurity.resetLoginAttempts(user.userId);
        await accountSecurity.updateLastLogin(user.userId, loginData.ipAddress);

        const tokens = await tokenManager.generateTokens(user, {
          deviceInfo: loginData.deviceInfo || 'web',
          ipAddress: loginData.ipAddress || 'unknown',
        });

        SecurityAuditor.logSecurityEvent(
          'USER_LOGIN_SUCCESS',
          {
            userId: user.userId,
            email: user.email,
            ipAddress: loginData.ipAddress,
            deviceInfo: loginData.deviceInfo,
          },
          'low'
        );

        return {
          success: true,
          data: {
            user: sanitizeUserForResponse(user),
            tokens,
          },
        };
      },
      { operation: 'login', collection: 'users' }
    );
}
