// Mock Auth Service for Testing
class MockAuthService {
  constructor() {
    this.users = new Map();
    this.tokens = new Map();
  }

  async register(userData) {
    const { email, username, password, confirmPassword } = userData;

    // Basic validation
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    if (this.users.has(email)) {
      return { success: false, error: 'User already exists' };
    }

    const userId = `user_${Date.now()}`;
    const user = {
      userId,
      email,
      username,
      createdAt: new Date(),
    };

    this.users.set(email, user);

    const tokens = {
      accessToken: `access_${userId}`,
      refreshToken: `refresh_${userId}`,
      expiresIn: 3600,
      tokenType: 'Bearer',
    };

    this.tokens.set(userId, tokens);

    return {
      success: true,
      data: { user, tokens },
    };
  }

  async login(loginData) {
    const { email, password } = loginData;

    const user = this.users.get(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    const tokens = this.tokens.get(user.userId);

    return {
      success: true,
      data: { user, tokens },
    };
  }

  async refreshToken(refreshData) {
    const { refreshToken } = refreshData;

    for (const [userId, tokens] of this.tokens.entries()) {
      if (tokens.refreshToken === refreshToken) {
        const newTokens = {
          accessToken: `new_access_${userId}`,
          refreshToken: `new_refresh_${userId}`,
          expiresIn: 3600,
          tokenType: 'Bearer',
        };

        this.tokens.set(userId, newTokens);
        return { success: true, data: newTokens };
      }
    }

    return { success: false, error: 'Invalid refresh token' };
  }

  async logout(userId, refreshToken) {
    this.tokens.delete(userId);
    return { success: true, data: { message: 'Successfully logged out' } };
  }

  async initiatePasswordReset(data) {
    return { success: true, data: { message: 'Reset email sent' } };
  }
}

class MockUsersService {
  constructor() {
    this.users = new Map();
  }

  async getUserById(userId) {
    for (const user of this.users.values()) {
      if (user.userId === userId) {
        return { success: true, data: user };
      }
    }
    return { success: false, error: 'User not found' };
  }

  async getUserByEmail(email) {
    const user = this.users.get(email);
    return user
      ? { success: true, data: user }
      : { success: false, error: 'User not found' };
  }

  async updateUserPreferences(userId, preferences) {
    for (const [email, user] of this.users.entries()) {
      if (user.userId === userId) {
        const updated = { ...user, preferences };
        this.users.set(email, updated);
        return { success: true, data: updated };
      }
    }
    return { success: false, error: 'User not found' };
  }

  async updateUserStatistics(userId, statistics) {
    for (const [email, user] of this.users.entries()) {
      if (user.userId === userId) {
        const updated = { ...user, statistics };
        this.users.set(email, updated);
        return { success: true, data: updated };
      }
    }
    return { success: false, error: 'User not found' };
  }

  async getUserCount() {
    return { success: true, data: this.users.size };
  }
}

module.exports = { MockAuthService, MockUsersService };
