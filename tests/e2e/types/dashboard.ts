/**
 * Tipos para las pruebas E2E del dashboard
 */

export interface DashboardStats {
  totalFlashcards: number;
  studiedToday: number;
  currentStreak: number;
  totalStudyTime: number;
  averageAccuracy: number;
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyGoal: number;
  monthlyProgress: number;
  testId: string;
}

export interface DailyActivity {
  date: string;
  studied: number;
  accuracy: number;
}

export interface WeeklyProgress {
  week: string;
  studied: number;
  goal: number;
  accuracy: number;
}

export interface MonthlyProgress {
  month: string;
  studied: number;
  goal: number;
  accuracy: number;
}

export interface HeatmapData {
  date: string;
  intensity: number;
  studied: number;
}

export interface StudyProgress {
  dailyActivity: DailyActivity[];
  weeklyProgress: WeeklyProgress[];
  monthlyProgress: MonthlyProgress[];
  heatmapData: HeatmapData[];
  testId: string;
}

export interface ReviewedCard {
  id: string;
  front: string;
  back: string;
  correct: boolean;
}

export interface StudySession {
  id: string;
  date: string;
  duration: number;
  flashcardsStudied: number;
  accuracy: number;
  cardsReviewed: ReviewedCard[];
}

export interface RecentFlashcard {
  id: string;
  front: string;
  back: string;
  lastStudied: string;
  difficulty: number;
  nextReview: string;
}

export interface RecentActivity {
  recentSessions: StudySession[];
  recentFlashcards: RecentFlashcard[];
  testId: string;
}

export interface StudyGoal {
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
  currentDaily: number;
  currentWeekly: number;
  currentMonthly: number;
  streakDays: number;
  longestStreak: number;
  testId: string;
}

export interface DashboardData {
  stats: DashboardStats;
  progress: StudyProgress;
  activity: RecentActivity;
  goals: StudyGoal;
  testId: string;
}

export interface DashboardSelectors {
  // Estadísticas generales
  statsContainer: string;
  totalFlashcards: string;
  studiedToday: string;
  currentStreak: string;
  totalStudyTime: string;
  averageAccuracy: string;

  // Gráficos de progreso
  progressCharts: string;
  dailyActivityChart: string;
  weeklyProgressChart: string;
  monthlyProgressChart: string;
  studyHeatmap: string;

  // Acciones rápidas
  quickActions: string;
  createFlashcardBtn: string;
  startStudyBtn: string;
  viewProgressBtn: string;

  // Actividad reciente
  recentActivity: string;
  recentSessions: string;
  recentFlashcards: string;

  // Metas de estudio
  studyGoals: string;
  dailyGoal: string;
  weeklyGoal: string;
  monthlyGoal: string;
  progressBars: string;

  // Navegación
  navigation: string;
  dashboardNav: string;
  progressNav: string;
  settingsNav: string;
}

export interface DashboardTestContext {
  testId: string;
  userId: string;
  data: DashboardData;
  selectors: DashboardSelectors;
}