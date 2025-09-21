import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import type { FlashcardData } from '@/types/index';
import { useTouchGestures } from './TouchGestureHandler';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useApp } from './AppProvider';
import OptimizedImage from './OptimizedImage';
import LoadingSpinner from './LoadingSpinner';
import { flashcardsActions, flashcardsLoadingStore, flashcardsErrorStore } from '@/stores/flashcards';
import { MiniSyncIndicator } from './SyncStatusIndicator';

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
     onPreviousCard,
     userId,
     onQualityResponse
 }) => {
     const { speak, isSpeaking } = useAudioSystem();
     const { showError, showInfo, preferences } = useApp();
     const [isLoadingAudio, setIsLoadingAudio] = useState(false);
     const [qualityResponse, setQualityResponse] = useState<number | null>(null);

   // Store subscriptions
   const isLoading = useStore(flashcardsLoadingStore);
   const error = useStore(flashcardsErrorStore);


   // Handle quality response for SM-2 algorithm
   const handleQualityResponse = async (quality: number) => {
      if (!userId) return;

      setQualityResponse(quality);
      try {
         // Use the store's processQualityResponse function
         await flashcardsActions.processQualityResponse(cardData.id, quality, 0, userId);
         
         // Call the optional callback
         if (onQualityResponse) {
           await onQualityResponse(quality);
         }
      } catch (error) {
         console.error('Failed to process quality response:', error);
         showError('Error processing response', 'Failed to update card difficulty');
      } finally {
         setQualityResponse(null);
      }
   };

  const handlePlaySound = async (event: React.MouseEvent, textToSpeak?: string) => {
    event.stopPropagation(); // Prevent card from flipping
    if (!textToSpeak) return;

    if (!preferences.enableSound) {
      showInfo('Audio deshabilitado', 'El audio está desactivado en la configuración');
      return;
    }

    setIsLoadingAudio(true);
    try {
      await speak(textToSpeak);
    } catch (error) {
      console.warn('Audio playback failed:', error);
      showError(
        'Error de audio',
        'No se pudo reproducir el audio. Verifica tu configuración de sonido.'
      );
      // Fallback: show visual feedback
      console.log(`🔊 "${textToSpeak}"`);
    } finally {
      setIsLoadingAudio(false);
    }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onFlip();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onPreviousCard?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        onNextCard?.();
        break;
      case 's':
      case 'S':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handlePlaySound(e as unknown as React.MouseEvent<HTMLElement>, cardData.english);
        }
        break;
    }
  };

  return (
    <div
      className={`
        flashcard-mobile perspective cursor-pointer group touch-manipulation touch-feedback focus-mobile relative
        ${preferences.highContrast ? 'high-contrast' : ''}
        ${preferences.largeText ? 'text-lg' : ''}
        ${preferences.reduceMotion ? 'motion-reduce' : ''}
        ${isLoading ? 'opacity-75' : ''}
      `}
      onClick={onFlip}
      onTouchStart={touchGestures.onTouchStart}
      onTouchMove={touchGestures.onTouchMove}
      onTouchEnd={touchGestures.onTouchEnd}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-pressed={isFlipped}
      aria-label={`Tarjeta de vocabulario: ${cardData.english}. Presiona Enter para voltear, flechas para navegar, Ctrl+S para reproducir audio.`}
      aria-describedby="flashcard-instructions"
    >
      {/* Instructions for screen readers */}
      <div id="flashcard-instructions" className="sr-only">
        Esta es una tarjeta de vocabulario interactiva. Presiona Enter o la barra espaciadora para voltear la tarjeta.
        Usa las flechas izquierda y derecha para navegar entre tarjetas.
        Presiona Ctrl+S para reproducir el audio de la palabra.
      </div>

      {/* Swipe indicator for mobile */}
      <div className="swipe-indicator md:hidden" aria-hidden="true">
        <span className="text-xs">👆 Toca para voltear • 👈👉 Desliza para navegar</span>
      </div>

      {/* Sync status indicator */}
      {userId && (
        <div className="absolute top-2 right-2 z-10">
          <MiniSyncIndicator userId={userId} className="text-xs" />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20 rounded-2xl">
          <div className="bg-white/90 rounded-lg p-3 flex items-center space-x-2">
            <LoadingSpinner size="sm" color="primary" />
            <span className="text-sm text-gray-700">
              Loading...
            </span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute top-2 left-2 right-2 z-10">
          <div className="bg-red-100 border border-red-300 text-red-800 px-3 py-2 rounded-lg text-xs">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  flashcardsActions.clearError();
                }}
                className="text-red-600 hover:text-red-800 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-700 ease-in-out ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Face */}
        <div className="card-front absolute inset-0 w-full h-full rounded-2xl shadow-xl p-mobile flex flex-col items-center justify-center backface-hidden group-hover:shadow-glow-primary transition-shadow duration-300 border border-primary-200/50 dark:border-primary-700/50 bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center space-mobile-y text-center">
            <div className="flex items-start gap-3">
              <h2 className="text-mobile-2xl md:text-6xl font-extrabold text-primary-800 dark:text-primary-200 leading-tight tracking-tight break-words animate-fade-in">
                {cardData.english}
              </h2>
              <button
                onClick={(e) => handlePlaySound(e, cardData.english)}
                disabled={isSpeaking || isLoadingAudio}
                className="touch-target text-primary-500 hover:text-primary-700 disabled:text-primary-300 dark:text-primary-400 dark:hover:text-primary-300 dark:disabled:text-primary-600 transition-all duration-200 p-3 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900 hover:scale-110 active:scale-95 disabled:hover:scale-100 flex-shrink-0 mt-2 group/btn touch-feedback relative"
                aria-label={`Reproducir audio de ${cardData.english}`}
                aria-describedby="audio-status"
              >
                <SpeakerIcon />
                {(isSpeaking || isLoadingAudio) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isLoadingAudio ? (
                      <LoadingSpinner size="sm" color="primary" />
                    ) : (
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                )}
              </button>
              <div id="audio-status" className="sr-only">
                {isSpeaking ? 'Reproduciendo audio...' : isLoadingAudio ? 'Cargando audio...' : 'Audio listo para reproducir'}
              </div>
            </div>
            <div
              className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/50 px-4 py-2 rounded-full border border-primary-200 dark:border-primary-700"
              aria-hidden="true"
            >
              <span className="animate-pulse">💡</span>
              <span>Haz clic para revelar la traducción</span>
            </div>
          </div>
        </div>

        {/* Back Face */}
        <div className="card-back absolute inset-0 w-full h-full rounded-2xl shadow-xl p-mobile flex flex-col backface-hidden rotate-y-180 group-hover:shadow-glow-secondary transition-shadow duration-300 border border-secondary-200/50 dark:border-secondary-700/50 overflow-hidden bg-white dark:bg-gray-800">
          <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-mobile-xl md:text-5xl font-bold text-secondary-800 dark:text-secondary-200 leading-tight tracking-tight break-words animate-slide-up flex-1">
                {cardData.spanish}
              </h3>
              <button
                onClick={(e) => handlePlaySound(e, cardData.spanish)}
                disabled={isSpeaking || isLoadingAudio}
                className="touch-target text-secondary-500 hover:text-secondary-700 disabled:text-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-300 dark:disabled:text-secondary-600 transition-all duration-200 p-3 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-900 hover:scale-110 active:scale-95 disabled:hover:scale-100 flex-shrink-0 ml-3 group/btn touch-feedback relative"
                aria-label={`Reproducir audio de ${cardData.spanish}`}
              >
                <SpeakerIcon />
                {(isSpeaking || isLoadingAudio) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isLoadingAudio ? (
                      <LoadingSpinner size="sm" color="secondary" />
                    ) : (
                      <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col space-mobile-y overflow-y-auto touch-scroll">
              {cardData.image && (
                <div className="relative group/image">
                  <OptimizedImage
                    src={cardData.image}
                    alt={`Visual aid for ${cardData.english}`}
                    className="w-full max-h-36 sm:max-h-40 md:max-h-44 object-contain rounded-xl shadow-md border-2 border-secondary-200 group-hover/image:border-secondary-300 transition-all duration-200"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    quality={85}
                    priority={false}
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
                          <span className="text-xs font-bold text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-900 px-2 py-1 rounded-md uppercase tracking-wide">EN</span>
                          <div className="h-px bg-primary-200 dark:bg-primary-700 flex-1"></div>
                        </div>
                        <p className="text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed">
                          {cardData.exampleEnglish}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handlePlaySound(e, cardData.exampleEnglish)}
                        disabled={isSpeaking || isLoadingAudio}
                        className="touch-target text-primary-500 hover:text-primary-700 disabled:text-primary-300 transition-all duration-200 p-2 rounded-full hover:bg-primary-100 hover:scale-110 active:scale-95 disabled:hover:scale-100 flex-shrink-0 touch-feedback relative"
                        aria-label={`Reproducir audio del ejemplo en inglés`}
                      >
                        <SpeakerIcon />
                        {(isSpeaking || isLoadingAudio) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {isLoadingAudio ? (
                              <LoadingSpinner size="sm" color="primary" />
                            ) : (
                              <div className="w-1 h-1 bg-primary-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        )}
                      </button>
                    </div>

                    {cardData.exampleSpanish && (
                      <div className="pt-2 border-t border-primary-200/40">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-secondary-600 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-900 px-2 py-1 rounded-md uppercase tracking-wide">ES</span>
                          <div className="h-px bg-secondary-200 dark:bg-secondary-700 flex-1"></div>
                        </div>
                        <p className="text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed">
                          {cardData.exampleSpanish}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quality Response Controls for SM-2 Algorithm */}
            {onQualityResponse && (
              <div className="mt-4 pt-4 border-t border-secondary-200/40 dark:border-secondary-700/40">
                <div className="text-center space-y-3">
                  <div className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    ¿Qué tan bien recordaste esta palabra?
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { value: 0, label: 'Otra vez', emoji: '😵', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
                      { value: 1, label: 'Difícil', emoji: '😰', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
                      { value: 2, label: 'Buena', emoji: '😐', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
                      { value: 3, label: 'Fácil', emoji: '😊', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
                      { value: 4, label: 'Muy fácil', emoji: '😄', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' }
                    ].map(({ value, label, emoji, color }) => (
                      <button
                        key={value}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQualityResponse(value);
                        }}
                        disabled={qualityResponse !== null}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${color}
                          ${qualityResponse === value ? 'ring-2 ring-primary-500 scale-105' : ''}
                        `}
                        aria-label={`Calidad de recuerdo: ${label}`}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{emoji}</span>
                          <span>{label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {qualityResponse !== null && (
                    <div className="text-xs text-secondary-500 animate-pulse">
                      Procesando respuesta...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Hint */}
            {!onQualityResponse && (
              <div className="mt-4 pt-4 border-t border-secondary-200/40 dark:border-secondary-700/40">
                <div
                  className="flex items-center justify-center gap-2 text-sm font-medium text-secondary-600 dark:text-secondary-300"
                  aria-hidden="true"
                >
                  <span className="animate-pulse">🔄</span>
                  <span>Haz clic para voltear de vuelta</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;