import { SecurityAuditor } from '../../utils/security.ts';
import { ValidationError, safeAsync } from '../../types/database.ts';
import type { UsersService } from '../users.ts';
import type { RefreshTokenData } from './types.ts';
import type { TokenManager } from './tokenManager.ts';

interface RefreshTokenDependencies {
  usersService: UsersService;
  tokenManager: TokenManager;
}

export function createRefreshTokenHandler({ usersService, tokenManager }: RefreshTokenDependencies) {
  return (refreshData: RefreshTokenData) =>
    safeAsync(async () => {
      const decoded = tokenManager.decodeRefreshToken(refreshData.refreshToken);

      const userResult = await usersService.getUserById(decoded.userId);
      if (!userResult.success || !userResult.data) {
        throw new ValidationError('Invalid refresh token', 'refresh_token', 'users');
      }

      const user = userResult.data;
      const tokenExists = user.authentication.refreshTokens.some(
        token => token.token === refreshData.refreshToken
      );

      if (!tokenExists) {
        throw new ValidationError('Invalid refresh token', 'refresh_token', 'users');
      }

      const tokens = await tokenManager.generateTokens(user, {
        deviceInfo: refreshData.deviceInfo || 'web',
        ipAddress: refreshData.ipAddress || 'unknown'
      });

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
    }, { operation: 'refresh_token', collection: 'users' });
}
