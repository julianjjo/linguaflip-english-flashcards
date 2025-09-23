import type { UsersService } from '../users.ts';

export class AccountSecurityManager {
  constructor(private readonly usersService: UsersService) {}

  async incrementLoginAttempts(
    userId: string,
    ipAddress?: string
  ): Promise<void> {
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
          type: 'FAILED_LOGIN_ATTEMPT',
          timestamp: new Date(),
          ipAddress: ipAddress || 'unknown',
          details: `Attempt ${newAttempts}`,
        },
        ...user.security.suspiciousActivity.slice(0, 9),
      ],
    });
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }

    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      loginAttempts: 0,
    });
  }

  async lockAccount(userId: string, duration: number): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }

    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      accountLocked: true,
      accountLockedUntil: new Date(Date.now() + duration),
    });
  }

  async unlockAccount(userId: string): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }

    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      accountLocked: false,
      accountLockedUntil: undefined,
      loginAttempts: 0,
    });
  }

  async updateLastLogin(userId: string, ipAddress?: string): Promise<void> {
    const userResult = await this.usersService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      return;
    }

    await this.usersService.updateUserSecurity(userId, {
      ...userResult.data.security,
      lastLogin: new Date(),
      lastLoginIP: ipAddress,
    });
  }
}
