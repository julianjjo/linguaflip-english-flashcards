import React from 'react';
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
  isFlipped = false,
  onFlip = () => {},
  onNextCard,
  onPreviousCard,
  userId,
  onCardUpdate,
  onQualityResponse,
  onRate = (quality) => console.log('Quality rated:', quality)
}) => {
  return (
    <AppProvider>
      <div className="study-components">
        {/* Flashcard Container */}
        <div className="mb-8" id="flashcard-container">
          <div className="aspect-[4/3] max-w-2xl mx-auto">
            <Flashcard
              cardData={cardData}
              isFlipped={isFlipped}
              onFlip={onFlip}
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