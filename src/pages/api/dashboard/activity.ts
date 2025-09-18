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
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get study history
    const studyHistory = studyHistoryStore.get();

    // Sort by date (most recent first) and apply pagination
    const sortedSessions = studyHistory
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(offset, offset + limit);

    // Enhance session data with additional metrics
    const enhancedSessions = sortedSessions.map(session => {
      const accuracy = session.cardsReviewed > 0 
        ? Math.round((session.correctAnswers / session.cardsReviewed) * 100)
        : 0;
      
      const averageTimePerCard = session.cardsReviewed > 0 
        ? Math.round(session.totalTime / session.cardsReviewed * 60) // in seconds
        : 0;

      // Calculate relative time
      const sessionDate = new Date(session.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - sessionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let relativeTime = '';
      if (diffDays === 1) {
        relativeTime = 'Hoy';
      } else if (diffDays === 2) {
        relativeTime = 'Ayer';
      } else if (diffDays <= 7) {
        relativeTime = `Hace ${diffDays - 1} días`;
      } else if (diffDays <= 30) {
        const weeks = Math.floor((diffDays - 1) / 7);
        relativeTime = weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
      } else {
        const months = Math.floor((diffDays - 1) / 30);
        relativeTime = months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
      }

      // Determine performance level
      let performanceLevel = 'poor';
      if (accuracy >= 80) {
        performanceLevel = 'excellent';
      } else if (accuracy >= 70) {
        performanceLevel = 'good';
      } else if (accuracy >= 60) {
        performanceLevel = 'fair';
      }

      return {
        ...session,
        accuracy,
        averageTimePerCard,
        relativeTime,
        performanceLevel,
        formattedDate: sessionDate.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: sessionDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
      };
    });

    // Calculate pagination info
    const totalSessions = studyHistory.length;
    const hasMore = offset + limit < totalSessions;
    const totalPages = Math.ceil(totalSessions / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Calculate activity summary for the current page
    const currentPageSummary = {
      totalCardsReviewed: enhancedSessions.reduce((sum, session) => sum + session.cardsReviewed, 0),
      totalStudyTime: enhancedSessions.reduce((sum, session) => sum + session.totalTime, 0),
      averageAccuracy: enhancedSessions.length > 0 
        ? Math.round(enhancedSessions.reduce((sum, session) => sum + session.accuracy, 0) / enhancedSessions.length)
        : 0,
      sessionsCount: enhancedSessions.length
    };

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        sessions: enhancedSessions,
        pagination: {
          currentPage,
          totalPages,
          limit,
          offset,
          hasMore,
          total: totalSessions
        },
        summary: currentPageSummary
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dashboard activity API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch activity data' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};