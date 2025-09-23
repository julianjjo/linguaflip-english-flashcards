/**
 * Database Index Definitions for MongoDB
 *
 * This module contains all database index definitions for optimal query performance
 * across the LinguaFlip application collections.
 */

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
    { key: { 'statistics.totalCardsStudied': -1 } },
    { key: { 'statistics.averageRecallRate': -1 } },
    { key: { 'statistics.streakDays': -1 } },

    // Compound index for user queries
    { key: { userId: 1, updatedAt: -1 } },
  ],

  flashcards: [
    // Primary compound index for user-specific queries
    { key: { userId: 1, cardId: 1 }, options: { unique: true } },

    // SM-2 algorithm critical index for due cards
    { key: { userId: 1, 'sm2.nextReviewDate': 1, 'sm2.isSuspended': 1 } },

    // Category and tags for filtering
    { key: { userId: 1, category: 1 } },
    { key: { userId: 1, tags: 1 } },

    // Difficulty-based queries
    { key: { userId: 1, difficulty: 1 } },

    // Performance analytics
    { key: { userId: 1, 'sm2.repetitions': -1 } },
    { key: { userId: 1, 'statistics.timesCorrect': -1 } },

    // Time-based queries
    { key: { userId: 1, createdAt: -1 } },
    { key: { userId: 1, updatedAt: -1 } },

    // Text search for content
    {
      key: {
        userId: 1,
        front: 'text',
        back: 'text',
        exampleFront: 'text',
        exampleBack: 'text',
      },
    },
  ],

  study_sessions: [
    // Primary queries
    { key: { userId: 1, sessionId: 1 }, options: { unique: true } },

    // Time-based queries
    { key: { userId: 1, startTime: -1 } },
    { key: { userId: 1, endTime: -1 } },

    // Performance analysis
    { key: { userId: 1, sessionType: 1, startTime: -1 } },
    { key: { userId: 1, 'performance.overallScore': -1 } },

    // Analytics queries
    { key: { userId: 1, startTime: -1, sessionType: 1 } },
  ],

  study_statistics: [
    // Primary queries
    { key: { userId: 1, statsId: 1 }, options: { unique: true } },

    // Time-based analytics
    { key: { userId: 1, date: -1, period: 1 } },

    // Performance tracking
    { key: { userId: 1, 'dailyStats.averageRecallRate': -1 } },
    { key: { userId: 1, 'dailyStats.cardsStudied': -1 } },
  ],
};
