import { InputSanitizer, SecurityAuditor } from '../../utils/security.ts';
import {
  DatabaseError,
  ValidationError,
  safeAsync,
  validateRequired,
} from '../../types/database.ts';
import type { UsersService } from '../users.ts';
import { AUTH_CONFIG } from './config.ts';
import { ensurePasswordStrength, hashPassword } from './passwordManager.ts';
import type { PasswordResetConfirmData, PasswordResetData } from './types.ts';
import type { TokenManager } from './tokenManager.ts';

interface PasswordResetDependencies {
  usersService: UsersService;
  tokenManager: TokenManager;
}

export function createInitiatePasswordResetHandler({
  usersService,
  tokenManager,
}: PasswordResetDependencies) {
  return (resetData: PasswordResetData) =>
    safeAsync(
      async () => {
        validateRequired(resetData, ['email'], 'password_reset');

        const sanitizedEmail = InputSanitizer.sanitizeString(resetData.email);
        const userResult = await usersService.getUserByEmail(sanitizedEmail);

        if (!userResult.success || !userResult.data) {
          return {
            success: true,
            data: {
              message:
                'If the email exists, a password reset link has been sent',
            },
          };
        }

        const user = userResult.data;
        const resetToken = tokenManager.generateSecureToken();
        const resetExpires = new Date(
          Date.now() + AUTH_CONFIG.passwordResetTokenExpires
        );

        const updateResult = await usersService.updateUser(
          user.userId,
          {
            ...user,
            authentication: {
              ...user.authentication,
              passwordResetToken: resetToken,
              passwordResetExpires: resetExpires,
            },
          },
          user.userId
        );

        if (!updateResult.success) {
          throw new DatabaseError(
            'Failed to initiate password reset',
            'PASSWORD_RESET_FAILED',
            'password_reset',
            'users'
          );
        }

        SecurityAuditor.logSecurityEvent(
          'PASSWORD_RESET_INITIATED',
          { userId: user.userId, email: user.email },
          'medium'
        );

        return {
          success: true,
          data: {
            message: 'If the email exists, a password reset link has been sent',
          },
        };
      },
      { operation: 'password_reset', collection: 'users' }
    );
}

export function createConfirmPasswordResetHandler({
  usersService,
  tokenManager,
}: PasswordResetDependencies) {
  return (resetConfirmData: PasswordResetConfirmData) =>
    safeAsync(
      async () => {
        validateRequired(
          resetConfirmData,
          ['token', 'newPassword', 'confirmPassword'],
          'password_reset_confirm'
        );
        ensurePasswordStrength(resetConfirmData.newPassword);

        if (resetConfirmData.newPassword !== resetConfirmData.confirmPassword) {
          throw new ValidationError(
            'Passwords do not match',
            'password_reset_confirm',
            'users'
          );
        }

        const decoded = tokenManager.verifyPasswordResetToken(
          resetConfirmData.token
        );
        const userResult = await usersService.getUserById(decoded.userId);

        if (!userResult.success || !userResult.data) {
          throw new ValidationError(
            'Invalid or expired reset token',
            'password_reset_confirm',
            'users'
          );
        }

        const user = userResult.data;
        const tokenMatches =
          user.authentication.passwordResetToken === resetConfirmData.token;
        const tokenValid =
          user.authentication.passwordResetExpires &&
          user.authentication.passwordResetExpires > new Date();

        if (!tokenMatches || !tokenValid) {
          throw new ValidationError(
            'Invalid or expired reset token',
            'password_reset_confirm',
            'users'
          );
        }

        const hashedPassword = await hashPassword(resetConfirmData.newPassword);

        const updateResult = await usersService.updateUser(
          user.userId,
          {
            ...user,
            authentication: {
              ...user.authentication,
              password: hashedPassword,
              passwordChangedAt: new Date(),
              passwordResetToken: undefined,
              passwordResetExpires: undefined,
            },
          },
          user.userId
        );

        if (!updateResult.success) {
          throw new DatabaseError(
            'Failed to update password',
            'PASSWORD_UPDATE_FAILED',
            'password_reset_confirm',
            'users'
          );
        }

        SecurityAuditor.logSecurityEvent(
          'PASSWORD_CHANGED',
          { userId: user.userId },
          'medium'
        );

        return {
          success: true,
          data: { message: 'Password successfully updated' },
        };
      },
      { operation: 'password_reset_confirm', collection: 'users' }
    );
}
