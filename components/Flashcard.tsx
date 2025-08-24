
import React from 'react';
import { FlashcardData } from '../types';

interface FlashcardProps {
  cardData: FlashcardData;
  isFlipped: boolean;
  onFlip: () => void;
}

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);


const Flashcard: React.FC<FlashcardProps> = ({ cardData, isFlipped, onFlip }) => {
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

  return (
    <div
      className="w-full max-w-md h-72 sm:h-80 md:h-96 perspective cursor-pointer group"
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onFlip()}
      aria-pressed={isFlipped}
      aria-label={`Flashcard: ${cardData.english}. Click or press Enter to flip.`}
    >
      <div
        className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-700 ease-in-out ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Face */}
        <div className="absolute inset-0 w-full h-full bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center backface-hidden group-hover:shadow-3xl transition-shadow">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-sky-700 break-words">
              {cardData.english}
            </h2>
            <button 
                onClick={(e) => handlePlaySound(e, cardData.english)} 
                className="text-sky-500 hover:text-sky-700 transition-colors p-2 rounded-full hover:bg-sky-100"
                aria-label={`Play sound for ${cardData.english}`}
            >
                <SpeakerIcon />
            </button>
          </div>
          <span className="absolute bottom-4 text-xs text-gray-400 group-hover:text-sky-500 transition-colors">Click to flip</span>
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 w-full h-full bg-slate-50 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-start overflow-y-auto backface-hidden rotate-y-180 group-hover:shadow-3xl transition-shadow">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-indigo-700 mb-3 text-center break-words">
            {cardData.spanish}
          </h3>
          {cardData.image && (
            <img 
              src={cardData.image} 
              alt={`Visual aid for ${cardData.english}`} 
              className="w-full max-h-32 sm:max-h-36 md:max-h-40 object-contain rounded-md mb-3 shadow-sm border border-slate-200"
              loading="lazy"
            />
          )}
          {cardData.exampleEnglish && (
            <div className="text-sm sm:text-base text-left w-full mt-2 p-2 bg-sky-50 rounded-md border border-sky-200">
              <p className="text-gray-700 flex items-center justify-between">
                <span>
                    <span className="font-semibold text-sky-600">EN:</span> {cardData.exampleEnglish}
                </span>
                <button 
                    onClick={(e) => handlePlaySound(e, cardData.exampleEnglish)} 
                    className="text-sky-500 hover:text-sky-700 transition-colors p-1 rounded-full hover:bg-sky-100 flex-shrink-0 ml-2"
                    aria-label={`Play sound for example sentence`}
                >
                    <SpeakerIcon />
                </button>
              </p>
              {cardData.exampleSpanish && (
                <p className="text-gray-600 mt-1">
                  <span className="font-semibold text-indigo-500">ES:</span> {cardData.exampleSpanish}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
