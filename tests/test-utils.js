// Test Utilities for MongoDB Integration Tests
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

// Global test database instance for sharing across test files
let globalTestDb = null;

// Function to get or create shared test database
async function getTestDatabase() {
  if (!globalTestDb) {
    globalTestDb = new TestDatabaseSetup();
    await globalTestDb.setup();
  }
  return globalTestDb;
}

// Function to setup production services with test database
async function setupProductionServicesForTesting() {
  const testDb = await getTestDatabase();
  const { uri } = testDb;
  
  // Set environment variables that production services will read
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DATABASE = 'linguaflip_test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-production-services';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-production-services';
  
  return testDb;
}

class TestDatabaseSetup {
  constructor() {
    this.mongoServer = null;
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async setup() {
    try {
      // Start MongoDB Memory Server
      this.mongoServer = await MongoMemoryServer.create();
      const mongoUri = this.mongoServer.getUri();
      
      // Connect to memory server
      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000
      });
      
      await this.client.connect();
      this.db = this.client.db('linguaflip_test');
      this.isConnected = true;
      
      console.log('Test database setup completed');
      return { client: this.client, db: this.db, uri: mongoUri };
    } catch (error) {
      console.error('Test database setup failed:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      if (this.client) {
        await this.client.close();
      }
      if (this.mongoServer) {
        await this.mongoServer.stop();
      }
      this.isConnected = false;
      console.log('Test database cleanup completed');
    } catch (error) {
      console.error('Test database cleanup failed:', error);
    }
  }

  async clearDatabase() {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }
    
    const collections = await this.db.listCollections().toArray();
    for (const collection of collections) {
      await this.db.collection(collection.name).deleteMany({});
    }
  }

  getDatabase() {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.client;
  }
}

// Mock Services that work with test database
class TestFlashcardsService {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('flashcards');
  }

  async createFlashcard(cardData, userId) {
    try {
      const now = new Date();
      const flashcard = {
        ...cardData,
        userId,
        createdAt: now,
        updatedAt: now,
        sm2: {
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: now,
          totalReviews: 0,
          correctStreak: 0,
          incorrectStreak: 0,
          qualityResponses: []
        },
        statistics: {
          timesCorrect: 0,
          timesIncorrect: 0,
          averageResponseTime: 0,
          lastDifficulty: 'medium'
        }
      };
      
      const result = await this.collection.insertOne(flashcard);
      
      return {
        success: true,
        data: { ...flashcard, _id: result.insertedId }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getFlashcardById(cardId, userId) {
    try {
      const card = await this.collection.findOne({ cardId, userId });
      return {
        success: true,
        data: card
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processReviewResponse(cardId, quality, responseTime, userId) {
    try {
      const card = await this.collection.findOne({ cardId, userId });
      if (!card) {
        return { success: false, error: 'Card not found' };
      }

      // Simple SM-2 calculation
      const currentSM2 = card.sm2;
      const wasCorrect = quality >= 3;
      
      let newEaseFactor = currentSM2.easeFactor;
      let newInterval = currentSM2.interval;
      let newRepetitions = currentSM2.repetitions;
      
      if (wasCorrect) {
        // Update ease factor
        newEaseFactor = Math.max(1.3, currentSM2.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
        
        // Update interval and repetitions
        if (newRepetitions === 0) {
          newInterval = 1;
        } else if (newRepetitions === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.round(newInterval * newEaseFactor);
        }
        newRepetitions++;
      } else {
        // Reset on failure
        newRepetitions = 0;
        newInterval = 1;
        newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
      }
      
      const nextReviewDate = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);
      
      const updates = {
        $set: {
          'sm2.easeFactor': newEaseFactor,
          'sm2.interval': newInterval,
          'sm2.repetitions': newRepetitions,
          'sm2.nextReviewDate': nextReviewDate,
          'sm2.lastReviewed': new Date(),
          'sm2.totalReviews': currentSM2.totalReviews + 1,
          'sm2.correctStreak': wasCorrect ? currentSM2.correctStreak + 1 : 0,
          'sm2.incorrectStreak': wasCorrect ? 0 : currentSM2.incorrectStreak + 1,
          'statistics.timesCorrect': wasCorrect ? card.statistics.timesCorrect + 1 : card.statistics.timesCorrect,
          'statistics.timesIncorrect': wasCorrect ? card.statistics.timesIncorrect : card.statistics.timesIncorrect + 1,
          updatedAt: new Date()
        },
        $push: {
          'sm2.qualityResponses': quality
        }
      };
      
      await this.collection.updateOne({ cardId, userId }, updates);
      
      const updatedCard = await this.collection.findOne({ cardId, userId });
      return {
        success: true,
        data: updatedCard
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getDueFlashcards(userId, options = {}) {
    try {
      const query = { userId };
      
      if (options.includeSuspended) {
        // When including suspended cards, get all cards regardless of due date
        // No additional filters
      } else {
        // Normal query: only due cards that are not suspended
        query['sm2.nextReviewDate'] = { $lte: new Date() };
        query['sm2.isSuspended'] = { $ne: true };
      }
      
      if (options.category) {
        query.category = options.category;
      }
      
      const cards = await this.collection
        .find(query)
        .limit(options.limit || 50)
        .sort({ 'sm2.nextReviewDate': 1 })
        .toArray();
      
      return {
        success: true,
        data: cards
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getFlashcardsByCategory(userId, category, options = {}) {
    try {
      const cards = await this.collection
        .find({ userId, category })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .sort({ createdAt: -1 })
        .toArray();
      
      return {
        success: true,
        data: cards
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchFlashcards(userId, searchTerm, options = {}) {
    try {
      const query = {
        userId,
        $or: [
          { front: new RegExp(searchTerm, 'i') },
          { back: new RegExp(searchTerm, 'i') }
        ]
      };
      
      if (options.category) {
        query.category = options.category;
      }
      
      const cards = await this.collection
        .find(query)
        .limit(options.limit || 20)
        .toArray();
      
      return {
        success: true,
        data: cards
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async suspendFlashcard(cardId, suspended, reason, userId) {
    try {
      const updates = {
        'sm2.isSuspended': suspended,
        'sm2.suspensionReason': suspended ? reason : null,
        updatedAt: new Date()
      };
      
      if (suspended) {
        updates['sm2.nextReviewDate'] = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
      
      await this.collection.updateOne({ cardId, userId }, { $set: updates });
      
      const updatedCard = await this.collection.findOne({ cardId, userId });
      return {
        success: true,
        data: updatedCard
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getFlashcardStats(userId) {
    try {
      const pipeline = [
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalCards: { $sum: 1 },
            newCards: { $sum: { $cond: [{ $eq: ['$sm2.repetitions', 0] }, 1, 0] } },
            learningCards: { $sum: { $cond: [{ $and: [{ $gt: ['$sm2.repetitions', 0] }, { $lt: ['$sm2.repetitions', 5] }] }, 1, 0] } },
            matureCards: { $sum: { $cond: [{ $gte: ['$sm2.repetitions', 5] }, 1, 0] } },
            suspendedCards: { $sum: { $cond: [{ $eq: ['$sm2.isSuspended', true] }, 1, 0] } },
            averageEaseFactor: { $avg: '$sm2.easeFactor' },
            averageInterval: { $avg: '$sm2.interval' },
            totalReviews: { $sum: '$sm2.totalReviews' }
          }
        }
      ];
      
      const result = await this.collection.aggregate(pipeline).toArray();
      
      return {
        success: true,
        data: result[0] || {
          totalCards: 0,
          newCards: 0,
          learningCards: 0,
          matureCards: 0,
          suspendedCards: 0,
          averageEaseFactor: 0,
          averageInterval: 0,
          totalReviews: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = {
  TestDatabaseSetup,
  TestFlashcardsService
};