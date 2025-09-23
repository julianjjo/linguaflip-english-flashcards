import { InputSanitizer, SecurityAuditor } from '../../utils/security.ts';
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
  safeAsync,
  validateRequired
} from '../../types/database.ts';
import type { UsersService } from '../users.ts';
import { hashPassword, ensurePasswordStrength } from './passwordManager.ts';
import { sanitizeUserForResponse } from './userSanitizer.ts';
import { createNewUser } from './userFactory.ts';
import type { RegisterData } from './types.ts';
import type { TokenManager } from './tokenManager.ts';
import { assertValidEmail } from './validators.ts';

interface RegisterDependencies {
  usersService: UsersService;
  tokenManager: TokenManager;
}

export function createRegisterHandler({ usersService, tokenManager }: RegisterDependencies) {
  return (registerData: RegisterData, ipAddress?: string) =>
    safeAsync(async () => {
      validateRequired(registerData, ['email', 'password', 'confirmPassword'], 'auth_register');

      assertValidEmail(registerData.email, 'register');
      ensurePasswordStrength(registerData.password);

      if (registerData.password !== registerData.confirmPassword) {
        throw new ValidationError('Passwords do not match', 'register', 'users', 'confirmPassword');
      }

      const sanitizedEmail = InputSanitizer.sanitizeString(registerData.email);
      const sanitizedUsername = registerData.username
        ? InputSanitizer.sanitizeString(registerData.username)
        : undefined;

      try {
        const existingUser = await usersService.getUserByEmail(sanitizedEmail);
        if (existingUser.success && existingUser.data) {
          throw new ValidationError(
            'User with this email already exists',
            'register',
            'users',
            'email',
            sanitizedEmail
          );
        }
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }
      }

      const hashedPassword = await hashPassword(registerData.password);
      const emailVerificationToken = tokenManager.generateSecureToken();

      const userData = createNewUser({
        userId: tokenManager.generateUserId(),
        email: sanitizedEmail,
        username: sanitizedUsername,
        passwordHash: hashedPassword,
        emailVerified: true,
        emailVerificationToken
      });

      const createResult = await usersService.createUser(userData);
      if (!createResult.success || !createResult.data) {
        throw new DatabaseError(
          createResult.error || 'Failed to create user',
          'USER_CREATION_FAILED',
          'register',
          'users'
        );
      }

      const tokens = await tokenManager.generateTokens(createResult.data, {
        deviceInfo: 'registration',
        ipAddress: ipAddress || 'unknown'
      });

      SecurityAuditor.logSecurityEvent(
        'USER_REGISTERED',
        {
          userId: createResult.data.userId,
          email: sanitizedEmail,
          ipAddress
        },
        'low'
      );

      return {
        success: true,
        data: {
          user: sanitizeUserForResponse(createResult.data),
          tokens
        }
      };
    }, { operation: 'register', collection: 'users' });
}
