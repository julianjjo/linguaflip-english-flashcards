import { atom, map } from 'nanostores';
import type { StudySession, StudySessionState, StudyProfile } from '../types';

// Estado de la sesión de estudio actual
export const studySessionStore = map<StudySessionState>({
  isActive: false,
  isPaused: false,
  startTime: null,
  pauseTime: null,
  totalPausedTime: 0,
  cardsStudied: 0,
  correctAnswers: 0,
  currentBreakTime: 0,
  nextBreakTime: 0,
});

// Historial de sesiones de estudio
export const studyHistoryStore = atom<StudySession[]>([]);

// Perfil de estudio actual
export const currentProfileStore = atom<StudyProfile | null>(null);

// Estadísticas de progreso
export const progressStatsStore = atom({
  totalCards: 0,
  cardsMastered: 0,
  cardsInProgress: 0,
  cardsNew: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalStudyTime: 0,
  averageAccuracy: 0,
  studySessionsToday: 0,
  studySessionsThisWeek: 0,
  studySessionsThisMonth: 0,
});

// Acciones para la sesión de estudio
export const studySessionActions = {
  startSession: () => {
    const now = new Date();
    studySessionStore.set({
      isActive: true,
      isPaused: false,
      startTime: now,
      pauseTime: null,
      totalPausedTime: 0,
      cardsStudied: 0,
      correctAnswers: 0,
      currentBreakTime: 0,
      nextBreakTime: 0,
    });
  },

  pauseSession: () => {
    const current = studySessionStore.get();
    if (current.isActive && !current.isPaused) {
      const now = new Date();
      studySessionStore.set({
        ...current,
        isPaused: true,
        pauseTime: now,
      });
    }
  },

  resumeSession: () => {
    const current = studySessionStore.get();
    if (current.isActive && current.isPaused && current.pauseTime) {
      const pausedTime = Date.now() - current.pauseTime.getTime();
      studySessionStore.set({
        ...current,
        isPaused: false,
        pauseTime: null,
        totalPausedTime: current.totalPausedTime + Math.floor(pausedTime / 1000),
      });
    }
  },

  endSession: () => {
    const current = studySessionStore.get();
    if (current.isActive) {
      // Aquí se guardaría la sesión en el historial
      const session: StudySession = {
        id: `session_${Date.now()}`,
        date: new Date().toISOString(),
        cardsReviewed: current.cardsStudied,
        correctAnswers: current.correctAnswers,
        totalTime: current.startTime
          ? Math.floor((Date.now() - current.startTime.getTime() - current.totalPausedTime * 1000) / 1000)
          : 0,
        averageResponseTime: 0, // Calcular basado en datos reales
      };

      studyHistoryStore.set([...studyHistoryStore.get(), session]);

      // Reset session state
      studySessionStore.set({
        isActive: false,
        isPaused: false,
        startTime: null,
        pauseTime: null,
        totalPausedTime: 0,
        cardsStudied: 0,
        correctAnswers: 0,
        currentBreakTime: 0,
        nextBreakTime: 0,
      });
    }
  },

  recordAnswer: (correct: boolean) => {
    const current = studySessionStore.get();
    studySessionStore.set({
      ...current,
      cardsStudied: current.cardsStudied + 1,
      correctAnswers: current.correctAnswers + (correct ? 1 : 0),
    });
  },
};

// Acciones para perfiles de estudio
export const profileActions = {
  setCurrentProfile: (profile: StudyProfile) => {
    currentProfileStore.set(profile);
  },

  updateProfile: (updates: Partial<StudyProfile>) => {
    const current = currentProfileStore.get();
    if (current) {
      currentProfileStore.set({
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }
  },
};