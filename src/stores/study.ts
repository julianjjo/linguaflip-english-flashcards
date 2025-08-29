import { atom, map } from 'nanostores';
import type { StudySession, StudySessionState, StudyProfile, ProgressStats } from '../types';
import { hybridStorage } from './hybridStorage';

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
export const progressStatsStore = atom<ProgressStats>({
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

// Estados de carga y error
export const studyLoadingStore = atom<boolean>(false);
export const studyErrorStore = atom<string | null>(null);
export const studySyncStatusStore = hybridStorage.getSyncStatusStore();

// Estado del usuario actual
let currentUserId: string | null = null;

// Función para establecer el usuario actual
export const setStudyUser = (userId: string) => {
  currentUserId = userId;
};

// Acciones para la sesión de estudio con integración MongoDB
export const studySessionActions = {
  // Cargar sesiones de estudio desde el almacenamiento híbrido
  async loadStudySessions(userId?: string): Promise<void> {
    const user = userId || currentUserId;
    if (!user) {
      console.warn('No user ID provided for loading study sessions');
      return;
    }

    try {
      studyLoadingStore.set(true);
      studyErrorStore.set(null);

      const sessions = await hybridStorage.getStudySessions(user);
      studyHistoryStore.set(sessions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load study sessions';
      studyErrorStore.set(errorMessage);
      console.error('Failed to load study sessions:', error);
    } finally {
      studyLoadingStore.set(false);
    }
  },

  // Cargar estadísticas de progreso
  async loadProgressStats(userId?: string): Promise<void> {
    const user = userId || currentUserId;
    if (!user) {
      console.warn('No user ID provided for loading progress stats');
      return;
    }

    try {
      studyLoadingStore.set(true);
      studyErrorStore.set(null);

      const stats = await hybridStorage.getProgressStats(user);
      progressStatsStore.set(stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load progress stats';
      studyErrorStore.set(errorMessage);
      console.error('Failed to load progress stats:', error);
    } finally {
      studyLoadingStore.set(false);
    }
  },

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

  endSession: async (userId?: string) => {
    const current = studySessionStore.get();
    if (current.isActive) {
      const user = userId || currentUserId;

      // Crear la sesión para guardar
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

      // Agregar al historial local inmediatamente
      studyHistoryStore.set([...studyHistoryStore.get(), session]);

      // Guardar en MongoDB si hay usuario
      if (user) {
        try {
          await hybridStorage.saveStudySession(user, session);
        } catch (error) {
          console.error('Failed to save study session to MongoDB:', error);
          // La sesión ya está en el historial local, así que no es un error crítico
        }
      }

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

  // Forzar sincronización de datos de estudio
  async forceSync(userId?: string): Promise<void> {
    const user = userId || currentUserId;
    if (!user) return;

    try {
      await hybridStorage.forceSync(user);
    } catch (error) {
      console.error('Failed to force sync study data:', error);
    }
  },

  // Limpiar errores
  clearError: () => {
    studyErrorStore.set(null);
  }
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