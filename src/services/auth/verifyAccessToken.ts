import { ValidationError, safeAsync } from '../../types/database.ts';
import type { UsersService } from '../users.ts';
import { sanitizeUserForResponse } from './userSanitizer.ts';
import type { TokenManager } from './tokenManager.ts';

interface VerifyTokenDependencies {
  usersService: UsersService;
  tokenManager: TokenManager;
}

export function createVerifyAccessTokenHandler({ usersService, tokenManager }: VerifyTokenDependencies) {
  return (token: string) =>
    safeAsync(async () => {
      const decoded = tokenManager.decodeAccessToken(token);

      const userResult = await usersService.getUserById(decoded.userId);
      if (!userResult.success || !userResult.data) {
        throw new ValidationError('User not found', 'verify_token', 'users');
      }

      return {
        success: true,
        data: sanitizeUserForResponse(userResult.data)
      };
    }, { operation: 'verify_token', collection: 'users' });
}
