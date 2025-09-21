/**
 * Users Service - MongoDB CRUD Operations for LinguaFlip
 *
 * This service provides comprehensive CRUD operations for user management,
 * including profile management, preferences, statistics, and security features.
 */

import { createDatabaseOperations } from '../utils/databaseOperations.ts';
import type { UserDocument, DatabaseOperationResult, UserFilter } from '../types/database.ts';
import {
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ValidationError,
  safeAsync,
  validateRequired,
  validateOwnership
} from '../types/database.ts';
import { UserSchema, validateDocument, sanitizeInput } from '../schemas/mongodb.ts';

const COLLECTION_NAME = 'users';
const dbOps = createDatabaseOperations(COLLECTION_NAME);

/**
 * Users Service Class
 */
export class UsersService {
  /**
   * Create a new user
   */
  async createUser(userData: Omit<UserDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      // Validate required fields
      validateRequired(userData, ['userId', 'preferences', 'statistics', 'authentication'], COLLECTION_NAME);

      // Sanitize input data
      const sanitizedData = this.sanitizeUserData(userData);

      // Add timestamps for validation
      const now = new Date();
      const dataWithTimestamps = {
        ...sanitizedData,
        createdAt: now,
        updatedAt: now,
      };

      // Validate against schema
      const validation = validateDocument(dataWithTimestamps, UserSchema);
      if (!validation.isValid) {
        throw new ValidationError(
          `User validation failed: ${validation.errors.join(', ')}`,
          'create_user',
          COLLECTION_NAME
        );
      }

      // Check for duplicate userId or email
      await this.checkForDuplicates(sanitizedData.userId as string, sanitizedData.email as string);

      // Create user
      const result = await dbOps.create(sanitizedData) as DatabaseOperationResult<UserDocument>;

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to create user',
          'CREATE_USER_FAILED',
          'create_user',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'create_user', collection: COLLECTION_NAME });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      if (!userId) {
        throw new ValidationError(
          'User ID is required',
          'get_user_by_id',
          COLLECTION_NAME,
          'userId'
        );
      }

      const result = await dbOps.findOne({ userId }) as DatabaseOperationResult<UserDocument | null>;

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve user',
          'GET_USER_FAILED',
          'get_user_by_id',
          COLLECTION_NAME
        );
      }

      if (!result.data) {
        throw new NotFoundError(
          `User with ID ${userId} not found`,
          'get_user_by_id',
          COLLECTION_NAME,
          userId
        );
      }

      return result as DatabaseOperationResult<UserDocument>;
    }, { operation: 'get_user_by_id', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      if (!email) {
        throw new ValidationError(
          'Email is required',
          'get_user_by_email',
          COLLECTION_NAME,
          'email'
        );
      }

      const result = await dbOps.findOne({ email }) as DatabaseOperationResult<UserDocument | null>;

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve user',
          'GET_USER_FAILED',
          'get_user_by_email',
          COLLECTION_NAME
        );
      }

      if (!result.data) {
        throw new NotFoundError(
          `User with email ${email} not found`,
          'get_user_by_email',
          COLLECTION_NAME,
          email
        );
      }

      return result as DatabaseOperationResult<UserDocument>;
    }, { operation: 'get_user_by_email', collection: COLLECTION_NAME });
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updates: Partial<UserDocument>,
    requestingUserId: string
  ): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      // Validate ownership
      validateOwnership(userId, requestingUserId, COLLECTION_NAME);

      // Get current user data
      const currentUser = await this.getUserById(userId);
      if (!currentUser.success || !currentUser.data) {
        throw new NotFoundError(
          `User with ID ${userId} not found`,
          'update_user',
          COLLECTION_NAME,
          userId
        );
      }

      // Sanitize updates
      const sanitizedUpdates = this.sanitizeUserData(updates);

      // Validate updated data against schema
      const updatedData = { ...currentUser.data, ...sanitizedUpdates };
      const validation = validateDocument(updatedData, UserSchema);
      if (!validation.isValid) {
        throw new ValidationError(
          `User validation failed: ${validation.errors.join(', ')}`,
          'update_user',
          COLLECTION_NAME
        );
      }

      // Check for duplicate email if email is being updated
      if (sanitizedUpdates.email && (sanitizedUpdates.email as string) !== currentUser.data.email) {
        await this.checkForDuplicates(userId, sanitizedUpdates.email as string);
      }

      // Update user
      const result = await dbOps.updateOne(
        { userId },
        { $set: sanitizedUpdates }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to update user',
          'UPDATE_USER_FAILED',
          'update_user',
          COLLECTION_NAME
        );
      }

      // Return updated user
      return this.getUserById(userId);
    }, { operation: 'update_user', collection: COLLECTION_NAME, userId });
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserDocument['preferences']>,
    requestingUserId: string
  ): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      // Validate ownership
      validateOwnership(userId, requestingUserId, COLLECTION_NAME);

      // Validate preferences structure
      const validPreferences = this.validatePreferences(preferences);

      // Update preferences
      const result = await dbOps.updateOne(
        { userId },
        { $set: { 'preferences': validPreferences } }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to update user preferences',
          'UPDATE_PREFERENCES_FAILED',
          'update_user_preferences',
          COLLECTION_NAME
        );
      }

      // Return updated user
      return this.getUserById(userId);
    }, { operation: 'update_user_preferences', collection: COLLECTION_NAME, userId });
  }

  /**
   * Update user statistics
   */
  async updateUserStatistics(
    userId: string,
    statistics: Partial<UserDocument['statistics']>
  ): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      // Validate statistics structure
      const validStatistics = this.validateStatistics(statistics);

      // Update statistics
      const result = await dbOps.updateOne(
        { userId },
        {
          $set: {
            'statistics': validStatistics,
            'statistics.lastStudyDate': new Date()
          }
        }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to update user statistics',
          'UPDATE_STATISTICS_FAILED',
          'update_user_statistics',
          COLLECTION_NAME
        );
      }

      // Return updated user
      return this.getUserById(userId);
    }, { operation: 'update_user_statistics', collection: COLLECTION_NAME, userId });
  }

  /**
   * Delete user
   */
  async deleteUser(
    userId: string,
    requestingUserId: string
  ): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    return safeAsync(async () => {
      // Validate ownership
      validateOwnership(userId, requestingUserId, COLLECTION_NAME);

      // Delete user
      const result = await dbOps.deleteOne({ userId });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to delete user',
          'DELETE_USER_FAILED',
          'delete_user',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'delete_user', collection: COLLECTION_NAME, userId });
  }

  /**
   * Search users by criteria
   */
  async searchUsers(
    filter: UserFilter,
    options: { limit?: number; skip?: number; sort?: Record<string, 1 | -1> } = {}
  ): Promise<DatabaseOperationResult<UserDocument[]>> {
    return safeAsync(async () => {
      const query: Record<string, unknown> = {};

      // Build query from filter
      if (filter.userId) query.userId = filter.userId;
      if (filter.email) query.email = new RegExp(filter.email, 'i');
      if (filter.username) query.username = new RegExp(filter.username, 'i');

      // Set default options
      const queryOptions = {
        limit: options.limit || 50,
        skip: options.skip || 0,
        sort: options.sort || { createdAt: -1 }
      };

      const result = await dbOps.findMany(query, queryOptions) as DatabaseOperationResult<UserDocument[]>;

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to search users',
          'SEARCH_USERS_FAILED',
          'search_users',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'search_users', collection: COLLECTION_NAME });
  }

  /**
   * Get user count
   */
  async getUserCount(filter: UserFilter = {}): Promise<DatabaseOperationResult<number>> {
    return safeAsync(async () => {
      const query: Record<string, unknown> = {};

      // Build query from filter
      if (filter.userId) query.userId = filter.userId;
      if (filter.email) query.email = new RegExp(filter.email, 'i');
      if (filter.username) query.username = new RegExp(filter.username, 'i');

      const result = await dbOps.count(query);

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to count users',
          'COUNT_USERS_FAILED',
          'get_user_count',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'get_user_count', collection: COLLECTION_NAME });
  }

  /**
   * Update user security information
   */
  async updateUserSecurity(
    userId: string,
    securityUpdates: Partial<UserDocument['security']>
  ): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      // Validate security updates
      const validSecurity = this.validateSecurity(securityUpdates);

      // Update security information
      const result = await dbOps.updateOne(
        { userId },
        { $set: { 'security': validSecurity } }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to update user security',
          'UPDATE_SECURITY_FAILED',
          'update_user_security',
          COLLECTION_NAME
        );
      }

      // Return updated user
      return this.getUserById(userId);
    }, { operation: 'update_user_security', collection: COLLECTION_NAME, userId });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Sanitize user data
   */
  private sanitizeUserData(userData: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...userData };

    // Sanitize string fields
    if (sanitized.email) sanitized.email = sanitizeInput(sanitized.email as string);
    if (sanitized.username) sanitized.username = sanitizeInput(sanitized.username as string);
    // Note: profile.bio sanitization removed due to type constraints

    return sanitized;
  }

  /**
   * Check for duplicate userId or email
   */
  private async checkForDuplicates(userId: string, email?: string): Promise<void> {
    // Check for duplicate userId
    const existingUser = await dbOps.findOne({ userId });
    if (existingUser.success && existingUser.data) {
      throw new DuplicateError(
        `User with ID ${userId} already exists`,
        'create_user',
        COLLECTION_NAME,
        'userId',
        userId
      );
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await dbOps.findOne({ email });
      if (existingEmail.success && existingEmail.data) {
        throw new DuplicateError(
          `User with email ${email} already exists`,
          'create_user',
          COLLECTION_NAME,
          'email',
          email
        );
      }
    }
  }

  /**
   * Validate preferences structure
   */
  private validatePreferences(preferences: Record<string, unknown>): UserDocument['preferences'] {
    const validPreferences = {
      theme: 'light' as const,
      language: 'en',
      audioEnabled: true,
      studyReminders: true,
      dailyCardLimit: undefined,
      sessionDuration: undefined,
      ...preferences
    } as UserDocument['preferences'];

    // Validate theme
    if (!['light', 'dark', 'auto'].includes(validPreferences.theme)) {
      throw new ValidationError(
        `Invalid theme: ${validPreferences.theme}`,
        'validate_preferences',
        COLLECTION_NAME,
        'theme'
      );
    }

    // Validate daily card limit
    if (validPreferences.dailyCardLimit !== undefined) {
      if (validPreferences.dailyCardLimit < 5 || validPreferences.dailyCardLimit > 200) {
        throw new ValidationError(
          `Daily card limit must be between 5 and 200`,
          'validate_preferences',
          COLLECTION_NAME,
          'dailyCardLimit'
        );
      }
    }

    // Validate session duration
    if (validPreferences.sessionDuration !== undefined) {
      if (validPreferences.sessionDuration < 5 || validPreferences.sessionDuration > 120) {
        throw new ValidationError(
          `Session duration must be between 5 and 120 minutes`,
          'validate_preferences',
          COLLECTION_NAME,
          'sessionDuration'
        );
      }
    }

    return validPreferences;
  }

  /**
   * Validate statistics structure
   */
  private validateStatistics(statistics: Record<string, unknown>): UserDocument['statistics'] {
    const validStatistics: UserDocument['statistics'] = {
      totalCardsStudied: 0,
      totalStudyTime: 0,
      averageRecallRate: 0,
      streakDays: 0,
      ...statistics
    };

    // Validate numeric fields
    const numericFields = ['totalCardsStudied', 'totalStudyTime', 'streakDays'];
    for (const field of numericFields) {
      if ((validStatistics as Record<string, unknown>)[field] as number < 0) {
        throw new ValidationError(
          `${field} cannot be negative`,
          'validate_statistics',
          COLLECTION_NAME,
          field
        );
      }
    }

    // Validate recall rate
    if (validStatistics.averageRecallRate < 0 || validStatistics.averageRecallRate > 100) {
      throw new ValidationError(
        `Average recall rate must be between 0 and 100`,
        'validate_statistics',
        COLLECTION_NAME,
        'averageRecallRate'
      );
    }

    return validStatistics;
  }

  /**
   * Validate security structure
   */
  private validateSecurity(security: Record<string, unknown>): UserDocument['security'] {
    const validSecurity = { ...security } as UserDocument['security'];

    // Validate login attempts
    if (validSecurity.loginAttempts !== undefined && validSecurity.loginAttempts < 0) {
      throw new ValidationError(
        `Login attempts cannot be negative`,
        'validate_security',
        COLLECTION_NAME,
        'loginAttempts'
      );
    }

    return validSecurity;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const usersService = new UsersService();
export default usersService;