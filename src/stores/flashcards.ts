import { atom, map } from 'nanostores';
import type { FlashcardData } from '../types';

// Estado global de flashcards
export const flashcardsStore = atom<FlashcardData[]>([]);

// Estado de la flashcard actual
export const currentCardStore = atom<FlashcardData | null>(null);

// Estado de navegación
export const navigationStore = map({
  currentView: 'study' as 'study' | 'dashboard' | 'progress' | 'settings',
  previousView: null as string | null,
});

// Estado de carga y sincronización
export const flashcardsLoadingStore = atom<boolean>(false);
export const flashcardsErrorStore = atom<string | null>(null);

// Lazy-loaded hybrid storage (client-side only)
let hybridStorageInstance: any = null;
let syncStatusStore: any = null;

const getHybridStorage = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!hybridStorageInstance) {
    const { hybridStorage } = await import('./hybridStorage');
    hybridStorageInstance = hybridStorage;
    syncStatusStore = hybridStorage.getSyncStatusStore();
  }

  return hybridStorageInstance;
};

export const getSyncStatusStore = () => {
  return syncStatusStore;
};

// Estado del usuario actual (necesario para MongoDB)
let currentUserId: string | null = null;

// Función para establecer el usuario actual
export const setCurrentUser = (userId: string) => {
  currentUserId = userId;
};

// Acciones para flashcards con integración MongoDB
export const flashcardsActions = {
  // Cargar flashcards desde el almacenamiento híbrido
  async loadFlashcards(userId?: string): Promise<void> {
    const user = userId || currentUserId;
    if (!user) {
      console.warn('No user ID provided for loading flashcards');
      return;
    }

    try {
      flashcardsLoadingStore.set(true);
      flashcardsErrorStore.set(null);

      const hybridStorage = await getHybridStorage();
      if (!hybridStorage) {
        console.warn('Hybrid storage not available (server-side)');
        return;
      }

      const flashcards = await hybridStorage.getFlashcards(user);
      flashcardsStore.set(flashcards);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load flashcards';
      flashcardsErrorStore.set(errorMessage);
      console.error('Failed to load flashcards:', error);
    } finally {
      flashcardsLoadingStore.set(false);
    }
  },

  // Guardar flashcard con sincronización MongoDB
  async saveFlashcard(flashcard: FlashcardData, userId?: string): Promise<void> {
    const user = userId || currentUserId;
    if (!user) {
      console.warn('No user ID provided for saving flashcard');
      // Fallback to local storage only
      flashcardsStore.set([...flashcardsStore.get(), flashcard]);
      return;
    }

    try {
      flashcardsLoadingStore.set(true);
      flashcardsErrorStore.set(null);

      const hybridStorage = await getHybridStorage();
      if (hybridStorage) {
        await hybridStorage.saveFlashcard(user, flashcard);
      }

      // Actualizar el store local inmediatamente para UI responsiva
      const current = flashcardsStore.get();
      const existingIndex = current.findIndex(card => card.id === flashcard.id);

      if (existingIndex >= 0) {
        // Actualizar existente
        const updated = [...current];
        updated[existingIndex] = flashcard;
        flashcardsStore.set(updated);
      } else {
        // Agregar nuevo
        flashcardsStore.set([...current, flashcard]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save flashcard';
      flashcardsErrorStore.set(errorMessage);
      console.error('Failed to save flashcard:', error);

      // Fallback: actualizar localmente
      const current = flashcardsStore.get();
      const existingIndex = current.findIndex(card => card.id === flashcard.id);

      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = flashcard;
        flashcardsStore.set(updated);
      } else {
        flashcardsStore.set([...current, flashcard]);
      }
    } finally {
      flashcardsLoadingStore.set(false);
    }
  },

  // Eliminar flashcard con sincronización MongoDB
  async deleteFlashcard(id: number, userId?: string): Promise<void> {
    const user = userId || currentUserId;
    if (!user) {
      console.warn('No user ID provided for deleting flashcard');
      // Fallback to local storage only
      const current = flashcardsStore.get();
      const filtered = current.filter(card => card.id !== id);
      flashcardsStore.set(filtered);
      return;
    }

    try {
      flashcardsLoadingStore.set(true);
      flashcardsErrorStore.set(null);

      const hybridStorage = await getHybridStorage();
      if (hybridStorage) {
        await hybridStorage.deleteFlashcard(user, id);
      }

      // Actualizar el store local
      const current = flashcardsStore.get();
      const filtered = current.filter(card => card.id !== id);
      flashcardsStore.set(filtered);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete flashcard';
      flashcardsErrorStore.set(errorMessage);
      console.error('Failed to delete flashcard:', error);

      // Fallback: eliminar localmente
      const current = flashcardsStore.get();
      const filtered = current.filter(card => card.id !== id);
      flashcardsStore.set(filtered);
    } finally {
      flashcardsLoadingStore.set(false);
    }
  },

  // Métodos de compatibilidad hacia atrás
  setFlashcards: (flashcards: FlashcardData[]) => {
    flashcardsStore.set(flashcards);
  },

  addFlashcard: (flashcard: FlashcardData) => {
    flashcardsStore.set([...flashcardsStore.get(), flashcard]);
  },

  updateFlashcard: (id: number, updates: Partial<FlashcardData>) => {
    const current = flashcardsStore.get();
    const updated = current.map(card =>
      card.id === id ? { ...card, ...updates } : card
    );
    flashcardsStore.set(updated);
  },

  deleteFlashcardLocal: (id: number) => {
    const current = flashcardsStore.get();
    const filtered = current.filter(card => card.id !== id);
    flashcardsStore.set(filtered);
  },

  setCurrentCard: (card: FlashcardData | null) => {
    currentCardStore.set(card);
  },

  // Forzar sincronización
  async forceSync(userId?: string): Promise<void> {
    const user = userId || currentUserId;
    if (!user) return;

    try {
      const hybridStorage = await getHybridStorage();
      if (hybridStorage) {
        await hybridStorage.forceSync(user);
      }
    } catch (error) {
      console.error('Failed to force sync:', error);
    }
  },

  // Limpiar errores
  clearError: () => {
    flashcardsErrorStore.set(null);
  }
};

// Acciones para navegación
export const navigationActions = {
  navigate: (view: 'study' | 'dashboard' | 'progress' | 'settings') => {
    const current = navigationStore.get();
    navigationStore.set({
      currentView: view,
      previousView: current.currentView,
    });
  },

  goBack: () => {
    const current = navigationStore.get();
    if (current.previousView) {
      navigationStore.set({
        currentView: current.previousView as any,
        previousView: null,
      });
    }
  },
};