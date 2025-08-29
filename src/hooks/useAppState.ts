import { useStore } from '@nanostores/react';
import { flashcardsStore, flashcardsActions } from '../stores/flashcards.js';
import { studyHistoryStore, studySessionStore, studySessionActions } from '../stores/study.js';
import { FlashcardData } from '../types/index.js';
import { INITIAL_FLASHCARDS_DATA, DEFAULT_EASINESS_FACTOR } from '../../constants.js';

export const useAppState = () => {
  const allCards = useStore(flashcardsStore);
  const studyHistory = useStore(studyHistoryStore);
  const studySession = useStore(studySessionStore);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // Initialize cards from localStorage if not already loaded
  const initializeCards = () => {
    if (allCards.length === 0) {
      let storedCards = null;
      try {
        const storedCardsString = localStorage.getItem('linguaFlipCards');
        if (storedCardsString) {
          storedCards = JSON.parse(storedCardsString) as FlashcardData[];
        }
      } catch (error) {
        console.error("Failed to parse cards from localStorage:", error);
        localStorage.removeItem('linguaFlipCards');
      }

      if (storedCards && storedCards.length > 0) {
        const migratedCards = storedCards.map(card => ({
          ...card,
          dueDate: card.dueDate || getTodayDateString(),
          interval: card.interval === undefined ? 0 : card.interval,
          easinessFactor: card.easinessFactor || DEFAULT_EASINESS_FACTOR,
          repetitions: card.repetitions === undefined ? 0 : card.repetitions,
          lastReviewed: card.lastReviewed || null,
          image: card.image || `https://picsum.photos/320/180?random=${card.id}`
        }));
        flashcardsActions.setFlashcards(migratedCards);
      } else {
        const today = getTodayDateString();
        const initialCards = INITIAL_FLASHCARDS_DATA.map(card => ({
          ...card,
          dueDate: today,
          interval: 0,
          easinessFactor: DEFAULT_EASINESS_FACTOR,
          repetitions: 0,
          lastReviewed: null,
          image: card.image || `https://picsum.photos/320/180?random=${card.id}`
        }));
        flashcardsActions.setFlashcards(initialCards);
        localStorage.setItem('linguaFlipCards', JSON.stringify(initialCards));
      }
    }
  };

  const updateCards = (newCards: FlashcardData[]) => {
    flashcardsActions.setFlashcards(newCards);
    localStorage.setItem('linguaFlipCards', JSON.stringify(newCards));
  };

  const addCards = (newCards: FlashcardData[]) => {
    const updatedCards = [...allCards, ...newCards];
    updateCards(updatedCards);
  };

  const updateCard = (updatedCard: FlashcardData) => {
    flashcardsActions.updateFlashcard(updatedCard.id, updatedCard);
    const updatedCards = allCards.map((c: FlashcardData) => c.id === updatedCard.id ? updatedCard : c);
    localStorage.setItem('linguaFlipCards', JSON.stringify(updatedCards));
  };

  return {
    // State
    allCards,
    studyHistory,
    studySession,
    isLoading: allCards.length === 0,

    // Actions
    initializeCards,
    updateCards,
    addCards,
    updateCard,
    getTodayDateString,

    // Study session actions
    startStudySession: studySessionActions.startSession,
    pauseStudySession: studySessionActions.pauseSession,
    resumeStudySession: studySessionActions.resumeSession,
    endStudySession: studySessionActions.endSession,
    recordAnswer: studySessionActions.recordAnswer,
  };
};