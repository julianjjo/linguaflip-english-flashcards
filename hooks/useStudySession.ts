import { useState, useEffect, useCallback } from 'react';

import { RecallQuality } from '../components/RecallQualityControls';
import { MIN_EASINESS_FACTOR, LEARNING_STEPS_DAYS } from '../constants';
import { StudySessionManager } from '../utils/studySession';

import type { FlashcardData, StudySession, StudyProfile, StudySessionState } from '../types';

export const useStudySession = (
  allCards: FlashcardData[],
  updateCard: (card: FlashcardData) => void,
  getTodayDateString: () => string
) => {
  const [reviewDeck, setReviewDeck] = useState<FlashcardData[]>([]);
  const [currentReviewCardIndex, setCurrentReviewCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionCorrectAnswers, setSessionCorrectAnswers] = useState<number>(0);
  const [currentProfile, setCurrentProfile] = useState<StudyProfile | null>(null);
  const [studySessionManager] = useState(() => new StudySessionManager());
  const [sessionState, setSessionState] = useState<StudySessionState>({
    isActive: false,
    isPaused: false,
    startTime: null,
    pauseTime: null,
    totalPausedTime: 0,
    cardsStudied: 0,
    correctAnswers: 0,
    currentBreakTime: 0,
    nextBreakTime: 0
  });

  // Load study sessions from localStorage
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('linguaFlipStudySessions');
      if (storedSessions) {
        setStudySessions(JSON.parse(storedSessions));
      }
    } catch (error) {
      console.error("Failed to load study sessions:", error);
    }
  }, []);

  // Build review deck with customization
  const buildReviewDeck = useCallback(() => {
    if (allCards.length === 0) return;

    // Use study session manager if profile is set, otherwise use default logic
    let cardsToReview: FlashcardData[] = [];

    if (currentProfile) {
      // Use customized deck building
      const maxCards = currentProfile.sessionControls.dailyCardLimit;
      cardsToReview = studySessionManager.buildReviewDeck(allCards, maxCards);
    } else {
      // Fallback to original logic
      const today = getTodayDateString();
      const dueCards = allCards
        .filter(card => new Date(card.dueDate) <= new Date(today))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      const newCards = allCards.filter(card => card.repetitions === 0 && !dueCards.find(dc => dc.id === card.id));
      cardsToReview = [...dueCards];

      const MAX_REVIEW_SIZE = 20;
      const MAX_NEW_CARDS = 5;

      let newCardsAdded = 0;
      for (let i = 0; i < newCards.length && cardsToReview.length < MAX_REVIEW_SIZE && newCardsAdded < MAX_NEW_CARDS; i++) {
          if (!cardsToReview.find(card => card.id === newCards[i].id)) {
              cardsToReview.push(newCards[i]);
              newCardsAdded++;
          }
      }

      // Shuffle the review deck
      for (let i = cardsToReview.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cardsToReview[i], cardsToReview[j]] = [cardsToReview[j], cardsToReview[i]];
      }
    }

    setReviewDeck(cardsToReview);
    setCurrentReviewCardIndex(0);
    setIsFlipped(false);
    setSessionCompleted(cardsToReview.length === 0 && allCards.length > 0);
  }, [allCards, getTodayDateString, currentProfile, studySessionManager]);

  useEffect(() => {
    buildReviewDeck();
  }, [allCards, buildReviewDeck]);

  const handleFlip = useCallback(() => {
    if (reviewDeck.length > 0) {
      setIsFlipped(prev => !prev);
    }
  }, [reviewDeck]);

  const handleNextCard = useCallback(() => {
    if (currentReviewCardIndex < reviewDeck.length - 1) {
      setCurrentReviewCardIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  }, [currentReviewCardIndex, reviewDeck.length]);

  const handlePreviousCard = useCallback(() => {
    if (currentReviewCardIndex > 0) {
      setCurrentReviewCardIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentReviewCardIndex]);

  const handleRecallQuality = useCallback((quality: RecallQuality) => {
    if (currentReviewCardIndex >= reviewDeck.length) return;

    // Start session tracking if not already started
    if (!sessionState.isActive) {
      studySessionManager.startSession();
      setSessionState(studySessionManager.getSessionState());
      setSessionStartTime(new Date());
    }

    const cardToUpdate = reviewDeck[currentReviewCardIndex];
    let { repetitions, easinessFactor, interval } = cardToUpdate;
    const todayDate = new Date();

    if (quality === RecallQuality.AGAIN) {
      repetitions = 0;
      interval = LEARNING_STEPS_DAYS[0];
    } else {
      repetitions += 1;
      let qualityScore = 0;
      if (quality === RecallQuality.HARD) qualityScore = 1;
      else if (quality === RecallQuality.GOOD) qualityScore = 2;
      else if (quality === RecallQuality.EASY) qualityScore = 3;

      const sm2QualityScore = qualityScore + 2;
      easinessFactor = easinessFactor + (0.1 - (5 - sm2QualityScore) * (0.08 + (5 - sm2QualityScore) * 0.02));
      if (easinessFactor < MIN_EASINESS_FACTOR) easinessFactor = MIN_EASINESS_FACTOR;

      if (repetitions === 1) {
        interval = LEARNING_STEPS_DAYS[0];
      } else if (repetitions === 2) {
        interval = LEARNING_STEPS_DAYS[1];
      } else {
        interval = Math.max(1, interval);
        interval = Math.round(interval * easinessFactor);
      }
    }

    interval = Math.min(interval, 365);
    if (quality !== RecallQuality.AGAIN && interval < 1) {
        interval = 1;
    }

    const newDueDate = new Date(todayDate);
    newDueDate.setDate(todayDate.getDate() + interval);

    const updatedCard: FlashcardData = {
      ...cardToUpdate,
      repetitions,
      easinessFactor,
      interval,
      dueDate: newDueDate.toISOString().split('T')[0],
      lastReviewed: getTodayDateString(),
    };

    updateCard(updatedCard);

    setIsFlipped(false); // Always unflip *before* changing card or ending session

    if (quality === RecallQuality.AGAIN) {
      if (reviewDeck.length > 1) {
        const cardToRequeue = reviewDeck[currentReviewCardIndex];
        const tempReviewDeck = reviewDeck.filter((_, index) => index !== currentReviewCardIndex);
        tempReviewDeck.push(cardToRequeue);
        setReviewDeck(tempReviewDeck);
        // currentReviewCardIndex remains the same, pointing to the next card in sequence or the requeued card if it was last
      } else {
        // Only one card in the deck, marked "Again". Session completes.
        setSessionCompleted(true);
      }
    } else {
      // Track correct answers
      setSessionCorrectAnswers(prev => prev + 1);
      studySessionManager.recordCardResult(true);

      // For Hard, Good, Easy: advance to the next card or complete session.
      if (currentReviewCardIndex < reviewDeck.length - 1) {
        setCurrentReviewCardIndex(prev => prev + 1);
      } else {
        setSessionCompleted(true);
      }
    }

    // Check if session is ending and record it
    const isLastCard = currentReviewCardIndex >= reviewDeck.length - 1;
    const willCompleteSession = (quality === RecallQuality.AGAIN && reviewDeck.length <= 1) ||
                               (quality !== RecallQuality.AGAIN && isLastCard);

    if (willCompleteSession && sessionStartTime) {
      // End session using the session manager
      const sessionStats = studySessionManager.endSession();
      if (sessionStats) {
        const newStudySession: StudySession = {
          id: sessionStats.sessionId,
          date: getTodayDateString(),
          cardsReviewed: sessionStats.cardsStudied,
          correctAnswers: sessionStats.correctAnswers,
          totalTime: sessionStats.totalTime,
          averageResponseTime: sessionStats.averageResponseTime,
        };

        const updatedSessions = [...studySessions, newStudySession];
        setStudySessions(updatedSessions);
        localStorage.setItem('linguaFlipStudySessions', JSON.stringify(updatedSessions));
      }

      // Reset session tracking
      setSessionStartTime(null);
      setSessionCorrectAnswers(0);
      setSessionState(studySessionManager.getSessionState());
    }
  }, [currentReviewCardIndex, reviewDeck, allCards, getTodayDateString, sessionStartTime, sessionCorrectAnswers, studySessions, sessionState.isActive, studySessionManager, updateCard]);

  const handlePauseSession = useCallback(() => {
    studySessionManager.pauseSession();
    setSessionState(studySessionManager.getSessionState());
  }, [studySessionManager]);

  const handleResumeSession = useCallback(() => {
    studySessionManager.resumeSession();
    setSessionState(studySessionManager.getSessionState());
  }, [studySessionManager]);

  const handleEndSession = useCallback(() => {
    const sessionStats = studySessionManager.endSession();
    if (sessionStats) {
      const updatedSessions = [...studySessions, {
        id: sessionStats.sessionId,
        date: getTodayDateString(),
        cardsReviewed: sessionStats.cardsStudied,
        correctAnswers: sessionStats.correctAnswers,
        totalTime: sessionStats.totalTime,
        averageResponseTime: sessionStats.averageResponseTime
      }];
      setStudySessions(updatedSessions);
      localStorage.setItem('linguaFlipStudySessions', JSON.stringify(updatedSessions));
    }
    setSessionState(studySessionManager.getSessionState());
    setSessionCompleted(true);
  }, [studySessionManager, studySessions, getTodayDateString]);

  const handleBreakStart = useCallback(() => {
    // Break logic will be implemented here
    console.log('Break started');
  }, []);

  const handleBreakEnd = useCallback(() => {
    // Break logic will be implemented here
    console.log('Break ended');
  }, []);

  const refreshDeckAndSession = useCallback(() => {
    setSessionCompleted(false);
    setCurrentReviewCardIndex(0);
    setIsFlipped(false);
    buildReviewDeck();
  }, [buildReviewDeck]);

  const currentCardData = reviewDeck.length > 0 && currentReviewCardIndex < reviewDeck.length
                          ? reviewDeck[currentReviewCardIndex]
                          : null;

  return {
    // State
    reviewDeck,
    currentReviewCardIndex,
    isFlipped,
    sessionCompleted,
    studySessions,
    sessionStartTime,
    sessionCorrectAnswers,
    currentProfile,
    sessionState,
    currentCardData,

    // Setters
    setCurrentProfile,
    setSessionCompleted,

    // Actions
    buildReviewDeck,
    handleFlip,
    handleNextCard,
    handlePreviousCard,
    handleRecallQuality,
    handlePauseSession,
    handleResumeSession,
    handleEndSession,
    handleBreakStart,
    handleBreakEnd,
    refreshDeckAndSession,
  };
};