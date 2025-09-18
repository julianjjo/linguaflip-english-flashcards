import type { FlashcardData, StudyModeConfig, DifficultyFilter, StudySessionState, StudySessionStats } from '../types';
import { getDifficultyLevel, isCardMastered, DEFAULT_STUDY_MODE, DEFAULT_DIFFICULTY_FILTER } from '../constants';

export class StudySessionManager {
  private sessionState: StudySessionState;
  private studyMode: StudyModeConfig;
  private difficultyFilter: DifficultyFilter;

  constructor(
    studyMode: StudyModeConfig = DEFAULT_STUDY_MODE,
    difficultyFilter: DifficultyFilter = DEFAULT_DIFFICULTY_FILTER
  ) {
    this.studyMode = studyMode;
    this.difficultyFilter = difficultyFilter;
    this.sessionState = {
      isActive: false,
      isPaused: false,
      startTime: null,
      pauseTime: null,
      totalPausedTime: 0,
      cardsStudied: 0,
      correctAnswers: 0,
      currentBreakTime: 0,
      nextBreakTime: 0
    };
  }

  // Build review deck based on study mode and filters
  buildReviewDeck(allCards: FlashcardData[], maxSize: number = 20): FlashcardData[] {
    const today = new Date().toISOString().split('T')[0];
    const filteredCards = this.applyFilters(allCards, today);

    switch (this.studyMode.mode) {
      case 'review-only':
        return this.buildReviewOnlyDeck(filteredCards, maxSize);

      case 'new-cards-only':
        return this.buildNewCardsOnlyDeck(filteredCards, maxSize);

      case 'difficult-cards':
        return this.buildDifficultCardsDeck(filteredCards, maxSize);

      case 'mixed':
        return this.buildMixedDeck(filteredCards, maxSize);

      case 'custom':
        return this.buildCustomDeck(filteredCards, maxSize);

      default:
        return this.buildMixedDeck(filteredCards, maxSize);
    }
  }

  private applyFilters(cards: FlashcardData[]): FlashcardData[] {
    let filteredCards = [...cards];

    // Apply difficulty filter
    if (this.difficultyFilter.enabled) {
      filteredCards = filteredCards.filter(card => {
        const difficulty = getDifficultyLevel(card.easinessFactor);
        return this.difficultyFilter.levels.includes(difficulty);
      });
    }

    // Focus on recent cards
    if (this.difficultyFilter.focusRecentCards) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - this.difficultyFilter.recentDaysThreshold);

      filteredCards = filteredCards.filter(card => {
        if (!card.lastReviewed) return true;
        return new Date(card.lastReviewed) >= thresholdDate;
      });
    }

    // Exclude mastered cards
    if (this.difficultyFilter.excludeMasteredCards) {
      filteredCards = filteredCards.filter(card => !isCardMastered(card.repetitions, card.easinessFactor));
    }

    return filteredCards;
  }

  private buildReviewOnlyDeck(cards: FlashcardData[], maxSize: number): FlashcardData[] {
    const today = new Date().toISOString().split('T')[0];
    const dueCards = cards
      .filter(card => new Date(card.dueDate) <= new Date(today))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return this.shuffleArray(dueCards.slice(0, maxSize));
  }

  private buildNewCardsOnlyDeck(cards: FlashcardData[], maxSize: number): FlashcardData[] {
    const newCards = cards.filter(card => card.repetitions === 0);
    return this.shuffleArray(newCards.slice(0, maxSize));
  }

  private buildDifficultCardsDeck(cards: FlashcardData[], maxSize: number): FlashcardData[] {
    const difficultCards = cards
      .filter(card => getDifficultyLevel(card.easinessFactor) === 'hard' || card.repetitions < 3)
      .sort((a, b) => a.easinessFactor - b.easinessFactor);

    return this.shuffleArray(difficultCards.slice(0, maxSize));
  }

  private buildMixedDeck(cards: FlashcardData[], maxSize: number): FlashcardData[] {
    const today = new Date().toISOString().split('T')[0];

    const dueCards = cards.filter(card => new Date(card.dueDate) <= new Date(today));
    const newCards = cards.filter(card => card.repetitions === 0 && !dueCards.find(dc => dc.id === card.id));

    const reviewCount = Math.floor(maxSize * 0.7);
    const newCount = Math.min(maxSize - reviewCount, newCards.length);

    const selectedCards = [
      ...this.shuffleArray(dueCards.slice(0, reviewCount)),
      ...this.shuffleArray(newCards.slice(0, newCount))
    ];

    return this.shuffleArray(selectedCards);
  }

  private buildCustomDeck(cards: FlashcardData[], maxSize: number): FlashcardData[] {
    if (!this.studyMode.customRatios) return this.buildMixedDeck(cards, maxSize);

    const { reviewCards, newCards, difficultCards } = this.studyMode.customRatios;
    const total = reviewCards + newCards + difficultCards;

    const reviewCount = Math.floor((reviewCards / total) * maxSize);
    const newCount = Math.floor((newCards / total) * maxSize);
    const difficultCount = Math.floor((difficultCards / total) * maxSize);

    const today = new Date().toISOString().split('T')[0];
    const dueCards = cards.filter(card => new Date(card.dueDate) <= new Date(today));
    const newOnlyCards = cards.filter(card => card.repetitions === 0 && !dueCards.find(dc => dc.id === card.id));
    const difficultOnlyCards = cards.filter(card =>
      getDifficultyLevel(card.easinessFactor) === 'hard' && !dueCards.find(dc => dc.id === card.id)
    );

    const selectedCards = [
      ...this.shuffleArray(dueCards.slice(0, reviewCount)),
      ...this.shuffleArray(newOnlyCards.slice(0, newCount)),
      ...this.shuffleArray(difficultOnlyCards.slice(0, difficultCount))
    ];

    return this.shuffleArray(selectedCards);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Session state management
  startSession(): void {
    this.sessionState = {
      ...this.sessionState,
      isActive: true,
      isPaused: false,
      startTime: new Date(),
      pauseTime: null,
      totalPausedTime: 0,
      cardsStudied: 0,
      correctAnswers: 0,
      currentBreakTime: 0,
      nextBreakTime: 0
    };
  }

  pauseSession(): void {
    if (this.sessionState.isActive && !this.sessionState.isPaused) {
      this.sessionState.isPaused = true;
      this.sessionState.pauseTime = new Date();
    }
  }

  resumeSession(): void {
    if (this.sessionState.isActive && this.sessionState.isPaused && this.sessionState.pauseTime) {
      const pausedDuration = Date.now() - this.sessionState.pauseTime.getTime();
      this.sessionState.totalPausedTime += Math.floor(pausedDuration / 1000);
      this.sessionState.isPaused = false;
      this.sessionState.pauseTime = null;
    }
  }

  endSession(): StudySessionStats | null {
    if (!this.sessionState.isActive || !this.sessionState.startTime) return null;

    const endTime = new Date();
    const totalTime = Math.floor((endTime.getTime() - this.sessionState.startTime.getTime()) / 1000);

    const stats: StudySessionStats = {
      sessionId: `session_${Date.now()}`,
      profileId: 'default', // This will be updated when profiles are implemented
      startTime: this.sessionState.startTime,
      endTime,
      cardsStudied: this.sessionState.cardsStudied,
      correctAnswers: this.sessionState.correctAnswers,
      totalTime,
      pausedTime: this.sessionState.totalPausedTime,
      breaksTaken: 0, // This will be tracked when breaks are implemented
      averageResponseTime: this.sessionState.cardsStudied > 0 ?
        (totalTime - this.sessionState.totalPausedTime) / this.sessionState.cardsStudied : 0,
      difficulty: 'medium', // This will be calculated based on actual cards studied
      mode: this.studyMode.mode
    };

    this.sessionState = {
      isActive: false,
      isPaused: false,
      startTime: null,
      pauseTime: null,
      totalPausedTime: 0,
      cardsStudied: 0,
      correctAnswers: 0,
      currentBreakTime: 0,
      nextBreakTime: 0
    };

    return stats;
  }

  // Getters
  getSessionState(): StudySessionState {
    return { ...this.sessionState };
  }

  isSessionActive(): boolean {
    return this.sessionState.isActive;
  }

  isSessionPaused(): boolean {
    return this.sessionState.isPaused;
  }

  // Update session progress
  recordCardResult(correct: boolean): void {
    if (this.sessionState.isActive && !this.sessionState.isPaused) {
      this.sessionState.cardsStudied++;
      if (correct) {
        this.sessionState.correctAnswers++;
      }
    }
  }

  // Configuration updates
  updateStudyMode(mode: StudyModeConfig): void {
    this.studyMode = mode;
  }

  updateDifficultyFilter(filter: DifficultyFilter): void {
    this.difficultyFilter = filter;
  }
}

// Utility functions
export const calculateSessionProgress = (cardsStudied: number, totalCards: number): number => {
  if (totalCards === 0) return 0;
  return Math.round((cardsStudied / totalCards) * 100);
};

export const formatSessionTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const shouldTakeBreak = (sessionDuration: number, breakInterval: number): boolean => {
  return sessionDuration > 0 && breakInterval > 0 && sessionDuration % (breakInterval * 60) === 0;
};