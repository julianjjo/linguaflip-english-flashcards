import { SecurityAuditor } from '../../utils/security.ts';
import {
  DatabaseError,
  ValidationError,
  safeAsync,
} from '../../types/database.ts';
import type { UsersService } from '../users.ts';

interface LogoutDependencies {
  usersService: UsersService;
}

export function createLogoutHandler({ usersService }: LogoutDependencies) {
  return (userId: string, refreshToken: string) =>
    safeAsync(
      async () => {
        const userResult = await usersService.getUserById(userId);
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
          (token) => token.token !== refreshToken
        );

        const updateResult = await usersService.updateUser(
          userId,
          {
            ...user,
            authentication: {
              ...user.authentication,
              refreshTokens: updatedTokens,
            },
          },
          userId
        );

        if (!updateResult.success) {
          throw new DatabaseError(
            'Failed to logout user',
            'LOGOUT_FAILED',
            'logout',
            'users'
          );
        }

        SecurityAuditor.logSecurityEvent('USER_LOGOUT', { userId }, 'low');

        return {
          success: true,
          data: { message: 'Successfully logged out' },
        };
      },
      { operation: 'logout', collection: 'users', userId }
    );
}
