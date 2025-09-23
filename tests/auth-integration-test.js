// Simplified Authentication Test
const { MockAuthService, MockUsersService } = require('./mocks/auth.js');

describe('Authentication System', () => {
  let authService;
  let usersService;

  const validUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
  };

  beforeEach(() => {
    authService = new MockAuthService();
    usersService = new MockUsersService();
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const result = await authService.register(validUser);

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(validUser.email);
      expect(result.data.user.username).toBe(validUser.username);
      expect(result.data.tokens.accessToken).toBeDefined();
      expect(result.data.tokens.refreshToken).toBeDefined();
    });

    test('should reject registration with mismatched passwords', async () => {
      const result = await authService.register({
        ...validUser,
        confirmPassword: 'DifferentPassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Passwords do not match');
    });

    test('should reject duplicate email registration', async () => {
      await authService.register(validUser);

      const result = await authService.register(validUser);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      await authService.register(validUser);
    });

    test('should login with correct credentials', async () => {
      const result = await authService.login({
        email: validUser.email,
        password: validUser.password,
      });

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(validUser.email);
      expect(result.data.tokens).toBeDefined();
    });

    test('should reject login with wrong email', async () => {
      const result = await authService.login({
        email: 'wrong@example.com',
        password: validUser.password,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });
  });

  describe('Token Management', () => {
    let userTokens;
    let userId;

    beforeEach(async () => {
      const result = await authService.register(validUser);
      userTokens = result.data.tokens;
      userId = result.data.user.userId;
    });

    test('should refresh tokens', async () => {
      const result = await authService.refreshToken({
        refreshToken: userTokens.refreshToken,
      });

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.accessToken).not.toBe(userTokens.accessToken);
    });

    test('should logout successfully', async () => {
      const result = await authService.logout(userId, userTokens.refreshToken);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('logged out');
    });
  });
});
