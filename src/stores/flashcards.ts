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

// Acciones para flashcards
export const flashcardsActions = {
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

  deleteFlashcard: (id: number) => {
    const current = flashcardsStore.get();
    const filtered = current.filter(card => card.id !== id);
    flashcardsStore.set(filtered);
  },

  setCurrentCard: (card: FlashcardData | null) => {
    currentCardStore.set(card);
  },
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