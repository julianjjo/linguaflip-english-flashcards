export interface FlashcardData {
  id: number;
  english: string;
  spanish: string;
  exampleEnglish?: string;
  exampleSpanish?: string;
  image?: string;
  // Spaced Repetition System (SRS) fields
  dueDate: string; // ISO date string (YYYY-MM-DD)
  interval: number; // Interval in days
  easinessFactor: number; // Factor to modulate interval increases
  repetitions: number; // Number of successful recalls in a row
  lastReviewed: string | null; // ISO date string of last review
}

// Progress Tracking Types
export interface StudySession {
  id: string;
  date: string; // ISO date string
  cardsReviewed: number;
  correctAnswers: number;
  totalTime: number; // in seconds
  averageResponseTime: number; // in seconds
}

export interface ProgressStats {
  totalCards: number;
  cardsMastered: number; // cards with high repetitions
  cardsInProgress: number; // cards with some repetitions but not mastered
  cardsNew: number; // cards never reviewed
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number; // in minutes
  averageAccuracy: number;
  studySessionsToday: number;
  studySessionsThisWeek: number;
  studySessionsThisMonth: number;
}

export interface LearningAnalytics {
  retentionRate: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  studyPattern: {
    mostProductiveHour: number;
    mostProductiveDay: string;
    averageSessionLength: number;
  };
  performanceTrends: {
    accuracyTrend: number[];
    cardsLearnedTrend: number[];
    studyTimeTrend: number[];
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number; // 0-100
  target: number;
  current: number;
}

export interface DeckProgress {
  id: string;
  name: string;
  totalCards: number;
  completedCards: number;
  progress: number; // 0-100
  lastStudied: string | null;
  averageAccuracy: number;
}

// Study Session Customization Types
export type StudyMode =
  | 'review-only'
  | 'new-cards-only'
  | 'mixed'
  | 'difficult-cards'
  | 'custom';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type CardLimit = 10 | 25 | 50 | 100;

export type SessionDuration = 15 | 30 | 45 | 60;

export interface StudyModeConfig {
  mode: StudyMode;
  customRatios?: {
    reviewCards: number; // percentage 0-100
    newCards: number; // percentage 0-100
    difficultCards: number; // percentage 0-100
  };
}

export interface DifficultyFilter {
  enabled: boolean;
  levels: DifficultyLevel[];
  focusRecentCards: boolean;
  recentDaysThreshold: number; // days
  prioritizeDueCards: boolean;
  excludeMasteredCards: boolean;
}

export interface SessionControls {
  dailyCardLimit: CardLimit;
  sessionDuration: SessionDuration; // minutes
  breakInterval: number; // minutes between breaks
  breakDuration: number; // seconds for break reminders
  enablePauseResume: boolean;
  autoSaveProgress: boolean;
}

export interface AudioSettings {
  speed: 0.5 | 0.75 | 1.0 | 1.25 | 1.5;
  voice: 'default' | 'male' | 'female';
  autoPlay: boolean;
  volume: number; // 0-100
  enableBackgroundMusic: boolean;
}

export interface VisualSettings {
  cardSize: 'small' | 'medium' | 'large';
  fontSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
  showProgressBar: boolean;
  showCardCounter: boolean;
  enableAnimations: boolean;
}

export interface NotificationSettings {
  enableBreakReminders: boolean;
  enableSessionComplete: boolean;
  enableDailyGoal: boolean;
  enableStreakReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface StudyGoals {
  dailyCardGoal: number;
  weeklyCardGoal: number;
  monthlyCardGoal: number;
  accuracyTarget: number; // percentage 0-100
  streakTarget: number; // days
}

export interface StudyProfile {
  id: string;
  name: string;
  description?: string;
  studyMode: StudyModeConfig;
  difficultyFilter: DifficultyFilter;
  sessionControls: SessionControls;
  audioSettings: AudioSettings;
  visualSettings: VisualSettings;
  notificationSettings: NotificationSettings;
  studyGoals: StudyGoals;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

export interface StudySessionState {
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pauseTime: Date | null;
  totalPausedTime: number; // seconds
  cardsStudied: number;
  correctAnswers: number;
  currentBreakTime: number; // seconds remaining in current break
  nextBreakTime: number; // minutes until next break
}

export interface StudySessionStats {
  sessionId: string;
  profileId: string;
  startTime: Date;
  endTime: Date | null;
  cardsStudied: number;
  correctAnswers: number;
  totalTime: number; // seconds
  pausedTime: number; // seconds
  breaksTaken: number;
  averageResponseTime: number; // seconds
  difficulty: DifficultyLevel;
  mode: StudyMode;
}

// Preset configurations for quick setup
export interface StudyPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'review' | 'intensive';
  config: Omit<
    StudyProfile,
    'id' | 'name' | 'description' | 'createdAt' | 'updatedAt' | 'isDefault'
  >;
}
