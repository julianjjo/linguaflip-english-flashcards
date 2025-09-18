import type { APIRoute } from 'astro';
import { flashcardsStore } from '../../../stores/flashcards';
import { studyHistoryStore, progressStatsStore } from '../../../stores/study';
import { authStateAtom } from '../../../stores/auth';

export const GET: APIRoute = async () => {
  try {
    // Check authentication
    const authState = authStateAtom.get();
    if (!authState.isAuthenticated || !authState.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }


    // Get flashcards data
    const flashcards = flashcardsStore.get();
    
    // Get study history
    const studyHistory = studyHistoryStore.get();
    
    // Get progress stats
    const progressStats = progressStatsStore.get();

    // Calculate today's study time
    const today = new Date().toDateString();
    const todaySessions = studyHistory.filter(session =>
      new Date(session.date).toDateString() === today
    );
    const todayStudyTime = todaySessions.reduce((sum, session) => sum + session.totalTime, 0);

    // Calculate mastered cards (cards with high easiness factor and multiple repetitions)
    const masteredCards = flashcards.filter(card => 
      card.easinessFactor >= 2.5 && card.repetitions >= 3
    ).length;

    // Calculate cards due today
    const dueToday = flashcards.filter(card => {
      const dueDate = new Date(card.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate <= today;
    }).length;

    // Prepare response data
    const stats = {
      totalCards: flashcards.length,
      masteredCards,
      currentStreak: progressStats.currentStreak,
      longestStreak: progressStats.longestStreak,
      todayStudyTime,
      cardsReviewedToday: todaySessions.reduce((sum, session) => sum + session.cardsReviewed, 0),
      accuracyToday: todaySessions.length > 0 
        ? Math.round((todaySessions.reduce((sum, session) => sum + session.correctAnswers, 0) / 
           todaySessions.reduce((sum, session) => sum + session.cardsReviewed, 0)) * 100)
        : 0,
      dueToday,
      totalStudyTime: progressStats.totalStudyTime,
      averageAccuracy: progressStats.averageAccuracy,
      sessionsThisWeek: progressStats.studySessionsThisWeek,
      sessionsThisMonth: progressStats.studySessionsThisMonth,
      cardsInProgress: flashcards.filter(card => card.repetitions > 0 && card.repetitions < 3).length,
      newCards: flashcards.filter(card => card.repetitions === 0).length
    };

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch dashboard statistics' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};