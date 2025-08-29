/**
 * MongoDB Schema Definitions for LinguaFlip
 *
 * This file contains comprehensive MongoDB schema definitions with validation,
 * indexing strategies, and utilities for the LinguaFlip flashcard application.
 *
 * Supports the SM-2 Spaced Repetition algorithm and multi-user architecture.
 */

import { ObjectId } from 'mongodb';

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Email validation function
 */
export const emailValidator = function(email: string): boolean {
  if (!email) return true; // Allow empty emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * URL validation function
 */
export const urlValidator = function(url: string): boolean {
  if (!url) return true; // Allow empty URLs
  const urlRegex = /^https?:\/\/.+/;
  return urlRegex.test(url);
};

/**
 * SM-2 algorithm parameters validation
 */
export const sm2Validator = function(sm2: any): boolean {
  if (!sm2) return true;

  const { easeFactor, interval, repetitions } = sm2;

  // Validate ease factor (1.3 to 2.5)
  if (easeFactor !== undefined && (easeFactor < 1.3 || easeFactor > 2.5)) {
    return false;
  }

  // Validate interval (minimum 1)
  if (interval !== undefined && interval < 1) {
    return false;
  }

  // Validate repetitions (non-negative)
  if (repetitions !== undefined && repetitions < 0) {
    return false;
  }

  return true;
};

/**
 * Quality response validation (0-5)
 */
export const qualityValidator = function(quality: number): boolean {
  return quality >= 0 && quality <= 5;
};

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * User Schema Definition
 */
export const UserSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'preferences', 'statistics', 'authentication', 'createdAt', 'updatedAt'],
      properties: {
        userId: {
          bsonType: 'string',
          description: 'Unique user identifier'
        },
        email: {
          bsonType: ['string', 'null'],
          description: 'User email address',
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
        },
        username: {
          bsonType: ['string', 'null'],
          description: 'Unique username',
          maxLength: 30
        },
        preferences: {
          bsonType: 'object',
          required: ['theme', 'language', 'audioEnabled', 'studyReminders'],
          properties: {
            theme: {
              enum: ['light', 'dark', 'auto'],
              description: 'UI theme preference'
            },
            language: {
              bsonType: 'string',
              description: 'Preferred language'
            },
            audioEnabled: {
              bsonType: 'bool',
              description: 'Audio features enabled'
            },
            studyReminders: {
              bsonType: 'bool',
              description: 'Study reminder notifications'
            },
            dailyCardLimit: {
              bsonType: 'int',
              minimum: 5,
              maximum: 200,
              description: 'Daily card study limit'
            },
            sessionDuration: {
              bsonType: 'int',
              minimum: 5,
              maximum: 120,
              description: 'Default session duration in minutes'
            }
          }
        },
        statistics: {
          bsonType: 'object',
          required: ['totalCardsStudied', 'totalStudyTime', 'averageRecallRate', 'streakDays'],
          properties: {
            totalCardsStudied: {
              bsonType: 'int',
              minimum: 0,
              description: 'Total cards studied'
            },
            totalStudyTime: {
              bsonType: 'int',
              minimum: 0,
              description: 'Total study time in minutes'
            },
            averageRecallRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
              description: 'Average recall rate percentage'
            },
            streakDays: {
              bsonType: 'int',
              minimum: 0,
              description: 'Current study streak in days'
            },
            lastStudyDate: {
              bsonType: ['date', 'null'],
              description: 'Last study session date'
            },
            cardsMastered: {
              bsonType: 'int',
              minimum: 0,
              description: 'Cards with high repetition count'
            },
            totalSessions: {
              bsonType: 'int',
              minimum: 0,
              description: 'Total study sessions completed'
            }
          }
        },
        profile: {
          bsonType: 'object',
          properties: {
            avatar: {
              bsonType: 'string',
              description: 'User avatar URL'
            },
            bio: {
              bsonType: 'string',
              maxLength: 500,
              description: 'User biography'
            },
            timezone: {
              bsonType: 'string',
              description: 'User timezone'
            },
            joinDate: {
              bsonType: 'date',
              description: 'Account creation date'
            }
          }
        },
        authentication: {
          bsonType: 'object',
          required: ['password', 'emailVerified'],
          properties: {
            password: {
              bsonType: 'string',
              minLength: 60,
              maxLength: 100,
              description: 'Hashed password using bcrypt (60+ chars for bcrypt hash)'
            },
            passwordChangedAt: {
              bsonType: 'date',
              description: 'Last password change timestamp'
            },
            passwordResetToken: {
              bsonType: ['string', 'null'],
              description: 'Password reset token'
            },
            passwordResetExpires: {
              bsonType: ['date', 'null'],
              description: 'Password reset token expiration'
            },
            emailVerificationToken: {
              bsonType: ['string', 'null'],
              description: 'Email verification token'
            },
            emailVerified: {
              bsonType: 'bool',
              description: 'Email verification status'
            },
            emailVerifiedAt: {
              bsonType: ['date', 'null'],
              description: 'Email verification timestamp'
            },
            refreshTokens: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  token: {
                    bsonType: 'string',
                    description: 'Refresh token'
                  },
                  createdAt: {
                    bsonType: 'date',
                    description: 'Token creation timestamp'
                  },
                  expiresAt: {
                    bsonType: 'date',
                    description: 'Token expiration timestamp'
                  },
                  deviceInfo: {
                    bsonType: 'string',
                    description: 'Device/browser information'
                  },
                  ipAddress: {
                    bsonType: 'string',
                    description: 'IP address used for token creation'
                  }
                }
              },
              description: 'Active refresh tokens'
            }
          }
        },
        security: {
          bsonType: 'object',
          properties: {
            lastLogin: {
              bsonType: 'date',
              description: 'Last login timestamp'
            },
            lastLoginIP: {
              bsonType: 'string',
              description: 'IP address of last login'
            },
            loginAttempts: {
              bsonType: 'int',
              minimum: 0,
              description: 'Failed login attempts'
            },
            accountLocked: {
              bsonType: 'bool',
              description: 'Account lock status'
            },
            accountLockedUntil: {
              bsonType: ['date', 'null'],
              description: 'Account lock expiration'
            },
            suspiciousActivity: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  type: {
                    bsonType: 'string',
                    description: 'Type of suspicious activity'
                  },
                  timestamp: {
                    bsonType: 'date',
                    description: 'Activity timestamp'
                  },
                  ipAddress: {
                    bsonType: 'string',
                    description: 'IP address of activity'
                  },
                  details: {
                    bsonType: 'string',
                    description: 'Additional details'
                  }
                }
              },
              description: 'Suspicious activity log'
            }
          }
        },
        createdAt: {
          bsonType: 'date',
          description: 'Document creation timestamp'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Document last update timestamp'
        },
        version: {
          bsonType: 'int',
          minimum: 1,
          description: 'Schema version for migrations'
        }
      }
    }
  }
};

/**
 * Flashcard Schema Definition
 */
export const FlashcardSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['cardId', 'userId', 'front', 'back', 'category', 'sm2', 'createdAt', 'updatedAt'],
      properties: {
        cardId: {
          bsonType: 'string',
          description: 'Unique card identifier'
        },
        userId: {
          bsonType: 'string',
          description: 'Owner user ID'
        },
        front: {
          bsonType: 'string',
          maxLength: 1000,
          description: 'Card front content'
        },
        back: {
          bsonType: 'string',
          maxLength: 1000,
          description: 'Card back content'
        },
        exampleFront: {
          bsonType: ['string', 'null'],
          maxLength: 1000,
          description: 'Example sentence in front language'
        },
        exampleBack: {
          bsonType: ['string', 'null'],
          maxLength: 1000,
          description: 'Example sentence in back language'
        },
        audioUrl: {
          bsonType: ['string', 'null'],
          description: 'Pronunciation audio URL',
          pattern: '^https?://.+'
        },
        imageUrl: {
          bsonType: ['string', 'null'],
          description: 'Illustrative image URL',
          pattern: '^https?://.+'
        },
        tags: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            maxLength: 50
          },
          description: 'Card tags for organization'
        },
        category: {
          bsonType: 'string',
          maxLength: 100,
          description: 'Card category'
        },
        difficulty: {
          enum: ['easy', 'medium', 'hard'],
          description: 'Perceived difficulty level'
        },
        metadata: {
          bsonType: 'object',
          properties: {
            source: {
              bsonType: 'string',
              maxLength: 200,
              description: 'Content source'
            },
            createdByAI: {
              bsonType: 'bool',
              description: 'Generated by AI'
            },
            aiModel: {
              bsonType: 'string',
              maxLength: 100,
              description: 'AI model used for generation'
            },
            confidence: {
              bsonType: 'double',
              minimum: 0,
              maximum: 1,
              description: 'AI confidence score'
            }
          }
        },
        sm2: {
          bsonType: 'object',
          required: ['easeFactor', 'interval', 'repetitions', 'nextReviewDate'],
          properties: {
            easeFactor: {
              bsonType: 'double',
              minimum: 1.3,
              maximum: 2.5,
              description: 'SM-2 ease factor'
            },
            interval: {
              bsonType: 'int',
              minimum: 1,
              description: 'Current interval in days'
            },
            repetitions: {
              bsonType: 'int',
              minimum: 0,
              description: 'Successful recalls in a row'
            },
            nextReviewDate: {
              bsonType: 'date',
              description: 'Next review due date'
            },
            lastReviewed: {
              bsonType: ['date', 'null'],
              description: 'Last review timestamp'
            },
            qualityResponses: {
              bsonType: 'array',
              items: {
                bsonType: 'int',
                minimum: 0,
                maximum: 5
              },
              description: 'Historical quality responses'
            },
            totalReviews: {
              bsonType: 'int',
              minimum: 0,
              description: 'Total review attempts'
            },
            correctStreak: {
              bsonType: 'int',
              minimum: 0,
              description: 'Current correct answers streak'
            },
            incorrectStreak: {
              bsonType: 'int',
              minimum: 0,
              description: 'Current incorrect answers streak'
            },
            isSuspended: {
              bsonType: 'bool',
              description: 'Card temporarily suspended'
            },
            suspensionReason: {
              bsonType: 'string',
              maxLength: 200,
              description: 'Reason for suspension'
            }
          }
        },
        statistics: {
          bsonType: 'object',
          properties: {
            timesCorrect: {
              bsonType: 'int',
              minimum: 0,
              description: 'Total correct responses'
            },
            timesIncorrect: {
              bsonType: 'int',
              minimum: 0,
              description: 'Total incorrect responses'
            },
            averageResponseTime: {
              bsonType: 'double',
              minimum: 0,
              description: 'Average response time in seconds'
            },
            lastDifficulty: {
              enum: ['easy', 'medium', 'hard'],
              description: 'Last reported difficulty'
            }
          }
        },
        createdAt: {
          bsonType: 'date',
          description: 'Card creation timestamp'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Card last update timestamp'
        },
        version: {
          bsonType: 'int',
          minimum: 1,
          description: 'Schema version'
        }
      }
    }
  }
};

/**
 * Study Session Schema Definition
 */
export const StudySessionSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'userId', 'startTime', 'cardsStudied', 'createdAt', 'updatedAt'],
      properties: {
        sessionId: {
          bsonType: 'string',
          description: 'Unique session identifier'
        },
        userId: {
          bsonType: 'string',
          description: 'User who conducted the session'
        },
        startTime: {
          bsonType: 'date',
          description: 'Session start timestamp'
        },
        endTime: {
          bsonType: ['date', 'null'],
          description: 'Session end timestamp'
        },
        duration: {
          bsonType: 'int',
          minimum: 0,
          description: 'Session duration in seconds'
        },
        cardsStudied: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['cardId', 'quality', 'wasCorrect'],
            properties: {
              cardId: {
                bsonType: 'string',
                description: 'Card identifier'
              },
              quality: {
                bsonType: 'int',
                minimum: 0,
                maximum: 5,
                description: 'Quality of response (0-5)'
              },
              responseTime: {
                bsonType: 'double',
                minimum: 0,
                description: 'Response time in seconds'
              },
              wasCorrect: {
                bsonType: 'bool',
                description: 'Whether response was correct'
              },
              previousEaseFactor: {
                bsonType: 'double',
                description: 'Ease factor before this review'
              },
              newEaseFactor: {
                bsonType: 'double',
                description: 'Ease factor after this review'
              },
              previousInterval: {
                bsonType: 'int',
                description: 'Interval before this review'
              },
              newInterval: {
                bsonType: 'int',
                description: 'Interval after this review'
              }
            }
          },
          description: 'Cards studied in this session'
        },
        totalCards: {
          bsonType: 'int',
          minimum: 0,
          description: 'Total cards in session'
        },
        correctAnswers: {
          bsonType: 'int',
          minimum: 0,
          description: 'Number of correct answers'
        },
        incorrectAnswers: {
          bsonType: 'int',
          minimum: 0,
          description: 'Number of incorrect answers'
        },
        averageResponseTime: {
          bsonType: 'double',
          minimum: 0,
          description: 'Average response time'
        },
        sessionType: {
          enum: ['review', 'new', 'practice', 'difficult', 'custom'],
          description: 'Type of study session'
        },
        config: {
          bsonType: 'object',
          properties: {
            dailyLimit: {
              bsonType: 'int',
              minimum: 1,
              description: 'Daily card limit'
            },
            sessionLimit: {
              bsonType: 'int',
              minimum: 1,
              description: 'Session card limit'
            },
            difficultyFilter: {
              bsonType: 'object',
              properties: {
                enabled: {
                  bsonType: 'bool'
                },
                levels: {
                  bsonType: 'array',
                  items: {
                    enum: ['easy', 'medium', 'hard']
                  }
                }
              }
            },
            mode: {
              enum: ['review-only', 'new-only', 'mixed', 'difficult-cards']
            }
          }
        },
        performance: {
          bsonType: 'object',
          properties: {
            overallScore: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
              description: 'Overall session score'
            },
            improvement: {
              bsonType: 'double',
              description: 'Improvement from previous sessions'
            },
            focusAreas: {
              bsonType: 'array',
              items: {
                bsonType: 'string',
                maxLength: 100
              },
              description: 'Areas needing focus'
            },
            retentionRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
              description: 'Session retention rate'
            },
            consistency: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
              description: 'Response consistency score'
            }
          }
        },
        interruptions: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['type', 'startTime'],
            properties: {
              type: {
                enum: ['pause', 'break', 'distraction']
              },
              startTime: {
                bsonType: 'date'
              },
              endTime: {
                bsonType: 'date'
              },
              duration: {
                bsonType: 'int',
                minimum: 0
              },
              reason: {
                bsonType: 'string',
                maxLength: 200
              }
            }
          },
          description: 'Session interruptions'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Session creation timestamp'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Session last update timestamp'
        },
        version: {
          bsonType: 'int',
          minimum: 1,
          description: 'Schema version'
        }
      }
    }
  }
};

/**
 * Study Statistics Schema Definition
 */
export const StudyStatisticsSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['statsId', 'userId', 'date', 'period', 'dailyStats', 'createdAt', 'updatedAt'],
      properties: {
        statsId: {
          bsonType: 'string',
          description: 'Unique statistics identifier'
        },
        userId: {
          bsonType: 'string',
          description: 'User identifier'
        },
        date: {
          bsonType: 'date',
          description: 'Statistics date'
        },
        period: {
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Statistics period type'
        },
        dailyStats: {
          bsonType: 'object',
          required: ['cardsStudied', 'studyTime', 'correctAnswers', 'incorrectAnswers', 'averageRecallRate'],
          properties: {
            cardsStudied: {
              bsonType: 'int',
              minimum: 0
            },
            studyTime: {
              bsonType: 'int',
              minimum: 0,
              description: 'Study time in minutes'
            },
            correctAnswers: {
              bsonType: 'int',
              minimum: 0
            },
            incorrectAnswers: {
              bsonType: 'int',
              minimum: 0
            },
            averageRecallRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100
            },
            averageResponseTime: {
              bsonType: 'double',
              minimum: 0
            },
            sessionsCompleted: {
              bsonType: 'int',
              minimum: 0
            },
            newCardsLearned: {
              bsonType: 'int',
              minimum: 0
            }
          }
        },
        weeklyStats: {
          bsonType: 'object',
          properties: {
            totalCards: {
              bsonType: 'int',
              minimum: 0
            },
            totalTime: {
              bsonType: 'int',
              minimum: 0
            },
            averageRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100
            },
            improvement: {
              bsonType: 'double'
            },
            streakDays: {
              bsonType: 'int',
              minimum: 0
            },
            categoriesStudied: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  category: {
                    bsonType: 'string'
                  },
                  cardsCount: {
                    bsonType: 'int',
                    minimum: 0
                  }
                }
              }
            }
          }
        },
        monthlyStats: {
          bsonType: 'object',
          properties: {
            totalCards: {
              bsonType: 'int',
              minimum: 0
            },
            totalTime: {
              bsonType: 'int',
              minimum: 0
            },
            averageRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100
            },
            improvement: {
              bsonType: 'double'
            },
            mostStudiedCategory: {
              bsonType: 'string'
            },
            leastStudiedCategory: {
              bsonType: 'string'
            },
            consistency: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100
            }
          }
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        },
        version: {
          bsonType: 'int',
          minimum: 1
        }
      }
    }
  }
};

// ============================================================================
// INDEX DEFINITIONS
// ============================================================================

/**
 * Database index definitions for optimal query performance
 */
export const DatabaseIndexes = {
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
    { key: { userId: 1, front: "text", back: "text", exampleFront: "text", exampleBack: "text" } }
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

// ============================================================================
// MIGRATION SCHEMA
// ============================================================================

/**
 * Migration tracking schema
 */
export const MigrationSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['migrationId', 'version', 'description', 'appliedAt'],
      properties: {
        migrationId: {
          bsonType: 'string',
          description: 'Unique migration identifier'
        },
        version: {
          bsonType: 'string',
          description: 'Schema version'
        },
        description: {
          bsonType: 'string',
          description: 'Migration description'
        },
        appliedAt: {
          bsonType: 'date',
          description: 'Migration application timestamp'
        },
        checksum: {
          bsonType: 'string',
          description: 'Migration checksum for validation'
        },
        success: {
          bsonType: 'bool',
          description: 'Migration success status'
        },
        error: {
          bsonType: 'string',
          description: 'Migration error message'
        }
      }
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate SM-2 algorithm parameters
 */
export function validateSM2Params(params: {
  quality: number;
  easeFactor: number;
  interval: number;
}): boolean {
  const { quality, easeFactor, interval } = params;

  return quality >= 0 && quality <= 5 &&
         easeFactor >= 1.3 && easeFactor <= 2.5 &&
         interval >= 1;
}

/**
 * Generate default SM-2 parameters for new cards
 */
export function getDefaultSM2Params(): {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
} {
  return {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: new Date()
  };
}

/**
 * Calculate next review date based on SM-2 algorithm
 */
export function calculateNextReviewDate(
  currentInterval: number,
  easeFactor: number,
  quality: number
): Date {
  let newInterval: number;

  if (quality >= 3) {
    // Correct response
    if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * easeFactor);
    }
  } else {
    // Incorrect response
    newInterval = 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return nextReview;
}

/**
 * Validate collection data against schema
 */
export function validateDocument(document: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation logic (can be enhanced with a proper JSON schema validator)
  try {
    // Check required fields
    if (schema.validator?.$jsonSchema?.required) {
      for (const field of schema.validator.$jsonSchema.required) {
        if (!(field in document) || document[field] === null || document[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check SM-2 parameters if present
    if (document.sm2 && !sm2Validator(document.sm2)) {
      errors.push('Invalid SM-2 parameters');
    }

    // Check email format if present
    if (document.email && !emailValidator(document.email)) {
      errors.push('Invalid email format');
    }

    // Check URL formats if present
    if (document.audioUrl && !urlValidator(document.audioUrl)) {
      errors.push('Invalid audio URL format');
    }
    if (document.imageUrl && !urlValidator(document.imageUrl)) {
      errors.push('Invalid image URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const Schemas = {
  UserSchema,
  FlashcardSchema,
  StudySessionSchema,
  StudyStatisticsSchema,
  MigrationSchema
};

export default Schemas;