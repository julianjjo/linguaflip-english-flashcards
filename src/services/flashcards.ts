/**
 * Flashcards Service - MongoDB CRUD Operations with SM-2 Algorithm
 *
 * This service provides comprehensive CRUD operations for flashcards with
 * integrated SM-2 spaced repetition algorithm, performance tracking, and
 * advanced querying capabilities.
 */

import { ObjectId } from 'mongodb';
import { createDatabaseOperations } from '../utils/databaseOperations';
import type { FlashcardDocument, DatabaseOperationResult, FlashcardFilter } from '../types/database';
import {
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ValidationError,
  SM2Error,
  safeAsync,
  validateRequired,
  validateOwnership,
  validateQuality,
  errorHandler
} from '../types/database';
import { FlashcardSchema, validateDocument, sanitizeInput, calculateNextReviewDate, getDefaultSM2Params } from '../schemas/mongodb';

const COLLECTION_NAME = 'flashcards';
const dbOps = createDatabaseOperations(COLLECTION_NAME);

/**
 * Flashcards Service Class
 */
export class FlashcardsService {
  /**
   * Create a new flashcard
   */
  async createFlashcard(
    cardData: Omit<FlashcardDocument, '_id' | 'createdAt' | 'updatedAt' | 'sm2' | 'statistics'>,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(async () => {
      // Validate ownership
      validateOwnership(cardData.userId, userId, COLLECTION_NAME);

      // Validate required fields
      validateRequired(cardData, ['cardId', 'userId', 'front', 'back', 'category'], COLLECTION_NAME);

      // Sanitize input data
      const sanitizedData = this.sanitizeCardData(cardData);

      // Initialize SM-2 parameters
      const sm2Params = getDefaultSM2Params();

      // Initialize statistics
      const statistics = {
        timesCorrect: 0,
        timesIncorrect: 0,
        averageResponseTime: 0,
        lastDifficulty: 'medium' as const
      };

      // Prepare complete card data
      const completeCardData = {
        ...sanitizedData,
        sm2: sm2Params,
        statistics
      };

      // Validate against schema
      const validation = validateDocument(completeCardData, FlashcardSchema);
      if (!validation.isValid) {
        throw new ValidationError(
          `Flashcard validation failed: ${validation.errors.join(', ')}`,
          'create_flashcard',
          COLLECTION_NAME
        );
      }

      // Check for duplicate cardId for this user
      await this.checkForDuplicateCard(sanitizedData.userId, sanitizedData.cardId);

      // Create flashcard
      const result = await dbOps.create(completeCardData);

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to create flashcard',
          'CREATE_FLASHCARD_FAILED',
          'create_flashcard',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'create_flashcard', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get flashcard by ID
   */
  async getFlashcardById(
    cardId: string,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(async () => {
      const result = await dbOps.findOne({ cardId, userId });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve flashcard',
          'GET_FLASHCARD_FAILED',
          'get_flashcard_by_id',
          COLLECTION_NAME
        );
      }

      if (!result.data) {
        throw new NotFoundError(
          `Flashcard with ID ${cardId} not found`,
          'get_flashcard_by_id',
          COLLECTION_NAME,
          cardId
        );
      }

      return result;
    }, { operation: 'get_flashcard_by_id', collection: COLLECTION_NAME, userId });
  }

  /**
   * Update flashcard content
   */
  async updateFlashcard(
    cardId: string,
    updates: Partial<Omit<FlashcardDocument, 'sm2' | 'statistics'>>,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(async () => {
      // Get current flashcard to validate ownership
      const currentCard = await this.getFlashcardById(cardId, userId);
      if (!currentCard.success || !currentCard.data) {
        throw new NotFoundError(
          `Flashcard with ID ${cardId} not found`,
          'update_flashcard',
          COLLECTION_NAME,
          cardId
        );
      }

      // Sanitize updates
      const sanitizedUpdates = this.sanitizeCardData(updates);

      // Validate updated data against schema
      const updatedData = { ...currentCard.data, ...sanitizedUpdates };
      const validation = validateDocument(updatedData, FlashcardSchema);
      if (!validation.isValid) {
        throw new ValidationError(
          `Flashcard validation failed: ${validation.errors.join(', ')}`,
          'update_flashcard',
          COLLECTION_NAME
        );
      }

      // Update flashcard
      const result = await dbOps.updateOne(
        { cardId, userId },
        { $set: sanitizedUpdates }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to update flashcard',
          'UPDATE_FLASHCARD_FAILED',
          'update_flashcard',
          COLLECTION_NAME
        );
      }

      // Return updated flashcard
      return this.getFlashcardById(cardId, userId);
    }, { operation: 'update_flashcard', collection: COLLECTION_NAME, userId });
  }

  /**
   * Process SM-2 algorithm review response
   */
  async processReviewResponse(
    cardId: string,
    quality: number,
    responseTime: number,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(async () => {
      // Validate quality rating
      validateQuality(quality);

      // Get current flashcard
      const currentCard = await this.getFlashcardById(cardId, userId);
      if (!currentCard.success || !currentCard.data) {
        throw new NotFoundError(
          `Flashcard with ID ${cardId} not found`,
          'process_review_response',
          COLLECTION_NAME,
          cardId
        );
      }

      const card = currentCard.data;

      // Calculate new SM-2 parameters
      const newSM2Params = this.calculateNewSM2Params(card.sm2, quality);

      // Update statistics
      const newStatistics = this.updateCardStatistics(card.statistics, quality, responseTime);

      // Prepare updates
      const updates = {
        'sm2': newSM2Params,
        'statistics': newStatistics,
        'sm2.lastReviewed': new Date(),
        'sm2.qualityResponses': [...(card.sm2.qualityResponses || []), quality],
        'sm2.totalReviews': (card.sm2.totalReviews || 0) + 1
      };

      // Update flashcard
      const result = await dbOps.updateOne(
        { cardId, userId },
        { $set: updates }
      );

      if (!result.success) {
        throw new SM2Error(
          result.error || 'Failed to process review response',
          'process_review_response',
          COLLECTION_NAME,
          quality
        );
      }

      // Return updated flashcard
      return this.getFlashcardById(cardId, userId);
    }, { operation: 'process_review_response', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get due flashcards for review
   */
  async getDueFlashcards(
    userId: string,
    options: {
      limit?: number;
      category?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      includeSuspended?: boolean;
    } = {}
  ): Promise<DatabaseOperationResult<FlashcardDocument[]>> {
    return safeAsync(async () => {
      const now = new Date();
      const query: any = {
        userId,
        'sm2.nextReviewDate': { $lte: now }
      };

      // Exclude suspended cards unless explicitly requested
      if (!options.includeSuspended) {
        query['sm2.isSuspended'] = { $ne: true };
      }

      // Add category filter
      if (options.category) {
        query.category = options.category;
      }

      // Add difficulty filter
      if (options.difficulty) {
        query.difficulty = options.difficulty;
      }

      const result = await dbOps.findMany(query, {
        limit: options.limit || 50,
        sort: { 'sm2.nextReviewDate': 1 } // Oldest due cards first
      });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve due flashcards',
          'GET_DUE_FLASHCARDS_FAILED',
          'get_due_flashcards',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'get_due_flashcards', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get flashcards by category
   */
  async getFlashcardsByCategory(
    userId: string,
    category: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<DatabaseOperationResult<FlashcardDocument[]>> {
    return safeAsync(async () => {
      const result = await dbOps.findMany(
        { userId, category },
        {
          limit: options.limit || 50,
          skip: options.skip || 0,
          sort: { createdAt: -1 }
        }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve flashcards by category',
          'GET_FLASHCARDS_BY_CATEGORY_FAILED',
          'get_flashcards_by_category',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'get_flashcards_by_category', collection: COLLECTION_NAME, userId });
  }

  /**
   * Search flashcards by content
   */
  async searchFlashcards(
    userId: string,
    searchTerm: string,
    options: { limit?: number; category?: string } = {}
  ): Promise<DatabaseOperationResult<FlashcardDocument[]>> {
    return safeAsync(async () => {
      const query: any = {
        userId,
        $or: [
          { front: new RegExp(searchTerm, 'i') },
          { back: new RegExp(searchTerm, 'i') },
          { exampleFront: new RegExp(searchTerm, 'i') },
          { exampleBack: new RegExp(searchTerm, 'i') },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      };

      // Add category filter
      if (options.category) {
        query.category = options.category;
      }

      const result = await dbOps.findMany(query, {
        limit: options.limit || 20,
        sort: { createdAt: -1 }
      });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to search flashcards',
          'SEARCH_FLASHCARDS_FAILED',
          'search_flashcards',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'search_flashcards', collection: COLLECTION_NAME, userId });
  }

  /**
   * Suspend or unsuspend a flashcard
   */
  async suspendFlashcard(
    cardId: string,
    suspended: boolean,
    reason: string,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(async () => {
      const updates: any = {
        'sm2.isSuspended': suspended,
        'sm2.suspensionReason': suspended ? reason : null
      };

      // If suspending, set next review date far in the future
      if (suspended) {
        updates['sm2.nextReviewDate'] = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      } else {
        // If unsuspending, recalculate next review date based on current SM-2 parameters
        const currentCard = await this.getFlashcardById(cardId, userId);
        if (currentCard.success && currentCard.data) {
          updates['sm2.nextReviewDate'] = calculateNextReviewDate(
            currentCard.data.sm2.interval,
            currentCard.data.sm2.easeFactor,
            3 // Assume good quality for resumption
          );
        }
      }

      const result = await dbOps.updateOne(
        { cardId, userId },
        { $set: updates }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || `Failed to ${suspended ? 'suspend' : 'unsuspend'} flashcard`,
          'SUSPEND_FLASHCARD_FAILED',
          'suspend_flashcard',
          COLLECTION_NAME
        );
      }

      // Return updated flashcard
      return this.getFlashcardById(cardId, userId);
    }, { operation: 'suspend_flashcard', collection: COLLECTION_NAME, userId });
  }

  /**
   * Delete flashcard
   */
  async deleteFlashcard(
    cardId: string,
    userId: string
  ): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    return safeAsync(async () => {
      const result = await dbOps.deleteOne({ cardId, userId });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to delete flashcard',
          'DELETE_FLASHCARD_FAILED',
          'delete_flashcard',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'delete_flashcard', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get flashcard statistics
   */
  async getFlashcardStats(
    userId: string,
    cardId?: string
  ): Promise<DatabaseOperationResult<any>> {
    return safeAsync(async () => {
      const matchStage: any = { userId };

      if (cardId) {
        matchStage.cardId = cardId;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: cardId ? '$cardId' : null,
            totalCards: { $sum: 1 },
            newCards: {
              $sum: { $cond: [{ $eq: ['$sm2.repetitions', 0] }, 1, 0] }
            },
            learningCards: {
              $sum: { $cond: [{ $and: [
                { $gt: ['$sm2.repetitions', 0] },
                { $lt: ['$sm2.repetitions', 5] }
              ]}, 1, 0] }
            },
            matureCards: {
              $sum: { $cond: [{ $gte: ['$sm2.repetitions', 5] }, 1, 0] }
            },
            suspendedCards: {
              $sum: { $cond: [{ $eq: ['$sm2.isSuspended', true] }, 1, 0] }
            },
            averageEaseFactor: { $avg: '$sm2.easeFactor' },
            averageInterval: { $avg: '$sm2.interval' },
            totalReviews: { $sum: '$sm2.totalReviews' }
          }
        }
      ];

      const result = await dbOps.aggregate(pipeline);

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to get flashcard statistics',
          'GET_FLASHCARD_STATS_FAILED',
          'get_flashcard_stats',
          COLLECTION_NAME
        );
      }

      return {
        success: true,
        data: (result.data && result.data[0]) || {
          totalCards: 0,
          newCards: 0,
          learningCards: 0,
          matureCards: 0,
          suspendedCards: 0,
          averageEaseFactor: 0,
          averageInterval: 0,
          totalReviews: 0
        },
        operationTime: result.operationTime
      };
    }, { operation: 'get_flashcard_stats', collection: COLLECTION_NAME, userId });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Sanitize flashcard data
   */
  private sanitizeCardData(cardData: any): any {
    const sanitized = { ...cardData };

    // Sanitize string fields
    if (sanitized.front) sanitized.front = sanitizeInput(sanitized.front);
    if (sanitized.back) sanitized.back = sanitizeInput(sanitized.back);
    if (sanitized.exampleFront) sanitized.exampleFront = sanitizeInput(sanitized.exampleFront);
    if (sanitized.exampleBack) sanitized.exampleBack = sanitizeInput(sanitized.exampleBack);
    if (sanitized.category) sanitized.category = sanitizeInput(sanitized.category);
    if (sanitized.tags) sanitized.tags = sanitized.tags.map((tag: string) => sanitizeInput(tag));

    return sanitized;
  }

  /**
   * Check for duplicate card ID for the same user
   */
  private async checkForDuplicateCard(userId: string, cardId: string): Promise<void> {
    const existingCard = await dbOps.findOne({ userId, cardId });
    if (existingCard.success && existingCard.data) {
      throw new DuplicateError(
        `Flashcard with ID ${cardId} already exists for this user`,
        'create_flashcard',
        COLLECTION_NAME,
        'cardId',
        cardId
      );
    }
  }

  /**
   * Calculate new SM-2 parameters based on quality response
   */
  private calculateNewSM2Params(currentSM2: any, quality: number): any {
    const newSM2 = { ...currentSM2 };

    // Calculate new ease factor
    newSM2.easeFactor = Math.max(1.3, currentSM2.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    // Calculate new interval
    if (quality >= 3) {
      // Correct response
      if (currentSM2.repetitions === 0) {
        newSM2.interval = 1;
      } else if (currentSM2.repetitions === 1) {
        newSM2.interval = 6;
      } else {
        newSM2.interval = Math.round(currentSM2.interval * newSM2.easeFactor);
      }
      newSM2.repetitions = currentSM2.repetitions + 1;
    } else {
      // Incorrect response
      newSM2.repetitions = 0;
      newSM2.interval = 1;
    }

    // Calculate next review date
    newSM2.nextReviewDate = calculateNextReviewDate(newSM2.interval, newSM2.easeFactor, quality);

    // Update streaks
    if (quality >= 3) {
      newSM2.correctStreak = (currentSM2.correctStreak || 0) + 1;
      newSM2.incorrectStreak = 0;
    } else {
      newSM2.incorrectStreak = (currentSM2.incorrectStreak || 0) + 1;
      newSM2.correctStreak = 0;
    }

    return newSM2;
  }

  /**
   * Update card statistics based on review response
   */
  private updateCardStatistics(currentStats: any, quality: number, responseTime: number): any {
    const newStats = { ...currentStats };

    // Update correct/incorrect counts
    if (quality >= 3) {
      newStats.timesCorrect = (currentStats.timesCorrect || 0) + 1;
    } else {
      newStats.timesIncorrect = (currentStats.timesIncorrect || 0) + 1;
    }

    // Update average response time
    const totalResponses = (newStats.timesCorrect || 0) + (newStats.timesIncorrect || 0);
    if (totalResponses > 0) {
      const currentTotalTime = (currentStats.averageResponseTime || 0) * (totalResponses - 1);
      newStats.averageResponseTime = (currentTotalTime + responseTime) / totalResponses;
    }

    // Update difficulty based on performance
    const correctRate = (newStats.timesCorrect || 0) / totalResponses;
    if (correctRate >= 0.8) {
      newStats.lastDifficulty = 'easy';
    } else if (correctRate >= 0.6) {
      newStats.lastDifficulty = 'medium';
    } else {
      newStats.lastDifficulty = 'hard';
    }

    return newStats;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const flashcardsService = new FlashcardsService();
export default flashcardsService;