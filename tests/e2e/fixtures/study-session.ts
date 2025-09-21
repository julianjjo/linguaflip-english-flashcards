/**
 * Fixtures para datos de prueba de sesiones de estudio
 * Genera datos únicos para evitar conflictos entre pruebas
 */

export interface StudySessionData {
  sessionId: string;
  userId: string;
  flashcards: StudyFlashcard[];
  startTime: Date;
  endTime?: Date;
  currentIndex: number;
  totalCards: number;
  completedCards: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalStudyTime: number; // en segundos
  averageResponseTime: number; // en segundos
  qualityDistribution: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  settings: StudySettings;
  statistics: StudyStatistics;
  interruptions: StudyInterruption[];
}

export interface StudyFlashcard {
  cardId: string;
  front: string;
  back: string;
  audioUrl?: string;
  imageUrl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  sm2Data: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: Date;
    lastReviewed?: Date;
  };
  studyData: {
    quality?: 'again' | 'hard' | 'good' | 'easy';
    responseTime: number; // en segundos
    studiedAt: Date;
    correct: boolean;
  };
}

export interface StudySettings {
  autoplayAudio: boolean;
  showExamples: boolean;
  shuffleCards: boolean;
  studyMode: 'new' | 'review' | 'mixed';
  cardsPerSession: number;
  audioVolume: number;
  showProgress: boolean;
}

export interface StudyStatistics {
  totalSessions: number;
  totalCardsStudied: number;
  totalStudyTime: number; // en minutos
  averageAccuracy: number; // porcentaje
  streakCurrent: number;
  streakLongest: number;
  lastStudyDate?: Date;
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyGoal: number;
  monthlyProgress: number;
}

export interface StudyInterruption {
  timestamp: Date;
  reason: 'pause' | 'navigation' | 'timeout' | 'error';
  duration: number; // en segundos
  resumedAt?: Date;
}

/**
 * Genera un ID único para sesiones de estudio usando timestamp
 */
export function generateUniqueSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `studysession_${timestamp}_${random}`;
}

/**
 * Genera un ID único para flashcards de estudio
 */
export function generateUniqueStudyCardId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `studycard_${timestamp}_${random}`;
}

/**
 * Genera datos de prueba para una sesión de estudio básica
 */
export function createBasicStudySession(): StudySessionData {
  const sessionId = generateUniqueSessionId();
  const flashcards = createStudyFlashcards(10);

  return {
    sessionId,
    userId: `testuser_${Date.now()}`,
    flashcards,
    startTime: new Date(),
    currentIndex: 0,
    totalCards: flashcards.length,
    completedCards: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalStudyTime: 0,
    averageResponseTime: 0,
    qualityDistribution: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    settings: createDefaultStudySettings(),
    statistics: createDefaultStudyStatistics(),
    interruptions: [],
  };
}

/**
 * Genera datos de prueba para una sesión de estudio con audio
 */
export function createAudioStudySession(): StudySessionData {
  const sessionId = generateUniqueSessionId();
  const flashcards = createAudioStudyFlashcards(8);

  return {
    sessionId,
    userId: `testuser_${Date.now()}`,
    flashcards,
    startTime: new Date(),
    currentIndex: 0,
    totalCards: flashcards.length,
    completedCards: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalStudyTime: 0,
    averageResponseTime: 0,
    qualityDistribution: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    settings: {
      ...createDefaultStudySettings(),
      autoplayAudio: true,
      audioVolume: 0.7,
    },
    statistics: createDefaultStudyStatistics(),
    interruptions: [],
  };
}

/**
 * Genera datos de prueba para una sesión de estudio con diferentes dificultades
 */
export function createMixedDifficultySession(): StudySessionData {
  const sessionId = generateUniqueSessionId();
  const flashcards = createMixedDifficultyFlashcards(12);

  return {
    sessionId,
    userId: `testuser_${Date.now()}`,
    flashcards,
    startTime: new Date(),
    currentIndex: 0,
    totalCards: flashcards.length,
    completedCards: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalStudyTime: 0,
    averageResponseTime: 0,
    qualityDistribution: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    settings: createDefaultStudySettings(),
    statistics: createDefaultStudyStatistics(),
    interruptions: [],
  };
}

/**
 * Genera datos de prueba para una sesión de estudio interrumpida
 */
export function createInterruptedStudySession(): StudySessionData {
  const sessionId = generateUniqueSessionId();
  const flashcards = createStudyFlashcards(6);

  return {
    sessionId,
    userId: `testuser_${Date.now()}`,
    flashcards,
    startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    currentIndex: 3,
    totalCards: flashcards.length,
    completedCards: 3,
    correctAnswers: 2,
    incorrectAnswers: 1,
    totalStudyTime: 1800, // 30 minutos
    averageResponseTime: 45,
    qualityDistribution: {
      again: 1,
      hard: 1,
      good: 1,
      easy: 0,
    },
    settings: createDefaultStudySettings(),
    statistics: createDefaultStudyStatistics(),
    interruptions: [
      {
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos atrás
        reason: 'pause',
        duration: 300, // 5 minutos
        resumedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutos atrás
      },
    ],
  };
}

/**
 * Crea flashcards básicas para estudio
 */
function createStudyFlashcards(count: number): StudyFlashcard[] {
  const flashcards: StudyFlashcard[] = [];

  for (let i = 0; i < count; i++) {
    const cardId = generateUniqueStudyCardId();
    flashcards.push({
      cardId,
      front: `Front content for study card ${i + 1} - ${cardId}`,
      back: `Back content for study card ${i + 1} - ${cardId}`,
      difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
      category: `test_category_${Date.now()}_${i % 3}`,
      sm2Data: {
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      studyData: {
        responseTime: 0,
        studiedAt: new Date(),
        correct: false,
      },
    });
  }

  return flashcards;
}

/**
 * Crea flashcards con audio para estudio
 */
function createAudioStudyFlashcards(count: number): StudyFlashcard[] {
  const flashcards: StudyFlashcard[] = [];

  for (let i = 0; i < count; i++) {
    const cardId = generateUniqueStudyCardId();
    flashcards.push({
      cardId,
      front: `Audio front content for study card ${i + 1} - ${cardId}`,
      back: `Audio back content for study card ${i + 1} - ${cardId}`,
      audioUrl: `https://example.com/audio/study-audio-${i + 1}.mp3`,
      difficulty: i % 2 === 0 ? 'medium' : 'hard',
      category: `audio_category_${Date.now()}_${i % 2}`,
      sm2Data: {
        easeFactor: 2.3,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      studyData: {
        responseTime: 0,
        studiedAt: new Date(),
        correct: false,
      },
    });
  }

  return flashcards;
}

/**
 * Crea flashcards con diferentes dificultades
 */
function createMixedDifficultyFlashcards(count: number): StudyFlashcard[] {
  const flashcards: StudyFlashcard[] = [];
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  for (let i = 0; i < count; i++) {
    const cardId = generateUniqueStudyCardId();
    const difficulty = difficulties[i % difficulties.length];

    flashcards.push({
      cardId,
      front: `${difficulty.toUpperCase()} front content for study card ${i + 1} - ${cardId}`,
      back: `${difficulty.toUpperCase()} back content for study card ${i + 1} - ${cardId}`,
      difficulty,
      category: `mixed_category_${Date.now()}_${difficulty}`,
      sm2Data: {
        easeFactor: difficulty === 'easy' ? 2.6 : difficulty === 'medium' ? 2.4 : 2.2,
        interval: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 4,
        repetitions: difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2,
        nextReviewDate: new Date(Date.now() + (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 7) * 24 * 60 * 60 * 1000),
      },
      studyData: {
        responseTime: 0,
        studiedAt: new Date(),
        correct: false,
      },
    });
  }

  return flashcards;
}

/**
 * Crea configuración por defecto para estudio
 */
function createDefaultStudySettings(): StudySettings {
  return {
    autoplayAudio: false,
    showExamples: true,
    shuffleCards: false,
    studyMode: 'mixed',
    cardsPerSession: 20,
    audioVolume: 0.5,
    showProgress: true,
  };
}

/**
 * Crea estadísticas por defecto para estudio
 */
function createDefaultStudyStatistics(): StudyStatistics {
  return {
    totalSessions: 0,
    totalCardsStudied: 0,
    totalStudyTime: 0,
    averageAccuracy: 0,
    streakCurrent: 0,
    streakLongest: 0,
    weeklyGoal: 100,
    weeklyProgress: 0,
    monthlyGoal: 400,
    monthlyProgress: 0,
  };
}

/**
 * Crea datos de respuesta para diferentes calidades de recuerdo
 */
export function createQualityResponseData() {
  return {
    again: {
      quality: 'again' as const,
      expectedInterval: 1, // minutos
      easeFactorChange: -0.2,
      description: 'Completamente olvidado - necesita más práctica',
    },
    hard: {
      quality: 'hard' as const,
      expectedInterval: 6, // minutos
      easeFactorChange: -0.15,
      description: 'Difícil de recordar - necesita más repetición',
    },
    good: {
      quality: 'good' as const,
      expectedInterval: 24 * 60, // 1 día en minutos
      easeFactorChange: 0,
      description: 'Recordado correctamente - intervalo normal',
    },
    easy: {
      quality: 'easy' as const,
      expectedInterval: 4 * 24 * 60, // 4 días en minutos
      easeFactorChange: 0.15,
      description: 'Muy fácil de recordar - aumentar intervalo',
    },
  };
}

/**
 * Crea datos de prueba para diferentes dispositivos
 */
export function createDeviceTestData() {
  return {
    desktop: {
      viewport: { width: 1200, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      deviceScaleFactor: 1,
    },
    mobile: {
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceScaleFactor: 2,
    },
    tablet: {
      viewport: { width: 768, height: 1024 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceScaleFactor: 2,
    },
  };
}