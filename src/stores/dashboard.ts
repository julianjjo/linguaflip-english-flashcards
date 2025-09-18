import { atom, map, computed } from 'nanostores';

// Dashboard statistics interface
export interface DashboardStats {
  totalCards: number;
  masteredCards: number;
  currentStreak: number;
  longestStreak: number;
  todayStudyTime: number;
  cardsReviewedToday: number;
  accuracyToday: number;
  dueToday: number;
  totalStudyTime: number;
  averageAccuracy: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  cardsInProgress: number;
  newCards: number;
}

// Dashboard activity interface
export interface DashboardActivity {
  sessions: Array<{
    id: string;
    date: string;
    cardsReviewed: number;
    correctAnswers: number;
    totalTime: number;
    accuracy: number;
    averageTimePerCard: number;
    relativeTime: string;
    performanceLevel: 'poor' | 'fair' | 'good' | 'excellent';
    formattedDate: string;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    total: number;
  };
  summary: {
    totalCardsReviewed: number;
    totalStudyTime: number;
    averageAccuracy: number;
    sessionsCount: number;
  };
}

// Progress data interface
export interface DashboardProgress {
  progressData: Array<{
    date?: string;
    weekStart?: string;
    month?: string;
    cardsReviewed: number;
    correctAnswers: number;
    totalTime: number;
    sessions: number;
    accuracy: number;
  }>;
  summary: {
    totalCardsReviewed: number;
    totalCorrectAnswers: number;
    totalStudyTime: number;
    totalSessions: number;
    averageAccuracy: number;
    averageCardsPerSession: number;
    averageTimePerSession: number;
  };
  period: {
    days: number;
    type: 'daily' | 'weekly' | 'monthly';
  };
}

// Dashboard state atoms
export const dashboardStatsStore = atom<DashboardStats | null>(null);
export const dashboardActivityStore = atom<DashboardActivity | null>(null);
export const dashboardProgressStore = atom<DashboardProgress | null>(null);

// Loading states
export const dashboardLoadingStore = map<{
  stats: boolean;
  activity: boolean;
  progress: boolean;
}>({
  stats: false,
  activity: false,
  progress: false
});

// Error states
export const dashboardErrorStore = map<{
  stats: string | null;
  activity: string | null;
  progress: string | null;
}>({
  stats: null,
  activity: null,
  progress: null
});

// Computed values
export const isDashboardLoadingStore = computed(
  dashboardLoadingStore,
  (loading) => loading.stats || loading.activity || loading.progress
);

export const dashboardErrorsStore = computed(
  dashboardErrorStore,
  (errors) => Object.values(errors).filter(Boolean)
);

// API functions
export const fetchDashboardStats = async (): Promise<void> => {
  dashboardLoadingStore.setKey('stats', true);
  dashboardErrorStore.setKey('stats', null);

  try {
    const response = await fetch('/api/dashboard/stats');
    const result = await response.json();

    if (result.success) {
      dashboardStatsStore.set(result.data);
    } else {
      throw new Error(result.error || 'Failed to fetch dashboard stats');
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    dashboardErrorStore.setKey('stats', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    dashboardLoadingStore.setKey('stats', false);
  }
};

export const fetchDashboardActivity = async (
  limit: number = 10,
  offset: number = 0
): Promise<void> => {
  dashboardLoadingStore.setKey('activity', true);
  dashboardErrorStore.setKey('activity', null);

  try {
    const response = await fetch(`/api/dashboard/activity?limit=${limit}&offset=${offset}`);
    const result = await response.json();

    if (result.success) {
      dashboardActivityStore.set(result.data);
    } else {
      throw new Error(result.error || 'Failed to fetch dashboard activity');
    }
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    dashboardErrorStore.setKey('activity', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    dashboardLoadingStore.setKey('activity', false);
  }
};

export const fetchDashboardProgress = async (
  days: number = 30,
  type: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<void> => {
  dashboardLoadingStore.setKey('progress', true);
  dashboardErrorStore.setKey('progress', null);

  try {
    const response = await fetch(`/api/dashboard/progress?days=${days}&type=${type}`);
    const result = await response.json();

    if (result.success) {
      dashboardProgressStore.set(result.data);
    } else {
      throw new Error(result.error || 'Failed to fetch dashboard progress');
    }
  } catch (error) {
    console.error('Error fetching dashboard progress:', error);
    dashboardErrorStore.setKey('progress', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    dashboardLoadingStore.setKey('progress', false);
  }
};

// Convenience function to fetch all dashboard data
export const fetchAllDashboardData = async (): Promise<void> => {
  await Promise.all([
    fetchDashboardStats(),
    fetchDashboardActivity(5), // Fetch recent 5 activities
    fetchDashboardProgress(30, 'daily') // Fetch last 30 days
  ]);
};

// Refresh function for real-time updates
export const refreshDashboardData = async (): Promise<void> => {
  const currentActivity = dashboardActivityStore.get();
  const currentProgress = dashboardProgressStore.get();
  
  await Promise.all([
    fetchDashboardStats(),
    fetchDashboardActivity(
      currentActivity?.pagination.limit || 5,
      currentActivity?.pagination.offset || 0
    ),
    fetchDashboardProgress(
      currentProgress?.period.days || 30,
      currentProgress?.period.type || 'daily'
    )
  ]);
};