/**
 * Bulk Operations Service - High-Performance Batch Operations for LinguaFlip
 *
 * This service provides optimized bulk operations for importing, updating, and
 * synchronizing large amounts of data across all collections.
 */

import { createDatabaseOperations } from '../utils/databaseOperations';
import type {
  UserDocument,
  FlashcardDocument,
  StudySessionDocument,
  StudyStatisticsDocument,
  DatabaseOperationResult,
  BulkOperationResult
} from '../types/database';

// Bulk import results interface
interface BulkImportResults {
  flashcards: { inserted: number; updated: number; errors: number };
  studySessions: { inserted: number; updated: number; errors: number };
  studyStatistics: { inserted: number; updated: number; errors: number };
}

// Bulk export data interface
interface BulkExportData {
  user?: UserDocument;
  flashcards?: FlashcardDocument[];
  studySessions?: StudySessionDocument[];
  studyStatistics?: StudyStatisticsDocument[];
}

// Bulk import result interface
interface BulkImportResult {
  success: boolean;
  results: BulkImportResults;
  totalProcessed: number;
  totalErrors: number;
}
import {
  BulkOperationError,
  ValidationError,
  safeAsync
} from '../types/database';
import { validateDocument } from '../schemas/mongodb';
import { FlashcardSchema } from '../schemas/mongodb';

// Import individual services for cross-collection operations
import { usersService } from './users';
import { flashcardsService } from './flashcards';
import { studySessionsService } from './studySessions';
import { studyStatisticsService } from './studyStatistics';

/**
 * Bulk Operations Service Class
 */
export class BulkOperationsService {
  /**
   * Bulk import flashcards for a user
   */
  async bulkImportFlashcards(
    userId: string,
    flashcards: Omit<FlashcardDocument, '_id' | 'createdAt' | 'updatedAt' | 'sm2' | 'statistics'>[],
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<DatabaseOperationResult<BulkOperationResult>> {
    return safeAsync(async () => {
      const { skipDuplicates = true, updateExisting = false, batchSize = 100 } = options;

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
        errors: [] as Array<{ index: number; error: Error }>
      };

      // Process in batches
      for (let i = 0; i < flashcards.length; i += batchSize) {
        const batch = flashcards.slice(i, i + batchSize);
        const batchResults = await this.processFlashcardBatch(userId, batch, {
          skipDuplicates,
          updateExisting
        });

        results.inserted += batchResults.inserted;
        results.updated += batchResults.updated;
        results.skipped += batchResults.skipped;
        results.errors.push(...batchResults.errors.map(error => ({
          index: error.index + i,
          error: error.error
        })));
      }

      const bulkResult: BulkOperationResult = {
        success: results.errors.length === 0,
        insertedCount: results.inserted,
        updatedCount: results.updated,
        deletedCount: 0,
        errors: results.errors.map(e => e.error.message),
        operationTime: Date.now()
      };

      return {
        success: true,
        data: bulkResult,
        operationTime: Date.now()
      };
    }, { operation: 'bulk_import_flashcards', userId });
  }

  /**
   * Bulk update flashcard SM-2 parameters
   */
  async bulkUpdateSM2Parameters(
    userId: string,
    updates: Array<{
      cardId: string;
      quality: number;
      responseTime: number;
    }>
  ): Promise<DatabaseOperationResult<BulkOperationResult>> {
    return safeAsync(async () => {
      const results = {
        processed: 0,
        errors: [] as Array<{ index: number; error: Error }>
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
              error: new Error(result.error || 'Unknown error')
            });
          }
        } catch (error) {
          results.errors.push({
            index: i,
            error: error as Error
          });
        }
      }

      const bulkResult: BulkOperationResult = {
        success: results.errors.length === 0,
        insertedCount: 0,
        updatedCount: results.processed,
        deletedCount: 0,
        errors: results.errors.map(e => e.error.message),
        operationTime: Date.now()
      };

      return {
        success: true,
        data: bulkResult,
        operationTime: Date.now()
      };
    }, { operation: 'bulk_update_sm2_parameters', userId });
  }

  /**
   * Bulk suspend/unsuspend flashcards
   */
  async bulkSuspendFlashcards(
    userId: string,
    cardIds: string[],
    suspended: boolean,
    reason: string
  ): Promise<DatabaseOperationResult<BulkOperationResult>> {
    return safeAsync(async () => {
      const results = {
        processed: 0,
        errors: [] as Array<{ index: number; error: Error }>
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
              error: new Error(result.error || 'Unknown error')
            });
          }
        } catch (error) {
          results.errors.push({
            index: i,
            error: error as Error
          });
        }
      }

      const bulkResult: BulkOperationResult = {
        success: results.errors.length === 0,
        insertedCount: 0,
        updatedCount: results.processed,
        deletedCount: 0,
        errors: results.errors.map(e => e.error.message),
        operationTime: Date.now()
      };

      return {
        success: true,
        data: bulkResult,
        operationTime: Date.now()
      };
    }, { operation: 'bulk_suspend_flashcards', userId });
  }

  /**
   * Bulk delete flashcards
   */
  async bulkDeleteFlashcards(
    userId: string,
    cardIds: string[]
  ): Promise<DatabaseOperationResult<BulkOperationResult>> {
    return safeAsync(async () => {
      const dbOps = createDatabaseOperations('flashcards');

      const operations = cardIds.map(cardId => ({
        deleteOne: {
          filter: { cardId, userId }
        }
      }));

      const result = await dbOps.bulkWrite(operations);

      if (!result.success) {
        throw new BulkOperationError(
          result.error || 'Failed to bulk delete flashcards',
          'bulk_delete_flashcards',
          'flashcards',
          0,
          0,
          (result.data?.errors || []).map((error: string, index: number) => ({
            index,
            error: new Error(error)
          }))
        );
      }

      return result;
    }, { operation: 'bulk_delete_flashcards', userId });
  }

  /**
   * Bulk create study sessions
   */
  async bulkCreateStudySessions(
    userId: string,
    sessions: Omit<StudySessionDocument, '_id' | 'createdAt' | 'updatedAt' | 'endTime' | 'duration'>[]
  ): Promise<DatabaseOperationResult<BulkOperationResult>> {
    return safeAsync(async () => {
      const results = {
        inserted: 0,
        errors: [] as Array<{ index: number; error: Error }>
      };

      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];

        try {
          const result = await studySessionsService.createStudySession(session, userId);

          if (result.success) {
            results.inserted++;
          } else {
            results.errors.push({
              index: i,
              error: new Error(result.error || 'Unknown error')
            });
          }
        } catch (error) {
          results.errors.push({
            index: i,
            error: error as Error
          });
        }
      }

      const bulkResult: BulkOperationResult = {
        success: results.errors.length === 0,
        insertedCount: results.inserted,
        updatedCount: 0,
        deletedCount: 0,
        errors: results.errors.map(e => e.error.message),
        operationTime: Date.now()
      };

      return {
        success: true,
        data: bulkResult,
        operationTime: Date.now()
      };
    }, { operation: 'bulk_create_study_sessions', userId });
  }

  /**
   * Bulk update user statistics
   */
  async bulkUpdateUserStatistics(
    userId: string,
    statistics: Partial<UserDocument['statistics']>
  ): Promise<DatabaseOperationResult<UserDocument>> {
    return safeAsync(async () => {
      return usersService.updateUserStatistics(userId, statistics);
    }, { operation: 'bulk_update_user_statistics', userId });
  }

  /**
   * Bulk export user data
   */
  async bulkExportUserData(
    userId: string,
    options: {
      includeFlashcards?: boolean;
      includeSessions?: boolean;
      includeStatistics?: boolean;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<DatabaseOperationResult<{
    userId: string;
    exportedAt: Date;
    data: BulkExportData;
  }>> {
    return safeAsync(async () => {
      const exportData = {
        userId,
        exportedAt: new Date(),
        data: {} as BulkExportData
      };

      // Export user profile
      const userResult = await usersService.getUserById(userId);
      if (userResult.success && userResult.data) {
        exportData.data.user = userResult.data;
      }

      // Export flashcards
      if (options.includeFlashcards) {
        const flashcardsResult = await flashcardsService.getDueFlashcards(userId, {
          limit: 10000 // Large limit for export
        });
        if (flashcardsResult.success && flashcardsResult.data) {
          exportData.data.flashcards = flashcardsResult.data;
        }
      }

      // Export study sessions
      if (options.includeSessions) {
        const sessionsResult = await studySessionsService.getUserStudySessions(userId, {
          limit: 1000,
          dateRange: options.dateRange
        });
        if (sessionsResult.success && sessionsResult.data) {
          exportData.data.studySessions = sessionsResult.data;
        }
      }

      // Export study statistics
      if (options.includeStatistics) {
        const statsResult = await studyStatisticsService.getStudyStatisticsRange(
          userId,
          options.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          options.dateRange?.end || new Date(),
          'daily',
          { limit: 1000 }
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
    }, { operation: 'bulk_export_user_data', userId });
  }

  /**
   * Bulk import user data (for migration/sync)
   */
  async bulkImportUserData(
    userId: string,
    importData: {
      flashcards?: Omit<FlashcardDocument, '_id' | 'createdAt' | 'updatedAt'>[];
      studySessions?: Omit<StudySessionDocument, '_id' | 'createdAt' | 'updatedAt'>[];
      studyStatistics?: Omit<StudyStatisticsDocument, '_id' | 'createdAt' | 'updatedAt'>[];
    },
    options: {
      skipExisting?: boolean;
      updateExisting?: boolean;
      validateData?: boolean;
    } = {}
  ): Promise<DatabaseOperationResult<BulkImportResult>> {
    return safeAsync(async () => {
      const results = {
        flashcards: { inserted: 0, updated: 0, errors: 0 },
        studySessions: { inserted: 0, updated: 0, errors: 0 },
        studyStatistics: { inserted: 0, updated: 0, errors: 0 }
      };

      // Import flashcards
      if (importData.flashcards && importData.flashcards.length > 0) {
        const flashcardsResult = await this.bulkImportFlashcards(userId, importData.flashcards, {
          skipDuplicates: options.skipExisting,
          updateExisting: options.updateExisting
        });

        if (flashcardsResult.success && flashcardsResult.data) {
          results.flashcards.inserted = flashcardsResult.data.insertedCount;
          results.flashcards.updated = flashcardsResult.data.updatedCount;
          results.flashcards.errors = flashcardsResult.data.errors.length;
        }
      }

      // Import study sessions
      if (importData.studySessions && importData.studySessions.length > 0) {
        const sessionsResult = await this.bulkCreateStudySessions(userId, importData.studySessions);

        if (sessionsResult.success && sessionsResult.data) {
          results.studySessions.inserted = sessionsResult.data.insertedCount;
          results.studySessions.updated = sessionsResult.data.updatedCount;
          results.studySessions.errors = sessionsResult.data.errors.length;
        }
      }

      // Import study statistics
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
          totalProcessed: results.flashcards.inserted + results.flashcards.updated +
                          results.studySessions.inserted + results.studySessions.updated +
                          results.studyStatistics.inserted + results.studyStatistics.updated,
          totalErrors: results.flashcards.errors + results.studySessions.errors + results.studyStatistics.errors
        },
        operationTime: Date.now()
      };
    }, { operation: 'bulk_import_user_data', userId });
  }

  /**
   * Bulk cleanup old data
   */
  async bulkCleanupOldData(
    userId: string,
    options: {
      olderThanDays?: number;
      cleanupFlashcards?: boolean;
      cleanupSessions?: boolean;
      cleanupStatistics?: boolean;
    } = {}
  ): Promise<DatabaseOperationResult<BulkOperationResult>> {
    return safeAsync(async () => {
      const { olderThanDays = 365, cleanupSessions = true, cleanupStatistics = false } = options;
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const results = {
        deleted: 0,
        errors: [] as string[]
      };

      // Cleanup old study sessions
      if (cleanupSessions) {
        try {
          const sessionsDbOps = createDatabaseOperations('study_sessions');
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

      // Cleanup old statistics
      if (cleanupStatistics) {
        try {
          const statsDbOps = createDatabaseOperations('study_statistics');
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

      const bulkResult: BulkOperationResult = {
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
    }, { operation: 'bulk_cleanup_old_data', userId });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Process a batch of flashcards
   */
  private async processFlashcardBatch(
    userId: string,
    flashcards: Omit<FlashcardDocument, '_id' | 'createdAt' | 'updatedAt' | 'sm2' | 'statistics'>[],
    options: { skipDuplicates: boolean; updateExisting: boolean }
  ): Promise<{ inserted: number; updated: number; skipped: number; errors: Array<{ index: number; error: Error }> }> {
    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ index: number; error: Error }>
    };

    for (let i = 0; i < flashcards.length; i++) {
      const flashcard = flashcards[i];

      try {
        if (typeof flashcard.cardId !== 'string') {
          throw new ValidationError(
            'Flashcard cardId must be a non-empty string',
            'bulk_import_flashcards',
            'flashcards',
            'cardId',
            flashcard.cardId
          );
        }

        const cardId = flashcard.cardId.trim();
        if (cardId.length === 0) {
          throw new ValidationError(
            'Flashcard cardId must be a non-empty string',
            'bulk_import_flashcards',
            'flashcards',
            'cardId',
            flashcard.cardId
          );
        }

        flashcard.cardId = cardId;

        // Validate flashcard data
        const validation = validateDocument(flashcard, FlashcardSchema);
        if (!validation.isValid) {
          throw new ValidationError(
            `Flashcard validation failed: ${validation.errors.join(', ')}`,
            'bulk_import_flashcards',
            'flashcards'
          );
        }

        // Check if flashcard already exists
        const existingResult = await flashcardsService.getFlashcardById(cardId, userId);

        if (existingResult.success && existingResult.data) {
          if (options.skipDuplicates) {
            results.skipped++;
            continue;
          } else if (options.updateExisting) {
            // Update existing flashcard
            const updateResult = await flashcardsService.updateFlashcard(
              cardId,
              flashcard,
              userId
            );

            if (updateResult.success) {
              results.updated++;
            } else {
              throw new Error(updateResult.error || 'Failed to update flashcard');
            }
          } else {
            throw new Error(`Flashcard with ID ${flashcard.cardId} already exists`);
          }
        } else {
          // Create new flashcard
          const createResult = await flashcardsService.createFlashcard(flashcard, userId);

          if (createResult.success) {
            results.inserted++;
          } else {
            throw new Error(createResult.error || 'Failed to create flashcard');
          }
        }
      } catch (error) {
        results.errors.push({
          index: i,
          error: error as Error
        });
      }
    }

    return results;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const bulkOperationsService = new BulkOperationsService();
export default bulkOperationsService;