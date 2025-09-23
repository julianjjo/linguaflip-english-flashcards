import { getAuthConfig } from '../../config/security.ts';

const DEFAULT_MAX_SESSIONS = parseInt(process.env.AUTH_MAX_ACTIVE_SESSIONS || '5', 10);
const PASSWORD_RESET_HOURS = parseInt(process.env.PASSWORD_RESET_EXPIRES_HOURS || '24', 10);
const EMAIL_VERIFICATION_HOURS = parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || '48', 10);

export const AUTH_CONFIG = {
  ...getAuthConfig(),
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '15m') as string,
  jwtRefreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string,
  passwordResetTokenExpires: PASSWORD_RESET_HOURS * 60 * 60 * 1000,
  emailVerificationTokenExpires: EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000,
  maxActiveSessions: Number.isNaN(DEFAULT_MAX_SESSIONS) ? 5 : DEFAULT_MAX_SESSIONS
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
