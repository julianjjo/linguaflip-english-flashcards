/**
 * MongoDB Schema Definitions for LinguaFlip
 *
 * This file serves as the main entry point for all MongoDB schema definitions,
 * validators, utilities, and database configuration for the LinguaFlip flashcard application.
 *
 * Supports the SM-2 Spaced Repetition algorithm and multi-user architecture.
 */

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

// Export all schema definitions
export {
  UserSchema,
  FlashcardSchema,
  StudySessionSchema,
  StudyStatisticsSchema,
  MigrationSchema,
  Schemas
} from './definitions/index.ts';

// ============================================================================
// VALIDATORS
// ============================================================================

// Export all validators and validation utilities
export {
  // Common validators
  emailValidator,
  urlValidator,
  qualityValidator,
  sanitizeInput,
  
  // SM-2 specific validators and utilities
  sm2Validator,
  validateSM2Params,
  getDefaultSM2Params,
  calculateNextReviewDate,
  type SM2Params,
  
  // Document validation utilities
  validateDocument,
  type SchemaValidator,
  type ValidationDocument
} from './validators/index.ts';

// ============================================================================
// DATABASE INDEXES
// ============================================================================

// Export database index definitions
export { DatabaseIndexes } from './indexes.ts';

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

// Re-export main schemas for backward compatibility
import { 
  UserSchema,
  FlashcardSchema,
  StudySessionSchema,
  StudyStatisticsSchema,
  MigrationSchema
} from './definitions/index.ts';

// Default export for convenience (maintaining backward compatibility)
export default {
  UserSchema,
  FlashcardSchema,
  StudySessionSchema,
  StudyStatisticsSchema,
  MigrationSchema
};