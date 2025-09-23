import type { FlashcardData } from './types';
import type {
  StudyModeConfig,
  DifficultyFilter,
  SessionControls,
  AudioSettings,
  VisualSettings,
  NotificationSettings,
  StudyGoals,
  StudyPreset,
  DifficultyLevel,
} from './types';

// Base flashcard data without SRS properties. These will be added during initialization.
export const INITIAL_FLASHCARDS_DATA: Omit<
  FlashcardData,
  'dueDate' | 'interval' | 'easinessFactor' | 'repetitions' | 'lastReviewed'
>[] = [
  {
    id: 1,
    english: 'Hello',
    spanish: 'Hola',
    exampleEnglish: 'Hello, how are you?',
    exampleSpanish: 'Hola, ¿cómo estás?',
    image: 'https://picsum.photos/320/180?random=1',
  },
  {
    id: 2,
    english: 'Goodbye',
    spanish: 'Adiós',
    exampleEnglish: 'Goodbye, see you later.',
    exampleSpanish: 'Adiós, hasta luego.',
    image: 'https://picsum.photos/320/180?random=2',
  },
  {
    id: 3,
    english: 'Thank you',
    spanish: 'Gracias',
    exampleEnglish: 'Thank you for your help.',
    exampleSpanish: 'Gracias por tu ayuda.',
    image: 'https://picsum.photos/320/180?random=3',
  },
  {
    id: 4,
    english: 'Please',
    spanish: 'Por favor',
    exampleEnglish: 'Can you help me, please?',
    exampleSpanish: '¿Puedes ayudarme, por favor?',
    image: 'https://picsum.photos/320/180?random=4',
  },
  {
    id: 5,
    english: 'Yes',
    spanish: 'Sí',
    exampleEnglish: 'Yes, I understand.',
    exampleSpanish: 'Sí, entiendo.',
    image: 'https://picsum.photos/320/180?random=5',
  },
  {
    id: 6,
    english: 'No',
    spanish: 'No',
    exampleEnglish: "No, I don't want that.",
    exampleSpanish: 'No, no quiero eso.',
    image: 'https://picsum.photos/320/180?random=6',
  },
  {
    id: 7,
    english: 'Water',
    spanish: 'Agua',
    exampleEnglish: 'I would like a glass of water.',
    exampleSpanish: 'Quisiera un vaso de agua.',
    image: 'https://picsum.photos/320/180?random=7',
  },
  {
    id: 8,
    english: 'Food',
    spanish: 'Comida',
    exampleEnglish: 'The food is delicious.',
    exampleSpanish: 'La comida está deliciosa.',
    image: 'https://picsum.photos/320/180?random=8',
  },
  {
    id: 9,
    english: 'House',
    spanish: 'Casa',
    exampleEnglish: 'This is my house.',
    exampleSpanish: 'Esta es mi casa.',
    image: 'https://picsum.photos/320/180?random=9',
  },
  {
    id: 10,
    english: 'Friend',
    spanish: 'Amigo/Amiga',
    exampleEnglish: 'He is my best friend.',
    exampleSpanish: 'Él es mi mejor amigo.',
    image: 'https://picsum.photos/320/180?random=10',
  },
  {
    id: 11,
    english: 'Learn',
    spanish: 'Aprender',
    exampleEnglish: 'I want to learn English.',
    exampleSpanish: 'Quiero aprender inglés.',
    image: 'https://picsum.photos/320/180?random=11',
  },
  {
    id: 12,
    english: 'Speak',
    spanish: 'Hablar',
    exampleEnglish: 'Can you speak Spanish?',
    exampleSpanish: '¿Puedes hablar español?',
    image: 'https://picsum.photos/320/180?random=12',
  },
  {
    id: 13,
    english: 'Read',
    spanish: 'Leer',
    exampleEnglish: 'I like to read books.',
    exampleSpanish: 'Me gusta leer libros.',
    image: 'https://picsum.photos/320/180?random=13',
  },
  {
    id: 14,
    english: 'Write',
    spanish: 'Escribir',
    exampleEnglish: 'She writes beautiful poems.',
    exampleSpanish: 'Ella escribe hermosos poemas.',
    image: 'https://picsum.photos/320/180?random=14',
  },
  {
    id: 15,
    english: 'Today',
    spanish: 'Hoy',
    exampleEnglish: 'Today is a sunny day.',
    exampleSpanish: 'Hoy es un día soleado.',
    image: 'https://picsum.photos/320/180?random=15',
  },
];

export const DEFAULT_EASINESS_FACTOR = 2.5;
export const MIN_EASINESS_FACTOR = 1.3;
export const LEARNING_STEPS_DAYS = [1, 6]; // Initial intervals for first few repetitions

// Study Session Customization Constants
export const DEFAULT_STUDY_MODE: StudyModeConfig = {
  mode: 'mixed',
  customRatios: {
    reviewCards: 70,
    newCards: 20,
    difficultCards: 10,
  },
};

export const DEFAULT_DIFFICULTY_FILTER: DifficultyFilter = {
  enabled: false,
  levels: ['easy', 'medium', 'hard'],
  focusRecentCards: false,
  recentDaysThreshold: 7,
  prioritizeDueCards: true,
  excludeMasteredCards: false,
};

export const DEFAULT_SESSION_CONTROLS: SessionControls = {
  dailyCardLimit: 25,
  sessionDuration: 30,
  breakInterval: 10,
  breakDuration: 30,
  enablePauseResume: true,
  autoSaveProgress: true,
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  speed: 1.0,
  voice: 'default',
  autoPlay: false,
  volume: 80,
  enableBackgroundMusic: false,
};

export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  cardSize: 'medium',
  fontSize: 'medium',
  theme: 'light',
  showProgressBar: true,
  showCardCounter: true,
  enableAnimations: true,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enableBreakReminders: true,
  enableSessionComplete: true,
  enableDailyGoal: true,
  enableStreakReminders: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

export const DEFAULT_STUDY_GOALS: StudyGoals = {
  dailyCardGoal: 25,
  weeklyCardGoal: 150,
  monthlyCardGoal: 600,
  accuracyTarget: 80,
  streakTarget: 7,
};

// Study Presets
export const STUDY_PRESETS: StudyPreset[] = [
  {
    id: 'beginner-daily',
    name: 'Beginner Daily',
    description: 'Perfect for starting your language learning journey',
    icon: '🌱',
    category: 'beginner',
    config: {
      studyMode: {
        mode: 'mixed',
        customRatios: { reviewCards: 50, newCards: 40, difficultCards: 10 },
      },
      difficultyFilter: {
        ...DEFAULT_DIFFICULTY_FILTER,
        levels: ['easy', 'medium'],
      },
      sessionControls: {
        ...DEFAULT_SESSION_CONTROLS,
        dailyCardLimit: 10,
        sessionDuration: 15,
      },
      audioSettings: { ...DEFAULT_AUDIO_SETTINGS, autoPlay: true, speed: 0.75 },
      visualSettings: DEFAULT_VISUAL_SETTINGS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      studyGoals: {
        ...DEFAULT_STUDY_GOALS,
        dailyCardGoal: 10,
        accuracyTarget: 70,
      },
    },
  },
  {
    id: 'intensive-study',
    name: 'Intensive Study',
    description: 'High-volume learning for dedicated students',
    icon: '⚡',
    category: 'intensive',
    config: {
      studyMode: {
        mode: 'mixed',
        customRatios: { reviewCards: 60, newCards: 30, difficultCards: 10 },
      },
      difficultyFilter: DEFAULT_DIFFICULTY_FILTER,
      sessionControls: {
        ...DEFAULT_SESSION_CONTROLS,
        dailyCardLimit: 100,
        sessionDuration: 60,
        breakInterval: 15,
      },
      audioSettings: DEFAULT_AUDIO_SETTINGS,
      visualSettings: DEFAULT_VISUAL_SETTINGS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      studyGoals: {
        ...DEFAULT_STUDY_GOALS,
        dailyCardGoal: 100,
        weeklyCardGoal: 500,
      },
    },
  },
  {
    id: 'review-focused',
    name: 'Review Focused',
    description: 'Strengthen your existing knowledge',
    icon: '🔄',
    category: 'review',
    config: {
      studyMode: { mode: 'review-only' },
      difficultyFilter: {
        ...DEFAULT_DIFFICULTY_FILTER,
        excludeMasteredCards: true,
      },
      sessionControls: { ...DEFAULT_SESSION_CONTROLS, dailyCardLimit: 50 },
      audioSettings: DEFAULT_AUDIO_SETTINGS,
      visualSettings: DEFAULT_VISUAL_SETTINGS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      studyGoals: { ...DEFAULT_STUDY_GOALS, dailyCardGoal: 50 },
    },
  },
  {
    id: 'difficult-cards',
    name: 'Challenge Mode',
    description: 'Focus on cards that need the most attention',
    icon: '💪',
    category: 'advanced',
    config: {
      studyMode: { mode: 'difficult-cards' },
      difficultyFilter: {
        ...DEFAULT_DIFFICULTY_FILTER,
        levels: ['hard'],
        prioritizeDueCards: true,
      },
      sessionControls: {
        ...DEFAULT_SESSION_CONTROLS,
        dailyCardLimit: 25,
        sessionDuration: 45,
      },
      audioSettings: { ...DEFAULT_AUDIO_SETTINGS, speed: 0.75 },
      visualSettings: DEFAULT_VISUAL_SETTINGS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      studyGoals: { ...DEFAULT_STUDY_GOALS, accuracyTarget: 90 },
    },
  },
  {
    id: 'quick-review',
    name: 'Quick Review',
    description: 'Short sessions for maintaining knowledge',
    icon: '⚡',
    category: 'intermediate',
    config: {
      studyMode: { mode: 'review-only' },
      difficultyFilter: DEFAULT_DIFFICULTY_FILTER,
      sessionControls: {
        ...DEFAULT_SESSION_CONTROLS,
        dailyCardLimit: 10,
        sessionDuration: 15,
        breakInterval: 0,
      },
      audioSettings: DEFAULT_AUDIO_SETTINGS,
      visualSettings: DEFAULT_VISUAL_SETTINGS,
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enableBreakReminders: false,
      },
      studyGoals: { ...DEFAULT_STUDY_GOALS, dailyCardGoal: 10 },
    },
  },
];

// Helper function to get difficulty level based on easiness factor
export const getDifficultyLevel = (easinessFactor: number): DifficultyLevel => {
  if (easinessFactor >= 2.5) return 'easy';
  if (easinessFactor >= 2.0) return 'medium';
  return 'hard';
};

// Helper function to check if card is mastered
export const isCardMastered = (
  repetitions: number,
  easinessFactor: number
): boolean => {
  return repetitions >= 5 && easinessFactor >= 2.5;
};
