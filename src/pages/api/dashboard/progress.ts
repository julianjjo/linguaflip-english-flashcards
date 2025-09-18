import type { APIRoute } from 'astro';
import { studyHistoryStore } from '../../../stores/study';
import { authStateAtom } from '../../../stores/auth';

export const GET: APIRoute = async ({ url }) => {
  try {
    // Check authentication
    const authState = authStateAtom.get();
    if (!authState.isAuthenticated || !authState.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const days = parseInt(url.searchParams.get('days') || '30');
    const type = url.searchParams.get('type') || 'daily'; // daily, weekly, monthly

    // Get study history
    const studyHistory = studyHistoryStore.get();

    // Filter data based on date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredSessions = studyHistory.filter(session => 
      new Date(session.date) >= cutoffDate
    );

    let progressData = [];

    if (type === 'daily') {
      // Group by day
      const dailyData = new Map();
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        dailyData.set(dateString, {
          date: dateString,
          cardsReviewed: 0,
          correctAnswers: 0,
          totalTime: 0,
          sessions: 0,
          accuracy: 0
        });
      }

      filteredSessions.forEach(session => {
        const date = session.date.split('T')[0]; // Get date part only
        if (dailyData.has(date)) {
          const existing = dailyData.get(date);
          existing.cardsReviewed += session.cardsReviewed;
          existing.correctAnswers += session.correctAnswers;
          existing.totalTime += session.totalTime;
          existing.sessions += 1;
          existing.accuracy = existing.cardsReviewed > 0 
            ? Math.round((existing.correctAnswers / existing.cardsReviewed) * 100)
            : 0;
        }
      });

      progressData = Array.from(dailyData.values()).reverse();

    } else if (type === 'weekly') {
      // Group by week
      const weeklyData = new Map();
      
      filteredSessions.forEach(session => {
        const date = new Date(session.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            weekStart: weekKey,
            cardsReviewed: 0,
            correctAnswers: 0,
            totalTime: 0,
            sessions: 0,
            accuracy: 0
          });
        }
        
        const existing = weeklyData.get(weekKey);
        existing.cardsReviewed += session.cardsReviewed;
        existing.correctAnswers += session.correctAnswers;
        existing.totalTime += session.totalTime;
        existing.sessions += 1;
        existing.accuracy = existing.cardsReviewed > 0 
          ? Math.round((existing.correctAnswers / existing.cardsReviewed) * 100)
          : 0;
      });

      progressData = Array.from(weeklyData.values()).sort((a, b) => 
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );

    } else if (type === 'monthly') {
      // Group by month
      const monthlyData = new Map();
      
      filteredSessions.forEach(session => {
        const date = new Date(session.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthKey,
            cardsReviewed: 0,
            correctAnswers: 0,
            totalTime: 0,
            sessions: 0,
            accuracy: 0
          });
        }
        
        const existing = monthlyData.get(monthKey);
        existing.cardsReviewed += session.cardsReviewed;
        existing.correctAnswers += session.correctAnswers;
        existing.totalTime += session.totalTime;
        existing.sessions += 1;
        existing.accuracy = existing.cardsReviewed > 0 
          ? Math.round((existing.correctAnswers / existing.cardsReviewed) * 100)
          : 0;
      });

      progressData = Array.from(monthlyData.values()).sort((a, b) => 
        a.month.localeCompare(b.month)
      );
    }

    // Calculate summary statistics
    const summary = {
      totalCardsReviewed: filteredSessions.reduce((sum, session) => sum + session.cardsReviewed, 0),
      totalCorrectAnswers: filteredSessions.reduce((sum, session) => sum + session.correctAnswers, 0),
      totalStudyTime: filteredSessions.reduce((sum, session) => sum + session.totalTime, 0),
      totalSessions: filteredSessions.length,
      averageAccuracy: filteredSessions.length > 0 
        ? Math.round((filteredSessions.reduce((sum, session) => sum + session.correctAnswers, 0) / 
           filteredSessions.reduce((sum, session) => sum + session.cardsReviewed, 0)) * 100)
        : 0,
      averageCardsPerSession: filteredSessions.length > 0 
        ? Math.round(filteredSessions.reduce((sum, session) => sum + session.cardsReviewed, 0) / filteredSessions.length)
        : 0,
      averageTimePerSession: filteredSessions.length > 0 
        ? Math.round(filteredSessions.reduce((sum, session) => sum + session.totalTime, 0) / filteredSessions.length)
        : 0
    };

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        progressData,
        summary,
        period: { days, type }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dashboard progress API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch progress data' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};