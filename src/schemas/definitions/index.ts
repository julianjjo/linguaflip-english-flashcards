/**
 * Schema Definitions Index
 * 
 * This module exports all MongoDB schema definitions used in the LinguaFlip application.
 */

// Individual schema definitions
export { UserSchema } from './user.ts';
export { FlashcardSchema } from './flashcard.ts';
export { StudySessionSchema } from './studySession.ts';
export { StudyStatisticsSchema } from './studyStatistics.ts';
export { MigrationSchema } from './migration.ts';

// Import all schemas for the combined object
import { UserSchema } from './user.ts';
import { FlashcardSchema } from './flashcard.ts';
import { StudySessionSchema } from './studySession.ts';
import { StudyStatisticsSchema } from './studyStatistics.ts';
import { MigrationSchema } from './migration.ts';

// Convenient export object for backward compatibility
export const Schemas = {
  UserSchema,
  FlashcardSchema,
  StudySessionSchema,
  StudyStatisticsSchema,
  MigrationSchema
};