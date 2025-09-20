/**
 * User Schema Definition for MongoDB
 * 
 * This schema defines the structure for user documents in the LinguaFlip application.
 * It includes user preferences, statistics, authentication, and security information.
 */

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