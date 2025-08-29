import React, { useEffect } from 'react';

import Flashcard from './Flashcard';
import Navigation from './Navigation';
import RecallQualityControls from './RecallQualityControls';
import { useTouchGestures } from './TouchGestureHandler';

import type { FlashcardData } from '../types';
import type { RecallQuality } from './RecallQualityControls';

interface StudyPageProps {
  // Study session state
  reviewDeck: FlashcardData[];
  currentReviewCardIndex: number;
  isFlipped: boolean;
  sessionCompleted: boolean;
  currentCardData: FlashcardData | null;

  // Loading state
  isLoading: boolean;

  // Actions
  handleFlip: () => void;
  handleNextCard: () => void;
  handlePreviousCard: () => void;
  handleRecallQuality: (quality: RecallQuality) => void;
  handleGenerateAICards: () => void;
  refreshDeckAndSession: () => void;
  setShowManualForm: (show: boolean) => void;
  setManualCreationError: (error: string | null) => void;

  // API availability
  apiKeyAvailable: boolean;
}

const StudyPage: React.FC<StudyPageProps> = ({
  reviewDeck,
  currentReviewCardIndex,
  isFlipped,
  sessionCompleted,
  currentCardData,
  isLoading,
  handleFlip,
  handleNextCard,
  handlePreviousCard,
  handleRecallQuality,
  handleGenerateAICards,
  refreshDeckAndSession,
  setShowManualForm,
  setManualCreationError,
  apiKeyAvailable,
}) => {
  // Touch gesture handlers
  const touchHandlers = useTouchGestures({
    onSwipeLeft: handleNextCard,
    onSwipeRight: handlePreviousCard,
    onTap: handleFlip,
  });
  // Preload images for better performance
  useEffect(() => {
    const preloadImage = (src?: string) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    };

    if (reviewDeck.length > 0 && currentReviewCardIndex < reviewDeck.length) {
      preloadImage(reviewDeck[currentReviewCardIndex]?.image);
      if (currentReviewCardIndex < reviewDeck.length - 1) {
        preloadImage(reviewDeck[currentReviewCardIndex + 1]?.image);
      }
    }
  }, [currentReviewCardIndex, reviewDeck]);

  if (sessionCompleted || (reviewDeck.length === 0 && !isLoading)) {
    return (
      <div className="text-center bg-white p-8 rounded-xl shadow-2xl w-full">
        <h2 className="text-2xl font-semibold text-success-600 mb-4">
          {reviewDeck.length === 0 ? "Welcome!" : (sessionCompleted && reviewDeck.length > 0 ? "Great job!" : "All caught up!")}
        </h2>
        <p className="text-neutral-700">
          {reviewDeck.length === 0 ? "Let's start by generating some cards." :
           (sessionCompleted && reviewDeck.length > 0 ? "You've completed all reviews for today." : "No cards due for review right now.")}
        </p>
        <p className="text-neutral-600 mt-2">
          {reviewDeck.length > 0 && "Come back tomorrow or generate new cards!"}
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          <button
              onClick={handleGenerateAICards}
              disabled={!apiKeyAvailable}
              className={`px-4 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 w-full
                          ${!apiKeyAvailable ? 'bg-neutral-400 text-neutral-700 cursor-not-allowed'
                                           : 'btn-primary hover:scale-105'}`}
              aria-live="polite"
          >
            Generate AI Cards
          </button>
          <button
              onClick={() => { setShowManualForm(true); setManualCreationError(null); }}
              disabled={!apiKeyAvailable}
              className={`px-4 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 w-full
                          ${!apiKeyAvailable ? 'bg-neutral-400 text-neutral-700 cursor-not-allowed'
                                           : 'btn-secondary hover:scale-105'}`}
          >
              Create Manually
          </button>
        </div>
         <button
           onClick={refreshDeckAndSession}
           className="mt-4 w-full px-6 py-3 bg-accent-500 text-white font-semibold rounded-xl shadow-lg hover:bg-accent-600 transition-all duration-200 hover:scale-105"
         >
           Refresh Deck
         </button>
        {!apiKeyAvailable && <p className="text-xs text-red-500 mt-2">AI Card Generation disabled: API Key missing.</p>}
      </div>
    );
  }

  if (currentCardData) {
    return (
      <div className="space-mobile-y">
        <div
          {...touchHandlers}
          className="touch-gesture-area"
        >
          <Flashcard
            key={currentCardData.id}
            cardData={currentCardData}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onNextCard={handleNextCard}
            onPreviousCard={handlePreviousCard}
          />
        </div>

        {isFlipped && (
          <RecallQualityControls onRate={handleRecallQuality} />
        )}

        <Navigation
          currentCardOrder={currentReviewCardIndex + 1}
          reviewDeckSize={reviewDeck.length}
        />

         <button
           onClick={() => { setShowManualForm(true); setManualCreationError(null); }}
           disabled={!apiKeyAvailable}
           className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200
                       ${!apiKeyAvailable ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                                        : 'btn-primary hover:scale-105'}`}
           aria-live="polite"
         >
            Add New Card
         </button>
          {!apiKeyAvailable && currentCardData && <p className="text-xs text-primary-200 mt-1">AI Card Generation disabled: API Key missing.</p>}
      </div>
    );
  }

  return (
     <div className="text-center bg-white p-8 rounded-xl shadow-2xl">
         <h2 className="text-2xl font-semibold text-sky-700 mb-4">Preparing your cards...</h2>
         <p className="text-slate-600">Just a moment.</p>
     </div>
  );
};

export default StudyPage;