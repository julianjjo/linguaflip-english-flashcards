import { UsersService } from '../users.ts';
import type { UserDocument } from '../../types/database.ts';
import type {
  AuthOperationResult,
  AuthResult,
  AuthTokens,
  LoginData,
  PasswordResetConfirmData,
  PasswordResetData,
  RefreshTokenData,
  RegisterData,
} from './types.ts';
import { TokenManager } from './tokenManager.ts';
import { AccountSecurityManager } from './accountSecurityManager.ts';
import { createRegisterHandler } from './register.ts';
import { createLoginHandler } from './login.ts';
import { createLogoutHandler } from './logout.ts';
import { createRefreshTokenHandler } from './refreshToken.ts';
import {
  createConfirmPasswordResetHandler,
  createInitiatePasswordResetHandler,
} from './passwordReset.ts';
import { createVerifyAccessTokenHandler } from './verifyAccessToken.ts';

export class AuthService {
  private readonly usersService: UsersService;
  private readonly tokenManager: TokenManager;
  private readonly accountSecurity: AccountSecurityManager;

  private readonly registerHandler: (
    registerData: RegisterData,
    ipAddress?: string
  ) => AuthOperationResult<AuthResult>;

  private readonly loginHandler: (
    loginData: LoginData
  ) => AuthOperationResult<AuthResult>;

  private readonly logoutHandler: (
    userId: string,
    refreshToken: string
  ) => AuthOperationResult<{ message: string }>;

  private readonly refreshTokenHandler: (
    refreshData: RefreshTokenData
  ) => AuthOperationResult<AuthTokens>;

  private readonly initiatePasswordResetHandler: (
    resetData: PasswordResetData
  ) => AuthOperationResult<{ message: string }>;

  private readonly confirmPasswordResetHandler: (
    resetConfirmData: PasswordResetConfirmData
  ) => AuthOperationResult<{ message: string }>;

  private readonly verifyAccessTokenHandler: (
    token: string
  ) => AuthOperationResult<Partial<UserDocument>>;

  constructor(usersService: UsersService = new UsersService()) {
    this.usersService = usersService;
    this.tokenManager = new TokenManager(this.usersService);
    this.accountSecurity = new AccountSecurityManager(this.usersService);

    this.registerHandler = createRegisterHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager,
    });

    this.loginHandler = createLoginHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager,
      accountSecurity: this.accountSecurity,
    });

    this.logoutHandler = createLogoutHandler({
      usersService: this.usersService,
    });

    this.refreshTokenHandler = createRefreshTokenHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager,
    });

    this.initiatePasswordResetHandler = createInitiatePasswordResetHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager,
    });

    this.confirmPasswordResetHandler = createConfirmPasswordResetHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager,
    });

    this.verifyAccessTokenHandler = createVerifyAccessTokenHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager,
    });
  }

  register(registerData: RegisterData, ipAddress?: string) {
    return this.registerHandler(registerData, ipAddress);
  }

  login(loginData: LoginData) {
    return this.loginHandler(loginData);
  }

  logout(userId: string, refreshToken: string) {
    return this.logoutHandler(userId, refreshToken);
  }

  refreshToken(refreshData: RefreshTokenData) {
    return this.refreshTokenHandler(refreshData);
  }

  initiatePasswordReset(resetData: PasswordResetData) {
    return this.initiatePasswordResetHandler(resetData);
  }

  confirmPasswordReset(resetConfirmData: PasswordResetConfirmData) {
    return this.confirmPasswordResetHandler(resetConfirmData);
  }

  verifyAccessToken(token: string) {
    return this.verifyAccessTokenHandler(token);
  }
}
