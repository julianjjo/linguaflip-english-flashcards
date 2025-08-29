/**
 * Schema Validation and Testing Utilities for LinguaFlip
 *
 * Provides comprehensive validation, testing, and health check utilities
 * for MongoDB collections and documents in the LinguaFlip application.
 */

import { Db, Collection } from 'mongodb';
import type { Document } from 'mongodb';
import { getDatabase } from './database';
import { Schemas, validateDocument, DatabaseIndexes } from '../schemas/mongodb';
import type {
  UserDocument,
  FlashcardDocument,
  StudySessionDocument,
  StudyStatisticsDocument
} from '../types/database';

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  expectedType?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface SchemaHealthReport {
  collection: string;
  totalDocuments: number;
  validDocuments: number;
  invalidDocuments: number;
  validationErrors: ValidationError[];
  indexHealth: IndexHealth[];
  performanceMetrics: PerformanceMetrics;
}

export interface IndexHealth {
  name: string;
  key: any;
  usageCount: number;
  isUsed: boolean;
  size: number;
}

export interface PerformanceMetrics {
  avgQueryTime: number;
  slowQueries: number;
  indexHitRate: number;
  storageSize: number;
}

// ============================================================================
// SCHEMA VALIDATOR CLASS
// ============================================================================

/**
 * Comprehensive schema validation and testing utilities
 */
export class SchemaValidator {
  private db: Db;

  constructor(db?: Db) {
    this.db = db || getDatabase();
  }

  /**
   * Validate a single document against its schema
   */
  async validateDocument(
    collectionName: string,
    document: Document
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Get the appropriate schema
      const schema = this.getSchemaForCollection(collectionName);
      if (!schema) {
        errors.push({
          field: 'collection',
          message: `No schema found for collection: ${collectionName}`
        });
        return { isValid: false, errors, warnings };
      }

      // Basic validation using our custom validator
      const basicValidation = validateDocument(document, schema);
      if (!basicValidation.isValid) {
        errors.push(...basicValidation.errors.map(err => ({
          field: 'document',
          message: err,
          value: document
        })));
      }

      // Collection-specific validations
      await this.validateCollectionSpecificRules(collectionName, document, errors, warnings);

      // Cross-collection validations
      await this.validateCrossCollectionRules(collectionName, document, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: document
      });

      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validate an entire collection
   */
  async validateCollection(
    collectionName: string,
    sampleSize?: number
  ): Promise<SchemaHealthReport> {
    const collection = this.db.collection(collectionName);
    const totalDocuments = await collection.countDocuments();

    let documentsToValidate: Document[] = [];

    if (sampleSize && sampleSize < totalDocuments) {
      // Sample documents for validation
      documentsToValidate = await collection.aggregate([
        { $sample: { size: sampleSize } }
      ]).toArray();
    } else {
      // Validate all documents
      documentsToValidate = await collection.find({}).toArray();
    }

    let validDocuments = 0;
    const validationErrors: ValidationError[] = [];

    // Validate each document
    for (const document of documentsToValidate) {
      const result = await this.validateDocument(collectionName, document);
      if (result.isValid) {
        validDocuments++;
      } else {
        validationErrors.push(...result.errors);
      }
    }

    // Get index health
    const indexHealth = await this.getIndexHealth(collectionName);

    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics(collectionName);

    return {
      collection: collectionName,
      totalDocuments,
      validDocuments,
      invalidDocuments: documentsToValidate.length - validDocuments,
      validationErrors,
      indexHealth,
      performanceMetrics
    };
  }

  /**
   * Generate comprehensive health report for all collections
   */
  async generateHealthReport(): Promise<{
    overallHealth: 'healthy' | 'warning' | 'critical';
    collections: SchemaHealthReport[];
    recommendations: string[];
  }> {
    const collections = ['users', 'flashcards', 'study_sessions', 'study_statistics'];
    const reports: SchemaHealthReport[] = [];
    const recommendations: string[] = [];

    for (const collectionName of collections) {
      const report = await this.validateCollection(collectionName, 100); // Sample 100 documents
      reports.push(report);

      // Generate recommendations based on report
      if (report.invalidDocuments > 0) {
        recommendations.push(
          `Fix ${report.invalidDocuments} invalid documents in ${collectionName} collection`
        );
      }

      // Check index usage
      const unusedIndexes = report.indexHealth.filter(idx => !idx.isUsed);
      if (unusedIndexes.length > 0) {
        recommendations.push(
          `Consider removing ${unusedIndexes.length} unused indexes in ${collectionName}`
        );
      }
    }

    // Determine overall health
    const totalInvalid = reports.reduce((sum, report) => sum + report.invalidDocuments, 0);
    const overallHealth = totalInvalid === 0 ? 'healthy' :
                         totalInvalid < 10 ? 'warning' : 'critical';

    return {
      overallHealth,
      collections: reports,
      recommendations
    };
  }

  /**
   * Test SM-2 algorithm parameters
   */
  async testSM2Algorithm(userId: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const flashcardsCollection = this.db.collection('flashcards');

      // Get user's flashcards
      const userFlashcards = await flashcardsCollection
        .find({ userId })
        .project({ cardId: 1, sm2: 1, lastReviewed: 1 })
        .toArray();

      // Validate SM-2 parameters
      for (const card of userFlashcards) {
        const sm2 = card.sm2;

        if (!sm2) {
          issues.push(`Card ${card.cardId} missing SM-2 data`);
          continue;
        }

        // Check ease factor range
        if (sm2.easeFactor < 1.3 || sm2.easeFactor > 2.5) {
          issues.push(`Card ${card.cardId} has invalid ease factor: ${sm2.easeFactor}`);
        }

        // Check interval
        if (sm2.interval < 1) {
          issues.push(`Card ${card.cardId} has invalid interval: ${sm2.interval}`);
        }

        // Check repetitions
        if (sm2.repetitions < 0) {
          issues.push(`Card ${card.cardId} has negative repetitions: ${sm2.repetitions}`);
        }

        // Check next review date
        if (!sm2.nextReviewDate) {
          issues.push(`Card ${card.cardId} missing next review date`);
        } else if (sm2.nextReviewDate < new Date()) {
          recommendations.push(`Card ${card.cardId} is overdue for review`);
        }
      }

      // Check for cards that haven't been reviewed recently
      const oldCards = userFlashcards.filter(card => {
        if (!card.lastReviewed) return true;
        const daysSinceReview = (Date.now() - card.lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceReview > 30; // 30 days
      });

      if (oldCards.length > 0) {
        recommendations.push(`${oldCards.length} cards haven't been reviewed in 30+ days`);
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        isValid: false,
        issues: [`SM-2 validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: []
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getSchemaForCollection(collectionName: string): any {
    switch (collectionName) {
      case 'users':
        return Schemas.UserSchema;
      case 'flashcards':
        return Schemas.FlashcardSchema;
      case 'study_sessions':
        return Schemas.StudySessionSchema;
      case 'study_statistics':
        return Schemas.StudyStatisticsSchema;
      default:
        return null;
    }
  }

  private async validateCollectionSpecificRules(
    collectionName: string,
    document: Document,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    switch (collectionName) {
      case 'users':
        await this.validateUserRules(document as UserDocument, errors, warnings);
        break;
      case 'flashcards':
        await this.validateFlashcardRules(document as FlashcardDocument, errors, warnings);
        break;
      case 'study_sessions':
        await this.validateStudySessionRules(document as StudySessionDocument, errors, warnings);
        break;
      case 'study_statistics':
        await this.validateStudyStatisticsRules(document as StudyStatisticsDocument, errors, warnings);
        break;
    }
  }

  private async validateCrossCollectionRules(
    collectionName: string,
    document: Document,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check referential integrity
    if (document.userId) {
      const usersCollection = this.db.collection('users');
      const userExists = await usersCollection.countDocuments(
        { userId: document.userId },
        { limit: 1 }
      );

      if (userExists === 0) {
        errors.push({
          field: 'userId',
          message: `Referenced user ${document.userId} does not exist`,
          value: document.userId
        });
      }
    }

    // Collection-specific cross-collection validations
    if (collectionName === 'flashcards' && document.cardId) {
      // Check for duplicate card IDs within user scope
      const flashcardsCollection = this.db.collection('flashcards');
      const duplicateCount = await flashcardsCollection.countDocuments({
        userId: document.userId,
        cardId: document.cardId,
        _id: { $ne: document._id }
      });

      if (duplicateCount > 0) {
        errors.push({
          field: 'cardId',
          message: `Duplicate card ID ${document.cardId} for user ${document.userId}`,
          value: document.cardId
        });
      }
    }
  }

  private async validateUserRules(
    user: UserDocument,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check email uniqueness if email exists
    if (user.email) {
      const usersCollection = this.db.collection('users');
      const emailExists = await usersCollection.countDocuments({
        email: user.email,
        userId: { $ne: user.userId }
      });

      if (emailExists > 0) {
        errors.push({
          field: 'email',
          message: 'Email address already exists',
          value: user.email
        });
      }
    }

    // Check username uniqueness if username exists
    if (user.username) {
      const usersCollection = this.db.collection('users');
      const usernameExists = await usersCollection.countDocuments({
        username: user.username,
        userId: { $ne: user.userId }
      });

      if (usernameExists > 0) {
        errors.push({
          field: 'username',
          message: 'Username already exists',
          value: user.username
        });
      }
    }

    // Validate statistics consistency
    if (user.statistics.totalCardsStudied < 0) {
      errors.push({
        field: 'statistics.totalCardsStudied',
        message: 'Total cards studied cannot be negative',
        value: user.statistics.totalCardsStudied
      });
    }
  }

  private async validateFlashcardRules(
    flashcard: FlashcardDocument,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Validate SM-2 parameters
    if (flashcard.sm2) {
      const sm2 = flashcard.sm2;

      // Check quality responses array
      if (sm2.qualityResponses) {
        for (const quality of sm2.qualityResponses) {
          if (quality < 0 || quality > 5) {
            errors.push({
              field: 'sm2.qualityResponses',
              message: 'Quality response must be between 0 and 5',
              value: quality
            });
          }
        }
      }

      // Check for logical inconsistencies
      if (sm2.repetitions === 0 && sm2.interval > 1) {
        warnings.push({
          field: 'sm2.interval',
          message: 'New card should have interval of 1',
          suggestion: 'Reset interval to 1 for new cards'
        });
      }
    }

    // Validate tags
    if (flashcard.tags) {
      for (const tag of flashcard.tags) {
        if (tag.length > 50) {
          errors.push({
            field: 'tags',
            message: 'Tag length cannot exceed 50 characters',
            value: tag
          });
        }
      }
    }
  }

  private async validateStudySessionRules(
    session: StudySessionDocument,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Validate session duration
    if (session.startTime && session.endTime) {
      const duration = session.endTime.getTime() - session.startTime.getTime();
      if (duration < 0) {
        errors.push({
          field: 'endTime',
          message: 'End time cannot be before start time',
          value: { startTime: session.startTime, endTime: session.endTime }
        });
      }
    }

    // Validate cards studied array
    if (session.cardsStudied) {
      for (const cardStudy of session.cardsStudied) {
        if (typeof cardStudy === 'object' && 'quality' in cardStudy) {
          const quality = (cardStudy as any).quality;
          if (quality < 0 || quality > 5) {
            errors.push({
              field: 'cardsStudied.quality',
              message: 'Card quality must be between 0 and 5',
              value: quality
            });
          }
        }
      }
    }

    // Check consistency between totalCards and cardsStudied array
    if (session.cardsStudied && session.totalCards !== session.cardsStudied.length) {
      warnings.push({
        field: 'totalCards',
        message: 'totalCards does not match cardsStudied array length',
        suggestion: 'Update totalCards to match actual count'
      });
    }
  }

  private async validateStudyStatisticsRules(
    stats: StudyStatisticsDocument,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Validate date ranges
    if (stats.date) {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      if (stats.date < oneYearAgo) {
        warnings.push({
          field: 'date',
          message: 'Statistics date is more than a year old',
          suggestion: 'Consider archiving old statistics'
        });
      }
    }

    // Validate percentage fields
    if (stats.dailyStats.averageRecallRate < 0 || stats.dailyStats.averageRecallRate > 100) {
      errors.push({
        field: 'dailyStats.averageRecallRate',
        message: 'Average recall rate must be between 0 and 100',
        value: stats.dailyStats.averageRecallRate
      });
    }
  }

  private async getIndexHealth(collectionName: string): Promise<IndexHealth[]> {
    try {
      const collection = this.db.collection(collectionName);
      const indexStats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();

      return indexStats.map((stat: any) => ({
        name: stat.name,
        key: stat.key,
        usageCount: stat.accesses?.ops || 0,
        isUsed: (stat.accesses?.ops || 0) > 0,
        size: stat.size || 0
      }));
    } catch (error) {
      console.warn(`Could not get index health for ${collectionName}:`, error);
      return [];
    }
  }

  private async getPerformanceMetrics(collectionName: string): Promise<PerformanceMetrics> {
    try {
      const collection = this.db.collection(collectionName);
      // Use aggregate to get basic stats instead of stats() method
      const stats = await collection.aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      return {
        avgQueryTime: 0, // Would need profiling data
        slowQueries: 0,  // Would need profiling data
        indexHitRate: 0, // Would need profiling data
        storageSize: 0    // Would need admin command
      };
    } catch (error) {
      console.warn(`Could not get performance metrics for ${collectionName}:`, error);
      return {
        avgQueryTime: 0,
        slowQueries: 0,
        indexHitRate: 0,
        storageSize: 0
      };
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick validation for a single document
 */
export async function quickValidate(
  collectionName: string,
  document: Document
): Promise<boolean> {
  const validator = new SchemaValidator();
  const result = await validator.validateDocument(collectionName, document);
  return result.isValid;
}

/**
 * Batch validate multiple documents
 */
export async function batchValidate(
  collectionName: string,
  documents: Document[]
): Promise<ValidationResult[]> {
  const validator = new SchemaValidator();
  const results: ValidationResult[] = [];

  for (const document of documents) {
    const result = await validator.validateDocument(collectionName, document);
    results.push(result);
  }

  return results;
}

/**
 * Generate sample data for testing
 */
export function generateSampleData(): {
  users: Partial<UserDocument>[];
  flashcards: Partial<FlashcardDocument>[];
  studySessions: Partial<StudySessionDocument>[];
} {
  const sampleUsers: Partial<UserDocument>[] = [
    {
      userId: 'user_001',
      email: 'test@example.com',
      username: 'testuser',
      preferences: {
        theme: 'light' as const,
        language: 'en',
        audioEnabled: true,
        studyReminders: true
      },
      statistics: {
        totalCardsStudied: 150,
        totalStudyTime: 2400, // 40 hours in minutes
        averageRecallRate: 85,
        streakDays: 7,
        lastStudyDate: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const sampleFlashcards: Partial<FlashcardDocument>[] = [
    {
      cardId: 'card_001',
      userId: 'user_001',
      front: 'Hello',
      back: 'Hola',
      exampleFront: 'Hello, how are you?',
      exampleBack: 'Hola, ¿cómo estás?',
      tags: ['greetings', 'basic'],
      category: 'Vocabulary',
      difficulty: 'easy',
      sm2: {
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        qualityResponses: [],
        totalReviews: 0,
        correctStreak: 0,
        incorrectStreak: 0,
        isSuspended: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const sampleStudySessions: Partial<StudySessionDocument>[] = [
    {
      sessionId: 'session_001',
      userId: 'user_001',
      startTime: new Date(Date.now() - 1800000), // 30 minutes ago
      endTime: new Date(),
      cardsStudied: [
        {
          cardId: 'card_001',
          quality: 4,
          responseTime: 2500,
          wasCorrect: true
        }
      ],
      totalCards: 1,
      correctAnswers: 1,
      incorrectAnswers: 0,
      averageResponseTime: 2500,
      sessionType: 'practice',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  return {
    users: sampleUsers,
    flashcards: sampleFlashcards,
    studySessions: sampleStudySessions
  };
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export type { ValidationResult, ValidationError, ValidationWarning, SchemaHealthReport };
export default SchemaValidator;