// Comprehensive Authentication System Integration Test
import 'mocha';
import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { getMockMongoDBServer } from './mongodb-mock-server.js';
import { AuthService } from '../src/services/auth.ts';
import { UsersService } from '../src/services/users.ts';
import { DatabaseConnection } from '../src/utils/database.ts';

// Test configuration
const TEST_CONFIG = {
  validUser: {
    email: 'test@example.com',
    username: 'testuser',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!'
  },
  invalidEmails: [
    'invalid-email',
    '@example.com',
    'test@',
    '',
    'test@.com'
  ],
  weakPasswords: [
    '123',
    'password',
    'abc',
    ''
  ]
};

describe('Authentication System Integration Tests', () => {
  let mockServer: any;
  let client: MongoClient;
  let db: any;
  let authService: AuthService;
  let usersService: UsersService;

  before(async function() {
    this.timeout(30000);

    try {
      // Start mock MongoDB server
      mockServer = getMockMongoDBServer();
      const mongoUri = await mockServer.start();

      // Override environment for testing
      process.env.NODE_ENV = 'test';
      process.env.MONGODB_TEST_URI = mongoUri;
      process.env.MONGODB_TEST_DATABASE = 'linguaflip_test';
      process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-only';

      // Connect using our database utilities
      const dbConnection = DatabaseConnection.getInstance();
      await dbConnection.connect();

      db = dbConnection.getDatabase();
      client = dbConnection.getClient();

      // Initialize services
      authService = new AuthService();
      usersService = new UsersService();

      console.log('Authentication test environment initialized');
    } catch (error) {
      console.error('Failed to setup authentication test environment:', error);
      throw error;
    }
  });

  after(async () => {
    try {
      // Clean up database connection
      const dbConnection = DatabaseConnection.getInstance();
      await dbConnection.close();

      // Stop mock server
      if (mockServer) {
        await mockServer.stop();
      }

      console.log('Authentication test cleanup completed');
    } catch (error) {
      console.error('Error during authentication test cleanup:', error);
    }
  });

  beforeEach(async () => {
    // Clear all collections before each test
    if (mockServer && mockServer.isServerRunning()) {
      await mockServer.clearDatabase();
    }
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      const result = await authService.register(TEST_CONFIG.validUser);

      expect(result.success).to.be.true;
      expect(result.data).to.be.an('object');
      expect(result.data!.user).to.be.an('object');
      expect(result.data!.tokens).to.be.an('object');

      // Verify user data
      const user = result.data!.user;
      expect(user.email).to.equal(TEST_CONFIG.validUser.email);
      expect(user.username).to.equal(TEST_CONFIG.validUser.username);
      expect(user).to.not.have.property('authentication'); // Should be sanitized

      // Verify tokens
      const tokens = result.data!.tokens;
      expect(tokens.accessToken).to.be.a('string');
      expect(tokens.refreshToken).to.be.a('string');
      expect(tokens.expiresIn).to.be.a('number');
      expect(tokens.tokenType).to.equal('Bearer');
    });

    it('should reject registration with invalid email format', async () => {
      for (const invalidEmail of TEST_CONFIG.invalidEmails) {
        const result = await authService.register({
          ...TEST_CONFIG.validUser,
          email: invalidEmail
        });

        expect(result.success).to.be.false;
        expect(result.error).to.include('Invalid email format');
      }
    });

    it('should reject registration with weak passwords', async () => {
      for (const weakPassword of TEST_CONFIG.weakPasswords) {
        const result = await authService.register({
          ...TEST_CONFIG.validUser,
          password: weakPassword,
          confirmPassword: weakPassword
        });

        expect(result.success).to.be.false;
        expect(result.error).to.include('Password');
      }
    });

    it('should reject registration when passwords do not match', async () => {
      const result = await authService.register({
        ...TEST_CONFIG.validUser,
        confirmPassword: 'DifferentPassword123!'
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Passwords do not match');
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await authService.register(TEST_CONFIG.validUser);

      // Try to register with same email
      const result = await authService.register({
        ...TEST_CONFIG.validUser,
        username: 'differentuser'
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('already exists');
    });

    it('should handle registration without username', async () => {
      const userWithoutUsername = {
        email: 'nousername@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!'
      };

      const result = await authService.register(userWithoutUsername);

      expect(result.success).to.be.true;
      expect(result.data!.user.email).to.equal(userWithoutUsername.email);
      expect(result.data!.user.username).to.be.undefined;
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Register a test user for login tests
      await authService.register(TEST_CONFIG.validUser);
    });

    it('should successfully login with correct credentials', async () => {
      const result = await authService.login({
        email: TEST_CONFIG.validUser.email,
        password: TEST_CONFIG.validUser.password
      });

      expect(result.success).to.be.true;
      expect(result.data).to.be.an('object');
      expect(result.data!.user).to.be.an('object');
      expect(result.data!.tokens).to.be.an('object');

      // Verify user data
      const user = result.data!.user;
      expect(user.email).to.equal(TEST_CONFIG.validUser.email);

      // Verify tokens
      const tokens = result.data!.tokens;
      expect(tokens.accessToken).to.be.a('string');
      expect(tokens.refreshToken).to.be.a('string');
    });

    it('should reject login with incorrect password', async () => {
      const result = await authService.login({
        email: TEST_CONFIG.validUser.email,
        password: 'WrongPassword123!'
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const result = await authService.login({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid email or password');
    });

    it('should handle login with device info and IP address', async () => {
      const result = await authService.login({
        email: TEST_CONFIG.validUser.email,
        password: TEST_CONFIG.validUser.password,
        deviceInfo: 'Chrome on MacOS',
        ipAddress: '192.168.1.100'
      });

      expect(result.success).to.be.true;
      expect(result.data!.user).to.be.an('object');
      expect(result.data!.tokens).to.be.an('object');
    });
  });

  describe('Token Management', () => {
    let userTokens: any;
    let userId: string;

    beforeEach(async () => {
      // Register and login to get tokens
      const registerResult = await authService.register(TEST_CONFIG.validUser);
      userTokens = registerResult.data!.tokens;
      userId = registerResult.data!.user.userId!;
    });

    it('should refresh access token with valid refresh token', async () => {
      const result = await authService.refreshToken({
        refreshToken: userTokens.refreshToken
      });

      expect(result.success).to.be.true;
      expect(result.data).to.be.an('object');
      expect(result.data!.accessToken).to.be.a('string');
      expect(result.data!.refreshToken).to.be.a('string');
      expect(result.data!.accessToken).to.not.equal(userTokens.accessToken); // Should be new
    });

    it('should reject refresh with invalid token', async () => {
      const result = await authService.refreshToken({
        refreshToken: 'invalid-refresh-token'
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid refresh token');
    });

    it('should logout and invalidate refresh token', async () => {
      const logoutResult = await authService.logout(userId, userTokens.refreshToken);

      expect(logoutResult.success).to.be.true;
      expect(logoutResult.data!.message).to.include('logged out');

      // Try to refresh with the invalidated token
      const refreshResult = await authService.refreshToken({
        refreshToken: userTokens.refreshToken
      });

      expect(refreshResult.success).to.be.false;
    });
  });

  describe('Password Reset', () => {
    beforeEach(async () => {
      // Register a test user
      await authService.register(TEST_CONFIG.validUser);
    });

    it('should initiate password reset for existing user', async () => {
      const result = await authService.initiatePasswordReset({
        email: TEST_CONFIG.validUser.email
      });

      // Should always return success for security (doesn't reveal if email exists)
      expect(result.success).to.be.true;
      expect(result.data!.message).to.include('sent');
    });

    it('should handle password reset for non-existent email', async () => {
      const result = await authService.initiatePasswordReset({
        email: 'nonexistent@example.com'
      });

      // Should still return success for security
      expect(result.success).to.be.true;
      expect(result.data!.message).to.include('sent');
    });
  });

  describe('Security Features', () => {
    it('should enforce account lockout after failed attempts', async function() {
      this.timeout(10000);

      // Register a user
      await authService.register(TEST_CONFIG.validUser);

      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        const result = await authService.login({
          email: TEST_CONFIG.validUser.email,
          password: 'WrongPassword123!'
        });
        expect(result.success).to.be.false;
      }

      // Next attempt should indicate account is locked
      const finalResult = await authService.login({
        email: TEST_CONFIG.validUser.email,
        password: TEST_CONFIG.validUser.password
      });

      expect(finalResult.success).to.be.false;
      expect(finalResult.error).to.include('locked');
    });

    it('should sanitize user input', async () => {
      const maliciousData = {
        email: 'test@example.com',
        username: '<script>alert("xss")</script>',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!'
      };

      const result = await authService.register(maliciousData);

      expect(result.success).to.be.true;
      // Username should be sanitized
      expect(result.data!.user.username).to.not.include('<script>');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close the mock server to simulate connection error
      await mockServer.stop();

      const result = await authService.register(TEST_CONFIG.validUser);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');

      // Restart server for other tests
      await mockServer.start();
    });

    it('should handle malformed input data', async () => {
      const result = await authService.register(null as any);

      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
    });

    it('should handle empty required fields', async () => {
      const result = await authService.register({
        email: '',
        password: '',
        confirmPassword: ''
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('required');
    });
  });

  describe('Integration with Users Service', () => {
    let registeredUser: any;

    beforeEach(async () => {
      // Register a user
      const result = await authService.register(TEST_CONFIG.validUser);
      registeredUser = result.data!.user;
    });

    it('should retrieve user by ID from users service', async () => {
      const result = await usersService.getUserById(registeredUser.userId);

      expect(result.success).to.be.true;
      expect(result.data!.email).to.equal(TEST_CONFIG.validUser.email);
      expect(result.data!.username).to.equal(TEST_CONFIG.validUser.username);
    });

    it('should retrieve user by email from users service', async () => {
      const result = await usersService.getUserByEmail(TEST_CONFIG.validUser.email);

      expect(result.success).to.be.true;
      expect(result.data!.userId).to.equal(registeredUser.userId);
    });

    it('should update user preferences', async () => {
      const updateResult = await usersService.updateUserPreferences(
        registeredUser.userId,
        { theme: 'dark', language: 'es' },
        registeredUser.userId
      );

      expect(updateResult.success).to.be.true;
      expect(updateResult.data!.preferences.theme).to.equal('dark');
      expect(updateResult.data!.preferences.language).to.equal('es');
    });

    it('should update user statistics', async () => {
      const updateResult = await usersService.updateUserStatistics(
        registeredUser.userId,
        { totalCardsStudied: 100, averageRecallRate: 85 }
      );

      expect(updateResult.success).to.be.true;
      expect(updateResult.data!.statistics.totalCardsStudied).to.equal(100);
      expect(updateResult.data!.statistics.averageRecallRate).to.equal(85);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent registrations', async function() {
      this.timeout(15000);

      const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        username: `user${i}`,
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!'
      }));

      const promises = users.map(user => authService.register(user));
      const results = await Promise.all(promises);

      // All registrations should succeed
      results.forEach(result => {
        expect(result.success).to.be.true;
        expect(result.data).to.be.an('object');
      });

      // Verify all users were created
      const userCount = await usersService.getUserCount();
      expect(userCount.success).to.be.true;
      expect(userCount.data).to.equal(10);
    });

    it('should handle concurrent login attempts', async function() {
      this.timeout(10000);

      // Register a user
      await authService.register(TEST_CONFIG.validUser);

      // Attempt multiple concurrent logins
      const loginPromises = Array.from({ length: 5 }, () =>
        authService.login({
          email: TEST_CONFIG.validUser.email,
          password: TEST_CONFIG.validUser.password
        })
      );

      const results = await Promise.all(loginPromises);

      // All logins should succeed
      results.forEach(result => {
        expect(result.success).to.be.true;
        expect(result.data!.tokens).to.be.an('object');
      });
    });
  });
});