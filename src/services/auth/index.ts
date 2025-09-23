import { SecurityAuditor } from '../../utils/security.ts';
import { AuthService } from './authService.ts';
import type { LoginData } from './types.ts';
import type { RegisterData } from './types.ts';
import type { RefreshTokenData } from './types.ts';
import { UsersService } from '../users.ts';

export * from './types.ts';
export { AuthService } from './authService.ts';

export const authService = new AuthService();

export const login = async (email: string, password: string, ipAddress?: string, deviceInfo?: string) => {
  const payload: LoginData = {
    email,
    password,
    deviceInfo: deviceInfo || 'Unknown Device',
    ipAddress: ipAddress || 'unknown'
  };

  return authService.login(payload);
};

export const register = async (data: {
  email: string;
  username?: string;
  password: string;
  clientIP?: string;
}) => {
  const payload: RegisterData = {
    email: data.email,
    username: data.username,
    password: data.password,
    confirmPassword: data.password
  };

  return authService.register(payload, data.clientIP);
};

export const logout = async (accessToken?: string | null, refreshToken?: string | null, clientIP?: string) => {
  if (!accessToken && !refreshToken) {
    return { success: true, message: 'No tokens to invalidate' } as const;
  }

  SecurityAuditor.logSecurityEvent(
    'LOGOUT_API_CALLED',
    { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken, clientIP },
    'low'
  );

  return { success: true, message: 'Logged out successfully' } as const;
};

export const refreshAccessToken = async (refreshToken: string, clientIP?: string) => {
  const payload: RefreshTokenData = {
    refreshToken,
    ipAddress: clientIP || 'unknown'
  };

  return authService.refreshToken(payload);
};

export const verifyAccessToken = async (token: string) => {
  return authService.verifyAccessToken(token);
};

export const getUserById = async (userId: string) => {
  const usersService = new UsersService();
  return usersService.getUserById(userId);
};
