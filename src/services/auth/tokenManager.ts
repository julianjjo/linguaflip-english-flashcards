import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

const { JsonWebTokenError, sign, verify } = jwt;

import type { UsersService } from '../users.ts';
import type { UserDocument } from '../../types/database.ts';
import { DatabaseError, ValidationError } from '../../types/database.ts';
import { AUTH_CONFIG } from './config.ts';
import type {
  AccessTokenPayload,
  AuthTokens,
  RefreshTokenPayload,
  SessionInfo,
} from './types.ts';

export class TokenManager {
  constructor(private readonly usersService: UsersService) {}

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateUserId(): string {
    return `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  decodeAccessToken(token: string): AccessTokenPayload {
    try {
      return verify(token, AUTH_CONFIG.jwtSecret) as AccessTokenPayload;
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new ValidationError(
          'Invalid access token',
          'verify_token',
          'users'
        );
      }
      throw error;
    }
  }

  decodeRefreshToken(token: string): RefreshTokenPayload {
    try {
      return verify(token, AUTH_CONFIG.jwtRefreshSecret) as RefreshTokenPayload;
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new ValidationError(
          'Invalid refresh token',
          'refresh_token',
          'users'
        );
      }
      throw error;
    }
  }

  verifyPasswordResetToken(_token: string): { userId: string } {
    // Placeholder implementation. In production this should validate a signed token.
    return { userId: 'mock_user_id' };
  }

  async generateTokens(
    user: UserDocument,
    sessionInfo: SessionInfo
  ): Promise<AuthTokens> {
    if (!user.email) {
      throw new DatabaseError(
        'User email is required for token generation',
        'TOKEN_GENERATION_FAILED',
        'generate_tokens',
        'users',
        { userId: user.userId }
      );
    }

    const accessPayload: AccessTokenPayload = {
      userId: user.userId,
      email: user.email,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      userId: user.userId,
      type: 'refresh',
    };

    const accessOptions: SignOptions = {
      expiresIn: AUTH_CONFIG.jwtExpiresIn as SignOptions['expiresIn'],
    };
    const refreshOptions: SignOptions = {
      expiresIn: AUTH_CONFIG.jwtRefreshExpiresIn as SignOptions['expiresIn'],
    };

    const accessToken = sign(
      accessPayload,
      AUTH_CONFIG.jwtSecret,
      accessOptions
    );

    const refreshToken = sign(
      refreshPayload,
      AUTH_CONFIG.jwtRefreshSecret,
      refreshOptions
    );

    const expiresIn = this.parseExpiresIn(AUTH_CONFIG.jwtExpiresIn);
    const refreshExpiresIn = this.parseExpiresIn(
      AUTH_CONFIG.jwtRefreshExpiresIn
    );

    const tokenRecord = {
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + refreshExpiresIn),
      deviceInfo: sessionInfo.deviceInfo,
      ipAddress: sessionInfo.ipAddress,
    };

    const updatedTokens = [
      tokenRecord,
      ...user.authentication.refreshTokens,
    ].slice(0, AUTH_CONFIG.maxActiveSessions);

    const updateResult = await this.usersService.updateUser(
      user.userId,
      {
        ...user,
        authentication: {
          ...user.authentication,
          refreshTokens: updatedTokens,
        },
      },
      user.userId
    );

    if (!updateResult.success) {
      throw new DatabaseError(
        updateResult.error || 'Failed to persist refresh token',
        'REFRESH_TOKEN_STORE_FAILED',
        'generate_tokens',
        'users'
      );
    }

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}
