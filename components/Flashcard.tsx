
import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { FlashcardData } from '../types';
import { useTouchGestures } from './TouchGestureHandler';
import { useAudioSystem } from '../hooks/useAudioSystem';
import { useApp } from './AppProvider';
import { flashcardsActions, flashcardsStore, flashcardsLoadingStore, flashcardsErrorStore } from '../stores/flashcards';
import { MiniSyncIndicator } from '../src/components/SyncStatusIndicator';
import LoadingSpinner from '../src/components/LoadingSpinner';

interface FlashcardProps {
  cardData: FlashcardData;
  isFlipped: boolean;
  onFlip: () => void;
  onNextCard?: () => void;
  onPreviousCard?: () => void;
  userId?: string;
  onCardUpdate?: (updatedCard: FlashcardData) => void;
  onQualityResponse?: (quality: number) => Promise<void>;
}

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);


const Flashcard: React.FC<FlashcardProps> = ({
  cardData,
  isFlipped,
  onFlip,
  onNextCard,
  onPreviousCard
}) => {
  const handlePlaySound = (event: React.MouseEvent, textToSpeak?: string) => {
    event.stopPropagation(); // Prevent card from flipping
    if (!textToSpeak || typeof window.speechSynthesis === 'undefined') {
        console.warn('Speech synthesis not supported or no text provided.');
        return;
    }

    // Cancel any ongoing speech to prevent overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US'; // Set language to American English
    utterance.rate = 0.9; // Slightly slower for clarity
    window.speechSynthesis.speak(utterance);
  };

  // Touch gesture handlers
  const touchGestures = useTouchGestures({
    onSwipeLeft: onNextCard,
    onSwipeRight: onPreviousCard,
    onTap: onFlip,
    minSwipeDistance: 75,
    maxTapDuration: 300,
    enableHapticFeedback: true
  });

  return (
    <div
      className="flashcard-mobile perspective cursor-pointer group touch-manipulation touch-feedback focus-mobile relative"
      onClick={onFlip}
      onTouchStart={touchGestures.onTouchStart}
      onTouchMove={touchGestures.onTouchMove}
      onTouchEnd={touchGestures.onTouchEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onFlip()}
      aria-pressed={isFlipped}
      aria-label={`Flashcard: ${cardData.english}. Tap to flip, swipe left/right to navigate.`}
    >
      {/* Swipe indicator for mobile */}
      <div className="swipe-indicator md:hidden">
        <span className="text-xs">👆 Tap to flip • 👈👉 Swipe to navigate</span>
      </div>
      <div
        className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-700 ease-in-out ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Face */}
        <div className="card-front absolute inset-0 w-full h-full rounded-2xl shadow-xl p-mobile flex flex-col items-center justify-center backface-hidden group-hover:shadow-glow-primary transition-all duration-300 hover:scale-[1.02] border border-primary-200/50">
          <div className="flex flex-col items-center space-mobile-y text-center">
            <div className="flex items-start gap-3">
              <h2 className="text-mobile-2xl md:text-6xl font-extrabold text-primary-800 leading-tight tracking-tight break-words animate-fade-in">
                {cardData.english}
              </h2>
              <button
                onClick={(e) => handlePlaySound(e, cardData.english)}
                className="touch-target text-primary-500 hover:text-primary-700 transition-all duration-200 p-3 rounded-full hover:bg-primary-100 hover:scale-110 active:scale-95 flex-shrink-0 mt-2 group/btn touch-feedback"
                aria-label={`Play sound for ${cardData.english}`}
              >
                <SpeakerIcon />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary-600 bg-primary-50 px-4 py-2 rounded-full border border-primary-200">
              <span className="animate-pulse">💡</span>
              <span>Click to reveal translation</span>
            </div>
          </div>
        </div>

        {/* Back Face */}
        <div className="card-back absolute inset-0 w-full h-full rounded-2xl shadow-xl p-mobile flex flex-col backface-hidden rotate-y-180 group-hover:shadow-glow-secondary transition-all duration-300 hover:scale-[1.02] border border-secondary-200/50 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-mobile-xl md:text-5xl font-bold text-secondary-800 leading-tight tracking-tight break-words animate-slide-up flex-1">
                {cardData.spanish}
              </h3>
              <button
                onClick={(e) => handlePlaySound(e, cardData.spanish)}
                className="touch-target text-secondary-500 hover:text-secondary-700 transition-all duration-200 p-3 rounded-full hover:bg-secondary-100 hover:scale-110 active:scale-95 flex-shrink-0 ml-3 group/btn touch-feedback"
                aria-label={`Play sound for ${cardData.spanish}`}
              >
                <SpeakerIcon />
              </button>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col space-mobile-y overflow-y-auto touch-scroll">
              {cardData.image && (
                <div className="relative group/image">
                  <img
                    src={cardData.image}
                    alt={`Visual aid for ${cardData.english}`}
                    className="w-full max-h-36 sm:max-h-40 md:max-h-44 object-contain rounded-xl shadow-md border-2 border-secondary-200 group-hover/image:border-secondary-300 transition-all duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl opacity-0 group-hover/image:opacity-100 transition-opacity duration-200"></div>
                </div>
              )}

              {cardData.exampleEnglish && (
                <div className="bg-gradient-to-br from-primary-50/80 to-secondary-50/80 rounded-xl p-5 border border-primary-200/60 shadow-sm backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-primary-600 bg-primary-100 px-2 py-1 rounded-md uppercase tracking-wide">EN</span>
                          <div className="h-px bg-primary-200 flex-1"></div>
                        </div>
                        <p className="text-neutral-800 font-medium leading-relaxed">
                          {cardData.exampleEnglish}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handlePlaySound(e, cardData.exampleEnglish)}
                        className="touch-target text-primary-500 hover:text-primary-700 transition-all duration-200 p-2 rounded-full hover:bg-primary-100 hover:scale-110 active:scale-95 flex-shrink-0 touch-feedback"
                        aria-label={`Play sound for example sentence`}
                      >
                        <SpeakerIcon />
                      </button>
                    </div>

                    {cardData.exampleSpanish && (
                      <div className="pt-2 border-t border-primary-200/40">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-secondary-600 bg-secondary-100 px-2 py-1 rounded-md uppercase tracking-wide">ES</span>
                          <div className="h-px bg-secondary-200 flex-1"></div>
                        </div>
                        <p className="text-neutral-700 font-medium leading-relaxed">
                          {cardData.exampleSpanish}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Hint */}
            <div className="mt-4 pt-4 border-t border-secondary-200/40">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-secondary-600">
                <span className="animate-pulse">🔄</span>
                <span>Click to flip back</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
