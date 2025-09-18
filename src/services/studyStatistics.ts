/**
 * Study Statistics Service - MongoDB CRUD Operations for Study Statistics
 *
 * This service provides comprehensive CRUD operations for study statistics,
 * including daily, weekly, and monthly progress tracking and analytics.
 */

import { createDatabaseOperations } from '../utils/databaseOperations';
import type { StudyStatisticsDocument, DatabaseOperationResult } from '../types/database';
import {
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ValidationError,
  safeAsync,
  validateRequired,
  validateOwnership
} from '../types/database';
import { StudyStatisticsSchema, validateDocument } from '../schemas/mongodb';

const COLLECTION_NAME = 'study_statistics';
const dbOps = createDatabaseOperations(COLLECTION_NAME);

/**
 * Study Statistics Service Class
 */
export class StudyStatisticsService {
  /**
   * Create study statistics entry
   */
  async createStudyStatistics(
    statsData: Omit<StudyStatisticsDocument, '_id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    return safeAsync(async () => {
      // Validate ownership
      validateOwnership(statsData.userId, userId, COLLECTION_NAME);

      // Validate required fields
      validateRequired(statsData, ['statsId', 'userId', 'date', 'dailyStats'], COLLECTION_NAME);

      // Sanitize input data
      const sanitizedData = this.sanitizeStatsData(statsData);

      // Validate against schema
      const validation = validateDocument(sanitizedData, StudyStatisticsSchema);
      if (!validation.isValid) {
        throw new ValidationError(
          `Study statistics validation failed: ${validation.errors.join(', ')}`,
          'create_study_statistics',
          COLLECTION_NAME
        );
      }

      // Check for duplicate statsId for this user and date
      await this.checkForDuplicateStats(sanitizedData.userId, sanitizedData.statsId);

      // Create study statistics
      const result = await dbOps.create(sanitizedData);

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to create study statistics',
          'CREATE_STUDY_STATISTICS_FAILED',
          'create_study_statistics',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'create_study_statistics', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get study statistics by ID
   */
  async getStudyStatisticsById(
    statsId: string,
    userId: string
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    return safeAsync(async () => {
      const result = await dbOps.findOne({ statsId, userId });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve study statistics',
          'GET_STUDY_STATISTICS_FAILED',
          'get_study_statistics_by_id',
          COLLECTION_NAME
        );
      }

      if (!result.data) {
        throw new NotFoundError(
          `Study statistics with ID ${statsId} not found`,
          'get_study_statistics_by_id',
          COLLECTION_NAME,
          statsId
        );
      }

      return result;
    }, { operation: 'get_study_statistics_by_id', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get study statistics for a specific date
   */
  async getStudyStatisticsByDate(
    userId: string,
    date: Date,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    return safeAsync(async () => {
      const result = await dbOps.findOne({
        userId,
        date: this.normalizeDate(date, period),
        period
      });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve study statistics for date',
          'GET_STUDY_STATISTICS_BY_DATE_FAILED',
          'get_study_statistics_by_date',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'get_study_statistics_by_date', collection: COLLECTION_NAME, userId });
  }

  /**
   * Update study statistics
   */
  async updateStudyStatistics(
    statsId: string,
    updates: Partial<StudyStatisticsDocument>,
    userId: string
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    return safeAsync(async () => {
      // Get current statistics to validate ownership
      const currentStats = await this.getStudyStatisticsById(statsId, userId);
      if (!currentStats.success || !currentStats.data) {
        throw new NotFoundError(
          `Study statistics with ID ${statsId} not found`,
          'update_study_statistics',
          COLLECTION_NAME,
          statsId
        );
      }

      // Sanitize updates
      const sanitizedUpdates = this.sanitizeStatsData(updates);

      // Validate updated data against schema
      const updatedData = { ...currentStats.data, ...sanitizedUpdates };
      const validation = validateDocument(updatedData, StudyStatisticsSchema);
      if (!validation.isValid) {
        throw new ValidationError(
          `Study statistics validation failed: ${validation.errors.join(', ')}`,
          'update_study_statistics',
          COLLECTION_NAME
        );
      }

      // Update statistics
      const result = await dbOps.updateOne(
        { statsId, userId },
        { $set: sanitizedUpdates }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to update study statistics',
          'UPDATE_STUDY_STATISTICS_FAILED',
          'update_study_statistics',
          COLLECTION_NAME
        );
      }

      // Return updated statistics
      return this.getStudyStatisticsById(statsId, userId);
    }, { operation: 'update_study_statistics', collection: COLLECTION_NAME, userId });
  }

  /**
   * Update or create daily statistics
   */
  async upsertDailyStatistics(
    userId: string,
    date: Date,
    dailyStats: StudyStatisticsDocument['dailyStats']
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    return safeAsync(async () => {
      const normalizedDate = this.normalizeDate(date, 'daily');
      const statsId = this.generateStatsId(userId, normalizedDate, 'daily');

      // Try to find existing statistics
      const existingStats = await dbOps.findOne({
        userId,
        date: normalizedDate,
        period: 'daily'
      });

      if (existingStats.success && existingStats.data) {
        // Update existing statistics
        return this.updateStudyStatistics(statsId, { dailyStats }, userId);
      } else {
        // Create new statistics
        const newStatsData = {
          statsId,
          userId,
          date: normalizedDate,
          period: 'daily' as const,
          dailyStats
        };

        return this.createStudyStatistics(newStatsData, userId);
      }
    }, { operation: 'upsert_daily_statistics', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get user's study statistics within a date range
   */
  async getStudyStatisticsRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    options: { limit?: number; skip?: number } = {}
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument[]>> {
    return safeAsync(async () => {
      const result = await dbOps.findMany(
        {
          userId,
          period,
          date: {
            $gte: this.normalizeDate(startDate, period),
            $lte: this.normalizeDate(endDate, period)
          }
        },
        {
          limit: options.limit || 100,
          skip: options.skip || 0,
          sort: { date: 1 }
        }
      );

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to retrieve study statistics range',
          'GET_STUDY_STATISTICS_RANGE_FAILED',
          'get_study_statistics_range',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'get_study_statistics_range', collection: COLLECTION_NAME, userId });
  }

  /**
   * Calculate and store weekly statistics
   */
  async calculateWeeklyStatistics(
    userId: string,
    weekStartDate: Date
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    return safeAsync(async () => {
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);

      // Get all daily statistics for the week
      const dailyStats = await this.getStudyStatisticsRange(userId, weekStartDate, weekEndDate, 'daily');

      if (!dailyStats.success || !dailyStats.data) {
        throw new DatabaseError(
          'Failed to retrieve daily statistics for weekly calculation',
          'CALCULATE_WEEKLY_STATS_FAILED',
          'calculate_weekly_statistics',
          COLLECTION_NAME
        );
      }

      // Calculate weekly aggregates
      const weeklyStats = this.aggregateStats(dailyStats.data);

      const normalizedWeekStart = this.normalizeDate(weekStartDate, 'weekly');
      const statsId = this.generateStatsId(userId, normalizedWeekStart, 'weekly');

      // Create or update weekly statistics
      const weeklyStatsData = {
        statsId,
        userId,
        date: normalizedWeekStart,
        period: 'weekly' as const,
        dailyStats: {
          cardsStudied: weeklyStats.totalCards,
          studyTime: weeklyStats.totalTime,
          correctAnswers: weeklyStats.totalCorrect,
          incorrectAnswers: weeklyStats.totalIncorrect,
          averageRecallRate: weeklyStats.averageRate
        },
        weeklyStats
      };

      return this.upsertWeeklyStatistics(weeklyStatsData, userId);
    }, { operation: 'calculate_weekly_statistics', collection: COLLECTION_NAME, userId });
  }

  /**
   * Calculate and store monthly statistics
   */
  async calculateMonthlyStatistics(
    userId: string,
    monthStartDate: Date
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    return safeAsync(async () => {
      const monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0);

      // Get all weekly statistics for the month
      const weeklyStats = await this.getStudyStatisticsRange(userId, monthStartDate, monthEndDate, 'weekly');

      if (!weeklyStats.success || !weeklyStats.data) {
        throw new DatabaseError(
          'Failed to retrieve weekly statistics for monthly calculation',
          'CALCULATE_MONTHLY_STATS_FAILED',
          'calculate_monthly_statistics',
          COLLECTION_NAME
        );
      }

      // Calculate monthly aggregates
      const monthlyStats = this.aggregateStats(weeklyStats.data);

      const normalizedMonthStart = this.normalizeDate(monthStartDate, 'monthly');
      const statsId = this.generateStatsId(userId, normalizedMonthStart, 'monthly');

      // Create or update monthly statistics
      const monthlyStatsData = {
        statsId,
        userId,
        date: normalizedMonthStart,
        period: 'monthly' as const,
        dailyStats: {
          cardsStudied: monthlyStats.totalCards,
          studyTime: monthlyStats.totalTime,
          correctAnswers: monthlyStats.totalCorrect,
          incorrectAnswers: monthlyStats.totalIncorrect,
          averageRecallRate: monthlyStats.averageRate
        },
        monthlyStats
      };

      return this.upsertMonthlyStatistics(monthlyStatsData, userId);
    }, { operation: 'calculate_monthly_statistics', collection: COLLECTION_NAME, userId });
  }

  /**
   * Get study statistics summary for dashboard
   */
  async getStudyStatisticsSummary(
    userId: string,
    days: number = 30
  ): Promise<DatabaseOperationResult<any>> {
    return safeAsync(async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const dailyStats = await this.getStudyStatisticsRange(userId, startDate, endDate, 'daily');

      if (!dailyStats.success || !dailyStats.data) {
        return {
          success: true,
          data: {
            totalDays: 0,
            totalCardsStudied: 0,
            totalStudyTime: 0,
            averageDailyCards: 0,
            averageDailyTime: 0,
            averageRecallRate: 0,
            studyDays: 0,
            consistency: 0
          },
          operationTime: 0
        };
      }

      const stats = dailyStats.data;
      const summary = this.calculateSummary(stats, days);

      return {
        success: true,
        data: summary,
        operationTime: dailyStats.operationTime
      };
    }, { operation: 'get_study_statistics_summary', collection: COLLECTION_NAME, userId });
  }

  /**
   * Delete study statistics
   */
  async deleteStudyStatistics(
    statsId: string,
    userId: string
  ): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    return safeAsync(async () => {
      const result = await dbOps.deleteOne({ statsId, userId });

      if (!result.success) {
        throw new DatabaseError(
          result.error || 'Failed to delete study statistics',
          'DELETE_STUDY_STATISTICS_FAILED',
          'delete_study_statistics',
          COLLECTION_NAME
        );
      }

      return result;
    }, { operation: 'delete_study_statistics', collection: COLLECTION_NAME, userId });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Sanitize study statistics data
   */
  private sanitizeStatsData(statsData: any): any {
    const sanitized = { ...statsData };
    return sanitized;
  }

  /**
   * Check for duplicate statistics ID for the same user
   */
  private async checkForDuplicateStats(userId: string, statsId: string): Promise<void> {
    const existingStats = await dbOps.findOne({ userId, statsId });
    if (existingStats.success && existingStats.data) {
      throw new DuplicateError(
        `Study statistics with ID ${statsId} already exists for this user`,
        'create_study_statistics',
        COLLECTION_NAME,
        'statsId',
        statsId
      );
    }
  }

  /**
   * Normalize date based on period
   */
  private normalizeDate(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const normalized = new Date(date);

    switch (period) {
      case 'daily':
        normalized.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const dayOfWeek = normalized.getDay();
        normalized.setDate(normalized.getDate() - dayOfWeek);
        normalized.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        normalized.setDate(1);
        normalized.setHours(0, 0, 0, 0);
        break;
    }

    return normalized;
  }

  /**
   * Generate statistics ID
   */
  private generateStatsId(userId: string, date: Date, period: string): string {
    const dateStr = date.toISOString().split('T')[0];
    return `${userId}_${period}_${dateStr}`;
  }

  /**
   * Aggregate statistics from multiple entries
   */
  private aggregateStats(statsArray: StudyStatisticsDocument[]): any {
    if (statsArray.length === 0) {
      return {
        totalCards: 0,
        totalTime: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        averageRate: 0,
        improvement: 0
      };
    }

    const totals = statsArray.reduce((acc, stats) => {
      const dailyStats = stats.dailyStats;
      return {
        totalCards: acc.totalCards + (dailyStats.cardsStudied || 0),
        totalTime: acc.totalTime + (dailyStats.studyTime || 0),
        totalCorrect: acc.totalCorrect + (dailyStats.correctAnswers || 0),
        totalIncorrect: acc.totalIncorrect + (dailyStats.incorrectAnswers || 0),
        totalRate: acc.totalRate + (dailyStats.averageRecallRate || 0)
      };
    }, { totalCards: 0, totalTime: 0, totalCorrect: 0, totalIncorrect: 0, totalRate: 0 });

    return {
      totalCards: totals.totalCards,
      totalTime: totals.totalTime,
      averageRate: statsArray.length > 0 ? totals.totalRate / statsArray.length : 0,
      improvement: this.calculateImprovement(statsArray),
      totalCorrect: totals.totalCorrect,
      totalIncorrect: totals.totalIncorrect
    };
  }

  /**
   * Calculate improvement trend
   */
  private calculateImprovement(statsArray: StudyStatisticsDocument[]): number {
    if (statsArray.length < 2) return 0;

    const sortedStats = statsArray.sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstHalf = sortedStats.slice(0, Math.floor(sortedStats.length / 2));
    const secondHalf = sortedStats.slice(Math.floor(sortedStats.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, stats) => sum + (stats.dailyStats.averageRecallRate || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, stats) => sum + (stats.dailyStats.averageRecallRate || 0), 0) / secondHalf.length;

    return secondHalfAvg - firstHalfAvg;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(statsArray: StudyStatisticsDocument[], totalDays: number): any {
    const totals = statsArray.reduce((acc, stats) => {
      const dailyStats = stats.dailyStats;
      return {
        totalCards: acc.totalCards + (dailyStats.cardsStudied || 0),
        totalTime: acc.totalTime + (dailyStats.studyTime || 0),
        totalCorrect: acc.totalCorrect + (dailyStats.correctAnswers || 0),
        totalIncorrect: acc.totalIncorrect + (dailyStats.incorrectAnswers || 0),
        totalRate: acc.totalRate + (dailyStats.averageRecallRate || 0)
      };
    }, { totalCards: 0, totalTime: 0, totalCorrect: 0, totalIncorrect: 0, totalRate: 0 });

    const studyDays = statsArray.length;
    const averageRate = studyDays > 0 ? totals.totalRate / studyDays : 0;
    const consistency = studyDays > 0 ? (studyDays / totalDays) * 100 : 0;

    return {
      totalDays,
      totalCardsStudied: totals.totalCards,
      totalStudyTime: totals.totalTime,
      averageDailyCards: studyDays > 0 ? totals.totalCards / studyDays : 0,
      averageDailyTime: studyDays > 0 ? totals.totalTime / studyDays : 0,
      averageRecallRate: averageRate,
      studyDays,
      consistency
    };
  }

  /**
   * Upsert weekly statistics
   */
  private async upsertWeeklyStatistics(
    statsData: Omit<StudyStatisticsDocument, '_id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    const existingStats = await dbOps.findOne({
      userId: statsData.userId,
      date: statsData.date,
      period: 'weekly'
    });

    if (existingStats.success && existingStats.data) {
      return this.updateStudyStatistics(statsData.statsId, statsData, userId);
    } else {
      return this.createStudyStatistics(statsData, userId);
    }
  }

  /**
   * Upsert monthly statistics
   */
  private async upsertMonthlyStatistics(
    statsData: Omit<StudyStatisticsDocument, '_id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<DatabaseOperationResult<StudyStatisticsDocument>> {
    const existingStats = await dbOps.findOne({
      userId: statsData.userId,
      date: statsData.date,
      period: 'monthly'
    });

    if (existingStats.success && existingStats.data) {
      return this.updateStudyStatistics(statsData.statsId, statsData, userId);
    } else {
      return this.createStudyStatistics(statsData, userId);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const studyStatisticsService = new StudyStatisticsService();
export default studyStatisticsService;