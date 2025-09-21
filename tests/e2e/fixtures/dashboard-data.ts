import type { DashboardStats, StudyProgress, RecentActivity, StudyGoal } from '../types/dashboard';

/**
 * Datos de prueba únicos para evitar conflictos entre pruebas
 * Cada conjunto de datos tiene un ID único basado en timestamp
 */
const timestamp = Date.now();
const testSuffix = `test_${timestamp}`;

// Estadísticas generales del dashboard
export const mockDashboardStats: DashboardStats = {
  totalFlashcards: 150,
  studiedToday: 25,
  currentStreak: 7,
  totalStudyTime: 1247, // minutos
  averageAccuracy: 87.5,
  weeklyGoal: 100,
  weeklyProgress: 68,
  monthlyGoal: 400,
  monthlyProgress: 245,
  testId: testSuffix
};

// Datos de progreso para gráficos
export const mockStudyProgress: StudyProgress = {
  dailyActivity: [
    { date: '2024-01-15', studied: 12, accuracy: 85 },
    { date: '2024-01-16', studied: 18, accuracy: 92 },
    { date: '2024-01-17', studied: 8, accuracy: 78 },
    { date: '2024-01-18', studied: 22, accuracy: 88 },
    { date: '2024-01-19', studied: 15, accuracy: 91 },
    { date: '2024-01-20', studied: 20, accuracy: 86 },
    { date: '2024-01-21', studied: 25, accuracy: 89 }
  ],
  weeklyProgress: [
    { week: 'Sem 1', studied: 95, goal: 100, accuracy: 87 },
    { week: 'Sem 2', studied: 112, goal: 100, accuracy: 91 },
    { week: 'Sem 3', studied: 89, goal: 100, accuracy: 84 },
    { week: 'Sem 4', studied: 68, goal: 100, accuracy: 88 }
  ],
  monthlyProgress: [
    { month: 'Ene', studied: 387, goal: 400, accuracy: 86 },
    { month: 'Feb', studied: 421, goal: 400, accuracy: 89 },
    { month: 'Mar', studied: 398, goal: 400, accuracy: 87 }
  ],
  heatmapData: [
    { date: '2024-01-15', intensity: 3, studied: 12 },
    { date: '2024-01-16', intensity: 4, studied: 18 },
    { date: '2024-01-17', intensity: 2, studied: 8 },
    { date: '2024-01-18', intensity: 5, studied: 22 },
    { date: '2024-01-19', intensity: 3, studied: 15 },
    { date: '2024-01-20', intensity: 4, studied: 20 },
    { date: '2024-01-21', intensity: 5, studied: 25 }
  ],
  testId: testSuffix
};

// Actividad reciente
export const mockRecentActivity: RecentActivity = {
  recentSessions: [
    {
      id: `session_${testSuffix}_1`,
      date: '2024-01-21T10:30:00Z',
      duration: 25, // minutos
      flashcardsStudied: 25,
      accuracy: 89,
      cardsReviewed: [
        { id: `card_${testSuffix}_1`, front: 'Hello', back: 'Hola', correct: true },
        { id: `card_${testSuffix}_2`, front: 'Goodbye', back: 'Adiós', correct: true },
        { id: `card_${testSuffix}_3`, front: 'Thank you', back: 'Gracias', correct: false }
      ]
    },
    {
      id: `session_${testSuffix}_2`,
      date: '2024-01-20T16:45:00Z',
      duration: 18,
      flashcardsStudied: 20,
      accuracy: 86,
      cardsReviewed: [
        { id: `card_${testSuffix}_4`, front: 'Please', back: 'Por favor', correct: true },
        { id: `card_${testSuffix}_5`, front: 'Sorry', back: 'Lo siento', correct: true }
      ]
    }
  ],
  recentFlashcards: [
    {
      id: `card_${testSuffix}_1`,
      front: 'Hello',
      back: 'Hola',
      lastStudied: '2024-01-21T10:30:00Z',
      difficulty: 2.5,
      nextReview: '2024-01-23T10:30:00Z'
    },
    {
      id: `card_${testSuffix}_2`,
      front: 'Goodbye',
      back: 'Adiós',
      lastStudied: '2024-01-21T10:32:00Z',
      difficulty: 1.8,
      nextReview: '2024-01-24T10:32:00Z'
    }
  ],
  testId: testSuffix
};

// Metas de estudio
export const mockStudyGoals: StudyGoal = {
  dailyGoal: 20,
  weeklyGoal: 100,
  monthlyGoal: 400,
  currentDaily: 25,
  currentWeekly: 68,
  currentMonthly: 245,
  streakDays: 7,
  longestStreak: 12,
  testId: testSuffix
};

// Datos para diferentes estados de prueba
export const emptyDashboardData = {
  stats: { ...mockDashboardStats, totalFlashcards: 0, studiedToday: 0, currentStreak: 0 },
  progress: { ...mockStudyProgress, dailyActivity: [], weeklyProgress: [], monthlyProgress: [] },
  activity: { ...mockRecentActivity, recentSessions: [], recentFlashcards: [] },
  goals: { ...mockStudyGoals, dailyGoal: 0, weeklyGoal: 0, monthlyGoal: 0 },
  testId: `${testSuffix}_empty`
};

export const minimalDashboardData = {
  stats: { ...mockDashboardStats, totalFlashcards: 5, studiedToday: 2, currentStreak: 1 },
  progress: {
    ...mockStudyProgress,
    dailyActivity: [{ date: '2024-01-21', studied: 2, accuracy: 75 }],
    weeklyProgress: [{ week: 'Sem 1', studied: 2, goal: 10, accuracy: 75 }],
    monthlyProgress: [{ month: 'Ene', studied: 2, goal: 50, accuracy: 75 }]
  },
  activity: {
    ...mockRecentActivity,
    recentSessions: [{
      id: `session_${testSuffix}_min_1`,
      date: '2024-01-21T09:00:00Z',
      duration: 5,
      flashcardsStudied: 2,
      accuracy: 75,
      cardsReviewed: [
        { id: `card_${testSuffix}_min_1`, front: 'Hi', back: 'Hola', correct: true },
        { id: `card_${testSuffix}_min_2`, front: 'Bye', back: 'Adiós', correct: false }
      ]
    }]
  },
  goals: { ...mockStudyGoals, dailyGoal: 5, weeklyGoal: 25, monthlyGoal: 100 },
  testId: `${testSuffix}_minimal`
};

export const largeDashboardData = {
  stats: { ...mockDashboardStats, totalFlashcards: 500, studiedToday: 75, currentStreak: 30 },
  progress: {
    ...mockStudyProgress,
    dailyActivity: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      studied: Math.floor(Math.random() * 50) + 10,
      accuracy: Math.floor(Math.random() * 20) + 75
    })),
    weeklyProgress: Array.from({ length: 12 }, (_, i) => ({
      week: `Sem ${i + 1}`,
      studied: Math.floor(Math.random() * 200) + 50,
      goal: 100,
      accuracy: Math.floor(Math.random() * 15) + 80
    })),
    monthlyProgress: Array.from({ length: 6 }, (_, i) => ({
      month: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'][i],
      studied: Math.floor(Math.random() * 300) + 200,
      goal: 400,
      accuracy: Math.floor(Math.random() * 10) + 85
    }))
  },
  activity: {
    ...mockRecentActivity,
    recentSessions: Array.from({ length: 20 }, (_, i) => ({
      id: `session_${testSuffix}_large_${i}`,
      date: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      duration: Math.floor(Math.random() * 60) + 10,
      flashcardsStudied: Math.floor(Math.random() * 30) + 5,
      accuracy: Math.floor(Math.random() * 25) + 70,
      cardsReviewed: []
    }))
  },
  goals: { ...mockStudyGoals, dailyGoal: 50, weeklyGoal: 300, monthlyGoal: 1200 },
  testId: `${testSuffix}_large`
};

// Función para limpiar datos de prueba
export const cleanupTestData = async (testId: string) => {
  // Esta función se puede usar para limpiar datos específicos de prueba
  // después de que las pruebas terminen
  console.log(`Cleaning up test data for: ${testId}`);
};