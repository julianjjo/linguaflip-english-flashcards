import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import type { FlashcardData } from '@/types/index';
import { useTouchGestures } from './TouchGestureHandler';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useApp } from './AppProvider';
import OptimizedImage from './OptimizedImage';
import LoadingSpinner from './LoadingSpinner';
import {
  flashcardsActions,
  flashcardsLoadingStore,
  flashcardsErrorStore,
} from '@/stores/flashcards';
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
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
  </svg>
);

const Flashcard: React.FC<FlashcardProps> = ({
  cardData,
  isFlipped,
  onFlip,
  onNextCard,
  onPreviousCard,
  userId,
  onQualityResponse,
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
      await flashcardsActions.processQualityResponse(
        cardData.id,
        quality,
        0,
        userId
      );

      // Call the optional callback
      if (onQualityResponse) {
        await onQualityResponse(quality);
      }
    } catch (error) {
      console.error('Failed to process quality response:', error);
      showError(
        'Error processing response',
        'Failed to update card difficulty'
      );
    } finally {
      setQualityResponse(null);
    }
  };

  const handlePlaySound = async (
    event: React.MouseEvent,
    textToSpeak?: string
  ) => {
    event.stopPropagation(); // Prevent card from flipping
    if (!textToSpeak) return;

    if (!preferences.enableSound) {
      showInfo(
        'Audio deshabilitado',
        'El audio está desactivado en la configuración'
      );
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
    enableHapticFeedback: true,
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
          handlePlaySound(
            e as unknown as React.MouseEvent<HTMLElement>,
            cardData.english
          );
        }
        break;
    }
  };

  return (
    <div
      className={`flashcard-mobile perspective touch-feedback focus-mobile group relative cursor-pointer touch-manipulation ${preferences.highContrast ? 'high-contrast' : ''} ${preferences.largeText ? 'text-lg' : ''} ${preferences.reduceMotion ? 'motion-reduce' : ''} ${isLoading ? 'opacity-75' : ''} `}
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
        Esta es una tarjeta de vocabulario interactiva. Presiona Enter o la
        barra espaciadora para voltear la tarjeta. Usa las flechas izquierda y
        derecha para navegar entre tarjetas. Presiona Ctrl+S para reproducir el
        audio de la palabra.
      </div>

      {/* Swipe indicator for mobile */}
      <div className="swipe-indicator md:hidden" aria-hidden="true">
        <span className="text-xs">
          👆 Toca para voltear • 👈👉 Desliza para navegar
        </span>
      </div>

      {/* Sync status indicator */}
      {userId && (
        <div className="absolute right-2 top-2 z-10">
          <MiniSyncIndicator userId={userId} className="text-xs" />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/20">
          <div className="flex items-center space-x-2 rounded-lg bg-white/90 p-3">
            <LoadingSpinner size="sm" color="primary" />
            <span className="text-sm text-gray-700">Loading...</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute left-2 right-2 top-2 z-10">
          <div className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-xs text-red-800">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  flashcardsActions.clearError();
                }}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`transform-style-preserve-3d relative h-full w-full transition-transform duration-700 ease-in-out ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Face */}
        <div className="card-front p-mobile backface-hidden border-primary-200/50 dark:border-primary-700/50 absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-2xl border bg-white shadow-xl transition-shadow duration-300 group-hover:shadow-glow-primary dark:bg-gray-800">
          <div className="space-mobile-y flex flex-col items-center text-center">
            <div className="flex items-start gap-3">
              <h2 className="text-mobile-2xl animate-fade-in break-words font-extrabold leading-tight tracking-tight text-primary-800 dark:text-primary-200 md:text-6xl">
                {cardData.english}
              </h2>
              <button
                onClick={(e) => handlePlaySound(e, cardData.english)}
                disabled={isSpeaking || isLoadingAudio}
                className="touch-target group/btn touch-feedback relative mt-2 flex-shrink-0 rounded-full p-3 text-primary-500 transition-all duration-200 hover:scale-110 hover:bg-primary-100 hover:text-primary-700 active:scale-95 disabled:text-primary-300 disabled:hover:scale-100 dark:text-primary-400 dark:hover:bg-primary-900 dark:hover:text-primary-300 dark:disabled:text-primary-600"
                aria-label={`Reproducir audio de ${cardData.english}`}
                aria-describedby="audio-status"
              >
                <SpeakerIcon />
                {(isSpeaking || isLoadingAudio) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isLoadingAudio ? (
                      <LoadingSpinner size="sm" color="primary" />
                    ) : (
                      <div className="h-2 w-2 animate-pulse rounded-full bg-primary-500"></div>
                    )}
                  </div>
                )}
              </button>
              <div id="audio-status" className="sr-only">
                {isSpeaking
                  ? 'Reproduciendo audio...'
                  : isLoadingAudio
                    ? 'Cargando audio...'
                    : 'Audio listo para reproducir'}
              </div>
            </div>
            <div
              className="dark:bg-primary-900/50 flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-600 dark:border-primary-700 dark:text-primary-300"
              aria-hidden="true"
            >
              <span className="animate-pulse">💡</span>
              <span>Haz clic para revelar la traducción</span>
            </div>
          </div>
        </div>

        {/* Back Face */}
        <div className="card-back p-mobile backface-hidden rotate-y-180 border-secondary-200/50 dark:border-secondary-700/50 absolute inset-0 flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-xl transition-shadow duration-300 group-hover:shadow-glow-secondary dark:bg-gray-800">
          <div className="flex h-full flex-col">
            {/* Header Section */}
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-mobile-xl flex-1 animate-slide-up break-words font-bold leading-tight tracking-tight text-secondary-800 dark:text-secondary-200 md:text-5xl">
                {cardData.spanish}
              </h3>
              <button
                onClick={(e) => handlePlaySound(e, cardData.spanish)}
                disabled={isSpeaking || isLoadingAudio}
                className="touch-target group/btn touch-feedback relative ml-3 flex-shrink-0 rounded-full p-3 text-secondary-500 transition-all duration-200 hover:scale-110 hover:bg-secondary-100 hover:text-secondary-700 active:scale-95 disabled:text-secondary-300 disabled:hover:scale-100 dark:text-secondary-400 dark:hover:bg-secondary-900 dark:hover:text-secondary-300 dark:disabled:text-secondary-600"
                aria-label={`Reproducir audio de ${cardData.spanish}`}
              >
                <SpeakerIcon />
                {(isSpeaking || isLoadingAudio) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isLoadingAudio ? (
                      <LoadingSpinner size="sm" color="secondary" />
                    ) : (
                      <div className="h-2 w-2 animate-pulse rounded-full bg-secondary-500"></div>
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Content Section */}
            <div className="space-mobile-y touch-scroll flex flex-1 flex-col overflow-y-auto">
              {cardData.image && (
                <div className="group/image relative">
                  <OptimizedImage
                    src={cardData.image}
                    alt={`Visual aid for ${cardData.english}`}
                    className="max-h-36 w-full rounded-xl border-2 border-secondary-200 object-contain shadow-md transition-all duration-200 group-hover/image:border-secondary-300 sm:max-h-40 md:max-h-44"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    quality={85}
                    priority={false}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover/image:opacity-100"></div>
                </div>
              )}

              {cardData.exampleEnglish && (
                <div className="from-primary-50/80 to-secondary-50/80 border-primary-200/60 rounded-xl border bg-gradient-to-br p-5 shadow-sm backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-md bg-primary-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-primary-600 dark:bg-primary-900 dark:text-primary-300">
                            EN
                          </span>
                          <div className="h-px flex-1 bg-primary-200 dark:bg-primary-700"></div>
                        </div>
                        <p className="font-medium leading-relaxed text-neutral-800 dark:text-neutral-200">
                          {cardData.exampleEnglish}
                        </p>
                      </div>
                      <button
                        onClick={(e) =>
                          handlePlaySound(e, cardData.exampleEnglish)
                        }
                        disabled={isSpeaking || isLoadingAudio}
                        className="touch-target touch-feedback relative flex-shrink-0 rounded-full p-2 text-primary-500 transition-all duration-200 hover:scale-110 hover:bg-primary-100 hover:text-primary-700 active:scale-95 disabled:text-primary-300 disabled:hover:scale-100"
                        aria-label={`Reproducir audio del ejemplo en inglés`}
                      >
                        <SpeakerIcon />
                        {(isSpeaking || isLoadingAudio) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {isLoadingAudio ? (
                              <LoadingSpinner size="sm" color="primary" />
                            ) : (
                              <div className="h-1 w-1 animate-pulse rounded-full bg-primary-500"></div>
                            )}
                          </div>
                        )}
                      </button>
                    </div>

                    {cardData.exampleSpanish && (
                      <div className="border-primary-200/40 border-t pt-2">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-md bg-secondary-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary-600 dark:bg-secondary-900 dark:text-secondary-300">
                            ES
                          </span>
                          <div className="h-px flex-1 bg-secondary-200 dark:bg-secondary-700"></div>
                        </div>
                        <p className="font-medium leading-relaxed text-neutral-700 dark:text-neutral-300">
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
              <div className="border-secondary-200/40 dark:border-secondary-700/40 mt-4 border-t pt-4">
                <div className="space-y-3 text-center">
                  <div className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    ¿Qué tan bien recordaste esta palabra?
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      {
                        value: 0,
                        label: 'Otra vez',
                        emoji: '😵',
                        color: 'bg-red-100 text-red-800 hover:bg-red-200',
                      },
                      {
                        value: 1,
                        label: 'Difícil',
                        emoji: '😰',
                        color:
                          'bg-orange-100 text-orange-800 hover:bg-orange-200',
                      },
                      {
                        value: 2,
                        label: 'Buena',
                        emoji: '😐',
                        color:
                          'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
                      },
                      {
                        value: 3,
                        label: 'Fácil',
                        emoji: '😊',
                        color: 'bg-green-100 text-green-800 hover:bg-green-200',
                      },
                      {
                        value: 4,
                        label: 'Muy fácil',
                        emoji: '😄',
                        color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
                      },
                    ].map(({ value, label, emoji, color }) => (
                      <button
                        key={value}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQualityResponse(value);
                        }}
                        disabled={qualityResponse !== null}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${color} ${qualityResponse === value ? 'scale-105 ring-2 ring-primary-500' : ''} `}
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
                    <div className="animate-pulse text-xs text-secondary-500">
                      Procesando respuesta...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Hint */}
            {!onQualityResponse && (
              <div className="border-secondary-200/40 dark:border-secondary-700/40 mt-4 border-t pt-4">
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
