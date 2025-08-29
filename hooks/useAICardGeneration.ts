import { useState } from 'react';

import type { FlashcardData } from '../types';
import {
  AICardGenerator,
  createFlashcardFromAIGenerated,
  createFlashcardFromManual,
  type AiGeneratedCard,
  type AiManualCardResponse
} from '../utils/aiCardGeneration';
import { SecurityError } from '../utils/security';
import { useCacheSystem, createAICacheKey } from '../src/hooks/useCacheSystem';

export const useAICardGeneration = (
  allCards: FlashcardData[],
  addCards: (cards: FlashcardData[]) => void,
  getTodayDateString: () => string,
  apiKey?: string,
  userIdentifier: string = 'default-user'
) => {
  const [isGeneratingCards, setIsGeneratingCards] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isCreatingManualCard, setIsCreatingManualCard] = useState<boolean>(false);
  const [manualCreationError, setManualCreationError] = useState<string | null>(null);
  const { ai: aiCache } = useCacheSystem();

  const generateBulkCards = async (): Promise<void> => {
    if (!apiKey) {
      setGenerationError("API Key is not configured. Cannot generate cards.");
      return;
    }

    setIsGeneratingCards(true);
    setGenerationError(null);

    try {
      const generator = new AICardGenerator(apiKey, userIdentifier);
      const existingWords = allCards.map(card => card.english.toLowerCase());

      // Check cache first
      const cacheKey = createAICacheKey(userIdentifier, 'bulk-cards', {
        existingWords: existingWords.sort(),
        cardCount: allCards.length
      });

      let aiGeneratedItems: AiGeneratedCard[] | null = aiCache.get(cacheKey) as AiGeneratedCard[] | null;

      if (!aiGeneratedItems) {
        console.log('[CACHE] Bulk cards not found in cache, fetching from API...');
        aiGeneratedItems = await generator.generateBulkCards(existingWords);

        // Cache the result
        aiCache.set(cacheKey, aiGeneratedItems);
        console.log('[CACHE] Bulk cards cached successfully');
      } else {
        console.log('[CACHE] Bulk cards loaded from cache');
      }

      const newFlashcards: FlashcardData[] = aiGeneratedItems
        .filter(item => !allCards.some(existingCard => existingCard.english.toLowerCase() === item.english.toLowerCase()))
        .map(item => createFlashcardFromAIGenerated(item, allCards, getTodayDateString));

      if (newFlashcards.length > 0) {
        addCards(newFlashcards);
      } else {
        setGenerationError("AI could not generate new unique cards. Try again later or add cards manually.");
      }
    } catch (error) {
      console.error("Failed to generate AI cards:", error);

      let errorMessage = 'Please try again.';
      if (error instanceof SecurityError) {
        switch (error.code) {
          case 'RATE_LIMIT_EXCEEDED':
            errorMessage = 'Too many requests. Please wait a moment before trying again.';
            break;
          case 'INVALID_API_KEY_FORMAT':
            errorMessage = 'API key configuration error. Please contact support.';
            break;
          case 'MISSING_API_KEY':
            errorMessage = 'API key not configured. Please check your environment settings.';
            break;
          case 'INVALID_PROMPT':
            errorMessage = 'Request validation failed. Please try with different content.';
            break;
          default:
            errorMessage = `Security error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setGenerationError(`Failed to generate cards. ${errorMessage}`);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const generateManualCard = async (englishWord: string): Promise<void> => {
    if (!apiKey) {
      setManualCreationError("API Key is not configured. Cannot create card.");
      return;
    }

    if (allCards.some(card => card.english.toLowerCase() === englishWord.toLowerCase())) {
      setManualCreationError(`The card "${englishWord}" already exists in your deck.`);
      return;
    }

    setIsCreatingManualCard(true);
    setManualCreationError(null);

    try {
      const generator = new AICardGenerator(apiKey, userIdentifier);

      // Check cache first
      const cacheKey = createAICacheKey(userIdentifier, 'manual-card', {
        word: englishWord.toLowerCase().trim()
      });

      let cardDetails: AiManualCardResponse | null = aiCache.get(cacheKey) as AiManualCardResponse | null;

      if (!cardDetails) {
        console.log(`[CACHE] Manual card for "${englishWord}" not found in cache, fetching from API...`);
        cardDetails = await generator.generateManualCard(englishWord);

        // Cache the result
        aiCache.set(cacheKey, cardDetails);
        console.log(`[CACHE] Manual card for "${englishWord}" cached successfully`);
      } else {
        console.log(`[CACHE] Manual card for "${englishWord}" loaded from cache`);
      }

      const newCard = createFlashcardFromManual(englishWord, cardDetails, allCards, getTodayDateString);
      addCards([newCard]);

    } catch (error) {
      console.error("Failed to create manual card:", error);

      let errorMessage = 'An unknown error occurred.';
      if (error instanceof SecurityError) {
        switch (error.code) {
          case 'RATE_LIMIT_EXCEEDED':
            errorMessage = 'Too many requests. Please wait a moment before trying again.';
            break;
          case 'INVALID_API_KEY_FORMAT':
            errorMessage = 'API key configuration error. Please contact support.';
            break;
          case 'MISSING_API_KEY':
            errorMessage = 'API key not configured. Please check your environment settings.';
            break;
          case 'INVALID_INPUT':
            errorMessage = 'Invalid input provided. Please check your word and try again.';
            break;
          case 'INPUT_TOO_LONG':
            errorMessage = 'Input is too long. Please use a shorter word or phrase.';
            break;
          case 'INVALID_PROMPT':
            errorMessage = 'Request validation failed. Please try with different content.';
            break;
          default:
            errorMessage = `Security error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setManualCreationError(`Failed to create card. ${errorMessage}`);
    } finally {
      setIsCreatingManualCard(false);
    }
  };

  const clearCache = () => {
    aiCache.clear();
    console.log('[CACHE] AI cache cleared');
  };

  return {
    // State
    isGeneratingCards,
    generationError,
    isCreatingManualCard,
    manualCreationError,

    // Actions
    generateBulkCards,
    generateManualCard,

    // Cache management
    clearCache,

    // Error setters
    setGenerationError,
    setManualCreationError,
  };
};