import { d as getAuthConfig, I as InputSanitizer, a as SecurityAuditor } from './utils_B4MKaY9u.mjs';
import { U as UsersService } from './users_DCnhfAXN.mjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { V as ValidationError, D as DatabaseError, s as safeAsync, v as validateRequired, N as NotFoundError, P as PermissionError } from './validation_DQbs7Sb1.mjs';
import bcrypt from 'bcrypt';

const DEFAULT_MAX_SESSIONS = parseInt(
  process.env.AUTH_MAX_ACTIVE_SESSIONS || "5",
  10
);
const PASSWORD_RESET_HOURS = parseInt(
  process.env.PASSWORD_RESET_EXPIRES_HOURS || "24",
  10
);
const EMAIL_VERIFICATION_HOURS = parseInt(
  process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || "48",
  10
);
const AUTH_CONFIG = {
  ...getAuthConfig(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  passwordResetTokenExpires: PASSWORD_RESET_HOURS * 60 * 60 * 1e3,
  emailVerificationTokenExpires: EMAIL_VERIFICATION_HOURS * 60 * 60 * 1e3,
  maxActiveSessions: Number.isNaN(DEFAULT_MAX_SESSIONS) ? 5 : DEFAULT_MAX_SESSIONS
};

const { JsonWebTokenError, sign, verify } = jwt;
class TokenManager {
  constructor(usersService) {
    this.usersService = usersService;
  }
  generateSecureToken() {
    return crypto.randomBytes(32).toString("hex");
  }
  generateUserId() {
    return `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }
  decodeAccessToken(token) {
    try {
      return verify(token, AUTH_CONFIG.jwtSecret);
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new ValidationError(
          "Invalid access token",
          "verify_token",
          "users"
        );
      }
      throw error;
    }
  }
  decodeRefreshToken(token) {
    try {
      return verify(token, AUTH_CONFIG.jwtRefreshSecret);
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new ValidationError(
          "Invalid refresh token",
          "refresh_token",
          "users"
        );
      }
      throw error;
    }
  }
  verifyPasswordResetToken(_token) {
    return { userId: "mock_user_id" };
  }
  async generateTokens(user, sessionInfo) {
    if (!user.email) {
      throw new DatabaseError(
        "User email is required for token generation",
        "TOKEN_GENERATION_FAILED",
        "generate_tokens",
        "users",
        { userId: user.userId }
      );
    }
    const accessPayload = {
      userId: user.userId,
      email: user.email,
      type: "access"
    };
    const refreshPayload = {
      userId: user.userId,
      type: "refresh"
    };
    const accessOptions = {
      expiresIn: AUTH_CONFIG.jwtExpiresIn
    };
    const refreshOptions = {
      expiresIn: AUTH_CONFIG.jwtRefreshExpiresIn
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
      createdAt: /* @__PURE__ */ new Date(),
      expiresAt: new Date(Date.now() + refreshExpiresIn),
      deviceInfo: sessionInfo.deviceInfo,
      ipAddress: sessionInfo.ipAddress
    };
    const updatedTokens = [
      tokenRecord,
      ...user.authentication.refreshTokens
    ].slice(0, AUTH_CONFIG.maxActiveSessions);
    const updateResult = await this.usersService.updateUser(
      user.userId,
      {
        ...user,
        authentication: {
          ...user.authentication,
          refreshTokens: updatedTokens
        }
      },
      user.userId
    );
    if (!updateResult.success) {
      throw new DatabaseError(
        updateResult.error || "Failed to persist refresh token",
        "REFRESH_TOKEN_STORE_FAILED",
        "generate_tokens",
        "users"
      );
    }
    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: "Bearer"
    };
  }
  parseExpiresIn(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1e3;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case "s":
        return value * 1e3;
      case "m":
        return value * 60 * 1e3;
      case "h":
        return value * 60 * 60 * 1e3;
      case "d":
        return value * 24 * 60 * 60 * 1e3;
      default:
        return 15 * 60 * 1e3;
    }
  }
}

class AccountSecurityManager {
  constructor(usersService) {
    this.usersService = usersService;
  }
  async incrementLoginAttempts(userId, ipAddress) {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }
    const user = userResult.data;
    const newAttempts = user.security.loginAttempts + 1;
    await this.usersService.updateUserSecurity(userId, {
      ...user.security,
      loginAttempts: newAttempts,
      suspiciousActivity: [
        {
          type: "FAILED_LOGIN_ATTEMPT",
          timestamp: /* @__PURE__ */ new Date(),
          ipAddress: ipAddress || "unknown",
          details: `Attempt ${newAttempts}`
        },
        ...user.security.suspiciousActivity.slice(0, 9)
      ]
    });
  }
  async resetLoginAttempts(userId) {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }
    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      loginAttempts: 0
    });
  }
  async lockAccount(userId, duration) {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }
    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      accountLocked: true,
      accountLockedUntil: new Date(Date.now() + duration)
    });
  }
  async unlockAccount(userId) {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }
    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      accountLocked: false,
      accountLockedUntil: void 0,
      loginAttempts: 0
    });
  }
  async updateLastLogin(userId, ipAddress) {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }
    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      lastLogin: /* @__PURE__ */ new Date(),
      lastLoginIP: ipAddress
    });
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function ensurePasswordStrength(password, operation = "validate_password") {
  if (password.length < 8) {
    throw new ValidationError(
      "Password must be at least 8 characters long",
      operation,
      "users",
      "password"
    );
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ValidationError(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
      operation,
      "users",
      "password"
    );
  }
}

function sanitizeUserForResponse(user) {
  const { authentication, security, ...sanitizedUser } = user;
  return {
    ...sanitizedUser,
    authentication: {
      password: "",
      emailVerified: authentication.emailVerified,
      emailVerifiedAt: authentication.emailVerifiedAt,
      passwordChangedAt: authentication.passwordChangedAt,
      refreshTokens: []
    }
  };
}

function createNewUser({
  userId,
  email,
  username,
  passwordHash,
  emailVerified = false,
  emailVerificationToken
}) {
  const now = /* @__PURE__ */ new Date();
  return {
    userId,
    email,
    username,
    preferences: {
      theme: "light",
      language: "en",
      audioEnabled: true,
      studyReminders: true
    },
    statistics: {
      totalCardsStudied: 0,
      totalStudyTime: 0,
      averageRecallRate: 0,
      streakDays: 0,
      lastStudyDate: void 0,
      cardsMastered: 0,
      totalSessions: 0
    },
    authentication: {
      password: passwordHash,
      emailVerified,
      emailVerificationToken,
      emailVerifiedAt: emailVerified ? now : void 0,
      passwordChangedAt: now,
      passwordResetToken: void 0,
      passwordResetExpires: void 0,
      refreshTokens: []
    },
    security: {
      lastLogin: void 0,
      lastLoginIP: void 0,
      loginAttempts: 0,
      accountLocked: false,
      accountLockedUntil: void 0,
      suspiciousActivity: []
    },
    profile: {
      joinDate: now
    }
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function assertValidEmail(email, operation) {
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(
      "Invalid email format",
      operation,
      "users",
      "email",
      email
    );
  }
}

function createRegisterHandler({
  usersService,
  tokenManager
}) {
  return (registerData, ipAddress) => safeAsync(
    async () => {
      validateRequired(
        registerData,
        ["email", "password", "confirmPassword"],
        "auth_register"
      );
      assertValidEmail(registerData.email, "register");
      ensurePasswordStrength(registerData.password);
      if (registerData.password !== registerData.confirmPassword) {
        throw new ValidationError(
          "Passwords do not match",
          "register",
          "users",
          "confirmPassword"
        );
      }
      const sanitizedEmail = InputSanitizer.sanitizeString(
        registerData.email
      );
      const sanitizedUsername = registerData.username ? InputSanitizer.sanitizeString(registerData.username) : void 0;
      try {
        const existingUser = await usersService.getUserByEmail(sanitizedEmail);
        if (existingUser.success && existingUser.data) {
          throw new ValidationError(
            "User with this email already exists",
            "register",
            "users",
            "email",
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
          createResult.error || "Failed to create user",
          "USER_CREATION_FAILED",
          "register",
          "users"
        );
      }
      const tokens = await tokenManager.generateTokens(createResult.data, {
        deviceInfo: "registration",
        ipAddress: ipAddress || "unknown"
      });
      SecurityAuditor.logSecurityEvent(
        "USER_REGISTERED",
        {
          userId: createResult.data.userId,
          email: sanitizedEmail,
          ipAddress
        },
        "low"
      );
      return {
        success: true,
        data: {
          user: sanitizeUserForResponse(createResult.data),
          tokens
        }
      };
    },
    { operation: "register", collection: "users" }
  );
}

function createLoginHandler({
  usersService,
  tokenManager,
  accountSecurity
}) {
  return (loginData) => safeAsync(
    async () => {
      validateRequired(loginData, ["email", "password"], "auth_login");
      const sanitizedEmail = InputSanitizer.sanitizeString(loginData.email);
      let user;
      try {
        const userResult = await usersService.getUserByEmail(sanitizedEmail);
        if (!userResult.success || !userResult.data) {
          throw new ValidationError(
            "Invalid email or password",
            "login",
            "users"
          );
        }
        user = userResult.data;
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new ValidationError(
            "Invalid email or password",
            "login",
            "users"
          );
        }
        throw error;
      }
      if (user.security.accountLocked) {
        if (user.security.accountLockedUntil && user.security.accountLockedUntil > /* @__PURE__ */ new Date()) {
          throw new PermissionError(
            "Account is temporarily locked due to too many failed login attempts",
            "login",
            "users",
            user.userId
          );
        }
        await accountSecurity.unlockAccount(user.userId);
        user.security.accountLocked = false;
        user.security.loginAttempts = 0;
      }
      const isPasswordValid = await verifyPassword(
        loginData.password,
        user.authentication.password
      );
      if (!isPasswordValid) {
        await accountSecurity.incrementLoginAttempts(
          user.userId,
          loginData.ipAddress
        );
        if (user.security.loginAttempts + 1 >= AUTH_CONFIG.maxLoginAttempts) {
          await accountSecurity.lockAccount(
            user.userId,
            AUTH_CONFIG.lockoutDuration
          );
          throw new PermissionError(
            `Account locked due to too many failed attempts. Try again in ${AUTH_CONFIG.lockoutDuration / (60 * 1e3)} minutes.`,
            "login",
            "users",
            user.userId
          );
        }
        throw new ValidationError(
          "Invalid email or password",
          "login",
          "users"
        );
      }
      if (!user.authentication.emailVerified) {
        throw new PermissionError(
          "Please verify your email address before logging in",
          "login",
          "users",
          user.userId
        );
      }
      await accountSecurity.resetLoginAttempts(user.userId);
      await accountSecurity.updateLastLogin(user.userId, loginData.ipAddress);
      const tokens = await tokenManager.generateTokens(user, {
        deviceInfo: loginData.deviceInfo || "web",
        ipAddress: loginData.ipAddress || "unknown"
      });
      SecurityAuditor.logSecurityEvent(
        "USER_LOGIN_SUCCESS",
        {
          userId: user.userId,
          email: user.email,
          ipAddress: loginData.ipAddress,
          deviceInfo: loginData.deviceInfo
        },
        "low"
      );
      return {
        success: true,
        data: {
          user: sanitizeUserForResponse(user),
          tokens
        }
      };
    },
    { operation: "login", collection: "users" }
  );
}

function createLogoutHandler({ usersService }) {
  return (userId, refreshToken) => safeAsync(
    async () => {
      const userResult = await usersService.getUserById(userId);
      if (!userResult.success || !userResult.data) {
        throw new ValidationError(
          "User not found",
          "logout",
          "users",
          "userId",
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
            refreshTokens: updatedTokens
          }
        },
        userId
      );
      if (!updateResult.success) {
        throw new DatabaseError(
          "Failed to logout user",
          "LOGOUT_FAILED",
          "logout",
          "users"
        );
      }
      SecurityAuditor.logSecurityEvent("USER_LOGOUT", { userId }, "low");
      return {
        success: true,
        data: { message: "Successfully logged out" }
      };
    },
    { operation: "logout", collection: "users", userId }
  );
}

function createRefreshTokenHandler({
  usersService,
  tokenManager
}) {
  return (refreshData) => safeAsync(
    async () => {
      const decoded = tokenManager.decodeRefreshToken(
        refreshData.refreshToken
      );
      const userResult = await usersService.getUserById(decoded.userId);
      if (!userResult.success || !userResult.data) {
        throw new ValidationError(
          "Invalid refresh token",
          "refresh_token",
          "users"
        );
      }
      const user = userResult.data;
      const tokenExists = user.authentication.refreshTokens.some(
        (token) => token.token === refreshData.refreshToken
      );
      if (!tokenExists) {
        throw new ValidationError(
          "Invalid refresh token",
          "refresh_token",
          "users"
        );
      }
      const tokens = await tokenManager.generateTokens(user, {
        deviceInfo: refreshData.deviceInfo || "web",
        ipAddress: refreshData.ipAddress || "unknown"
      });
      SecurityAuditor.logSecurityEvent(
        "TOKEN_REFRESHED",
        {
          userId: user.userId,
          ipAddress: refreshData.ipAddress
        },
        "low"
      );
      return {
        success: true,
        data: tokens
      };
    },
    { operation: "refresh_token", collection: "users" }
  );
}

function createInitiatePasswordResetHandler({
  usersService,
  tokenManager
}) {
  return (resetData) => safeAsync(
    async () => {
      validateRequired(resetData, ["email"], "password_reset");
      const sanitizedEmail = InputSanitizer.sanitizeString(resetData.email);
      const userResult = await usersService.getUserByEmail(sanitizedEmail);
      if (!userResult.success || !userResult.data) {
        return {
          success: true,
          data: {
            message: "If the email exists, a password reset link has been sent"
          }
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
            passwordResetExpires: resetExpires
          }
        },
        user.userId
      );
      if (!updateResult.success) {
        throw new DatabaseError(
          "Failed to initiate password reset",
          "PASSWORD_RESET_FAILED",
          "password_reset",
          "users"
        );
      }
      SecurityAuditor.logSecurityEvent(
        "PASSWORD_RESET_INITIATED",
        { userId: user.userId, email: user.email },
        "medium"
      );
      return {
        success: true,
        data: {
          message: "If the email exists, a password reset link has been sent"
        }
      };
    },
    { operation: "password_reset", collection: "users" }
  );
}
function createConfirmPasswordResetHandler({
  usersService,
  tokenManager
}) {
  return (resetConfirmData) => safeAsync(
    async () => {
      validateRequired(
        resetConfirmData,
        ["token", "newPassword", "confirmPassword"],
        "password_reset_confirm"
      );
      ensurePasswordStrength(resetConfirmData.newPassword);
      if (resetConfirmData.newPassword !== resetConfirmData.confirmPassword) {
        throw new ValidationError(
          "Passwords do not match",
          "password_reset_confirm",
          "users"
        );
      }
      const decoded = tokenManager.verifyPasswordResetToken(
        resetConfirmData.token
      );
      const userResult = await usersService.getUserById(decoded.userId);
      if (!userResult.success || !userResult.data) {
        throw new ValidationError(
          "Invalid or expired reset token",
          "password_reset_confirm",
          "users"
        );
      }
      const user = userResult.data;
      const tokenMatches = user.authentication.passwordResetToken === resetConfirmData.token;
      const tokenValid = user.authentication.passwordResetExpires && user.authentication.passwordResetExpires > /* @__PURE__ */ new Date();
      if (!tokenMatches || !tokenValid) {
        throw new ValidationError(
          "Invalid or expired reset token",
          "password_reset_confirm",
          "users"
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
            passwordChangedAt: /* @__PURE__ */ new Date(),
            passwordResetToken: void 0,
            passwordResetExpires: void 0
          }
        },
        user.userId
      );
      if (!updateResult.success) {
        throw new DatabaseError(
          "Failed to update password",
          "PASSWORD_UPDATE_FAILED",
          "password_reset_confirm",
          "users"
        );
      }
      SecurityAuditor.logSecurityEvent(
        "PASSWORD_CHANGED",
        { userId: user.userId },
        "medium"
      );
      return {
        success: true,
        data: { message: "Password successfully updated" }
      };
    },
    { operation: "password_reset_confirm", collection: "users" }
  );
}

function createVerifyAccessTokenHandler({
  usersService,
  tokenManager
}) {
  return (token) => safeAsync(
    async () => {
      const decoded = tokenManager.decodeAccessToken(token);
      const userResult = await usersService.getUserById(decoded.userId);
      if (!userResult.success || !userResult.data) {
        throw new ValidationError("User not found", "verify_token", "users");
      }
      return {
        success: true,
        data: sanitizeUserForResponse(userResult.data)
      };
    },
    { operation: "verify_token", collection: "users" }
  );
}

class AuthService {
  constructor(usersService = new UsersService()) {
    this.usersService = usersService;
    this.tokenManager = new TokenManager(this.usersService);
    this.accountSecurity = new AccountSecurityManager(this.usersService);
    this.registerHandler = createRegisterHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager
    });
    this.loginHandler = createLoginHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager,
      accountSecurity: this.accountSecurity
    });
    this.logoutHandler = createLogoutHandler({
      usersService: this.usersService
    });
    this.refreshTokenHandler = createRefreshTokenHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager
    });
    this.initiatePasswordResetHandler = createInitiatePasswordResetHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager
    });
    this.confirmPasswordResetHandler = createConfirmPasswordResetHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager
    });
    this.verifyAccessTokenHandler = createVerifyAccessTokenHandler({
      usersService: this.usersService,
      tokenManager: this.tokenManager
    });
  }
  register(registerData, ipAddress) {
    return this.registerHandler(registerData, ipAddress);
  }
  login(loginData) {
    return this.loginHandler(loginData);
  }
  logout(userId, refreshToken) {
    return this.logoutHandler(userId, refreshToken);
  }
  refreshToken(refreshData) {
    return this.refreshTokenHandler(refreshData);
  }
  initiatePasswordReset(resetData) {
    return this.initiatePasswordResetHandler(resetData);
  }
  confirmPasswordReset(resetConfirmData) {
    return this.confirmPasswordResetHandler(resetConfirmData);
  }
  verifyAccessToken(token) {
    return this.verifyAccessTokenHandler(token);
  }
}

const authService = new AuthService();
const login = async (email, password, ipAddress, deviceInfo) => {
  const payload = {
    email,
    password,
    deviceInfo: deviceInfo || "Unknown Device",
    ipAddress: ipAddress
  };
  return authService.login(payload);
};
const register = async (data) => {
  const payload = {
    email: data.email,
    username: data.username,
    password: data.password,
    confirmPassword: data.password
  };
  return authService.register(payload, data.clientIP);
};
const logout = async (accessToken, refreshToken, clientIP) => {
  if (!accessToken && !refreshToken) {
    return { success: true, message: "No tokens to invalidate" };
  }
  SecurityAuditor.logSecurityEvent(
    "LOGOUT_API_CALLED",
    {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      clientIP
    },
    "low"
  );
  return { success: true, message: "Logged out successfully" };
};
const refreshAccessToken = async (refreshToken, clientIP) => {
  const payload = {
    refreshToken,
    ipAddress: clientIP
  };
  return authService.refreshToken(payload);
};
const verifyAccessToken = async (token) => {
  return authService.verifyAccessToken(token);
};
const getUserById = async (userId) => {
  const usersService = new UsersService();
  return usersService.getUserById(userId);
};

export { logout as a, register as b, getUserById as g, login as l, refreshAccessToken as r, verifyAccessToken as v };
