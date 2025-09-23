/**
 * Flashcards Service - MongoDB CRUD Operations with SM-2 Algorithm
 *
 * This service provides comprehensive CRUD operations for flashcards with
 * integrated SM-2 spaced repetition algorithm, performance tracking, and
 * advanced querying capabilities.
 */

import { createDatabaseOperations } from '../utils/databaseOperations';
import type {
  FlashcardDocument,
  FlashcardSM2Data,
  FlashcardStatistics,
  DatabaseOperationResult,
} from '../types/database';
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
} from '../types/database';
import {
  FlashcardSchema,
  validateDocument,
  sanitizeInput,
  calculateNextReviewDate,
  getDefaultSM2Params,
} from '../schemas/mongodb';

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
    cardData: Omit<
      FlashcardDocument,
      '_id' | 'createdAt' | 'updatedAt' | 'sm2' | 'statistics'
    >,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(
      async () => {
        // Validate ownership
        validateOwnership(cardData.userId, userId, COLLECTION_NAME);

        // Validate required fields
        validateRequired(
          cardData,
          ['cardId', 'userId', 'front', 'back', 'category'],
          COLLECTION_NAME
        );

        // Sanitize input data
        const sanitizedData = this.sanitizeCardData(cardData);

        // Initialize SM-2 parameters
        const sm2Params: FlashcardSM2Data = getDefaultSM2Params();

        // Initialize statistics
        const statistics: FlashcardStatistics = {
          timesCorrect: 0,
          timesIncorrect: 0,
          averageResponseTime: 0,
          lastDifficulty: 'medium' as const,
        };

        // Prepare complete card data
        const completeCardData = {
          ...sanitizedData,
          sm2: sm2Params,
          statistics,
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
        await this.checkForDuplicateCard(
          sanitizedData.userId as string,
          sanitizedData.cardId as string
        );

        // Create flashcard
        const result = (await dbOps.create(
          completeCardData
        )) as DatabaseOperationResult<FlashcardDocument>;

        if (!result.success) {
          throw new DatabaseError(
            result.error || 'Failed to create flashcard',
            'CREATE_FLASHCARD_FAILED',
            'create_flashcard',
            COLLECTION_NAME
          );
        }

        return result;
      },
      { operation: 'create_flashcard', collection: COLLECTION_NAME, userId }
    );
  }

  /**
   * Get flashcard by ID
   */
  async getFlashcardById(
    cardId: string,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(
      async () => {
        const result = (await dbOps.findOne({
          cardId,
          userId,
        })) as DatabaseOperationResult<FlashcardDocument | null>;

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

        return result as DatabaseOperationResult<FlashcardDocument>;
      },
      { operation: 'get_flashcard_by_id', collection: COLLECTION_NAME, userId }
    );
  }

  /**
   * Update flashcard content
   */
  async updateFlashcard(
    cardId: string,
    updates: Partial<Omit<FlashcardDocument, 'sm2' | 'statistics'>>,
    userId: string
  ): Promise<DatabaseOperationResult<FlashcardDocument>> {
    return safeAsync(
      async () => {
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
      },
      { operation: 'update_flashcard', collection: COLLECTION_NAME, userId }
    );
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
    return safeAsync(
      async () => {
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
        const newStatistics = this.updateCardStatistics(
          card.statistics,
          quality,
          responseTime
        );

        // Prepare updates
        const updates = {
          sm2: {
            ...newSM2Params,
            lastReviewed: new Date(),
            qualityResponses: [...(card.sm2.qualityResponses || []), quality],
            totalReviews: (card.sm2.totalReviews || 0) + 1,
          },
          statistics: newStatistics,
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
      },
      {
        operation: 'process_review_response',
        collection: COLLECTION_NAME,
        userId,
      }
    );
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
    return safeAsync(
      async () => {
        const now = new Date();
        const baseQuery: Record<string, unknown> = { userId };

        if (options.category) {
          baseQuery.category = options.category;
        }

        if (options.difficulty) {
          baseQuery.difficulty = options.difficulty;
        }

        const fetchLimit = options.includeSuspended
          ? Math.max(options.limit || 50, 500)
          : options.limit || 50;

        const result = (await dbOps.findMany(baseQuery, {
          limit: fetchLimit,
          sort: { createdAt: -1 },
        })) as DatabaseOperationResult<FlashcardDocument[]>;

        if (!result.success) {
          throw new DatabaseError(
            result.error || 'Failed to retrieve due flashcards',
            'GET_DUE_FLASHCARDS_FAILED',
            'get_due_flashcards',
            COLLECTION_NAME
          );
        }

        const cards = (result.data || []).filter(
          (card): card is FlashcardDocument => Boolean(card)
        );

        const filteredCards = cards
          .filter((card) => {
            const sm2 = card.sm2;
            if (!sm2 || !(sm2.nextReviewDate instanceof Date)) {
              return false;
            }
            if (sm2.isSuspended) {
              return options.includeSuspended;
            }
            return sm2.nextReviewDate.getTime() <= now.getTime();
          })
          .sort(
            (a, b) =>
              a.sm2.nextReviewDate.getTime() - b.sm2.nextReviewDate.getTime()
          )
          .slice(0, options.limit || 50);

        return {
          success: true,
          data: filteredCards,
          operationTime: result.operationTime,
        } as DatabaseOperationResult<FlashcardDocument[]>;
      },
      { operation: 'get_due_flashcards', collection: COLLECTION_NAME, userId }
    );
  }

  /**
   * Get flashcards by category
   */
  async getFlashcardsByCategory(
    userId: string,
    category: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<DatabaseOperationResult<FlashcardDocument[]>> {
    return safeAsync(
      async () => {
        const result = (await dbOps.findMany(
          { userId, category },
          {
            limit: options.limit || 50,
            skip: options.skip || 0,
            sort: { createdAt: -1 },
          }
        )) as DatabaseOperationResult<FlashcardDocument[]>;

        if (!result.success) {
          throw new DatabaseError(
            result.error || 'Failed to retrieve flashcards by category',
            'GET_FLASHCARDS_BY_CATEGORY_FAILED',
            'get_flashcards_by_category',
            COLLECTION_NAME
          );
        }

        return result;
      },
      {
        operation: 'get_flashcards_by_category',
        collection: COLLECTION_NAME,
        userId,
      }
    );
  }

  /**
   * Get all flashcards for a user
   */
  async getAllFlashcards(
    userId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<DatabaseOperationResult<FlashcardDocument[]>> {
    return safeAsync(
      async () => {
        const result = (await dbOps.findMany(
          { userId },
          {
            limit: options.limit || 1000,
            skip: options.skip || 0,
            sort: { createdAt: -1 },
          }
        )) as DatabaseOperationResult<FlashcardDocument[]>;

        if (!result.success) {
          throw new DatabaseError(
            result.error || 'Failed to retrieve all flashcards',
            'GET_ALL_FLASHCARDS_FAILED',
            'get_all_flashcards',
            COLLECTION_NAME
          );
        }

        return result;
      },
      { operation: 'get_all_flashcards', collection: COLLECTION_NAME, userId }
    );
  }

  /**
   * Search flashcards by content
   */
  async searchFlashcards(
    userId: string,
    searchTerm: string,
    options: { limit?: number; category?: string } = {}
  ): Promise<DatabaseOperationResult<FlashcardDocument[]>> {
    return safeAsync(
      async () => {
        const query: Record<string, unknown> = {
          userId,
          $or: [
            { front: new RegExp(searchTerm, 'i') },
            { back: new RegExp(searchTerm, 'i') },
            { exampleFront: new RegExp(searchTerm, 'i') },
            { exampleBack: new RegExp(searchTerm, 'i') },
            { tags: { $in: [new RegExp(searchTerm, 'i')] } },
          ],
        };

        // Add category filter
        if (options.category) {
          query.category = options.category;
        }

        const result = (await dbOps.findMany(query, {
          limit: options.limit || 20,
          sort: { createdAt: -1 },
        })) as DatabaseOperationResult<FlashcardDocument[]>;

        if (!result.success) {
          throw new DatabaseError(
            result.error || 'Failed to search flashcards',
            'SEARCH_FLASHCARDS_FAILED',
            'search_flashcards',
            COLLECTION_NAME
          );
        }

        return result;
      },
      { operation: 'search_flashcards', collection: COLLECTION_NAME, userId }
    );
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
    return safeAsync(
      async () => {
        const updates: Record<string, unknown> = {
          'sm2.isSuspended': suspended,
          'sm2.suspensionReason': suspended ? reason : null,
        };

        // If suspending, set next review date far in the future
        if (suspended) {
          updates['sm2.nextReviewDate'] = new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ); // 1 year from now
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
            result.error ||
              `Failed to ${suspended ? 'suspend' : 'unsuspend'} flashcard`,
            'SUSPEND_FLASHCARD_FAILED',
            'suspend_flashcard',
            COLLECTION_NAME
          );
        }

        // Return updated flashcard
        return this.getFlashcardById(cardId, userId);
      },
      { operation: 'suspend_flashcard', collection: COLLECTION_NAME, userId }
    );
  }

  /**
   * Delete flashcard
   */
  async deleteFlashcard(
    cardId: string,
    userId: string
  ): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    return safeAsync(
      async () => {
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
      },
      { operation: 'delete_flashcard', collection: COLLECTION_NAME, userId }
    );
  }

  /**
   * Get flashcard statistics
   */
  async getFlashcardStats(
    userId: string,
    cardId?: string
  ): Promise<
    DatabaseOperationResult<{
      totalCards: number;
      newCards: number;
      learningCards: number;
      matureCards: number;
      suspendedCards: number;
      averageEaseFactor: number;
      averageInterval: number;
      totalReviews: number;
    }>
  > {
    return safeAsync(
      async () => {
        const matchStage: Record<string, unknown> = { userId };

        if (cardId) {
          matchStage.cardId = cardId;
        }

        const flashcardsResult = (await dbOps.findMany(
          matchStage
        )) as DatabaseOperationResult<FlashcardDocument[]>;

        if (!flashcardsResult.success) {
          throw new DatabaseError(
            flashcardsResult.error || 'Failed to get flashcard statistics',
            'GET_FLASHCARD_STATS_FAILED',
            'get_flashcard_stats',
            COLLECTION_NAME
          );
        }

        const cards = flashcardsResult.data || [];
        const totals = cards.reduce(
          (acc, card) => {
            acc.totalCards += 1;
            const repetitions = card.sm2?.repetitions ?? 0;
            if (repetitions === 0) {
              acc.newCards += 1;
            } else if (repetitions < 5) {
              acc.learningCards += 1;
            } else {
              acc.matureCards += 1;
            }

            if (card.sm2?.isSuspended) {
              acc.suspendedCards += 1;
            }

            if (typeof card.sm2?.easeFactor === 'number') {
              acc.totalEaseFactor += card.sm2.easeFactor;
            }

            if (typeof card.sm2?.interval === 'number') {
              acc.totalInterval += card.sm2.interval;
            }

            if (typeof card.sm2?.totalReviews === 'number') {
              acc.totalReviews += card.sm2.totalReviews;
            }

            return acc;
          },
          {
            totalCards: 0,
            newCards: 0,
            learningCards: 0,
            matureCards: 0,
            suspendedCards: 0,
            totalEaseFactor: 0,
            totalInterval: 0,
            totalReviews: 0,
          }
        );

        const averageEaseFactor =
          totals.totalCards > 0
            ? totals.totalEaseFactor / totals.totalCards
            : 0;
        const averageInterval =
          totals.totalCards > 0 ? totals.totalInterval / totals.totalCards : 0;

        return {
          success: true,
          data: {
            totalCards: totals.totalCards,
            newCards: totals.newCards,
            learningCards: totals.learningCards,
            matureCards: totals.matureCards,
            suspendedCards: totals.suspendedCards,
            averageEaseFactor,
            averageInterval,
            totalReviews: totals.totalReviews,
          },
          operationTime: flashcardsResult.operationTime,
        } as DatabaseOperationResult<{
          totalCards: number;
          newCards: number;
          learningCards: number;
          matureCards: number;
          suspendedCards: number;
          averageEaseFactor: number;
          averageInterval: number;
          totalReviews: number;
        }>;
      },
      { operation: 'get_flashcard_stats', collection: COLLECTION_NAME, userId }
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Sanitize flashcard data
   */
  private sanitizeCardData(
    cardData: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = { ...cardData };

    // Sanitize string fields with proper type assertions
    if (sanitized.front)
      sanitized.front = sanitizeInput(String(sanitized.front));
    if (sanitized.back) sanitized.back = sanitizeInput(String(sanitized.back));
    if (sanitized.exampleFront)
      sanitized.exampleFront = sanitizeInput(String(sanitized.exampleFront));
    if (sanitized.exampleBack)
      sanitized.exampleBack = sanitizeInput(String(sanitized.exampleBack));
    if (sanitized.category)
      sanitized.category = sanitizeInput(String(sanitized.category));
    if (sanitized.tags && Array.isArray(sanitized.tags)) {
      sanitized.tags = sanitized.tags.map((tag: unknown) =>
        sanitizeInput(String(tag))
      );
    }

    return sanitized;
  }

  /**
   * Check for duplicate card ID for the same user
   */
  private async checkForDuplicateCard(
    userId: string,
    cardId: string
  ): Promise<void> {
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
  private calculateNewSM2Params(
    currentSM2: FlashcardSM2Data,
    quality: number
  ): FlashcardSM2Data {
    const easeFactor = currentSM2.easeFactor;
    const repetitions = currentSM2.repetitions;
    const interval = currentSM2.interval;

    const updatedEaseFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    let updatedInterval = interval;
    let updatedRepetitions = repetitions;

    if (quality >= 3) {
      if (repetitions === 0) {
        updatedInterval = 1;
      } else if (repetitions === 1) {
        updatedInterval = 6;
      } else {
        updatedInterval = Math.round(interval * updatedEaseFactor);
      }
      updatedRepetitions = repetitions + 1;
    } else {
      updatedRepetitions = 0;
      updatedInterval = 1;
    }

    const nextReviewDate = calculateNextReviewDate(
      updatedInterval,
      updatedEaseFactor,
      quality
    );

    const correctStreak =
      quality >= 3 ? (currentSM2.correctStreak ?? 0) + 1 : 0;
    const incorrectStreak =
      quality >= 3 ? 0 : (currentSM2.incorrectStreak ?? 0) + 1;

    return {
      ...currentSM2,
      easeFactor: updatedEaseFactor,
      interval: updatedInterval,
      repetitions: updatedRepetitions,
      nextReviewDate,
      correctStreak,
      incorrectStreak,
    };
  }

  /**
   * Update card statistics based on review response
   */
  private updateCardStatistics(
    currentStats: FlashcardStatistics,
    quality: number,
    responseTime: number
  ): FlashcardStatistics {
    const timesCorrect = currentStats.timesCorrect;
    const timesIncorrect = currentStats.timesIncorrect;
    const averageResponseTime = currentStats.averageResponseTime;

    const updatedTimesCorrect = quality >= 3 ? timesCorrect + 1 : timesCorrect;
    const updatedTimesIncorrect =
      quality >= 3 ? timesIncorrect : timesIncorrect + 1;
    const totalResponses = updatedTimesCorrect + updatedTimesIncorrect;

    let updatedAverageResponseTime = averageResponseTime;
    if (totalResponses > 0) {
      const previousResponses = timesCorrect + timesIncorrect;
      const previousTotalTime = averageResponseTime * previousResponses;
      updatedAverageResponseTime =
        (previousTotalTime + responseTime) / totalResponses;
    }

    const correctRate =
      totalResponses > 0 ? updatedTimesCorrect / totalResponses : 0;
    let lastDifficulty: FlashcardStatistics['lastDifficulty'] =
      currentStats.lastDifficulty;
    if (correctRate >= 0.8) {
      lastDifficulty = 'easy';
    } else if (correctRate >= 0.6) {
      lastDifficulty = 'medium';
    } else {
      lastDifficulty = 'hard';
    }

    return {
      timesCorrect: updatedTimesCorrect,
      timesIncorrect: updatedTimesIncorrect,
      averageResponseTime: updatedAverageResponseTime,
      lastDifficulty,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const flashcardsService = new FlashcardsService();
export default flashcardsService;
