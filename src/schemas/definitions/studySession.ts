/**
 * Study Session Schema Definition for MongoDB
 * 
 * This schema defines the structure for study session documents in the LinguaFlip application.
 * It includes session configuration, performance tracking, and detailed card interaction data.
 */

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