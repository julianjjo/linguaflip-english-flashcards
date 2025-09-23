/**
 * Study Statistics Schema Definition for MongoDB
 *
 * This schema defines the structure for study statistics documents in the LinguaFlip application.
 * It includes daily, weekly, and monthly statistical data for user progress tracking.
 */

/**
 * Study Statistics Schema Definition
 */
export const StudyStatisticsSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'statsId',
        'userId',
        'date',
        'period',
        'dailyStats',
        'createdAt',
        'updatedAt',
      ],
      properties: {
        statsId: {
          bsonType: 'string',
          description: 'Unique statistics identifier',
        },
        userId: {
          bsonType: 'string',
          description: 'User identifier',
        },
        date: {
          bsonType: 'date',
          description: 'Statistics date',
        },
        period: {
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Statistics period type',
        },
        dailyStats: {
          bsonType: 'object',
          required: [
            'cardsStudied',
            'studyTime',
            'correctAnswers',
            'incorrectAnswers',
            'averageRecallRate',
          ],
          properties: {
            cardsStudied: {
              bsonType: 'int',
              minimum: 0,
            },
            studyTime: {
              bsonType: 'int',
              minimum: 0,
              description: 'Study time in minutes',
            },
            correctAnswers: {
              bsonType: 'int',
              minimum: 0,
            },
            incorrectAnswers: {
              bsonType: 'int',
              minimum: 0,
            },
            averageRecallRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
            },
            averageResponseTime: {
              bsonType: 'double',
              minimum: 0,
            },
            sessionsCompleted: {
              bsonType: 'int',
              minimum: 0,
            },
            newCardsLearned: {
              bsonType: 'int',
              minimum: 0,
            },
          },
        },
        weeklyStats: {
          bsonType: 'object',
          properties: {
            totalCards: {
              bsonType: 'int',
              minimum: 0,
            },
            totalTime: {
              bsonType: 'int',
              minimum: 0,
            },
            averageRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
            },
            improvement: {
              bsonType: 'double',
            },
            streakDays: {
              bsonType: 'int',
              minimum: 0,
            },
            categoriesStudied: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  category: {
                    bsonType: 'string',
                  },
                  cardsCount: {
                    bsonType: 'int',
                    minimum: 0,
                  },
                },
              },
            },
          },
        },
        monthlyStats: {
          bsonType: 'object',
          properties: {
            totalCards: {
              bsonType: 'int',
              minimum: 0,
            },
            totalTime: {
              bsonType: 'int',
              minimum: 0,
            },
            averageRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
            },
            improvement: {
              bsonType: 'double',
            },
            mostStudiedCategory: {
              bsonType: 'string',
            },
            leastStudiedCategory: {
              bsonType: 'string',
            },
            consistency: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
            },
          },
        },
        createdAt: {
          bsonType: 'date',
        },
        updatedAt: {
          bsonType: 'date',
        },
        version: {
          bsonType: 'int',
          minimum: 1,
        },
      },
    },
  },
};
