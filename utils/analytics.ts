import { FlashcardData, StudySession, ProgressStats, LearningAnalytics, Achievement, DeckProgress } from '../types';

export class AnalyticsCalculator {
  static calculateProgressStats(cards: FlashcardData[], studySessions: StudySession[]): ProgressStats {
    const totalCards = cards.length;
    const cardsMastered = cards.filter(card => card.repetitions >= 5).length;
    const cardsInProgress = cards.filter(card => card.repetitions > 0 && card.repetitions < 5).length;
    const cardsNew = cards.filter(card => card.repetitions === 0).length;

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const studySessionsToday = studySessions.filter(session => session.date === today).length;
    const studySessionsThisWeek = studySessions.filter(session => session.date >= weekAgo).length;
    const studySessionsThisMonth = studySessions.filter(session => session.date >= monthAgo).length;

    const totalStudyTime = studySessions.reduce((total, session) => total + session.totalTime, 0) / 60; // Convert to minutes
    const totalCorrect = studySessions.reduce((total, session) => total + session.correctAnswers, 0);
    const totalReviewed = studySessions.reduce((total, session) => total + session.cardsReviewed, 0);
    const averageAccuracy = totalReviewed > 0 ? (totalCorrect / totalReviewed) * 100 : 0;

    // Calculate current streak
    const currentStreak = this.calculateCurrentStreak(studySessions);
    const longestStreak = this.calculateLongestStreak(studySessions);

    return {
      totalCards,
      cardsMastered,
      cardsInProgress,
      cardsNew,
      currentStreak,
      longestStreak,
      totalStudyTime,
      averageAccuracy,
      studySessionsToday,
      studySessionsThisWeek,
      studySessionsThisMonth,
    };
  }

  static calculateLearningAnalytics(cards: FlashcardData[], studySessions: StudySession[]): LearningAnalytics {
    const retentionRate = this.calculateRetentionRate(cards, studySessions);

    const difficultyDistribution = this.calculateDifficultyDistribution(cards);

    const studyPattern = this.calculateStudyPattern(studySessions);

    const performanceTrends = this.calculatePerformanceTrends(studySessions);

    return {
      retentionRate,
      difficultyDistribution,
      studyPattern,
      performanceTrends,
    };
  }

  static calculateRetentionRate(cards: FlashcardData[], studySessions: StudySession[]): number {
    const reviewedCards = cards.filter(card => card.lastReviewed !== null);
    if (reviewedCards.length === 0) return 0;

    const totalReviews = reviewedCards.length;
    const successfulReviews = reviewedCards.filter(card => card.repetitions > 0).length;

    return (successfulReviews / totalReviews) * 100;
  }

  static calculateDifficultyDistribution(cards: FlashcardData[]) {
    const easy = cards.filter(card => card.easinessFactor >= 2.5).length;
    const medium = cards.filter(card => card.easinessFactor >= 1.8 && card.easinessFactor < 2.5).length;
    const hard = cards.filter(card => card.easinessFactor < 1.8).length;

    return { easy, medium, hard };
  }

  static calculateStudyPattern(studySessions: StudySession[]) {
    if (studySessions.length === 0) {
      return {
        mostProductiveHour: 0,
        mostProductiveDay: 'Monday',
        averageSessionLength: 0,
      };
    }

    // Calculate most productive hour
    const hourCounts = new Array(24).fill(0);
    studySessions.forEach(session => {
      const hour = new Date(session.date).getHours();
      hourCounts[hour] += session.totalTime;
    });
    const mostProductiveHour = hourCounts.indexOf(Math.max(...hourCounts));

    // Calculate most productive day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    studySessions.forEach(session => {
      const day = new Date(session.date).getDay();
      dayCounts[day] += session.totalTime;
    });
    const mostProductiveDay = dayNames[dayCounts.indexOf(Math.max(...dayCounts))];

    // Calculate average session length
    const averageSessionLength = studySessions.reduce((total, session) => total + session.totalTime, 0) / studySessions.length / 60; // Convert to minutes

    return {
      mostProductiveHour,
      mostProductiveDay,
      averageSessionLength,
    };
  }

  static calculatePerformanceTrends(studySessions: StudySession[]) {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const accuracyTrend = last30Days.map(date => {
      const daySessions = studySessions.filter(session => session.date === date);
      if (daySessions.length === 0) return 0;

      const totalCorrect = daySessions.reduce((sum, session) => sum + session.correctAnswers, 0);
      const totalReviewed = daySessions.reduce((sum, session) => sum + session.cardsReviewed, 0);
      return totalReviewed > 0 ? (totalCorrect / totalReviewed) * 100 : 0;
    });

    const cardsLearnedTrend = last30Days.map(date => {
      const daySessions = studySessions.filter(session => session.date === date);
      return daySessions.reduce((sum, session) => sum + session.cardsReviewed, 0);
    });

    const studyTimeTrend = last30Days.map(date => {
      const daySessions = studySessions.filter(session => session.date === date);
      return daySessions.reduce((sum, session) => sum + session.totalTime, 0) / 60; // Convert to minutes
    });

    return {
      accuracyTrend,
      cardsLearnedTrend,
      studyTimeTrend,
    };
  }

  static calculateCurrentStreak(studySessions: StudySession[]): number {
    if (studySessions.length === 0) return 0;

    const sortedSessions = studySessions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedSessions.length; i++) {
      const sessionDate = new Date(sortedSessions[i].date);
      sessionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  static calculateLongestStreak(studySessions: StudySession[]): number {
    if (studySessions.length === 0) return 0;

    const sortedSessions = studySessions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let longestStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < sortedSessions.length; i++) {
      const prevDate = new Date(sortedSessions[i - 1].date);
      const currentDate = new Date(sortedSessions[i].date);

      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(longestStreak, currentStreak);
  }

  static calculateDeckProgress(cards: FlashcardData[]): DeckProgress[] {
    // For now, we'll treat all cards as one deck. In the future, this could be expanded to support multiple decks
    const totalCards = cards.length;
    const completedCards = cards.filter(card => card.repetitions >= 5).length;
    const progress = totalCards > 0 ? (completedCards / totalCards) * 100 : 0;

    const lastStudied = cards
      .filter(card => card.lastReviewed !== null)
      .sort((a, b) => new Date(b.lastReviewed!).getTime() - new Date(a.lastReviewed!).getTime())[0]?.lastReviewed || null;

    const reviewedCards = cards.filter(card => card.lastReviewed !== null);
    const averageAccuracy = reviewedCards.length > 0
      ? reviewedCards.reduce((sum, card) => sum + (card.repetitions > 0 ? 100 : 0), 0) / reviewedCards.length
      : 0;

    return [{
      id: 'main-deck',
      name: 'Main Vocabulary Deck',
      totalCards,
      completedCards,
      progress,
      lastStudied,
      averageAccuracy,
    }];
  }

  static generateAchievements(progressStats: ProgressStats): Achievement[] {
    const achievements: Achievement[] = [
      {
        id: 'first-card',
        title: 'First Steps',
        description: 'Review your first flashcard',
        icon: '🎯',
        unlockedAt: progressStats.totalCards > 0 ? new Date().toISOString() : null,
        progress: Math.min(progressStats.totalCards, 1),
        target: 1,
        current: Math.min(progressStats.totalCards, 1),
      },
      {
        id: 'streak-7',
        title: 'Week Warrior',
        description: 'Maintain a 7-day study streak',
        icon: '🔥',
        unlockedAt: progressStats.currentStreak >= 7 ? new Date().toISOString() : null,
        progress: Math.min((progressStats.currentStreak / 7) * 100, 100),
        target: 7,
        current: progressStats.currentStreak,
      },
      {
        id: 'master-10',
        title: 'Vocabulary Builder',
        description: 'Master 10 flashcards',
        icon: '📚',
        unlockedAt: progressStats.cardsMastered >= 10 ? new Date().toISOString() : null,
        progress: Math.min((progressStats.cardsMastered / 10) * 100, 100),
        target: 10,
        current: progressStats.cardsMastered,
      },
      {
        id: 'accuracy-90',
        title: 'Accuracy Expert',
        description: 'Achieve 90% average accuracy',
        icon: '🎯',
        unlockedAt: progressStats.averageAccuracy >= 90 ? new Date().toISOString() : null,
        progress: Math.min(progressStats.averageAccuracy, 100),
        target: 90,
        current: progressStats.averageAccuracy,
      },
      {
        id: 'study-time-60',
        title: 'Dedicated Learner',
        description: 'Study for 60 minutes total',
        icon: '⏰',
        unlockedAt: progressStats.totalStudyTime >= 60 ? new Date().toISOString() : null,
        progress: Math.min((progressStats.totalStudyTime / 60) * 100, 100),
        target: 60,
        current: progressStats.totalStudyTime,
      },
    ];

    return achievements;
  }
}