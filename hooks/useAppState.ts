import { useState, useEffect, useCallback } from 'react';
import { FlashcardData } from '../types';
import { INITIAL_FLASHCARDS_DATA, DEFAULT_EASINESS_FACTOR } from '../constants';

export const useAppState = () => {
  const [allCards, setAllCards] = useState<FlashcardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingCards, setIsGeneratingCards] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [isCreatingManualCard, setIsCreatingManualCard] = useState<boolean>(false);
  const [manualCreationError, setManualCreationError] = useState<string | null>(null);

  const getTodayDateString = useCallback(() => new Date().toISOString().split('T')[0], []);

  // Initialize or load cards from localStorage
  useEffect(() => {
    setIsLoading(true);
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
        image: card.image || `https://picsum.photos/320/180?random=${card.id}` // Ensure image for older cards
      }));
      setAllCards(migratedCards);
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
      setAllCards(initialCards);
      localStorage.setItem('linguaFlipCards', JSON.stringify(initialCards));
    }
    setIsLoading(false);
  }, [getTodayDateString]);

  const updateCards = useCallback((newCards: FlashcardData[]) => {
    setAllCards(newCards);
    localStorage.setItem('linguaFlipCards', JSON.stringify(newCards));
  }, []);

  const addCards = useCallback((newCards: FlashcardData[]) => {
    const updatedCards = [...allCards, ...newCards];
    updateCards(updatedCards);
  }, [allCards, updateCards]);

  const updateCard = useCallback((updatedCard: FlashcardData) => {
    const updatedCards = allCards.map(c => c.id === updatedCard.id ? updatedCard : c);
    updateCards(updatedCards);
  }, [allCards, updateCards]);

  return {
    // State
    allCards,
    isLoading,
    isGeneratingCards,
    generationError,
    showManualForm,
    isCreatingManualCard,
    manualCreationError,

    // Setters
    setIsLoading,
    setIsGeneratingCards,
    setGenerationError,
    setShowManualForm,
    setIsCreatingManualCard,
    setManualCreationError,

    // Actions
    updateCards,
    addCards,
    updateCard,
    getTodayDateString,
  };
};