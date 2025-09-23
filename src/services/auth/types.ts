import type { DatabaseOperationResult, UserDocument } from '../../types/database.ts';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface SanitizedAuthentication {
  password: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  passwordChangedAt?: Date;
  refreshTokens: never[];
}

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

export interface SessionInfo {
  deviceInfo: string;
  ipAddress: string;
}

export type AuthOperationResult<T> = Promise<DatabaseOperationResult<T>>;
