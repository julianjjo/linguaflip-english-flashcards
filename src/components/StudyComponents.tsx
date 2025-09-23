import React, { useState, useEffect } from 'react';
import { AppProvider } from './AppProvider';
import Flashcard from './Flashcard';
import RecallQualityControls, { RecallQuality } from './RecallQualityControls';
import type { FlashcardData } from '@/types/index';

interface StudyComponentsProps {
  cardData: FlashcardData;
  isFlipped?: boolean;
  onFlip?: () => void;
  onNextCard?: () => void;
  onPreviousCard?: () => void;
  userId?: string;
  onCardUpdate?: (updatedCard: FlashcardData) => void;
  onQualityResponse?: (quality: number) => Promise<void>;
  onRate?: (quality: RecallQuality) => void;
}

const StudyComponents: React.FC<StudyComponentsProps> = ({
  cardData,
  isFlipped: initialFlipped = false,
  onFlip,
  onNextCard,
  onPreviousCard,
  userId,
  onCardUpdate,
  onQualityResponse,
  onRate = (quality) => console.log('Quality rated:', quality),
}) => {
  // Internal flip state management
  const [isFlipped, setIsFlipped] = useState(initialFlipped);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode =
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkMode);
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Handle flip with optional external handler
  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
    onFlip?.();
  };
  return (
    <AppProvider>
      <div className={`study-components ${isDark ? 'dark' : ''}`}>
        {/* Flashcard Container */}
        <div className="mb-8" id="flashcard-container">
          <div className="mx-auto aspect-[4/3] max-w-2xl">
            <Flashcard
              cardData={cardData}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              onNextCard={onNextCard}
              onPreviousCard={onPreviousCard}
              userId={userId}
              onCardUpdate={onCardUpdate}
              onQualityResponse={onQualityResponse}
            />
          </div>
        </div>

        {/* Recall Quality Controls */}
        <div className="flex justify-center" id="quality-controls">
          <RecallQualityControls onRate={onRate} />
        </div>
      </div>
    </AppProvider>
  );
};

export default StudyComponents;
