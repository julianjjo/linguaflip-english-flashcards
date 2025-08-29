/**
 * Study Sessions Service - MongoDB CRUD Operations for Study Sessions
 *
 * This service provides comprehensive CRUD operations for study sessions,
 * including session tracking, performance analytics, and progress monitoring.
 */

import { ObjectId } from 'mongodb';
import { createDatabaseOperations } from '../utils/databaseOperations';
import type { StudySessionDocument, DatabaseOperationResult, StudySessionFilter } from '../types/database';
import {
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ValidationError,
  safeAsync,
  validateRequired,
  validateOwnership,
  errorHandler
} from '../types/database';
import { StudySessionSchema, validateDocument, sanitizeInput } from '../schemas/mongodb';

const COLLECTION_NAME = 'study_sessions';
const dbOps = createDatabaseOperations(COLLECTION_NAME);

/**
 * Study Sessions Service Class
 */
export class StudySessionsService {
  /**
   * Create a new study session
   */
  async createStudySession(
    sessionData: Omit<StudySessionDocument, '_id' | 'createdAt' | 'updatedAt' | 'endTime' | 'duration'>,
    userId: string
  ): Promise<DatabaseOperationResult<StudySessionDocument>> {
    return safeAsync(async () => {
      // Validate ownership
      validateOwnership(sessionData.userId, userId, COLLECTION_NAME);

      // Validate required fields
      validateRequired(sessionData, ['sessionId', 'userId', 'startTime', 'cardsStudied'], COLLECTION_NAME);

      // Sanitize input data
      const sanitizedData = this.sanitizeSessionData(sessionData);

      // Validate against schema
      const validation = validateDocument(sanitizedData, StudySessionSchema);
      if (!validation.isValid) {
        throw new ValidationError(
          `Study session validation failed: ${validation.errors.join(', ')}`,
          'create_study_session',
          COLLECTION_NAME
        );
      }

      // Check for duplicate sessionId for this user
      await this.checkForDuplicateSession(sanitizedData.userId, sanitizedData.sessionId);

      // Create study session
      const result = await dbOps.create(sanitizedData);

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to create study session',
          'CREATE_STUDY_SESSION_FAILED',
          'create_study_session',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'create_study_session', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get study session by ID
   */
  async getStudySessionById(
    sessionId: string,
    userId: string
  ): Promise<DatabaseOperationResult<StudySessionDocument>> {
    return safeAsync(async () => {
      const result = await dbOps.findOne({ sessionId, userId });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve study session',
          'GET_STUDY_SESSION_FAILED',
          'get_study_session_by_id',
          COLLECTION_NAME
        );
      }

      if (!result.data) {
        throw new NotFoundError(
          `Study session with ID ${sessionId} not found`,
          'get_study_session_by_id',
          COLLECTION_NAME,
          sessionId
        );
      }

      return result;
    }, { operation: 'get_study_session_by_id', collection: COLLECTION_NAME, userId });
  }

  /**
   * End a study session
   */
  async endStudySession(
    sessionId: string,
    endData: {
      endTime: Date;
      finalCardsStudied: StudySessionDocument['cardsStudied'];
      performance?: StudySessionDocument['performance'];
    },
    userId: string
  ): Promise<DatabaseOperationResult<StudySessionDocument>> {
    return safeAsync(async () => {
      // Get current session
      const currentSession = await this.getStudySessionById(sessionId, userId);
      if (!currentSession.success || !currentSession.data) {
        throw new NotFoundError(
          `Study session with ID ${sessionId} not found`,
          'end_study_session',
          COLLECTION_NAME,
          sessionId
        );
      }

      const session = currentSession.data;

      // Calculate duration
      const duration = Math.floor((endData.endTime.getTime() - session.startTime.getTime()) / 1000);

      // Calculate performance metrics if not provided
      const performance = endData.performance || this.calculateSessionPerformance(endData.finalCardsStudied);

      // Prepare updates
      const updates = {
        endTime: endData.endTime,
        duration,
        cardsStudied: endData.finalCardsStudied,
        totalCards: endData.finalCardsStudied.length,
        performance
      };

      // Update session
      const result = await dbOps.updateOne(
        { sessionId, userId },
        { $set: updates }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to end study session',
          'END_STUDY_SESSION_FAILED',
          'end_study_session',
          COLLECTION_NAME
        );
      }

      // Return updated session
      return this.getStudySessionById(sessionId, userId);
    }, { operation: 'end_study_session', collection: COLLECTION_NAME, userId });
  }

  /**
   * Update study session progress
   */
  async updateSessionProgress(
    sessionId: string,
    progressData: {
      cardsStudied: StudySessionDocument['cardsStudied'];
      currentPerformance?: Partial<StudySessionDocument['performance']>;
    },
    userId: string
  ): Promise<DatabaseOperationResult<StudySessionDocument>> {
    return safeAsync(async () => {
      // Calculate updated performance
      const performance = progressData.currentPerformance || this.calculateSessionPerformance(progressData.cardsStudied);

      // Prepare updates
      const updates = {
        cardsStudied: progressData.cardsStudied,
        totalCards: progressData.cardsStudied.length,
        performance
      };

      // Update session
      const result = await dbOps.updateOne(
        { sessionId, userId },
        { $set: updates }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to update session progress',
          'UPDATE_SESSION_PROGRESS_FAILED',
          'update_session_progress',
          COLLECTION_NAME
        );
      }

      // Return updated session
      return this.getStudySessionById(sessionId, userId);
    }, { operation: 'update_session_progress', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get user's study sessions
   */
  async getUserStudySessions(
    userId: string,
    options: {
      limit?: number;
      skip?: number;
      dateRange?: { start: Date; end: Date };
      sessionType?: StudySessionDocument['sessionType'];
      sortBy?: 'startTime' | 'endTime' | 'duration' | 'performance.overallScore';
      sortOrder?: 1 | -1;
    } = {}
  ): Promise<DatabaseOperationResult<StudySessionDocument[]>> {
    return safeAsync(async () => {
      const query: any = { userId };

      // Add date range filter
      if (options.dateRange) {
        query.startTime = {
          $gte: options.dateRange.start,
          $lte: options.dateRange.end
        };
      }

      // Add session type filter
      if (options.sessionType) {
        query.sessionType = options.sessionType;
      }

      // Set default sorting
      const sortBy = options.sortBy || 'startTime';
      const sortOrder = options.sortOrder || -1;

      const result = await dbOps.findMany(query, {
        limit: options.limit || 50,
        skip: options.skip || 0,
        sort: { [sortBy]: sortOrder }
      });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve study sessions',
          'GET_USER_STUDY_SESSIONS_FAILED',
          'get_user_study_sessions',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'get_user_study_sessions', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get study session statistics
   */
  async getStudySessionStats(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<DatabaseOperationResult<any>> {
    return safeAsync(async () => {
      const matchStage: any = { userId };

      if (dateRange) {
        matchStage.startTime = {
          $gte: dateRange.start,
          $lte: dateRange.end
        };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: [{ $ne: ['$endTime', null] }, 1, 0] }
            },
            totalDuration: { $sum: '$duration' },
            averageDuration: { $avg: '$duration' },
            totalCardsStudied: { $sum: '$totalCards' },
            averageCardsPerSession: { $avg: '$totalCards' },
            averagePerformance: { $avg: '$performance.overallScore' },
            sessionsByType: {
              $push: '$sessionType'
            }
          }
        },
        {
          $project: {
            totalSessions: 1,
            completedSessions: 1,
            totalDuration: 1,
            averageDuration: 1,
            totalCardsStudied: 1,
            averageCardsPerSession: 1,
            averagePerformance: 1,
            sessionTypeBreakdown: {
              $arrayToObject: {
                $map: {
                  input: { $setUnion: ['$sessionsByType'] },
                  as: 'type',
                  in: {
                    k: '$$type',
                    v: {
                      $size: {
                        $filter: {
                          input: '$sessionsByType',
                          cond: { $eq: ['$$this', '$$type'] }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ];

      const result = await dbOps.aggregate(pipeline);

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to get study session statistics',
          'GET_STUDY_SESSION_STATS_FAILED',
          'get_study_session_stats',
          COLLECTION_NAME
        );
      }

      return {
        success: true,
        data: (result.data && result.data[0]) || {
          totalSessions: 0,
          completedSessions: 0,
          totalDuration: 0,
          averageDuration: 0,
          totalCardsStudied: 0,
          averageCardsPerSession: 0,
          averagePerformance: 0,
          sessionTypeBreakdown: {}
        },
        operationTime: result.operationTime
      };
    }, { operation: 'get_study_session_stats', collection: COLLECTION_NAME, userId });
  }

  /**
   * Delete study session
   */
  async deleteStudySession(
    sessionId: string,
    userId: string
  ): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    return safeAsync(async () => {
      const result = await dbOps.deleteOne({ sessionId, userId });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to delete study session',
          'DELETE_STUDY_SESSION_FAILED',
          'delete_study_session',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'delete_study_session', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get recent study sessions for dashboard
   */
  async getRecentSessions(
    userId: string,
    limit: number = 10
  ): Promise<DatabaseOperationResult<StudySessionDocument[]>> {
    return safeAsync(async () => {
      const result = await dbOps.findMany(
        { userId },
        {
          limit,
          sort: { startTime: -1 }
        }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve recent sessions',
          'GET_RECENT_SESSIONS_FAILED',
          'get_recent_sessions',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'get_recent_sessions', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get study streak information
   */
  async getStudyStreak(
    userId: string
  ): Promise<DatabaseOperationResult<{ currentStreak: number; longestStreak: number; lastStudyDate?: Date }>> {
    return safeAsync(async () => {
      // Get all completed sessions sorted by date
      const sessionsResult = await dbOps.findMany(
        { userId, endTime: { $ne: null } },
        { sort: { startTime: -1 } }
      );

      if (!sessionsResult.success) {
        throw new DatabaseError(
          sessionsResult.error || 'Failed to calculate study streak',
          'GET_STUDY_STREAK_FAILED',
          'get_study_streak',
          COLLECTION_NAME
        );
      }

      const sessions = sessionsResult.data || [];
      const streakInfo = this.calculateStreak(sessions);

      return {
        success: true,
        data: streakInfo,
        operationTime: sessionsResult.operationTime
      };
    }, { operation: 'get_study_streak', collection: COLLECTION_NAME, userId });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Sanitize study session data
   */
  private sanitizeSessionData(sessionData: any): any {
    const sanitized = { ...sessionData };

    // Sanitize string fields if any
    if (sanitized.sessionType) sanitized.sessionType = sanitizeInput(sanitized.sessionType);

    return sanitized;
  }

  /**
   * Check for duplicate session ID for the same user
   */
  private async checkForDuplicateSession(userId: string, sessionId: string): Promise<void> {
    const existingSession = await dbOps.findOne({ userId, sessionId });
    if (existingSession.success && existingSession.data) {
      throw new DuplicateError(
        `Study session with ID ${sessionId} already exists for this user`,
        'create_study_session',
        COLLECTION_NAME,
        'sessionId',
        sessionId
      );
    }
  }

  /**
   * Calculate session performance metrics
   */
  private calculateSessionPerformance(cardsStudied: StudySessionDocument['cardsStudied']): any {
    if (!cardsStudied || cardsStudied.length === 0) {
      return {
        overallScore: 0,
        improvement: 0,
        focusAreas: []
      };
    }

    // Calculate basic metrics
    const totalCards = cardsStudied.length;
    const correctCards = cardsStudied.filter((card: any) => card.wasCorrect).length;
    const retentionRate = (correctCards / totalCards) * 100;

    // Calculate average response time
    const avgResponseTime = cardsStudied.reduce((sum: number, card: any) => sum + (card.responseTime || 0), 0) / totalCards;

    // Calculate consistency (standard deviation of response times)
    const responseTimes = cardsStudied.map((card: any) => card.responseTime || 0);
    const mean = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum: number, time: number) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
    const consistency = Math.sqrt(variance);

    // Determine focus areas based on performance
    const focusAreas: string[] = [];
    if (retentionRate < 70) focusAreas.push('retention');
    if (avgResponseTime > 10000) focusAreas.push('speed');
    if (consistency > 5000) focusAreas.push('consistency');

    // Calculate overall score (0-100)
    const overallScore = Math.round(
      (retentionRate * 0.7) + // 70% weight on retention
      ((avgResponseTime < 5000 ? 100 : Math.max(0, 100 - (avgResponseTime - 5000) / 100)) * 0.2) + // 20% weight on speed
      ((consistency < 3000 ? 100 : Math.max(0, 100 - (consistency - 3000) / 100)) * 0.1) // 10% weight on consistency
    );

    return {
      overallScore,
      improvement: 0, // Would need historical data to calculate
      focusAreas,
      retentionRate,
      consistency
    };
  }

  /**
   * Calculate study streak from sessions
   */
  private calculateStreak(sessions: StudySessionDocument[]): { currentStreak: number; longestStreak: number; lastStudyDate?: Date } {
    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Sort sessions by date (most recent first)
    const sortedSessions = sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        // First session
        tempStreak = 1;
        lastDate = sessionDate;
      } else {
        const dayDiff = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
          // Consecutive day
          tempStreak++;
        } else if (dayDiff === 0) {
          // Same day, don't increment streak
          continue;
        } else {
          // Gap in streak
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }

        lastDate = sessionDate;
      }
    }

    // Check if current streak includes today or yesterday
    const lastSessionDate = new Date(sortedSessions[0].startTime);
    lastSessionDate.setHours(0, 0, 0, 0);

    const daysSinceLastSession = Math.floor((today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastSession <= 1) {
      currentStreak = tempStreak;
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      lastStudyDate: sortedSessions[0]?.startTime
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const studySessionsService = new StudySessionsService();
export default studySessionsService;