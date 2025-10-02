import { c as createDatabaseOperations, s as safeAsync, a as sanitizeInput, b as DuplicateError, V as ValidationError, v as validateRequired, d as validateDocument, D as DatabaseError, N as NotFoundError, e as validateOwnership } from './validation_DQbs7Sb1.mjs';

const UserSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "userId",
        "preferences",
        "statistics",
        "authentication",
        "createdAt",
        "updatedAt"
      ],
      properties: {
        userId: {
          bsonType: "string",
          description: "Unique user identifier"
        },
        email: {
          bsonType: ["string", "null"],
          description: "User email address",
          pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
        },
        username: {
          bsonType: ["string", "null"],
          description: "Unique username",
          maxLength: 30
        },
        preferences: {
          bsonType: "object",
          required: ["theme", "language", "audioEnabled", "studyReminders"],
          properties: {
            theme: {
              enum: ["light", "dark", "auto"],
              description: "UI theme preference"
            },
            language: {
              bsonType: "string",
              description: "Preferred language"
            },
            audioEnabled: {
              bsonType: "bool",
              description: "Audio features enabled"
            },
            studyReminders: {
              bsonType: "bool",
              description: "Study reminder notifications"
            },
            dailyCardLimit: {
              bsonType: "int",
              minimum: 5,
              maximum: 200,
              description: "Daily card study limit"
            },
            sessionDuration: {
              bsonType: "int",
              minimum: 5,
              maximum: 120,
              description: "Default session duration in minutes"
            }
          }
        },
        statistics: {
          bsonType: "object",
          required: [
            "totalCardsStudied",
            "totalStudyTime",
            "averageRecallRate",
            "streakDays"
          ],
          properties: {
            totalCardsStudied: {
              bsonType: "int",
              minimum: 0,
              description: "Total cards studied"
            },
            totalStudyTime: {
              bsonType: "int",
              minimum: 0,
              description: "Total study time in minutes"
            },
            averageRecallRate: {
              bsonType: "double",
              minimum: 0,
              maximum: 100,
              description: "Average recall rate percentage"
            },
            streakDays: {
              bsonType: "int",
              minimum: 0,
              description: "Current study streak in days"
            },
            lastStudyDate: {
              bsonType: ["date", "null"],
              description: "Last study session date"
            },
            cardsMastered: {
              bsonType: "int",
              minimum: 0,
              description: "Cards with high repetition count"
            },
            totalSessions: {
              bsonType: "int",
              minimum: 0,
              description: "Total study sessions completed"
            }
          }
        },
        profile: {
          bsonType: "object",
          properties: {
            avatar: {
              bsonType: "string",
              description: "User avatar URL"
            },
            bio: {
              bsonType: "string",
              maxLength: 500,
              description: "User biography"
            },
            timezone: {
              bsonType: "string",
              description: "User timezone"
            },
            joinDate: {
              bsonType: "date",
              description: "Account creation date"
            }
          }
        },
        authentication: {
          bsonType: "object",
          required: ["password", "emailVerified"],
          properties: {
            password: {
              bsonType: "string",
              minLength: 60,
              maxLength: 100,
              description: "Hashed password using bcrypt (60+ chars for bcrypt hash)"
            },
            passwordChangedAt: {
              bsonType: "date",
              description: "Last password change timestamp"
            },
            passwordResetToken: {
              bsonType: ["string", "null"],
              description: "Password reset token"
            },
            passwordResetExpires: {
              bsonType: ["date", "null"],
              description: "Password reset token expiration"
            },
            emailVerificationToken: {
              bsonType: ["string", "null"],
              description: "Email verification token"
            },
            emailVerified: {
              bsonType: "bool",
              description: "Email verification status"
            },
            emailVerifiedAt: {
              bsonType: ["date", "null"],
              description: "Email verification timestamp"
            },
            refreshTokens: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  token: {
                    bsonType: "string",
                    description: "Refresh token"
                  },
                  createdAt: {
                    bsonType: "date",
                    description: "Token creation timestamp"
                  },
                  expiresAt: {
                    bsonType: "date",
                    description: "Token expiration timestamp"
                  },
                  deviceInfo: {
                    bsonType: "string",
                    description: "Device/browser information"
                  },
                  ipAddress: {
                    bsonType: "string",
                    description: "IP address used for token creation"
                  }
                }
              },
              description: "Active refresh tokens"
            }
          }
        },
        security: {
          bsonType: "object",
          properties: {
            lastLogin: {
              bsonType: "date",
              description: "Last login timestamp"
            },
            lastLoginIP: {
              bsonType: "string",
              description: "IP address of last login"
            },
            loginAttempts: {
              bsonType: "int",
              minimum: 0,
              description: "Failed login attempts"
            },
            accountLocked: {
              bsonType: "bool",
              description: "Account lock status"
            },
            accountLockedUntil: {
              bsonType: ["date", "null"],
              description: "Account lock expiration"
            },
            suspiciousActivity: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  type: {
                    bsonType: "string",
                    description: "Type of suspicious activity"
                  },
                  timestamp: {
                    bsonType: "date",
                    description: "Activity timestamp"
                  },
                  ipAddress: {
                    bsonType: "string",
                    description: "IP address of activity"
                  },
                  details: {
                    bsonType: "string",
                    description: "Additional details"
                  }
                }
              },
              description: "Suspicious activity log"
            }
          }
        },
        createdAt: {
          bsonType: "date",
          description: "Document creation timestamp"
        },
        updatedAt: {
          bsonType: "date",
          description: "Document last update timestamp"
        },
        version: {
          bsonType: "int",
          minimum: 1,
          description: "Schema version for migrations"
        }
      }
    }
  }
};

const COLLECTION_NAME = "users";
const dbOps = createDatabaseOperations(COLLECTION_NAME);
class UsersService {
  /**
   * Create a new user
   */
  async createUser(userData) {
    return safeAsync(
      async () => {
        validateRequired(
          userData,
          ["userId", "preferences", "statistics", "authentication"],
          COLLECTION_NAME
        );
        const sanitizedData = this.sanitizeUserData(userData);
        const now = /* @__PURE__ */ new Date();
        const dataWithTimestamps = {
          ...sanitizedData,
          createdAt: now,
          updatedAt: now
        };
        const validation = validateDocument(dataWithTimestamps, UserSchema);
        if (!validation.isValid) {
          throw new ValidationError(
            `User validation failed: ${validation.errors.join(", ")}`,
            "create_user",
            COLLECTION_NAME
          );
        }
        await this.checkForDuplicates(
          sanitizedData.userId,
          sanitizedData.email
        );
        const result = await dbOps.create(
          sanitizedData
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to create user",
            "CREATE_USER_FAILED",
            "create_user",
            COLLECTION_NAME
          );
        }
        return result;
      },
      { operation: "create_user", collection: COLLECTION_NAME }
    );
  }
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    return safeAsync(
      async () => {
        if (!userId) {
          throw new ValidationError(
            "User ID is required",
            "get_user_by_id",
            COLLECTION_NAME,
            "userId"
          );
        }
        const result = await dbOps.findOne({
          userId
        });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve user",
            "GET_USER_FAILED",
            "get_user_by_id",
            COLLECTION_NAME
          );
        }
        if (!result.data) {
          throw new NotFoundError(
            `User with ID ${userId} not found`,
            "get_user_by_id",
            COLLECTION_NAME,
            userId
          );
        }
        return result;
      },
      { operation: "get_user_by_id", collection: COLLECTION_NAME, userId }
    );
  }
  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    return safeAsync(
      async () => {
        if (!email) {
          throw new ValidationError(
            "Email is required",
            "get_user_by_email",
            COLLECTION_NAME,
            "email"
          );
        }
        const result = await dbOps.findOne({
          email
        });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve user",
            "GET_USER_FAILED",
            "get_user_by_email",
            COLLECTION_NAME
          );
        }
        if (!result.data) {
          throw new NotFoundError(
            `User with email ${email} not found`,
            "get_user_by_email",
            COLLECTION_NAME,
            email
          );
        }
        return result;
      },
      { operation: "get_user_by_email", collection: COLLECTION_NAME }
    );
  }
  /**
   * Update user profile
   */
  async updateUser(userId, updates, requestingUserId) {
    return safeAsync(
      async () => {
        validateOwnership(userId, requestingUserId, COLLECTION_NAME);
        const currentUser = await this.getUserById(userId);
        if (!currentUser.success || !currentUser.data) {
          throw new NotFoundError(
            `User with ID ${userId} not found`,
            "update_user",
            COLLECTION_NAME,
            userId
          );
        }
        const sanitizedUpdates = this.sanitizeUserData(updates);
        const updatedData = { ...currentUser.data, ...sanitizedUpdates };
        const validation = validateDocument(updatedData, UserSchema);
        if (!validation.isValid) {
          throw new ValidationError(
            `User validation failed: ${validation.errors.join(", ")}`,
            "update_user",
            COLLECTION_NAME
          );
        }
        if (sanitizedUpdates.email && sanitizedUpdates.email !== currentUser.data.email) {
          await this.checkForDuplicates(
            userId,
            sanitizedUpdates.email
          );
        }
        const result = await dbOps.updateOne(
          { userId },
          { $set: sanitizedUpdates }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to update user",
            "UPDATE_USER_FAILED",
            "update_user",
            COLLECTION_NAME
          );
        }
        return this.getUserById(userId);
      },
      { operation: "update_user", collection: COLLECTION_NAME, userId }
    );
  }
  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, preferences, requestingUserId) {
    return safeAsync(
      async () => {
        validateOwnership(userId, requestingUserId, COLLECTION_NAME);
        const validPreferences = this.validatePreferences(preferences);
        const result = await dbOps.updateOne(
          { userId },
          { $set: { preferences: validPreferences } }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to update user preferences",
            "UPDATE_PREFERENCES_FAILED",
            "update_user_preferences",
            COLLECTION_NAME
          );
        }
        return this.getUserById(userId);
      },
      {
        operation: "update_user_preferences",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Update user statistics
   */
  async updateUserStatistics(userId, statistics) {
    return safeAsync(
      async () => {
        const validStatistics = this.validateStatistics(statistics);
        const result = await dbOps.updateOne(
          { userId },
          {
            $set: {
              statistics: validStatistics,
              "statistics.lastStudyDate": /* @__PURE__ */ new Date()
            }
          }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to update user statistics",
            "UPDATE_STATISTICS_FAILED",
            "update_user_statistics",
            COLLECTION_NAME
          );
        }
        return this.getUserById(userId);
      },
      {
        operation: "update_user_statistics",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Delete user
   */
  async deleteUser(userId, requestingUserId) {
    return safeAsync(
      async () => {
        validateOwnership(userId, requestingUserId, COLLECTION_NAME);
        const result = await dbOps.deleteOne({ userId });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to delete user",
            "DELETE_USER_FAILED",
            "delete_user",
            COLLECTION_NAME
          );
        }
        return result;
      },
      { operation: "delete_user", collection: COLLECTION_NAME, userId }
    );
  }
  /**
   * Search users by criteria
   */
  async searchUsers(filter, options = {}) {
    return safeAsync(
      async () => {
        const query = {};
        if (filter.userId) query.userId = filter.userId;
        if (filter.email) query.email = new RegExp(filter.email, "i");
        if (filter.username) query.username = new RegExp(filter.username, "i");
        const queryOptions = {
          limit: options.limit || 50,
          skip: options.skip || 0,
          sort: options.sort || { createdAt: -1 }
        };
        const result = await dbOps.findMany(
          query,
          queryOptions
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to search users",
            "SEARCH_USERS_FAILED",
            "search_users",
            COLLECTION_NAME
          );
        }
        return result;
      },
      { operation: "search_users", collection: COLLECTION_NAME }
    );
  }
  /**
   * Get user count
   */
  async getUserCount(filter = {}) {
    return safeAsync(
      async () => {
        const query = {};
        if (filter.userId) query.userId = filter.userId;
        if (filter.email) query.email = new RegExp(filter.email, "i");
        if (filter.username) query.username = new RegExp(filter.username, "i");
        const result = await dbOps.count(query);
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to count users",
            "COUNT_USERS_FAILED",
            "get_user_count",
            COLLECTION_NAME
          );
        }
        return result;
      },
      { operation: "get_user_count", collection: COLLECTION_NAME }
    );
  }
  /**
   * Update user security information
   */
  async updateUserSecurity(userId, securityUpdates) {
    return safeAsync(
      async () => {
        const validSecurity = this.validateSecurity(securityUpdates);
        const result = await dbOps.updateOne(
          { userId },
          { $set: { security: validSecurity } }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to update user security",
            "UPDATE_SECURITY_FAILED",
            "update_user_security",
            COLLECTION_NAME
          );
        }
        return this.getUserById(userId);
      },
      { operation: "update_user_security", collection: COLLECTION_NAME, userId }
    );
  }
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  /**
   * Sanitize user data
   */
  sanitizeUserData(userData) {
    const sanitized = { ...userData };
    if (sanitized.email)
      sanitized.email = sanitizeInput(sanitized.email);
    if (sanitized.username)
      sanitized.username = sanitizeInput(sanitized.username);
    return sanitized;
  }
  /**
   * Check for duplicate userId or email
   */
  async checkForDuplicates(userId, email) {
    const existingUser = await dbOps.findOne({ userId });
    if (existingUser.success && existingUser.data) {
      throw new DuplicateError(
        `User with ID ${userId} already exists`,
        "create_user",
        COLLECTION_NAME,
        "userId",
        userId
      );
    }
    if (email) {
      const existingEmail = await dbOps.findOne({ email });
      if (existingEmail.success && existingEmail.data) {
        throw new DuplicateError(
          `User with email ${email} already exists`,
          "create_user",
          COLLECTION_NAME,
          "email",
          email
        );
      }
    }
  }
  /**
   * Validate preferences structure
   */
  validatePreferences(preferences) {
    const validPreferences = {
      theme: "light",
      language: "en",
      audioEnabled: true,
      studyReminders: true,
      dailyCardLimit: void 0,
      sessionDuration: void 0,
      ...preferences
    };
    if (!["light", "dark", "auto"].includes(validPreferences.theme)) {
      throw new ValidationError(
        `Invalid theme: ${validPreferences.theme}`,
        "validate_preferences",
        COLLECTION_NAME,
        "theme"
      );
    }
    if (validPreferences.dailyCardLimit !== void 0) {
      if (validPreferences.dailyCardLimit < 5 || validPreferences.dailyCardLimit > 200) {
        throw new ValidationError(
          `Daily card limit must be between 5 and 200`,
          "validate_preferences",
          COLLECTION_NAME,
          "dailyCardLimit"
        );
      }
    }
    if (validPreferences.sessionDuration !== void 0) {
      if (validPreferences.sessionDuration < 5 || validPreferences.sessionDuration > 120) {
        throw new ValidationError(
          `Session duration must be between 5 and 120 minutes`,
          "validate_preferences",
          COLLECTION_NAME,
          "sessionDuration"
        );
      }
    }
    return validPreferences;
  }
  /**
   * Validate statistics structure
   */
  validateStatistics(statistics) {
    const validStatistics = {
      totalCardsStudied: 0,
      totalStudyTime: 0,
      averageRecallRate: 0,
      streakDays: 0,
      ...statistics
    };
    const numericFields = ["totalCardsStudied", "totalStudyTime", "streakDays"];
    for (const field of numericFields) {
      if (validStatistics[field] < 0) {
        throw new ValidationError(
          `${field} cannot be negative`,
          "validate_statistics",
          COLLECTION_NAME,
          field
        );
      }
    }
    if (validStatistics.averageRecallRate < 0 || validStatistics.averageRecallRate > 100) {
      throw new ValidationError(
        `Average recall rate must be between 0 and 100`,
        "validate_statistics",
        COLLECTION_NAME,
        "averageRecallRate"
      );
    }
    return validStatistics;
  }
  /**
   * Validate security structure
   */
  validateSecurity(security) {
    const validSecurity = { ...security };
    if (validSecurity.loginAttempts !== void 0 && validSecurity.loginAttempts < 0) {
      throw new ValidationError(
        `Login attempts cannot be negative`,
        "validate_security",
        COLLECTION_NAME,
        "loginAttempts"
      );
    }
    return validSecurity;
  }
}
const usersService = new UsersService();

export { UsersService as U, UserSchema as a, usersService as u };
