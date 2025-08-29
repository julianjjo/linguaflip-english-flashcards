/**
 * LinguaFlip MongoDB Services Index
 *
 * This file provides a unified interface to all MongoDB CRUD services,
 * error handling utilities, and database operations for the LinguaFlip application.
 */

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

// Individual service exports
export { default as usersService } from './users';
export { default as flashcardsService } from './flashcards';
export { default as studySessionsService } from './studySessions';
export { default as studyStatisticsService } from './studyStatistics';
export { default as bulkOperationsService } from './bulkOperations';
export { default as syncService } from './syncService';

// Import services for internal use
import usersService from './users';
import flashcardsService from './flashcards';
import studySessionsService from './studySessions';
import studyStatisticsService from './studyStatistics';
import bulkOperationsService from './bulkOperations';
import syncService from './syncService';

// Import utilities and error handling
import {
  errorHandler,
  safeAsync,
  validateObjectId,
  validateRequired,
  validateQuality,
  validateOwnership
} from '../types/database';

import {
  getDatabase,
  initializeDatabase,
  closeDatabase
} from '../utils/database';

import {
  databaseUtils
} from '../utils/databaseOperations';

import {
  validateDocument,
  sanitizeInput,
  calculateNextReviewDate,
  getDefaultSM2Params
} from '../schemas/mongodb';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Re-export all database types
export type {
  UserDocument,
  FlashcardDocument,
  StudySessionDocument,
  StudyStatisticsDocument,
  CardProgressDocument,
  BaseDocument,
  DatabaseOperationResult,
  BulkOperationResult,
  UserFilter,
  FlashcardFilter,
  StudySessionFilter,
  CardProgressFilter,
  DatabaseHealthStatus,
  ErrorHandlerConfig,
  DatabaseConfig,
  MigrationDocument,
  WithTimestamps,
  Optional,
  RequiredFields,
  AggregationPipeline
} from '../types/database';

// Re-export collection names enum
export { CollectionName } from '../types/database';

// ============================================================================
// ERROR HANDLING EXPORTS
// ============================================================================

// Re-export error classes
export {
  DatabaseError,
  ConnectionError,
  ValidationError,
  NotFoundError,
  DuplicateError,
  PermissionError,
  RateLimitError,
  SM2Error,
  BulkOperationError,
  MigrationError,
  ErrorHandler,
  errorHandler,
  safeAsync,
  validateObjectId,
  validateRequired,
  validateQuality,
  validateOwnership
} from '../types/database';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// Re-export database utilities
export {
  createDatabaseOperations,
  databaseUtils
} from '../utils/databaseOperations';

// Re-export database connection
export {
  dbConnection,
  getDatabase,
  initializeDatabase,
  closeDatabase,
  databaseConfig
} from '../utils/database';

// ============================================================================
// SCHEMA EXPORTS
// ============================================================================

// Re-export schemas and utilities
export {
  UserSchema,
  FlashcardSchema,
  StudySessionSchema,
  StudyStatisticsSchema,
  MigrationSchema,
  Schemas,
  validateDocument,
  sanitizeInput,
  calculateNextReviewDate,
  getDefaultSM2Params,
  validateSM2Params,
  emailValidator,
  urlValidator,
  sm2Validator,
  qualityValidator,
  DatabaseIndexes
} from '../schemas/mongodb';

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Unified service interface for type safety
 */
export interface LinguaFlipServices {
  users: typeof usersService;
  flashcards: typeof flashcardsService;
  studySessions: typeof studySessionsService;
  studyStatistics: typeof studyStatisticsService;
  bulkOperations: typeof bulkOperationsService;
  sync: typeof syncService;
}

/**
 * Service factory for dependency injection
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: LinguaFlipServices;

  private constructor() {
    this.services = {
      users: usersService,
      flashcards: flashcardsService,
      studySessions: studySessionsService,
      studyStatistics: studyStatisticsService,
      bulkOperations: bulkOperationsService,
      sync: syncService
    };
  }

  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  public getServices(): LinguaFlipServices {
    return this.services;
  }

  public getUserService() {
    return this.services.users;
  }

  public getFlashcardService() {
    return this.services.flashcards;
  }

  public getStudySessionService() {
    return this.services.studySessions;
  }

  public getStudyStatisticsService() {
    return this.services.studyStatistics;
  }

  public getBulkOperationsService() {
    return this.services.bulkOperations;
  }

  public getSyncService() {
    return this.services.sync;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

/**
 * Default export providing all services and utilities
 */
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

export default linguaFlipServices;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
Usage Examples:

// 1. Direct service usage
import { usersService, flashcardsService } from '@/services';

// Create a user
const userResult = await usersService.createUser({
  userId: 'user123',
  preferences: { theme: 'light', language: 'en', audioEnabled: true, studyReminders: true },
  statistics: { totalCardsStudied: 0, totalStudyTime: 0, averageRecallRate: 0, streakDays: 0 }
});

// Get due flashcards
const dueCards = await flashcardsService.getDueFlashcards('user123');

// 2. Using service factory
import { ServiceFactory } from '@/services';

const factory = ServiceFactory.getInstance();
const users = factory.getUserService();
const flashcards = factory.getFlashcardService();

// 3. Using default export
import linguaFlip from '@/services';

const user = await linguaFlip.users.createUser(userData);
const cards = await linguaFlip.flashcards.getDueFlashcards(userId);

// 4. Error handling
import { safeAsync, errorHandler } from '@/services';

const result = await safeAsync(async () => {
  return await flashcardsService.processReviewResponse(cardId, 4, 2500, userId);
}, { operation: 'process_review', userId });

// 5. Bulk operations
import { bulkOperationsService } from '@/services';

const bulkResult = await bulkOperationsService.bulkImportFlashcards(
  userId,
  flashcardsArray,
  { skipDuplicates: true, batchSize: 50 }
);

// 6. Sync operations
import { syncService } from '@/services';

const syncResult = await syncService.syncFromLocal(userId, localData, {
  resolveConflicts: 'merge'
});
*/