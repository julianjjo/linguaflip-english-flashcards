// Database Types for LinguaFlip MongoDB Operations

import type { ObjectId, Document } from 'mongodb';

// Base database document interface
export interface BaseDocument extends Document {
  _id?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// User document interface
export interface UserDocument extends BaseDocument {
  userId: string;
  email?: string;
  username?: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    audioEnabled: boolean;
    studyReminders: boolean;
    dailyCardLimit?: number;
    sessionDuration?: number;
  };
  statistics: {
    totalCardsStudied: number;
    totalStudyTime: number;
    averageRecallRate: number;
    streakDays: number;
    lastStudyDate?: Date;
    cardsMastered?: number;
    totalSessions?: number;
  };
  authentication: {
    password: string;
    passwordChangedAt?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerified: boolean;
    emailVerifiedAt?: Date;
    refreshTokens: Array<{
      token: string;
      createdAt: Date;
      expiresAt: Date;
      deviceInfo: string;
      ipAddress: string;
    }>;
  };
  security: {
    lastLogin?: Date;
    lastLoginIP?: string;
    loginAttempts: number;
    accountLocked: boolean;
    accountLockedUntil?: Date;
    suspiciousActivity: Array<{
      type: string;
      timestamp: Date;
      ipAddress: string;
      details: string;
    }>;
  };
  profile?: {
    avatar?: string;
    bio?: string;
    timezone?: string;
    joinDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  version?: number;
}

// Flashcard document interface
export interface FlashcardDocument extends BaseDocument {
  cardId: string;
  userId: string;
  front: string;
  back: string;
  audioUrl?: string;
  imageUrl?: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  metadata: {
    source?: string;
    createdByAI: boolean;
    aiModel?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Study session document interface
export interface StudySessionDocument extends BaseDocument {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: string[]; // Array of card IDs
  totalCards: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageResponseTime: number;
  sessionType: 'review' | 'new' | 'practice';
  performance: {
    overallScore: number;
    improvement: number;
    focusAreas: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Card progress document interface
export interface CardProgressDocument extends BaseDocument {
  progressId: string;
  userId: string;
  cardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  lastReviewed?: Date;
  qualityResponses: number[]; // Array of quality ratings (0-5)
  totalReviews: number;
  correctStreak: number;
  incorrectStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

// Study statistics document interface
export interface StudyStatisticsDocument extends BaseDocument {
  statsId: string;
  userId: string;
  date: Date;
  dailyStats: {
    cardsStudied: number;
    studyTime: number;
    correctAnswers: number;
    incorrectAnswers: number;
    averageRecallRate: number;
  };
  weeklyStats?: {
    totalCards: number;
    totalTime: number;
    averageRate: number;
    improvement: number;
  };
  monthlyStats?: {
    totalCards: number;
    totalTime: number;
    averageRate: number;
    improvement: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Database operation result types
export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  operationTime?: number;
}

export interface BulkOperationResult {
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  deletedCount: number;
  errors: string[];
  operationTime: number;
}

// Query filter types
export interface UserFilter {
  userId?: string;
  email?: string;
  username?: string;
}

export interface FlashcardFilter {
  userId?: string;
  cardId?: string;
  tags?: string[];
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdByAI?: boolean;
}

export interface StudySessionFilter {
  userId?: string;
  sessionId?: string;
  sessionType?: 'review' | 'new' | 'practice';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CardProgressFilter {
  userId?: string;
  cardId?: string;
  nextReviewDate?: {
    $lte: Date;
  };
  easeFactor?: {
    $lt: number;
  };
}

// Database connection status
export interface DatabaseHealthStatus {
  status: 'connected' | 'disconnected' | 'error';
  database: string;
  collections?: string[];
  connectionPool?: {
    size: number;
    available: number;
    pending: number;
  };
  lastChecked: Date;
  responseTime?: number;
}

// Collection names enum
export enum CollectionName {
  USERS = 'users',
  FLASHCARDS = 'flashcards',
  STUDY_SESSIONS = 'study_sessions',
  CARD_PROGRESS = 'card_progress',
  STUDY_STATISTICS = 'study_statistics',
}

// Index definitions
export interface DatabaseIndexes {
  [CollectionName.USERS]: {
    userId: 1;
    email: 1;
  };
  [CollectionName.FLASHCARDS]: {
    userId: 1;
    cardId: 1;
    tags: 1;
    category: 1;
    createdAt: -1;
  };
  [CollectionName.STUDY_SESSIONS]: {
    userId: 1;
    sessionId: 1;
    startTime: -1;
  };
  [CollectionName.CARD_PROGRESS]: {
    userId: 1;
    cardId: 1;
    nextReviewDate: 1;
  };
  [CollectionName.STUDY_STATISTICS]: {
    userId: 1;
    date: -1;
  };
}

// Aggregation pipeline types
export interface AggregationPipeline {
  $match?: Record<string, any>;
  $group?: Record<string, any>;
  $sort?: Record<string, 1 | -1>;
  $limit?: number;
  $skip?: number;
  $project?: Record<string, any>;
  $lookup?: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
  };
}

// Database configuration types
export interface DatabaseConfig {
  uri: string;
  databaseName: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    maxIdleTimeMS: number;
    retryWrites: boolean;
    retryReads: boolean;
  };
}

// Migration types
export interface MigrationDocument extends BaseDocument {
  migrationId: string;
  version: string;
  description: string;
  appliedAt: Date;
  checksum: string;
}

// ============================================================================
// COMPREHENSIVE ERROR HANDLING SYSTEM
// ============================================================================

// Error types
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly operation: string;
  public readonly collection?: string;
  public readonly timestamp: Date;
  public readonly details?: any;

  constructor(
    message: string,
    code: string = 'DATABASE_ERROR',
    operation: string = 'unknown',
    collection?: string,
    details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.operation = operation;
    this.collection = collection;
    this.timestamp = new Date();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      operation: this.operation,
      collection: this.collection,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack
    };
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, operation: string = 'connect', details?: any) {
    super(message, 'CONNECTION_ERROR', operation, undefined, details);
    this.name = 'ConnectionError';
  }
}

export class ValidationError extends DatabaseError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    operation: string = 'validate',
    collection?: string,
    field?: string,
    value?: any,
    details?: any
  ) {
    super(message, 'VALIDATION_ERROR', operation, collection, details);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Document not found errors
 */
export class NotFoundError extends DatabaseError {
  public readonly documentId?: string;

  constructor(
    message: string,
    operation: string = 'find',
    collection?: string,
    documentId?: string,
    details?: any
  ) {
    super(message, 'NOT_FOUND_ERROR', operation, collection, details);
    this.name = 'NotFoundError';
    this.documentId = documentId;
  }
}

/**
 * Duplicate key errors
 */
export class DuplicateError extends DatabaseError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    operation: string = 'insert',
    collection?: string,
    field?: string,
    value?: any,
    details?: any
  ) {
    super(message, 'DUPLICATE_ERROR', operation, collection, details);
    this.name = 'DuplicateError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Permission/authorization errors
 */
export class PermissionError extends DatabaseError {
  public readonly userId?: string;
  public readonly requiredPermission?: string;

  constructor(
    message: string,
    operation: string = 'authorize',
    collection?: string,
    userId?: string,
    requiredPermission?: string,
    details?: any
  ) {
    super(message, 'PERMISSION_ERROR', operation, collection, details);
    this.name = 'PermissionError';
    this.userId = userId;
    this.requiredPermission = requiredPermission;
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends DatabaseError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    operation: string = 'rate_limit',
    retryAfter?: number,
    details?: any
  ) {
    super(message, 'RATE_LIMIT_ERROR', operation, undefined, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * SM-2 algorithm specific errors
 */
export class SM2Error extends DatabaseError {
  public readonly quality?: number;
  public readonly currentInterval?: number;

  constructor(
    message: string,
    operation: string = 'sm2_calculation',
    collection: string = 'flashcards',
    quality?: number,
    currentInterval?: number,
    details?: any
  ) {
    super(message, 'SM2_ERROR', operation, collection, details);
    this.name = 'SM2Error';
    this.quality = quality;
    this.currentInterval = currentInterval;
  }
}

/**
 * Bulk operation errors
 */
export class BulkOperationError extends DatabaseError {
  public readonly successfulCount: number;
  public readonly failedCount: number;
  public readonly errors: Array<{ index: number; error: Error }>;

  constructor(
    message: string,
    operation: string = 'bulk_operation',
    collection?: string,
    successfulCount: number = 0,
    failedCount: number = 0,
    errors: Array<{ index: number; error: Error }> = [],
    details?: any
  ) {
    super(message, 'BULK_OPERATION_ERROR', operation, collection, details);
    this.name = 'BulkOperationError';
    this.successfulCount = successfulCount;
    this.failedCount = failedCount;
    this.errors = errors;
  }
}

/**
 * Migration errors
 */
export class MigrationError extends DatabaseError {
  public readonly migrationId?: string;
  public readonly version?: string;

  constructor(
    message: string,
    operation: string = 'migration',
    migrationId?: string,
    version?: string,
    details?: any
  ) {
    super(message, 'MIGRATION_ERROR', operation, undefined, details);
    this.name = 'MigrationError';
    this.migrationId = migrationId;
    this.version = version;
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  logErrors: boolean;
  throwOnError: boolean;
  includeStackTrace: boolean;
  customLogger?: (error: DatabaseError) => void;
}

/**
 * Default error handler configuration
 */
const defaultErrorHandlerConfig: ErrorHandlerConfig = {
  logErrors: true,
  throwOnError: true,
  includeStackTrace: process.env.NODE_ENV === 'development'
};

/**
 * Error handler class
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...defaultErrorHandlerConfig, ...config };
  }

  /**
   * Handle database errors with consistent logging and formatting
   */
  handle(error: Error | DatabaseError, context?: {
    operation?: string;
    collection?: string;
    userId?: string;
    documentId?: string;
  }): DatabaseError {
    // Convert generic errors to DatabaseError
    let dbError: DatabaseError;

    if (error instanceof DatabaseError) {
      dbError = error;
    } else {
      // Handle MongoDB driver errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        dbError = this.handleMongoError(error, context);
      } else {
        dbError = new DatabaseError(
          error.message,
          'UNKNOWN_ERROR',
          context?.operation || 'unknown',
          context?.collection,
          { originalError: error }
        );
      }
    }

    // Add context information
    if (context) {
      (dbError as any).details = {
        ...dbError.details,
        context: {
          operation: context.operation,
          collection: context.collection,
          userId: context.userId,
          documentId: context.documentId
        }
      };
    }

    // Log error if configured
    if (this.config.logErrors) {
      this.logError(dbError);
    }

    // Throw error if configured
    if (this.config.throwOnError) {
      throw dbError;
    }

    return dbError;
  }

  /**
   * Handle MongoDB-specific errors
   */
  private handleMongoError(error: any, context?: {
    operation?: string;
    collection?: string;
  }): DatabaseError {
    const { operation, collection } = context || {};

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const value = Object.values(error.keyValue || {})[0];
      return new DuplicateError(
        `Duplicate value for field '${field}': ${value}`,
        operation,
        collection,
        field,
        value,
        { originalError: error }
      );
    }

    // Handle connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return new ConnectionError(
        `Database connection error: ${error.message}`,
        operation,
        { originalError: error }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return new ValidationError(
        `Validation failed: ${error.message}`,
        operation,
        collection,
        undefined,
        undefined,
        { originalError: error }
      );
    }

    // Generic MongoDB error
    return new DatabaseError(
      error.message,
      `MONGODB_ERROR_${error.code || 'UNKNOWN'}`,
      operation || 'unknown',
      collection,
      { originalError: error }
    );
  }

  /**
   * Log error using configured logger or console
   */
  private logError(error: DatabaseError): void {
    if (this.config.customLogger) {
      this.config.customLogger(error);
    } else {
      const logData = this.config.includeStackTrace ? error.toJSON() : {
        name: error.name,
        message: error.message,
        code: error.code,
        operation: error.operation,
        collection: error.collection,
        timestamp: error.timestamp.toISOString(),
        details: error.details
      };

      console.error('[Database Error]', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Create user-friendly error messages
   */
  static createUserMessage(error: DatabaseError): string {
    switch (error.code) {
      case 'CONNECTION_ERROR':
        return 'Unable to connect to the database. Please check your internet connection and try again.';
      case 'VALIDATION_ERROR':
        return 'The provided data is invalid. Please check your input and try again.';
      case 'NOT_FOUND_ERROR':
        return 'The requested item was not found.';
      case 'DUPLICATE_ERROR':
        return 'This item already exists. Please use a different value.';
      case 'PERMISSION_ERROR':
        return 'You do not have permission to perform this action.';
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait a moment and try again.';
      case 'SM2_ERROR':
        return 'There was an error processing your study progress. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: {
    operation?: string;
    collection?: string;
    userId?: string;
    documentId?: string;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorHandler = new ErrorHandler();
    errorHandler.handle(error as Error, context);
    throw error; // This will never be reached due to throwOnError, but TypeScript needs it
  }
}

/**
 * Validate ObjectId format
 */
export function validateObjectId(id: string, fieldName: string = 'id'): void {
  const { ObjectId } = require('mongodb');
  if (!ObjectId.isValid(id)) {
    throw new ValidationError(
      `Invalid ObjectId format for field '${fieldName}': ${id}`,
      'validate_object_id',
      undefined,
      fieldName,
      id
    );
  }
}

/**
 * Validate required fields
 */
export function validateRequired<T>(
  data: Partial<T>,
  requiredFields: (keyof T)[],
  collection?: string
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === null || value === undefined || value === '';
  });

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      'validate_required_fields',
      collection,
      missingFields[0] as string
    );
  }
}

/**
 * Validate SM-2 quality value
 */
export function validateQuality(quality: number): void {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new SM2Error(
      `Invalid quality value: ${quality}. Must be an integer between 0 and 5.`,
      'validate_quality',
      'flashcards',
      quality
    );
  }
}

/**
 * Validate user ownership
 */
export function validateOwnership(
  documentUserId: string,
  requestUserId: string,
  collection: string,
  documentId?: string
): void {
  if (documentUserId !== requestUserId) {
    throw new PermissionError(
      'Access denied: You do not own this resource',
      'validate_ownership',
      collection,
      requestUserId,
      'owner',
      { documentId, documentUserId, requestUserId }
    );
  }
}

// ============================================================================
// GLOBAL ERROR HANDLER INSTANCE
// ============================================================================

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

// Export all types
export type {
  ObjectId,
  Document,
};