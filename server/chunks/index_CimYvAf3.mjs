import { a as UserSchema, u as usersService } from './users_DCnhfAXN.mjs';
import { F as FlashcardSchema, f as flashcardsService } from './flashcards_BQGdHDD6.mjs';
import { s as safeAsync, e as validateOwnership, v as validateRequired, d as validateDocument, V as ValidationError, c as createDatabaseOperations, D as DatabaseError, N as NotFoundError, a as sanitizeInput, b as DuplicateError, B as BulkOperationError, f as validateQuality, i as validateObjectId, g as getDefaultSM2Params, h as calculateNextReviewDate, j as closeDatabase, k as initializeDatabase, l as getDatabase, m as databaseUtils, n as errorHandler } from './validation_DQbs7Sb1.mjs';
export { C as CollectionName, o as ConnectionError, E as ErrorHandler, M as MigrationError, P as PermissionError, R as RateLimitError, S as SM2Error, q as databaseConfig, p as dbConnection, t as emailValidator, x as qualityValidator, w as sm2Validator, u as urlValidator, r as validateSM2Params } from './validation_DQbs7Sb1.mjs';

const StudySessionSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "sessionId",
        "userId",
        "startTime",
        "cardsStudied",
        "createdAt",
        "updatedAt"
      ],
      properties: {
        sessionId: {
          bsonType: "string",
          description: "Unique session identifier"
        },
        userId: {
          bsonType: "string",
          description: "User who conducted the session"
        },
        startTime: {
          bsonType: "date",
          description: "Session start timestamp"
        },
        endTime: {
          bsonType: ["date", "null"],
          description: "Session end timestamp"
        },
        duration: {
          bsonType: "int",
          minimum: 0,
          description: "Session duration in seconds"
        },
        cardsStudied: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["cardId", "quality", "wasCorrect"],
            properties: {
              cardId: {
                bsonType: "string",
                description: "Card identifier"
              },
              quality: {
                bsonType: "int",
                minimum: 0,
                maximum: 5,
                description: "Quality of response (0-5)"
              },
              responseTime: {
                bsonType: "double",
                minimum: 0,
                description: "Response time in seconds"
              },
              wasCorrect: {
                bsonType: "bool",
                description: "Whether response was correct"
              },
              previousEaseFactor: {
                bsonType: "double",
                description: "Ease factor before this review"
              },
              newEaseFactor: {
                bsonType: "double",
                description: "Ease factor after this review"
              },
              previousInterval: {
                bsonType: "int",
                description: "Interval before this review"
              },
              newInterval: {
                bsonType: "int",
                description: "Interval after this review"
              }
            }
          },
          description: "Cards studied in this session"
        },
        totalCards: {
          bsonType: "int",
          minimum: 0,
          description: "Total cards in session"
        },
        correctAnswers: {
          bsonType: "int",
          minimum: 0,
          description: "Number of correct answers"
        },
        incorrectAnswers: {
          bsonType: "int",
          minimum: 0,
          description: "Number of incorrect answers"
        },
        averageResponseTime: {
          bsonType: "double",
          minimum: 0,
          description: "Average response time"
        },
        sessionType: {
          enum: ["review", "new", "practice", "difficult", "custom"],
          description: "Type of study session"
        },
        config: {
          bsonType: "object",
          properties: {
            dailyLimit: {
              bsonType: "int",
              minimum: 1,
              description: "Daily card limit"
            },
            sessionLimit: {
              bsonType: "int",
              minimum: 1,
              description: "Session card limit"
            },
            difficultyFilter: {
              bsonType: "object",
              properties: {
                enabled: {
                  bsonType: "bool"
                },
                levels: {
                  bsonType: "array",
                  items: {
                    enum: ["easy", "medium", "hard"]
                  }
                }
              }
            },
            mode: {
              enum: ["review-only", "new-only", "mixed", "difficult-cards"]
            }
          }
        },
        performance: {
          bsonType: "object",
          properties: {
            overallScore: {
              bsonType: "double",
              minimum: 0,
              maximum: 100,
              description: "Overall session score"
            },
            improvement: {
              bsonType: "double",
              description: "Improvement from previous sessions"
            },
            focusAreas: {
              bsonType: "array",
              items: {
                bsonType: "string",
                maxLength: 100
              },
              description: "Areas needing focus"
            },
            retentionRate: {
              bsonType: "double",
              minimum: 0,
              maximum: 100,
              description: "Session retention rate"
            },
            consistency: {
              bsonType: "double",
              minimum: 0,
              maximum: 100,
              description: "Response consistency score"
            }
          }
        },
        interruptions: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["type", "startTime"],
            properties: {
              type: {
                enum: ["pause", "break", "distraction"]
              },
              startTime: {
                bsonType: "date"
              },
              endTime: {
                bsonType: "date"
              },
              duration: {
                bsonType: "int",
                minimum: 0
              },
              reason: {
                bsonType: "string",
                maxLength: 200
              }
            }
          },
          description: "Session interruptions"
        },
        createdAt: {
          bsonType: "date",
          description: "Session creation timestamp"
        },
        updatedAt: {
          bsonType: "date",
          description: "Session last update timestamp"
        },
        version: {
          bsonType: "int",
          minimum: 1,
          description: "Schema version"
        }
      }
    }
  }
};

const StudyStatisticsSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "statsId",
        "userId",
        "date",
        "period",
        "dailyStats",
        "createdAt",
        "updatedAt"
      ],
      properties: {
        statsId: {
          bsonType: "string",
          description: "Unique statistics identifier"
        },
        userId: {
          bsonType: "string",
          description: "User identifier"
        },
        date: {
          bsonType: "date",
          description: "Statistics date"
        },
        period: {
          enum: ["daily", "weekly", "monthly"],
          description: "Statistics period type"
        },
        dailyStats: {
          bsonType: "object",
          required: [
            "cardsStudied",
            "studyTime",
            "correctAnswers",
            "incorrectAnswers",
            "averageRecallRate"
          ],
          properties: {
            cardsStudied: {
              bsonType: "int",
              minimum: 0
            },
            studyTime: {
              bsonType: "int",
              minimum: 0,
              description: "Study time in minutes"
            },
            correctAnswers: {
              bsonType: "int",
              minimum: 0
            },
            incorrectAnswers: {
              bsonType: "int",
              minimum: 0
            },
            averageRecallRate: {
              bsonType: "double",
              minimum: 0,
              maximum: 100
            },
            averageResponseTime: {
              bsonType: "double",
              minimum: 0
            },
            sessionsCompleted: {
              bsonType: "int",
              minimum: 0
            },
            newCardsLearned: {
              bsonType: "int",
              minimum: 0
            }
          }
        },
        weeklyStats: {
          bsonType: "object",
          properties: {
            totalCards: {
              bsonType: "int",
              minimum: 0
            },
            totalTime: {
              bsonType: "int",
              minimum: 0
            },
            averageRate: {
              bsonType: "double",
              minimum: 0,
              maximum: 100
            },
            improvement: {
              bsonType: "double"
            },
            streakDays: {
              bsonType: "int",
              minimum: 0
            },
            categoriesStudied: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  category: {
                    bsonType: "string"
                  },
                  cardsCount: {
                    bsonType: "int",
                    minimum: 0
                  }
                }
              }
            }
          }
        },
        monthlyStats: {
          bsonType: "object",
          properties: {
            totalCards: {
              bsonType: "int",
              minimum: 0
            },
            totalTime: {
              bsonType: "int",
              minimum: 0
            },
            averageRate: {
              bsonType: "double",
              minimum: 0,
              maximum: 100
            },
            improvement: {
              bsonType: "double"
            },
            mostStudiedCategory: {
              bsonType: "string"
            },
            leastStudiedCategory: {
              bsonType: "string"
            },
            consistency: {
              bsonType: "double",
              minimum: 0,
              maximum: 100
            }
          }
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        },
        version: {
          bsonType: "int",
          minimum: 1
        }
      }
    }
  }
};

const MigrationSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["migrationId", "version", "description", "appliedAt"],
      properties: {
        migrationId: {
          bsonType: "string",
          description: "Unique migration identifier"
        },
        version: {
          bsonType: "string",
          description: "Schema version"
        },
        description: {
          bsonType: "string",
          description: "Migration description"
        },
        appliedAt: {
          bsonType: "date",
          description: "Migration application timestamp"
        },
        checksum: {
          bsonType: "string",
          description: "Migration checksum for validation"
        },
        success: {
          bsonType: "bool",
          description: "Migration success status"
        },
        error: {
          bsonType: "string",
          description: "Migration error message"
        }
      }
    }
  }
};

const Schemas = {
  UserSchema: UserSchema,
  FlashcardSchema: FlashcardSchema,
  StudySessionSchema: StudySessionSchema,
  StudyStatisticsSchema: StudyStatisticsSchema,
  MigrationSchema: MigrationSchema
};

const DatabaseIndexes = {
  users: [
    // Primary user lookup
    { key: { userId: 1 }, options: { unique: true } },
    // Email and username lookups
    { key: { email: 1 }, options: { unique: true, sparse: true } },
    { key: { username: 1 }, options: { unique: true, sparse: true } },
    // Statistics queries
    { key: { "statistics.totalCardsStudied": -1 } },
    { key: { "statistics.averageRecallRate": -1 } },
    { key: { "statistics.streakDays": -1 } },
    // Compound index for user queries
    { key: { userId: 1, updatedAt: -1 } }
  ],
  flashcards: [
    // Primary compound index for user-specific queries
    { key: { userId: 1, cardId: 1 }, options: { unique: true } },
    // SM-2 algorithm critical index for due cards
    { key: { userId: 1, "sm2.nextReviewDate": 1, "sm2.isSuspended": 1 } },
    // Category and tags for filtering
    { key: { userId: 1, category: 1 } },
    { key: { userId: 1, tags: 1 } },
    // Difficulty-based queries
    { key: { userId: 1, difficulty: 1 } },
    // Performance analytics
    { key: { userId: 1, "sm2.repetitions": -1 } },
    { key: { userId: 1, "statistics.timesCorrect": -1 } },
    // Time-based queries
    { key: { userId: 1, createdAt: -1 } },
    { key: { userId: 1, updatedAt: -1 } },
    // Text search for content
    {
      key: {
        userId: 1,
        front: "text",
        back: "text",
        exampleFront: "text",
        exampleBack: "text"
      }
    }
  ],
  study_sessions: [
    // Primary queries
    { key: { userId: 1, sessionId: 1 }, options: { unique: true } },
    // Time-based queries
    { key: { userId: 1, startTime: -1 } },
    { key: { userId: 1, endTime: -1 } },
    // Performance analysis
    { key: { userId: 1, sessionType: 1, startTime: -1 } },
    { key: { userId: 1, "performance.overallScore": -1 } },
    // Analytics queries
    { key: { userId: 1, startTime: -1, sessionType: 1 } }
  ],
  study_statistics: [
    // Primary queries
    { key: { userId: 1, statsId: 1 }, options: { unique: true } },
    // Time-based analytics
    { key: { userId: 1, date: -1, period: 1 } },
    // Performance tracking
    { key: { userId: 1, "dailyStats.averageRecallRate": -1 } },
    { key: { userId: 1, "dailyStats.cardsStudied": -1 } }
  ]
};

const COLLECTION_NAME$1 = "study_sessions";
const dbOps$1 = createDatabaseOperations(COLLECTION_NAME$1);
class StudySessionsService {
  /**
   * Create a new study session
   */
  async createStudySession(sessionData, userId) {
    return safeAsync(
      async () => {
        validateOwnership(sessionData.userId, userId, COLLECTION_NAME$1);
        validateRequired(
          sessionData,
          ["sessionId", "userId", "startTime", "cardsStudied"],
          COLLECTION_NAME$1
        );
        const sanitizedData = this.sanitizeSessionData(sessionData);
        const validation = validateDocument(sanitizedData, StudySessionSchema);
        if (!validation.isValid) {
          throw new ValidationError(
            `Study session validation failed: ${validation.errors.join(", ")}`,
            "create_study_session",
            COLLECTION_NAME$1
          );
        }
        await this.checkForDuplicateSession(
          sanitizedData.userId,
          sanitizedData.sessionId
        );
        const result = await dbOps$1.create(
          sanitizedData
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to create study session",
            "CREATE_STUDY_SESSION_FAILED",
            "create_study_session",
            COLLECTION_NAME$1
          );
        }
        return result;
      },
      { operation: "create_study_session", collection: COLLECTION_NAME$1, userId }
    );
  }
  /**
   * Get study session by ID
   */
  async getStudySessionById(sessionId, userId) {
    return safeAsync(
      async () => {
        const result = await dbOps$1.findOne({
          sessionId,
          userId
        });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve study session",
            "GET_STUDY_SESSION_FAILED",
            "get_study_session_by_id",
            COLLECTION_NAME$1
          );
        }
        if (!result.data) {
          throw new NotFoundError(
            `Study session with ID ${sessionId} not found`,
            "get_study_session_by_id",
            COLLECTION_NAME$1,
            sessionId
          );
        }
        return result;
      },
      {
        operation: "get_study_session_by_id",
        collection: COLLECTION_NAME$1,
        userId
      }
    );
  }
  /**
   * End a study session
   */
  async endStudySession(sessionId, endData, userId) {
    return safeAsync(
      async () => {
        const currentSession = await this.getStudySessionById(
          sessionId,
          userId
        );
        if (!currentSession.success || !currentSession.data) {
          throw new NotFoundError(
            `Study session with ID ${sessionId} not found`,
            "end_study_session",
            COLLECTION_NAME$1,
            sessionId
          );
        }
        const session = currentSession.data;
        const duration = Math.floor(
          (endData.endTime.getTime() - session.startTime.getTime()) / 1e3
        );
        const performance = endData.performance || this.calculateSessionPerformance(endData.finalCardsStudied);
        const updates = {
          endTime: endData.endTime,
          duration,
          cardsStudied: endData.finalCardsStudied,
          totalCards: endData.finalCardsStudied.length,
          performance
        };
        const result = await dbOps$1.updateOne(
          { sessionId, userId },
          { $set: updates }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to end study session",
            "END_STUDY_SESSION_FAILED",
            "end_study_session",
            COLLECTION_NAME$1
          );
        }
        return this.getStudySessionById(sessionId, userId);
      },
      { operation: "end_study_session", collection: COLLECTION_NAME$1, userId }
    );
  }
  /**
   * Update study session progress
   */
  async updateSessionProgress(sessionId, progressData, userId) {
    return safeAsync(
      async () => {
        const performance = progressData.currentPerformance || this.calculateSessionPerformance(progressData.cardsStudied);
        const updates = {
          cardsStudied: progressData.cardsStudied,
          totalCards: progressData.cardsStudied.length,
          performance
        };
        const result = await dbOps$1.updateOne(
          { sessionId, userId },
          { $set: updates }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to update session progress",
            "UPDATE_SESSION_PROGRESS_FAILED",
            "update_session_progress",
            COLLECTION_NAME$1
          );
        }
        return this.getStudySessionById(sessionId, userId);
      },
      {
        operation: "update_session_progress",
        collection: COLLECTION_NAME$1,
        userId
      }
    );
  }
  /**
   * Get user's study sessions
   */
  async getUserStudySessions(userId, options = {}) {
    return safeAsync(
      async () => {
        const query = { userId };
        if (options.dateRange) {
          query.startTime = {
            $gte: options.dateRange.start,
            $lte: options.dateRange.end
          };
        }
        if (options.sessionType) {
          query.sessionType = options.sessionType;
        }
        const sortBy = options.sortBy || "startTime";
        const sortOrder = options.sortOrder || -1;
        const result = await dbOps$1.findMany(query, {
          limit: options.limit || 50,
          skip: options.skip || 0,
          sort: { [sortBy]: sortOrder }
        });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve study sessions",
            "GET_USER_STUDY_SESSIONS_FAILED",
            "get_user_study_sessions",
            COLLECTION_NAME$1
          );
        }
        return result;
      },
      {
        operation: "get_user_study_sessions",
        collection: COLLECTION_NAME$1,
        userId
      }
    );
  }
  /**
   * Get study session statistics
   */
  async getStudySessionStats(userId, dateRange) {
    return safeAsync(
      async () => {
        const matchStage = { userId };
        if (dateRange) {
          matchStage.startTime = {
            $gte: dateRange.start,
            $lte: dateRange.end
          };
        }
        const sessionsResult = await dbOps$1.findMany(
          matchStage
        );
        if (!sessionsResult.success) {
          throw new DatabaseError(
            sessionsResult.error || "Failed to get study session statistics",
            "GET_STUDY_SESSION_STATS_FAILED",
            "get_study_session_stats",
            COLLECTION_NAME$1
          );
        }
        const sessions = sessionsResult.data || [];
        const totals = sessions.reduce(
          (acc, session) => {
            acc.totalSessions += 1;
            if (session.endTime) {
              acc.completedSessions += 1;
            }
            const duration = typeof session.duration === "number" ? Number(session.duration) : session.endTime ? Math.floor(
              (session.endTime.getTime() - session.startTime.getTime()) / 1e3
            ) : 0;
            acc.totalDuration += duration;
            acc.totalCardsStudied += session.totalCards ?? session.cardsStudied?.length ?? 0;
            acc.totalPerformance += session.performance?.overallScore ?? 0;
            acc.sessionsByType.push(session.sessionType);
            return acc;
          },
          {
            totalSessions: 0,
            completedSessions: 0,
            totalDuration: 0,
            totalCardsStudied: 0,
            totalPerformance: 0,
            sessionsByType: []
          }
        );
        const averageDuration = totals.totalSessions > 0 ? totals.totalDuration / totals.totalSessions : 0;
        const averageCardsPerSession = totals.totalSessions > 0 ? totals.totalCardsStudied / totals.totalSessions : 0;
        const averagePerformance = totals.totalSessions > 0 ? totals.totalPerformance / totals.totalSessions : 0;
        return {
          success: true,
          data: {
            totalSessions: totals.totalSessions,
            completedSessions: totals.completedSessions,
            totalDuration: totals.totalDuration,
            averageDuration,
            totalCardsStudied: totals.totalCardsStudied,
            averageCardsPerSession,
            averagePerformance,
            sessionsByType: totals.sessionsByType
          },
          operationTime: sessionsResult.operationTime
        };
      },
      {
        operation: "get_study_session_stats",
        collection: COLLECTION_NAME$1,
        userId
      }
    );
  }
  /**
   * Delete study session
   */
  async deleteStudySession(sessionId, userId) {
    return safeAsync(
      async () => {
        const result = await dbOps$1.deleteOne({ sessionId, userId });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to delete study session",
            "DELETE_STUDY_SESSION_FAILED",
            "delete_study_session",
            COLLECTION_NAME$1
          );
        }
        return result;
      },
      { operation: "delete_study_session", collection: COLLECTION_NAME$1, userId }
    );
  }
  /**
   * Get recent study sessions for dashboard
   */
  async getRecentSessions(userId, limit = 10) {
    return safeAsync(
      async () => {
        const result = await dbOps$1.findMany(
          { userId },
          {
            limit,
            sort: { startTime: -1 }
          }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve recent sessions",
            "GET_RECENT_SESSIONS_FAILED",
            "get_recent_sessions",
            COLLECTION_NAME$1
          );
        }
        return result;
      },
      { operation: "get_recent_sessions", collection: COLLECTION_NAME$1, userId }
    );
  }
  /**
   * Get study streak information
   */
  async getStudyStreak(userId) {
    return safeAsync(
      async () => {
        const sessionsResult = await dbOps$1.findMany(
          { userId, endTime: { $ne: null } },
          { sort: { startTime: -1 } }
        );
        if (!sessionsResult.success) {
          throw new DatabaseError(
            sessionsResult.error || "Failed to calculate study streak",
            "GET_STUDY_STREAK_FAILED",
            "get_study_streak",
            COLLECTION_NAME$1
          );
        }
        const sessions = sessionsResult.data || [];
        const streakInfo = this.calculateStreak(sessions);
        return {
          success: true,
          data: streakInfo,
          operationTime: sessionsResult.operationTime
        };
      },
      { operation: "get_study_streak", collection: COLLECTION_NAME$1, userId }
    );
  }
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  /**
   * Sanitize study session data
   */
  sanitizeSessionData(sessionData) {
    const sanitized = { ...sessionData };
    if (sanitized.sessionType)
      sanitized.sessionType = sanitizeInput(sanitized.sessionType);
    return sanitized;
  }
  /**
   * Check for duplicate session ID for the same user
   */
  async checkForDuplicateSession(userId, sessionId) {
    const existingSession = await dbOps$1.findOne({ userId, sessionId });
    if (existingSession.success && existingSession.data) {
      throw new DuplicateError(
        `Study session with ID ${sessionId} already exists for this user`,
        "create_study_session",
        COLLECTION_NAME$1,
        "sessionId",
        sessionId
      );
    }
  }
  /**
   * Calculate session performance metrics
   */
  calculateSessionPerformance(cardsStudied) {
    if (!cardsStudied || cardsStudied.length === 0) {
      return {
        overallScore: 0,
        improvement: 0,
        focusAreas: []
      };
    }
    const totalCards = cardsStudied.length;
    const correctCards = cardsStudied.filter(
      (card) => card.wasCorrect
    ).length;
    const retentionRate = correctCards / totalCards * 100;
    const avgResponseTime = cardsStudied.reduce(
      (sum, card) => sum + (card.responseTime || 0),
      0
    ) / totalCards;
    const responseTimes = cardsStudied.map(
      (card) => card.responseTime || 0
    );
    const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce(
      (sum, time) => sum + Math.pow(time - mean, 2),
      0
    ) / responseTimes.length;
    const consistency = Math.sqrt(variance);
    const focusAreas = [];
    if (retentionRate < 70) focusAreas.push("retention");
    if (avgResponseTime > 1e4) focusAreas.push("speed");
    if (consistency > 5e3) focusAreas.push("consistency");
    const overallScore = Math.round(
      retentionRate * 0.7 + // 70% weight on retention
      (avgResponseTime < 5e3 ? 100 : Math.max(0, 100 - (avgResponseTime - 5e3) / 100)) * 0.2 + // 20% weight on speed
      (consistency < 3e3 ? 100 : Math.max(0, 100 - (consistency - 3e3) / 100)) * 0.1
      // 10% weight on consistency
    );
    return {
      overallScore,
      improvement: 0,
      // Would need historical data to calculate
      focusAreas
    };
  }
  /**
   * Calculate study streak from sessions
   */
  calculateStreak(sessions) {
    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }
    const sortedSessions = sessions.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = null;
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      if (!lastDate) {
        tempStreak = 1;
        lastDate = sessionDate;
      } else {
        const dayDiff = Math.floor(
          (lastDate.getTime() - sessionDate.getTime()) / (1e3 * 60 * 60 * 24)
        );
        if (dayDiff === 1) {
          tempStreak++;
        } else if (dayDiff === 0) {
          continue;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        lastDate = sessionDate;
      }
    }
    const lastSessionDate = new Date(sortedSessions[0].startTime);
    lastSessionDate.setHours(0, 0, 0, 0);
    const daysSinceLastSession = Math.floor(
      (today.getTime() - lastSessionDate.getTime()) / (1e3 * 60 * 60 * 24)
    );
    if (daysSinceLastSession <= 1) {
      currentStreak = tempStreak;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    return {
      currentStreak,
      longestStreak,
      lastStudyDate: sortedSessions[0]?.startTime
    };
  }
}
const studySessionsService = new StudySessionsService();

const COLLECTION_NAME = "study_statistics";
const dbOps = createDatabaseOperations(COLLECTION_NAME);
class StudyStatisticsService {
  /**
   * Create study statistics entry
   */
  async createStudyStatistics(statsData, userId) {
    return safeAsync(
      async () => {
        validateOwnership(statsData.userId, userId, COLLECTION_NAME);
        validateRequired(
          statsData,
          ["statsId", "userId", "date", "dailyStats"],
          COLLECTION_NAME
        );
        const sanitizedData = this.sanitizeStatsData(statsData);
        const validation = validateDocument(
          sanitizedData,
          StudyStatisticsSchema
        );
        if (!validation.isValid) {
          throw new ValidationError(
            `Study statistics validation failed: ${validation.errors.join(", ")}`,
            "create_study_statistics",
            COLLECTION_NAME
          );
        }
        const statsUserId = this.ensureString(
          sanitizedData.userId,
          "userId",
          "create_study_statistics"
        );
        const statsId = this.ensureString(
          sanitizedData.statsId,
          "statsId",
          "create_study_statistics"
        );
        sanitizedData.userId = statsUserId;
        sanitizedData.statsId = statsId;
        await this.checkForDuplicateStats(statsUserId, statsId);
        const result = await dbOps.create(
          sanitizedData
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to create study statistics",
            "CREATE_STUDY_STATISTICS_FAILED",
            "create_study_statistics",
            COLLECTION_NAME
          );
        }
        return result;
      },
      {
        operation: "create_study_statistics",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Get study statistics by ID
   */
  async getStudyStatisticsById(statsId, userId) {
    return safeAsync(
      async () => {
        const result = await dbOps.findOne({
          statsId,
          userId
        });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve study statistics",
            "GET_STUDY_STATISTICS_FAILED",
            "get_study_statistics_by_id",
            COLLECTION_NAME
          );
        }
        if (!result.data) {
          throw new NotFoundError(
            `Study statistics with ID ${statsId} not found`,
            "get_study_statistics_by_id",
            COLLECTION_NAME,
            statsId
          );
        }
        return result;
      },
      {
        operation: "get_study_statistics_by_id",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Get study statistics for a specific date
   */
  async getStudyStatisticsByDate(userId, date, period = "daily") {
    return safeAsync(
      async () => {
        const result = await dbOps.findOne({
          userId,
          date: this.normalizeDate(date, period),
          period
        });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve study statistics for date",
            "GET_STUDY_STATISTICS_BY_DATE_FAILED",
            "get_study_statistics_by_date",
            COLLECTION_NAME
          );
        }
        return result;
      },
      {
        operation: "get_study_statistics_by_date",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Update study statistics
   */
  async updateStudyStatistics(statsId, updates, userId) {
    return safeAsync(
      async () => {
        const currentStats = await this.getStudyStatisticsById(statsId, userId);
        if (!currentStats.success || !currentStats.data) {
          throw new NotFoundError(
            `Study statistics with ID ${statsId} not found`,
            "update_study_statistics",
            COLLECTION_NAME,
            statsId
          );
        }
        const sanitizedUpdates = this.sanitizeStatsData(updates);
        const updatedData = { ...currentStats.data, ...sanitizedUpdates };
        const validation = validateDocument(updatedData, StudyStatisticsSchema);
        if (!validation.isValid) {
          throw new ValidationError(
            `Study statistics validation failed: ${validation.errors.join(", ")}`,
            "update_study_statistics",
            COLLECTION_NAME
          );
        }
        const result = await dbOps.updateOne(
          { statsId, userId },
          { $set: sanitizedUpdates }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to update study statistics",
            "UPDATE_STUDY_STATISTICS_FAILED",
            "update_study_statistics",
            COLLECTION_NAME
          );
        }
        return this.getStudyStatisticsById(statsId, userId);
      },
      {
        operation: "update_study_statistics",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Update or create daily statistics
   */
  async upsertDailyStatistics(userId, date, dailyStats) {
    return safeAsync(
      async () => {
        const normalizedDate = this.normalizeDate(date, "daily");
        const statsId = this.generateStatsId(userId, normalizedDate, "daily");
        const existingStats = await dbOps.findOne({
          userId,
          date: normalizedDate,
          period: "daily"
        });
        if (existingStats.success && existingStats.data) {
          return this.updateStudyStatistics(statsId, { dailyStats }, userId);
        } else {
          const newStatsData = {
            statsId,
            userId,
            date: normalizedDate,
            period: "daily",
            dailyStats
          };
          return this.createStudyStatistics(newStatsData, userId);
        }
      },
      {
        operation: "upsert_daily_statistics",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Get user's study statistics within a date range
   */
  async getStudyStatisticsRange(userId, startDate, endDate, period = "daily", options = {}) {
    return safeAsync(
      async () => {
        const result = await dbOps.findMany(
          {
            userId,
            period,
            date: {
              $gte: this.normalizeDate(startDate, period),
              $lte: this.normalizeDate(endDate, period)
            }
          },
          {
            limit: options.limit || 100,
            skip: options.skip || 0,
            sort: { date: 1 }
          }
        );
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to retrieve study statistics range",
            "GET_STUDY_STATISTICS_RANGE_FAILED",
            "get_study_statistics_range",
            COLLECTION_NAME
          );
        }
        return result;
      },
      {
        operation: "get_study_statistics_range",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Calculate and store weekly statistics
   */
  async calculateWeeklyStatistics(userId, weekStartDate) {
    return safeAsync(
      async () => {
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        const dailyStats = await this.getStudyStatisticsRange(
          userId,
          weekStartDate,
          weekEndDate,
          "daily"
        );
        if (!dailyStats.success || !dailyStats.data) {
          throw new DatabaseError(
            "Failed to retrieve daily statistics for weekly calculation",
            "CALCULATE_WEEKLY_STATS_FAILED",
            "calculate_weekly_statistics",
            COLLECTION_NAME
          );
        }
        const weeklyStats = this.aggregateStats(dailyStats.data);
        const normalizedWeekStart = this.normalizeDate(weekStartDate, "weekly");
        const statsId = this.generateStatsId(
          userId,
          normalizedWeekStart,
          "weekly"
        );
        const weeklyStatsData = {
          statsId,
          userId,
          date: normalizedWeekStart,
          period: "weekly",
          dailyStats: {
            cardsStudied: weeklyStats.totalCards,
            studyTime: weeklyStats.totalTime,
            correctAnswers: weeklyStats.totalCorrect,
            incorrectAnswers: weeklyStats.totalIncorrect,
            averageRecallRate: weeklyStats.averageRate
          },
          weeklyStats
        };
        return this.upsertWeeklyStatistics(weeklyStatsData, userId);
      },
      {
        operation: "calculate_weekly_statistics",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Calculate and store monthly statistics
   */
  async calculateMonthlyStatistics(userId, monthStartDate) {
    return safeAsync(
      async () => {
        const monthEndDate = new Date(
          monthStartDate.getFullYear(),
          monthStartDate.getMonth() + 1,
          0
        );
        const weeklyStats = await this.getStudyStatisticsRange(
          userId,
          monthStartDate,
          monthEndDate,
          "weekly"
        );
        if (!weeklyStats.success || !weeklyStats.data) {
          throw new DatabaseError(
            "Failed to retrieve weekly statistics for monthly calculation",
            "CALCULATE_MONTHLY_STATS_FAILED",
            "calculate_monthly_statistics",
            COLLECTION_NAME
          );
        }
        const monthlyStats = this.aggregateStats(weeklyStats.data);
        const normalizedMonthStart = this.normalizeDate(
          monthStartDate,
          "monthly"
        );
        const statsId = this.generateStatsId(
          userId,
          normalizedMonthStart,
          "monthly"
        );
        const monthlyStatsData = {
          statsId,
          userId,
          date: normalizedMonthStart,
          period: "monthly",
          dailyStats: {
            cardsStudied: monthlyStats.totalCards,
            studyTime: monthlyStats.totalTime,
            correctAnswers: monthlyStats.totalCorrect,
            incorrectAnswers: monthlyStats.totalIncorrect,
            averageRecallRate: monthlyStats.averageRate
          },
          monthlyStats
        };
        return this.upsertMonthlyStatistics(monthlyStatsData, userId);
      },
      {
        operation: "calculate_monthly_statistics",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Get study statistics summary for dashboard
   */
  async getStudyStatisticsSummary(userId, days = 30) {
    return safeAsync(
      async () => {
        const endDate = /* @__PURE__ */ new Date();
        const startDate = /* @__PURE__ */ new Date();
        startDate.setDate(endDate.getDate() - days);
        const dailyStats = await this.getStudyStatisticsRange(
          userId,
          startDate,
          endDate,
          "daily"
        );
        if (!dailyStats.success || !dailyStats.data) {
          return {
            success: true,
            data: {
              totalDays: 0,
              totalCardsStudied: 0,
              totalStudyTime: 0,
              averageDailyCards: 0,
              averageDailyTime: 0,
              averageRecallRate: 0,
              studyDays: 0,
              consistency: 0
            },
            operationTime: 0
          };
        }
        const stats = dailyStats.data;
        const summary = this.calculateSummary(stats, days);
        return {
          success: true,
          data: summary,
          operationTime: dailyStats.operationTime
        };
      },
      {
        operation: "get_study_statistics_summary",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  /**
   * Delete study statistics
   */
  async deleteStudyStatistics(statsId, userId) {
    return safeAsync(
      async () => {
        const result = await dbOps.deleteOne({ statsId, userId });
        if (!result.success) {
          throw new DatabaseError(
            result.error || "Failed to delete study statistics",
            "DELETE_STUDY_STATISTICS_FAILED",
            "delete_study_statistics",
            COLLECTION_NAME
          );
        }
        return result;
      },
      {
        operation: "delete_study_statistics",
        collection: COLLECTION_NAME,
        userId
      }
    );
  }
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  /**
   * Sanitize study statistics data
   */
  sanitizeStatsData(statsData) {
    const sanitized = { ...statsData };
    return sanitized;
  }
  /**
   * Check for duplicate statistics ID for the same user
   */
  async checkForDuplicateStats(userId, statsId) {
    const existingStats = await dbOps.findOne({ userId, statsId });
    if (existingStats.success && existingStats.data) {
      throw new DuplicateError(
        `Study statistics with ID ${statsId} already exists for this user`,
        "create_study_statistics",
        COLLECTION_NAME,
        "statsId",
        statsId
      );
    }
  }
  ensureString(value, field, operation) {
    if (typeof value !== "string") {
      throw new ValidationError(
        `${field} must be a string`,
        operation,
        COLLECTION_NAME,
        field,
        value
      );
    }
    return value;
  }
  /**
   * Normalize date based on period
   */
  normalizeDate(date, period) {
    const normalized = new Date(date);
    switch (period) {
      case "daily":
        normalized.setHours(0, 0, 0, 0);
        break;
      case "weekly": {
        const dayOfWeek = normalized.getDay();
        normalized.setDate(normalized.getDate() - dayOfWeek);
        normalized.setHours(0, 0, 0, 0);
        break;
      }
      case "monthly":
        normalized.setDate(1);
        normalized.setHours(0, 0, 0, 0);
        break;
    }
    return normalized;
  }
  /**
   * Generate statistics ID
   */
  generateStatsId(userId, date, period) {
    const dateStr = date.toISOString().split("T")[0];
    return `${userId}_${period}_${dateStr}`;
  }
  /**
   * Aggregate statistics from multiple entries
   */
  aggregateStats(statsArray) {
    if (statsArray.length === 0) {
      return {
        totalCards: 0,
        totalTime: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        averageRate: 0,
        improvement: 0
      };
    }
    const totals = statsArray.reduce(
      (acc, stats) => {
        const dailyStats = stats.dailyStats;
        return {
          totalCards: acc.totalCards + (dailyStats.cardsStudied || 0),
          totalTime: acc.totalTime + (dailyStats.studyTime || 0),
          totalCorrect: acc.totalCorrect + (dailyStats.correctAnswers || 0),
          totalIncorrect: acc.totalIncorrect + (dailyStats.incorrectAnswers || 0),
          totalRate: acc.totalRate + (dailyStats.averageRecallRate || 0)
        };
      },
      {
        totalCards: 0,
        totalTime: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalRate: 0
      }
    );
    return {
      totalCards: totals.totalCards,
      totalTime: totals.totalTime,
      averageRate: statsArray.length > 0 ? totals.totalRate / statsArray.length : 0,
      improvement: this.calculateImprovement(statsArray),
      totalCorrect: totals.totalCorrect,
      totalIncorrect: totals.totalIncorrect
    };
  }
  /**
   * Calculate improvement trend
   */
  calculateImprovement(statsArray) {
    if (statsArray.length < 2) return 0;
    const sortedStats = statsArray.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    const firstHalf = sortedStats.slice(0, Math.floor(sortedStats.length / 2));
    const secondHalf = sortedStats.slice(Math.floor(sortedStats.length / 2));
    const firstHalfAvg = firstHalf.reduce(
      (sum, stats) => sum + (stats.dailyStats.averageRecallRate || 0),
      0
    ) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce(
      (sum, stats) => sum + (stats.dailyStats.averageRecallRate || 0),
      0
    ) / secondHalf.length;
    return secondHalfAvg - firstHalfAvg;
  }
  /**
   * Calculate summary statistics
   */
  calculateSummary(statsArray, totalDays) {
    const totals = statsArray.reduce(
      (acc, stats) => {
        const dailyStats = stats.dailyStats;
        return {
          totalCards: acc.totalCards + (dailyStats.cardsStudied || 0),
          totalTime: acc.totalTime + (dailyStats.studyTime || 0),
          totalCorrect: acc.totalCorrect + (dailyStats.correctAnswers || 0),
          totalIncorrect: acc.totalIncorrect + (dailyStats.incorrectAnswers || 0),
          totalRate: acc.totalRate + (dailyStats.averageRecallRate || 0)
        };
      },
      {
        totalCards: 0,
        totalTime: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalRate: 0
      }
    );
    const studyDays = statsArray.length;
    const averageRate = studyDays > 0 ? totals.totalRate / studyDays : 0;
    const consistency = studyDays > 0 ? studyDays / totalDays * 100 : 0;
    return {
      totalDays,
      totalCardsStudied: totals.totalCards,
      totalStudyTime: totals.totalTime,
      averageDailyCards: studyDays > 0 ? totals.totalCards / studyDays : 0,
      averageDailyTime: studyDays > 0 ? totals.totalTime / studyDays : 0,
      averageRecallRate: averageRate,
      studyDays,
      consistency
    };
  }
  /**
   * Upsert weekly statistics
   */
  async upsertWeeklyStatistics(statsData, userId) {
    const statsUserId = this.ensureString(
      statsData.userId,
      "userId",
      "upsert_weekly_statistics"
    );
    const statsId = this.ensureString(
      statsData.statsId,
      "statsId",
      "upsert_weekly_statistics"
    );
    const normalizedStats = { ...statsData, userId: statsUserId, statsId };
    const existingStats = await dbOps.findOne({
      userId: statsUserId,
      date: statsData.date,
      period: "weekly"
    });
    if (existingStats.success && existingStats.data) {
      return this.updateStudyStatistics(statsId, normalizedStats, userId);
    } else {
      return this.createStudyStatistics(normalizedStats, userId);
    }
  }
  /**
   * Upsert monthly statistics
   */
  async upsertMonthlyStatistics(statsData, userId) {
    const statsUserId = this.ensureString(
      statsData.userId,
      "userId",
      "upsert_monthly_statistics"
    );
    const statsId = this.ensureString(
      statsData.statsId,
      "statsId",
      "upsert_monthly_statistics"
    );
    const normalizedStats = { ...statsData, userId: statsUserId, statsId };
    const existingStats = await dbOps.findOne({
      userId: statsUserId,
      date: statsData.date,
      period: "monthly"
    });
    if (existingStats.success && existingStats.data) {
      return this.updateStudyStatistics(statsId, normalizedStats, userId);
    } else {
      return this.createStudyStatistics(normalizedStats, userId);
    }
  }
}
const studyStatisticsService = new StudyStatisticsService();

class BulkOperationsService {
  /**
   * Bulk import flashcards for a user
   */
  async bulkImportFlashcards(userId, flashcards, options = {}) {
    return safeAsync(
      async () => {
        const {
          skipDuplicates = true,
          updateExisting = false,
          batchSize = 100
        } = options;
        if (!flashcards.length) {
          return {
            success: true,
            data: {
              success: true,
              insertedCount: 0,
              updatedCount: 0,
              deletedCount: 0,
              errors: [],
              operationTime: 0
            },
            operationTime: 0
          };
        }
        const results = {
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: []
        };
        for (let i = 0; i < flashcards.length; i += batchSize) {
          const batch = flashcards.slice(i, i + batchSize);
          const batchResults = await this.processFlashcardBatch(userId, batch, {
            skipDuplicates,
            updateExisting
          });
          results.inserted += batchResults.inserted;
          results.updated += batchResults.updated;
          results.skipped += batchResults.skipped;
          results.errors.push(
            ...batchResults.errors.map((error) => ({
              index: error.index + i,
              error: error.error
            }))
          );
        }
        const bulkResult = {
          success: results.errors.length === 0,
          insertedCount: results.inserted,
          updatedCount: results.updated,
          deletedCount: 0,
          errors: results.errors.map((e) => e.error.message),
          operationTime: Date.now()
        };
        return {
          success: true,
          data: bulkResult,
          operationTime: Date.now()
        };
      },
      { operation: "bulk_import_flashcards", userId }
    );
  }
  /**
   * Bulk update flashcard SM-2 parameters
   */
  async bulkUpdateSM2Parameters(userId, updates) {
    return safeAsync(
      async () => {
        const results = {
          processed: 0,
          errors: []
        };
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          try {
            const result = await flashcardsService.processReviewResponse(
              update.cardId,
              update.quality,
              update.responseTime,
              userId
            );
            if (result.success) {
              results.processed++;
            } else {
              results.errors.push({
                index: i,
                error: new Error(result.error || "Unknown error")
              });
            }
          } catch (error) {
            results.errors.push({
              index: i,
              error
            });
          }
        }
        const bulkResult = {
          success: results.errors.length === 0,
          insertedCount: 0,
          updatedCount: results.processed,
          deletedCount: 0,
          errors: results.errors.map((e) => e.error.message),
          operationTime: Date.now()
        };
        return {
          success: true,
          data: bulkResult,
          operationTime: Date.now()
        };
      },
      { operation: "bulk_update_sm2_parameters", userId }
    );
  }
  /**
   * Bulk suspend/unsuspend flashcards
   */
  async bulkSuspendFlashcards(userId, cardIds, suspended, reason) {
    return safeAsync(
      async () => {
        const results = {
          processed: 0,
          errors: []
        };
        for (let i = 0; i < cardIds.length; i++) {
          const cardId = cardIds[i];
          try {
            const result = await flashcardsService.suspendFlashcard(
              cardId,
              suspended,
              reason,
              userId
            );
            if (result.success) {
              results.processed++;
            } else {
              results.errors.push({
                index: i,
                error: new Error(result.error || "Unknown error")
              });
            }
          } catch (error) {
            results.errors.push({
              index: i,
              error
            });
          }
        }
        const bulkResult = {
          success: results.errors.length === 0,
          insertedCount: 0,
          updatedCount: results.processed,
          deletedCount: 0,
          errors: results.errors.map((e) => e.error.message),
          operationTime: Date.now()
        };
        return {
          success: true,
          data: bulkResult,
          operationTime: Date.now()
        };
      },
      { operation: "bulk_suspend_flashcards", userId }
    );
  }
  /**
   * Bulk delete flashcards
   */
  async bulkDeleteFlashcards(userId, cardIds) {
    return safeAsync(
      async () => {
        const dbOps = createDatabaseOperations("flashcards");
        const operations = cardIds.map((cardId) => ({
          deleteOne: {
            filter: { cardId, userId }
          }
        }));
        const result = await dbOps.bulkWrite(operations);
        if (!result.success) {
          throw new BulkOperationError(
            result.error || "Failed to bulk delete flashcards",
            "bulk_delete_flashcards",
            "flashcards",
            0,
            0,
            (result.data?.errors || []).map((error, index) => ({
              index,
              error: new Error(error)
            }))
          );
        }
        return result;
      },
      { operation: "bulk_delete_flashcards", userId }
    );
  }
  /**
   * Bulk create study sessions
   */
  async bulkCreateStudySessions(userId, sessions) {
    return safeAsync(
      async () => {
        const results = {
          inserted: 0,
          errors: []
        };
        for (let i = 0; i < sessions.length; i++) {
          const session = sessions[i];
          try {
            const result = await studySessionsService.createStudySession(
              session,
              userId
            );
            if (result.success) {
              results.inserted++;
            } else {
              results.errors.push({
                index: i,
                error: new Error(result.error || "Unknown error")
              });
            }
          } catch (error) {
            results.errors.push({
              index: i,
              error
            });
          }
        }
        const bulkResult = {
          success: results.errors.length === 0,
          insertedCount: results.inserted,
          updatedCount: 0,
          deletedCount: 0,
          errors: results.errors.map((e) => e.error.message),
          operationTime: Date.now()
        };
        return {
          success: true,
          data: bulkResult,
          operationTime: Date.now()
        };
      },
      { operation: "bulk_create_study_sessions", userId }
    );
  }
  /**
   * Bulk update user statistics
   */
  async bulkUpdateUserStatistics(userId, statistics) {
    return safeAsync(
      async () => {
        return usersService.updateUserStatistics(userId, statistics);
      },
      { operation: "bulk_update_user_statistics", userId }
    );
  }
  /**
   * Bulk export user data
   */
  async bulkExportUserData(userId, options = {}) {
    return safeAsync(
      async () => {
        const exportData = {
          userId,
          exportedAt: /* @__PURE__ */ new Date(),
          data: {}
        };
        const userResult = await usersService.getUserById(userId);
        if (userResult.success && userResult.data) {
          exportData.data.user = userResult.data;
        }
        if (options.includeFlashcards) {
          const flashcardsResult = await flashcardsService.getDueFlashcards(
            userId,
            {
              limit: 1e4
              // Large limit for export
            }
          );
          if (flashcardsResult.success && flashcardsResult.data) {
            exportData.data.flashcards = flashcardsResult.data;
          }
        }
        if (options.includeSessions) {
          const sessionsResult = await studySessionsService.getUserStudySessions(userId, {
            limit: 1e3,
            dateRange: options.dateRange
          });
          if (sessionsResult.success && sessionsResult.data) {
            exportData.data.studySessions = sessionsResult.data;
          }
        }
        if (options.includeStatistics) {
          const statsResult = await studyStatisticsService.getStudyStatisticsRange(
            userId,
            options.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3),
            options.dateRange?.end || /* @__PURE__ */ new Date(),
            "daily",
            { limit: 1e3 }
          );
          if (statsResult.success && statsResult.data) {
            exportData.data.studyStatistics = statsResult.data;
          }
        }
        return {
          success: true,
          data: exportData,
          operationTime: Date.now()
        };
      },
      { operation: "bulk_export_user_data", userId }
    );
  }
  /**
   * Bulk import user data (for migration/sync)
   */
  async bulkImportUserData(userId, importData, options = {}) {
    return safeAsync(
      async () => {
        const results = {
          flashcards: { inserted: 0, updated: 0, errors: 0 },
          studySessions: { inserted: 0, updated: 0, errors: 0 },
          studyStatistics: { inserted: 0, updated: 0, errors: 0 }
        };
        if (importData.flashcards && importData.flashcards.length > 0) {
          const flashcardsResult = await this.bulkImportFlashcards(
            userId,
            importData.flashcards,
            {
              skipDuplicates: options.skipExisting,
              updateExisting: options.updateExisting
            }
          );
          if (flashcardsResult.success && flashcardsResult.data) {
            results.flashcards.inserted = flashcardsResult.data.insertedCount;
            results.flashcards.updated = flashcardsResult.data.updatedCount;
            results.flashcards.errors = flashcardsResult.data.errors.length;
          }
        }
        if (importData.studySessions && importData.studySessions.length > 0) {
          const sessionsResult = await this.bulkCreateStudySessions(
            userId,
            importData.studySessions
          );
          if (sessionsResult.success && sessionsResult.data) {
            results.studySessions.inserted = sessionsResult.data.insertedCount;
            results.studySessions.updated = sessionsResult.data.updatedCount;
            results.studySessions.errors = sessionsResult.data.errors.length;
          }
        }
        if (importData.studyStatistics && importData.studyStatistics.length > 0) {
          for (const stats of importData.studyStatistics) {
            try {
              await studyStatisticsService.createStudyStatistics(stats, userId);
              results.studyStatistics.inserted++;
            } catch {
              results.studyStatistics.errors++;
            }
          }
        }
        return {
          success: true,
          data: {
            success: true,
            results,
            totalProcessed: results.flashcards.inserted + results.flashcards.updated + results.studySessions.inserted + results.studySessions.updated + results.studyStatistics.inserted + results.studyStatistics.updated,
            totalErrors: results.flashcards.errors + results.studySessions.errors + results.studyStatistics.errors
          },
          operationTime: Date.now()
        };
      },
      { operation: "bulk_import_user_data", userId }
    );
  }
  /**
   * Bulk cleanup old data
   */
  async bulkCleanupOldData(userId, options = {}) {
    return safeAsync(
      async () => {
        const {
          olderThanDays = 365,
          cleanupSessions = true,
          cleanupStatistics = false
        } = options;
        const cutoffDate = new Date(
          Date.now() - olderThanDays * 24 * 60 * 60 * 1e3
        );
        const results = {
          deleted: 0,
          errors: []
        };
        if (cleanupSessions) {
          try {
            const sessionsDbOps = createDatabaseOperations("study_sessions");
            const sessionsResult = await sessionsDbOps.deleteMany({
              userId,
              startTime: { $lt: cutoffDate }
            });
            if (sessionsResult.success && sessionsResult.data) {
              results.deleted += sessionsResult.data.deletedCount;
            }
          } catch (error) {
            results.errors.push(`Failed to cleanup study sessions: ${error}`);
          }
        }
        if (cleanupStatistics) {
          try {
            const statsDbOps = createDatabaseOperations("study_statistics");
            const statsResult = await statsDbOps.deleteMany({
              userId,
              date: { $lt: cutoffDate }
            });
            if (statsResult.success && statsResult.data) {
              results.deleted += statsResult.data.deletedCount;
            }
          } catch (error) {
            results.errors.push(`Failed to cleanup statistics: ${error}`);
          }
        }
        const bulkResult = {
          success: results.errors.length === 0,
          insertedCount: 0,
          updatedCount: 0,
          deletedCount: results.deleted,
          errors: results.errors,
          operationTime: Date.now()
        };
        return {
          success: true,
          data: bulkResult,
          operationTime: Date.now()
        };
      },
      { operation: "bulk_cleanup_old_data", userId }
    );
  }
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  /**
   * Process a batch of flashcards
   */
  async processFlashcardBatch(userId, flashcards, options) {
    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    for (let i = 0; i < flashcards.length; i++) {
      const flashcard = flashcards[i];
      try {
        if (typeof flashcard.cardId !== "string") {
          throw new ValidationError(
            "Flashcard cardId must be a non-empty string",
            "bulk_import_flashcards",
            "flashcards",
            "cardId",
            flashcard.cardId
          );
        }
        const cardId = flashcard.cardId.trim();
        if (cardId.length === 0) {
          throw new ValidationError(
            "Flashcard cardId must be a non-empty string",
            "bulk_import_flashcards",
            "flashcards",
            "cardId",
            flashcard.cardId
          );
        }
        flashcard.cardId = cardId;
        const validation = validateDocument(flashcard, FlashcardSchema);
        if (!validation.isValid) {
          throw new ValidationError(
            `Flashcard validation failed: ${validation.errors.join(", ")}`,
            "bulk_import_flashcards",
            "flashcards"
          );
        }
        const existingResult = await flashcardsService.getFlashcardById(
          cardId,
          userId
        );
        if (existingResult.success && existingResult.data) {
          if (options.skipDuplicates) {
            results.skipped++;
            continue;
          } else if (options.updateExisting) {
            const updateResult = await flashcardsService.updateFlashcard(
              cardId,
              flashcard,
              userId
            );
            if (updateResult.success) {
              results.updated++;
            } else {
              throw new Error(
                updateResult.error || "Failed to update flashcard"
              );
            }
          } else {
            throw new Error(
              `Flashcard with ID ${flashcard.cardId} already exists`
            );
          }
        } else {
          const createResult = await flashcardsService.createFlashcard(
            flashcard,
            userId
          );
          if (createResult.success) {
            results.inserted++;
          } else {
            throw new Error(createResult.error || "Failed to create flashcard");
          }
        }
      } catch (error) {
        results.errors.push({
          index: i,
          error
        });
      }
    }
    return results;
  }
}
const bulkOperationsService = new BulkOperationsService();

class SyncService {
  constructor() {
    this.activeSyncSessions = /* @__PURE__ */ new Map();
  }
  /**
   * Start a new sync session
   */
  async startSyncSession(userId) {
    return safeAsync(
      async () => {
        const sessionId = `sync_${userId}_${Date.now()}`;
        const syncSession = {
          sessionId,
          userId,
          startTime: /* @__PURE__ */ new Date(),
          status: "in_progress",
          totalItems: 0,
          syncedItems: 0,
          conflicts: [],
          errors: []
        };
        this.activeSyncSessions.set(sessionId, syncSession);
        return {
          success: true,
          data: syncSession,
          operationTime: Date.now()
        };
      },
      { operation: "start_sync_session", userId }
    );
  }
  /**
   * Sync user data from local storage to MongoDB
   */
  async syncFromLocal(userId, localData, options = {}) {
    return safeAsync(
      async () => {
        const sessionResult = await this.startSyncSession(userId);
        if (!sessionResult.success || !sessionResult.data) {
          throw new DatabaseError(
            "Failed to start sync session",
            "SYNC_FAILED",
            "sync_from_local"
          );
        }
        const syncSession = sessionResult.data;
        const {
          resolveConflicts = "merge",
          skipExisting = false,
          batchSize = 50
        } = options;
        try {
          syncSession.totalItems = (localData.flashcards?.length || 0) + (localData.studySessions?.length || 0) + (localData.studyStatistics?.length || 0);
          if (localData.flashcards && localData.flashcards.length > 0) {
            await this.syncFlashcards(syncSession, localData.flashcards, {
              resolveConflicts,
              skipExisting,
              batchSize
            });
          }
          if (localData.studySessions && localData.studySessions.length > 0) {
            await this.syncStudySessions(syncSession, localData.studySessions, {
              resolveConflicts,
              skipExisting,
              batchSize
            });
          }
          if (localData.studyStatistics && localData.studyStatistics.length > 0) {
            await this.syncStudyStatistics(
              syncSession,
              localData.studyStatistics,
              {
                resolveConflicts,
                skipExisting,
                batchSize
              }
            );
          }
          syncSession.endTime = /* @__PURE__ */ new Date();
          syncSession.status = syncSession.conflicts.length > 0 ? "completed" : "completed";
          this.activeSyncSessions.set(syncSession.sessionId, syncSession);
          return {
            success: true,
            data: syncSession,
            operationTime: Date.now()
          };
        } catch (error) {
          syncSession.status = "failed";
          syncSession.errors.push(
            error instanceof Error ? error.message : "Unknown sync error"
          );
          syncSession.endTime = /* @__PURE__ */ new Date();
          throw error;
        }
      },
      { operation: "sync_from_local", userId }
    );
  }
  /**
   * Sync user data from MongoDB to local storage
   */
  async syncToLocal(userId, options = {}) {
    return safeAsync(
      async () => {
        const {
          since,
          includeFlashcards = true,
          includeSessions = true,
          includeStatistics = true,
          limit = 1e3
        } = options;
        const syncData = {
          userId,
          syncedAt: /* @__PURE__ */ new Date(),
          data: {}
        };
        if (includeFlashcards) {
          const flashcardsResult = await flashcardsService.getDueFlashcards(
            userId,
            {
              limit,
              includeSuspended: true
            }
          );
          if (flashcardsResult.success && flashcardsResult.data) {
            syncData.data.flashcards = flashcardsResult.data;
          }
        }
        if (includeSessions) {
          const sessionsResult = await studySessionsService.getUserStudySessions(userId, {
            limit,
            dateRange: since ? { start: since, end: /* @__PURE__ */ new Date() } : void 0
          });
          if (sessionsResult.success && sessionsResult.data) {
            syncData.data.studySessions = sessionsResult.data;
          }
        }
        if (includeStatistics) {
          const statsResult = await studyStatisticsService.getStudyStatisticsRange(
            userId,
            since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3),
            /* @__PURE__ */ new Date(),
            "daily",
            { limit }
          );
          if (statsResult.success && statsResult.data) {
            syncData.data.studyStatistics = statsResult.data;
          }
        }
        return {
          success: true,
          data: syncData,
          operationTime: Date.now()
        };
      },
      { operation: "sync_to_local", userId }
    );
  }
  /**
   * Resolve sync conflicts
   */
  async resolveConflicts(sessionId, resolutions) {
    return safeAsync(
      async () => {
        const syncSession = this.activeSyncSessions.get(sessionId);
        if (!syncSession) {
          throw new ValidationError(
            "Sync session not found",
            "resolve_conflicts"
          );
        }
        for (const resolution of resolutions) {
          const conflict = syncSession.conflicts[resolution.conflictIndex];
          if (!conflict) continue;
          conflict.resolved = true;
          conflict.resolution = resolution.resolution;
          await this.applyConflictResolution(conflict, resolution);
        }
        return {
          success: true,
          data: syncSession,
          operationTime: Date.now()
        };
      },
      { operation: "resolve_conflicts" }
    );
  }
  /**
   * Get sync status for a user
   */
  async getSyncStatus(userId) {
    return safeAsync(
      async () => {
        const userResult = await usersService.getUserById(userId);
        const lastSyncTimestamp = userResult.success && userResult.data?.updatedAt ? userResult.data.updatedAt : void 0;
        const pendingCounts = await this.getPendingSyncCounts(
          userId,
          lastSyncTimestamp
        );
        return {
          success: true,
          data: {
            userId,
            lastSyncTimestamp,
            pendingItems: pendingCounts,
            activeSyncSessions: Array.from(
              this.activeSyncSessions.values()
            ).filter((session) => session.userId === userId)
          },
          operationTime: Date.now()
        };
      },
      { operation: "get_sync_status", userId }
    );
  }
  /**
   * Perform full data migration for a user
   */
  async migrateUserData(userId, sourceData, options = {}) {
    return safeAsync(
      async () => {
        const {
          validateData = true,
          transformData = true,
          batchSize = 100
        } = options;
        const migrationResult = {
          success: true,
          migratedItems: {
            flashcards: 0,
            studySessions: 0,
            studyStatistics: 0
          },
          errors: [],
          skippedItems: 0
        };
        let processedData = sourceData;
        if (transformData) {
          processedData = await this.transformMigrationData(sourceData, userId);
        }
        if (validateData) {
          const validationResult = await this.validateMigrationData(processedData);
          if (!validationResult.isValid) {
            migrationResult.errors.push(...validationResult.errors);
            if (validationResult.errors.length > 0) {
              migrationResult.success = false;
              return {
                success: false,
                data: migrationResult,
                operationTime: Date.now()
              };
            }
          }
        }
        if (processedData.flashcards && processedData.flashcards.length > 0) {
          const flashcardsResult = await bulkOperationsService.bulkImportFlashcards(
            userId,
            processedData.flashcards,
            { skipDuplicates: true, batchSize }
          );
          if (flashcardsResult.success && flashcardsResult.data) {
            migrationResult.migratedItems.flashcards = flashcardsResult.data.insertedCount;
            if (flashcardsResult.data.errors.length > 0) {
              migrationResult.errors.push(...flashcardsResult.data.errors);
            }
          }
        }
        if (processedData.studySessions && processedData.studySessions.length > 0) {
          const sessionsResult = await bulkOperationsService.bulkCreateStudySessions(
            userId,
            processedData.studySessions
          );
          if (sessionsResult.success && sessionsResult.data) {
            migrationResult.migratedItems.studySessions = sessionsResult.data.insertedCount;
            if (sessionsResult.data.errors.length > 0) {
              migrationResult.errors.push(...sessionsResult.data.errors);
            }
          }
        }
        if (processedData.studyStatistics && processedData.studyStatistics.length > 0) {
          for (const stats of processedData.studyStatistics) {
            try {
              await studyStatisticsService.createStudyStatistics(stats, userId);
              migrationResult.migratedItems.studyStatistics++;
            } catch (error) {
              migrationResult.errors.push(
                `Failed to migrate study statistics: ${error}`
              );
            }
          }
        }
        return {
          success: migrationResult.success,
          data: migrationResult,
          operationTime: Date.now()
        };
      },
      { operation: "migrate_user_data", userId }
    );
  }
  /**
   * Clean up old sync sessions
   */
  async cleanupSyncSessions(maxAgeHours = 24) {
    return safeAsync(
      async () => {
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1e3);
        let cleanedCount = 0;
        for (const [sessionId, session] of this.activeSyncSessions.entries()) {
          if (session.startTime < cutoffTime) {
            this.activeSyncSessions.delete(sessionId);
            cleanedCount++;
          }
        }
        return {
          success: true,
          data: cleanedCount,
          operationTime: Date.now()
        };
      },
      { operation: "cleanup_sync_sessions" }
    );
  }
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  /**
   * Sync flashcards with conflict resolution
   */
  async syncFlashcards(syncSession, flashcards, options) {
    for (let i = 0; i < flashcards.length; i += options.batchSize) {
      const batch = flashcards.slice(i, i + options.batchSize);
      for (const flashcard of batch) {
        try {
          const existingResult = await flashcardsService.getFlashcardById(
            flashcard.cardId,
            syncSession.userId
          );
          if (existingResult.success && existingResult.data) {
            const conflict = await this.createConflict(
              syncSession,
              "flashcards",
              flashcard.cardId,
              flashcard,
              existingResult.data,
              "update"
            );
            await this.resolveConflictAutomatically(
              conflict,
              options.resolveConflicts
            );
          } else {
            await flashcardsService.createFlashcard(
              flashcard,
              syncSession.userId
            );
          }
          syncSession.syncedItems++;
        } catch (error) {
          syncSession.errors.push(
            `Failed to sync flashcard ${flashcard.cardId}: ${error}`
          );
        }
      }
    }
  }
  /**
   * Sync study sessions
   */
  async syncStudySessions(syncSession, sessions, options) {
    for (let i = 0; i < sessions.length; i += options.batchSize) {
      const batch = sessions.slice(i, i + options.batchSize);
      for (const session of batch) {
        try {
          const existingResult = await studySessionsService.getStudySessionById(
            session.sessionId,
            syncSession.userId
          );
          if (existingResult.success && existingResult.data) {
            const conflict = await this.createConflict(
              syncSession,
              "study_sessions",
              session.sessionId,
              session,
              existingResult.data,
              "update"
            );
            await this.resolveConflictAutomatically(
              conflict,
              options.resolveConflicts
            );
          } else {
            await studySessionsService.createStudySession(
              session,
              syncSession.userId
            );
          }
          syncSession.syncedItems++;
        } catch (error) {
          syncSession.errors.push(
            `Failed to sync study session ${session.sessionId}: ${error}`
          );
        }
      }
    }
  }
  /**
   * Sync study statistics
   */
  async syncStudyStatistics(syncSession, statistics, options) {
    for (let i = 0; i < statistics.length; i += options.batchSize) {
      const batch = statistics.slice(i, i + options.batchSize);
      for (const stats of batch) {
        try {
          const existingResult = await studyStatisticsService.getStudyStatisticsById(
            stats.statsId,
            syncSession.userId
          );
          if (existingResult.success && existingResult.data) {
            const conflict = await this.createConflict(
              syncSession,
              "study_statistics",
              stats.statsId,
              stats,
              existingResult.data,
              "update"
            );
            await this.resolveConflictAutomatically(
              conflict,
              options.resolveConflicts
            );
          } else {
            await studyStatisticsService.createStudyStatistics(
              stats,
              syncSession.userId
            );
          }
          syncSession.syncedItems++;
        } catch (error) {
          syncSession.errors.push(
            `Failed to sync study statistics ${stats.statsId}: ${error}`
          );
        }
      }
    }
  }
  /**
   * Create a sync conflict
   */
  async createConflict(syncSession, collection, documentId, localVersion, remoteVersion, conflictType) {
    const conflict = {
      collection,
      documentId,
      localVersion,
      remoteVersion,
      conflictType,
      resolved: false,
      timestamp: /* @__PURE__ */ new Date()
    };
    syncSession.conflicts.push(conflict);
    return conflict;
  }
  /**
   * Automatically resolve a conflict
   */
  async resolveConflictAutomatically(conflict, resolutionStrategy) {
    switch (resolutionStrategy) {
      case "local":
        conflict.resolution = "local";
        conflict.resolved = true;
        await this.applyLocalVersion(conflict);
        break;
      case "remote":
        conflict.resolution = "remote";
        conflict.resolved = true;
        break;
      case "merge":
        conflict.resolution = "merge";
        conflict.resolved = true;
        await this.mergeVersions(conflict);
        break;
    }
  }
  /**
   * Apply conflict resolution
   */
  async applyConflictResolution(conflict, resolution) {
    switch (resolution.resolution) {
      case "local":
        await this.applyLocalVersion(conflict);
        break;
      case "remote":
        break;
      case "merge":
        if (resolution.mergedData) {
          await this.applyMergedVersion(conflict, resolution.mergedData);
        } else {
          await this.mergeVersions(conflict);
        }
        break;
    }
  }
  /**
   * Apply local version to resolve conflict
   */
  async applyLocalVersion(conflict) {
    switch (conflict.collection) {
      case "flashcards":
        await flashcardsService.updateFlashcard(
          conflict.documentId,
          conflict.localVersion,
          conflict.localVersion.userId
        );
        break;
      case "study_sessions":
        await studySessionsService.updateSessionProgress(
          conflict.documentId,
          {
            cardsStudied: conflict.localVersion.cardsStudied,
            currentPerformance: conflict.localVersion.performance
          },
          conflict.localVersion.userId
        );
        break;
      case "study_statistics":
        await studyStatisticsService.updateStudyStatistics(
          conflict.documentId,
          conflict.localVersion,
          conflict.localVersion.userId
        );
        break;
    }
  }
  /**
   * Merge local and remote versions
   */
  async mergeVersions(conflict) {
    const localTime = new Date(
      conflict.localVersion.updatedAt || conflict.localVersion.createdAt
    ).getTime();
    const remoteTime = new Date(
      conflict.remoteVersion.updatedAt || conflict.remoteVersion.createdAt
    ).getTime();
    if (localTime > remoteTime) {
      await this.applyLocalVersion(conflict);
    }
  }
  /**
   * Apply merged version
   */
  async applyMergedVersion(conflict, mergedData) {
    switch (conflict.collection) {
      case "flashcards":
        await flashcardsService.updateFlashcard(
          conflict.documentId,
          mergedData,
          mergedData.userId
        );
        break;
      case "study_sessions":
        await studySessionsService.updateSessionProgress(
          conflict.documentId,
          {
            cardsStudied: mergedData.cardsStudied,
            currentPerformance: mergedData.performance
          },
          mergedData.userId
        );
        break;
      case "study_statistics":
        await studyStatisticsService.updateStudyStatistics(
          conflict.documentId,
          mergedData,
          mergedData.userId
        );
        break;
    }
  }
  /**
   * Get pending sync counts
   */
  async getPendingSyncCounts(userId, since) {
    const counts = {
      flashcards: 0,
      studySessions: 0,
      studyStatistics: 0
    };
    if (since) {
      const flashcardsResult = await flashcardsService.getDueFlashcards(
        userId,
        { limit: 1e4 }
      );
      if (flashcardsResult.success && flashcardsResult.data) {
        counts.flashcards = flashcardsResult.data.filter(
          (card) => new Date(card.updatedAt) > since
        ).length;
      }
      const sessionsResult = await studySessionsService.getUserStudySessions(
        userId,
        {
          limit: 1e3,
          dateRange: { start: since, end: /* @__PURE__ */ new Date() }
        }
      );
      if (sessionsResult.success && sessionsResult.data) {
        counts.studySessions = sessionsResult.data.length;
      }
      const statsResult = await studyStatisticsService.getStudyStatisticsRange(
        userId,
        since,
        /* @__PURE__ */ new Date(),
        "daily",
        { limit: 1e3 }
      );
      if (statsResult.success && statsResult.data) {
        counts.studyStatistics = statsResult.data.length;
      }
    }
    return counts;
  }
  /**
   * Transform migration data
   */
  async transformMigrationData(sourceData, userId) {
    const transformed = { ...sourceData };
    if (transformed.flashcards) {
      transformed.flashcards = transformed.flashcards.map((card) => ({
        ...card,
        userId,
        cardId: card.cardId || `card_${Date.now()}_${Math.random()}`,
        createdAt: card.createdAt || /* @__PURE__ */ new Date(),
        updatedAt: card.updatedAt || /* @__PURE__ */ new Date()
      }));
    }
    if (transformed.studySessions) {
      transformed.studySessions = transformed.studySessions.map((session) => ({
        ...session,
        userId,
        sessionId: session.sessionId || `session_${Date.now()}_${Math.random()}`,
        createdAt: session.createdAt || /* @__PURE__ */ new Date(),
        updatedAt: session.updatedAt || /* @__PURE__ */ new Date()
      }));
    }
    if (transformed.studyStatistics) {
      transformed.studyStatistics = transformed.studyStatistics.map((stats) => ({
        ...stats,
        userId,
        statsId: stats.statsId || `stats_${Date.now()}_${Math.random()}`,
        createdAt: stats.createdAt || /* @__PURE__ */ new Date(),
        updatedAt: stats.updatedAt || /* @__PURE__ */ new Date()
      }));
    }
    return transformed;
  }
  /**
   * Validate migration data
   */
  async validateMigrationData(data) {
    const errors = [];
    if (data.flashcards) {
      for (const card of data.flashcards) {
        if (!card.front || !card.back || !card.category) {
          errors.push(`Invalid flashcard: missing required fields`);
        }
      }
    }
    if (data.studySessions) {
      for (const session of data.studySessions) {
        if (!session.startTime || !session.cardsStudied) {
          errors.push(`Invalid study session: missing required fields`);
        }
      }
    }
    if (data.studyStatistics) {
      for (const stats of data.studyStatistics) {
        if (!stats.date || !stats.dailyStats) {
          errors.push(`Invalid study statistics: missing required fields`);
        }
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
const syncService = new SyncService();

class ServiceFactory {
  constructor() {
    this.services = {
      users: usersService,
      flashcards: flashcardsService,
      studySessions: studySessionsService,
      studyStatistics: studyStatisticsService,
      bulkOperations: bulkOperationsService,
      sync: syncService
    };
  }
  static getInstance() {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  getServices() {
    return this.services;
  }
  getUserService() {
    return this.services.users;
  }
  getFlashcardService() {
    return this.services.flashcards;
  }
  getStudySessionService() {
    return this.services.studySessions;
  }
  getStudyStatisticsService() {
    return this.services.studyStatistics;
  }
  getBulkOperationsService() {
    return this.services.bulkOperations;
  }
  getSyncService() {
    return this.services.sync;
  }
}
const linguaFlipServices = {
  // Services
  users: usersService,
  flashcards: flashcardsService,
  studySessions: studySessionsService,
  studyStatistics: studyStatisticsService,
  bulkOperations: bulkOperationsService,
  sync: syncService,
  // Service factory
  factory: ServiceFactory.getInstance(),
  // Error handling
  errorHandler,
  safeAsync,
  // Database utilities
  databaseUtils,
  getDatabase,
  initializeDatabase,
  closeDatabase,
  // Schema utilities
  validateDocument,
  sanitizeInput,
  calculateNextReviewDate,
  getDefaultSM2Params,
  // Validation utilities
  validateObjectId,
  validateRequired,
  validateQuality,
  validateOwnership
};

export { BulkOperationError, DatabaseError, DatabaseIndexes, DuplicateError, FlashcardSchema, MigrationSchema, NotFoundError, Schemas, ServiceFactory, StudySessionSchema, StudyStatisticsSchema, UserSchema, ValidationError, bulkOperationsService, calculateNextReviewDate, closeDatabase, createDatabaseOperations, databaseUtils, linguaFlipServices as default, errorHandler, flashcardsService, getDatabase, getDefaultSM2Params, initializeDatabase, safeAsync, sanitizeInput, studySessionsService, studyStatisticsService, syncService, usersService, validateDocument, validateObjectId, validateOwnership, validateQuality, validateRequired };
