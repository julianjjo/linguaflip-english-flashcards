import React, { useState, useEffect, useCallback } from 'react';
import Flashcard from './components/Flashcard';
import Navigation from './components/Navigation';
import RecallQualityControls, { RecallQuality } from './components/RecallQualityControls';
import ManualCardForm from './components/ManualCardForm';
import { INITIAL_FLASHCARDS_DATA, DEFAULT_EASINESS_FACTOR, MIN_EASINESS_FACTOR, LEARNING_STEPS_DAYS } from './constants';
import { FlashcardData } from './types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Assume process.env.API_KEY is available in the execution environment
const API_KEY = process.env.API_KEY;

interface AiGeneratedCard {
  english: string;
  spanish: string;
  exampleEnglish: string;
  exampleSpanish: string;
}

interface AiManualCardResponse {
  spanish: string;
  exampleEnglish: string;
  exampleSpanish: string;
}

const App: React.FC = () => {
  const [allCards, setAllCards] = useState<FlashcardData[]>([]);
  const [reviewDeck, setReviewDeck] = useState<FlashcardData[]>([]);
  const [currentReviewCardIndex, setCurrentReviewCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [isCreatingManualCard, setIsCreatingManualCard] = useState<boolean>(false);
  const [manualCreationError, setManualCreationError] = useState<string | null>(null);

  const getTodayDateString = useCallback(() => new Date().toISOString().split('T')[0], []);

  // Initialize or load cards from localStorage
  useEffect(() => {
    setIsLoading(true);
    let storedCards = null;
    try {
      const storedCardsString = localStorage.getItem('linguaFlipCards');
      if (storedCardsString) {
        storedCards = JSON.parse(storedCardsString) as FlashcardData[];
      }
    } catch (error) {
      console.error("Failed to parse cards from localStorage:", error);
      localStorage.removeItem('linguaFlipCards'); 
    }
    

    if (storedCards && storedCards.length > 0) {
      const migratedCards = storedCards.map(card => ({
        ...card,
        dueDate: card.dueDate || getTodayDateString(),
        interval: card.interval === undefined ? 0 : card.interval,
        easinessFactor: card.easinessFactor || DEFAULT_EASINESS_FACTOR,
        repetitions: card.repetitions === undefined ? 0 : card.repetitions,
        lastReviewed: card.lastReviewed || null,
        image: card.image || `https://picsum.photos/320/180?random=${card.id}` // Ensure image for older cards
      }));
      setAllCards(migratedCards);
    } else {
      const today = getTodayDateString();
      const initialCards = INITIAL_FLASHCARDS_DATA.map(card => ({
        ...card,
        dueDate: today,
        interval: 0,
        easinessFactor: DEFAULT_EASINESS_FACTOR,
        repetitions: 0,
        lastReviewed: null,
        image: card.image || `https://picsum.photos/320/180?random=${card.id}`
      }));
      setAllCards(initialCards);
      localStorage.setItem('linguaFlipCards', JSON.stringify(initialCards));
    }
    setIsLoading(false);
  }, [getTodayDateString]);

  // Build review deck
  const buildReviewDeck = useCallback(() => {
    if (isLoading || allCards.length === 0) return;

    const today = getTodayDateString();
    const dueCards = allCards
      .filter(card => new Date(card.dueDate) <= new Date(today))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const newCards = allCards.filter(card => card.repetitions === 0 && !dueCards.find(dc => dc.id === card.id));
    const cardsToReview = [...dueCards];
    
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

    setReviewDeck(cardsToReview);
    setCurrentReviewCardIndex(0);
    setIsFlipped(false);
    setSessionCompleted(cardsToReview.length === 0 && allCards.length > 0);
  }, [allCards, isLoading, getTodayDateString]);


  useEffect(() => {
    buildReviewDeck();
  }, [allCards, isLoading, buildReviewDeck]);


  const handleFlip = useCallback(() => {
    if (reviewDeck.length > 0) {
      setIsFlipped(prev => !prev);
    }
  }, [reviewDeck]);

  const handleRecallQuality = useCallback((quality: RecallQuality) => {
    if (currentReviewCardIndex >= reviewDeck.length) return;

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

    const updatedAllCards = allCards.map(c => c.id === updatedCard.id ? updatedCard : c);
    setAllCards(updatedAllCards);
    localStorage.setItem('linguaFlipCards', JSON.stringify(updatedAllCards));

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
      // For Hard, Good, Easy: advance to the next card or complete session.
      if (currentReviewCardIndex < reviewDeck.length - 1) {
        setCurrentReviewCardIndex(prev => prev + 1);
      } else {
        setSessionCompleted(true);
      }
    }
  }, [currentReviewCardIndex, reviewDeck, allCards, getTodayDateString]);

  const handleGenerateAICards = async () => {
    if (!API_KEY) {
      setGenerationError("API Key is not configured. Cannot generate cards.");
      console.error("API Key is missing.");
      return;
    }
    setIsGeneratingCards(true);
    setGenerationError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const existingWords = allCards.map(card => card.english.toLowerCase()).join(', ') || "None";
      
      const prompt = `You are an expert AI assistant creating English vocabulary flashcards for a Spanish speaker.
Your primary directive is to generate 3 completely new flashcards.

CRITICAL RULE: Do NOT generate any words or phrases that are already on this list. This is the user's existing vocabulary list:
[${existingWords}]

Your task is to generate 3 flashcards that are complementary to the user's existing list, suitable for a beginner to intermediate level. Focus on common English words or short, useful phrases.

For each of the 3 new flashcards, provide:
1. "english": The English word or short common phrase (string).
2. "spanish": Its Spanish translation (string).
3. "exampleEnglish": A simple example sentence in English using the word/phrase (string).
4. "exampleSpanish": The Spanish translation of the example sentence (string).

Your entire response MUST be a single, valid JSON array containing exactly 3 objects. Each object must strictly follow the structure:
{ "english": "string", "spanish": "string", "exampleEnglish": "string", "exampleSpanish": "string" }

Do not include any other text, explanations, or markdown formatting like \`\`\`json ... \`\`\` before or after the JSON array. Your output must be only the raw JSON.`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      const aiGeneratedItems: AiGeneratedCard[] = JSON.parse(jsonStr);

      if (!Array.isArray(aiGeneratedItems) || aiGeneratedItems.some(item => 
          typeof item.english !== 'string' || 
          typeof item.spanish !== 'string' ||
          typeof item.exampleEnglish !== 'string' ||
          typeof item.exampleSpanish !== 'string'
      )) {
        throw new Error("AI response is not in the expected format of an array of card objects.");
      }
      
      const newFlashcards: FlashcardData[] = aiGeneratedItems
        .filter(item => !allCards.some(existingCard => existingCard.english.toLowerCase() === item.english.toLowerCase()))
        .map((item, index) => {
          const newId = (allCards.length > 0 ? Math.max(...allCards.map(c => c.id)) : 0) + 1 + index;
          return {
            ...item,
            id: newId,
            dueDate: getTodayDateString(),
            interval: 0,
            easinessFactor: DEFAULT_EASINESS_FACTOR,
            repetitions: 0,
            lastReviewed: null,
            image: `https://picsum.photos/320/180?random=${newId}`,
          };
        });

      if (newFlashcards.length > 0) {
        const updatedAllCards = [...allCards, ...newFlashcards];
        setAllCards(updatedAllCards);
        localStorage.setItem('linguaFlipCards', JSON.stringify(updatedAllCards));
        setSessionCompleted(false); 
      } else {
        setGenerationError("AI could not generate new unique cards. Try again later or add cards manually.");
      }

    } catch (error) {
      console.error("Failed to generate AI cards:", error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      setGenerationError(`Failed to generate cards. ${errorMessage}`);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleAddManualCard = async (englishWord: string) => {
    if (!API_KEY) {
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
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const prompt = `You are an AI assistant for a language learning app. The user wants to create a flashcard for the English word/phrase: "${englishWord}".
      
Provide the following:
1. "spanish": The most common and accurate Spanish translation for "${englishWord}".
2. "exampleEnglish": A simple and clear example sentence in English that uses "${englishWord}".
3. "exampleSpanish": The Spanish translation of the example sentence.
      
Return your response as a single, valid JSON object strictly following this structure: { "spanish": "string", "exampleEnglish": "string", "exampleSpanish": "string" }
Do not include any other text, explanations, or markdown formatting like \`\`\`json ... \`\`\` before or after the JSON object.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        const cardDetails: AiManualCardResponse = JSON.parse(jsonStr);

        if (!cardDetails.spanish || !cardDetails.exampleEnglish || !cardDetails.exampleSpanish) {
            throw new Error("AI response was missing required fields.");
        }
      
        const newId = (allCards.length > 0 ? Math.max(...allCards.map(c => c.id)) : 0) + 1;
        const newCard: FlashcardData = {
            id: newId,
            english: englishWord,
            spanish: cardDetails.spanish,
            exampleEnglish: cardDetails.exampleEnglish,
            exampleSpanish: cardDetails.exampleSpanish,
            dueDate: getTodayDateString(),
            interval: 0,
            easinessFactor: DEFAULT_EASINESS_FACTOR,
            repetitions: 0,
            lastReviewed: null,
            image: `https://picsum.photos/320/180?random=${newId}`,
        };

        const updatedAllCards = [...allCards, newCard];
        setAllCards(updatedAllCards);
        localStorage.setItem('linguaFlipCards', JSON.stringify(updatedAllCards));
      
        setShowManualForm(false);
        setSessionCompleted(false);

    } catch (error) {
        console.error("Failed to create manual card:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setManualCreationError(`Failed to create card. ${errorMessage}`);
    } finally {
        setIsCreatingManualCard(false);
    }
  };

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

  const currentCardData = reviewDeck.length > 0 && currentReviewCardIndex < reviewDeck.length 
                          ? reviewDeck[currentReviewCardIndex] 
                          : null;
  
  const refreshDeckAndSession = () => {
    setIsLoading(true); 
    setAllCards(prev => [...prev]); 
    setSessionCompleted(false); 
    setCurrentReviewCardIndex(0); 
    setIsFlipped(false); 
    setTimeout(() => setIsLoading(false), 50); 
  };

  if (isLoading && !isGeneratingCards) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-400 to-indigo-600 p-4 text-slate-800">
        <h1 className="text-4xl sm:text-5xl font-bold text-white shadow-sm">LinguaFlip</h1>
        <p className="text-xl text-sky-100 mt-4">Loading your learning journey...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-400 to-indigo-600 p-4 text-slate-800">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white shadow-sm">LinguaFlip</h1>
        <p className="text-lg text-sky-100">Learn English with Spaced Repetition</p>
      </header>
      
      {generationError && (
        <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-sm w-full max-w-md text-center" role="alert">
          <p>{generationError}</p>
        </div>
      )}

      {sessionCompleted || (reviewDeck.length === 0 && !isLoading) ? (
        <div className="text-center bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">
            {allCards.length === 0 ? "Welcome!" : (sessionCompleted && reviewDeck.length > 0 ? "Great job!" : "All caught up!")}
          </h2>
          <p className="text-slate-700">
            {allCards.length === 0 ? "Let's start by generating some cards." : 
             (sessionCompleted && reviewDeck.length > 0 ? "You've completed all reviews for today." : "No cards due for review right now.")}
          </p>
          <p className="text-slate-600 mt-2">
            {allCards.length > 0 && "Come back tomorrow or generate new cards!"}
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
                onClick={handleGenerateAICards}
                disabled={isGeneratingCards || !API_KEY}
                className={`px-4 py-3 font-semibold rounded-lg shadow-md transition-colors w-full
                            ${isGeneratingCards || !API_KEY ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                                                    : 'bg-teal-500 hover:bg-teal-600 text-white'}`}
                aria-live="polite"
            >
                {isGeneratingCards ? 'Generating...' : 'Generate AI Cards'}
            </button>
            <button
                onClick={() => { setShowManualForm(true); setManualCreationError(null); }}
                disabled={!API_KEY}
                className={`px-4 py-3 font-semibold rounded-lg shadow-md transition-colors w-full
                            ${!API_KEY ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                                        : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
            >
                Create Manually
            </button>
          </div>
           <button 
            onClick={refreshDeckAndSession}
            className="mt-4 w-full px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 transition-colors"
          >
            Refresh Deck
          </button>
          {!API_KEY && <p className="text-xs text-red-500 mt-2">AI Card Generation disabled: API Key missing.</p>}
        </div>
      ) : currentCardData ? (
        <>
          <Flashcard
            key={currentCardData.id}
            cardData={currentCardData}
            isFlipped={isFlipped}
            onFlip={handleFlip}
          />
          {isFlipped && (
            <RecallQualityControls onRate={handleRecallQuality} />
          )}
          <Navigation
            currentCardOrder={currentReviewCardIndex + 1}
            reviewDeckSize={reviewDeck.length}
          />
           <button
            onClick={() => { setShowManualForm(true); setManualCreationError(null); }}
            disabled={!API_KEY}
            className={`mt-8 px-4 py-2 text-sm font-semibold rounded-lg shadow transition-colors
                        ${!API_KEY ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                                             : 'bg-sky-500 hover:bg-sky-600 text-white'}`}
            aria-live="polite"
          >
             Add New Card
          </button>
           {!API_KEY && currentCardData && <p className="text-xs text-sky-200 mt-1">AI Card Generation disabled: API Key missing.</p>}
        </>
      ) : ( 
         <div className="text-center bg-white p-8 rounded-xl shadow-2xl">
             <h2 className="text-2xl font-semibold text-sky-700 mb-4">Preparing your cards...</h2>
             <p className="text-slate-600">Just a moment.</p>
         </div>
      )}

      {showManualForm && (
        <ManualCardForm
          onAddCard={handleAddManualCard}
          onClose={() => {
            setShowManualForm(false);
            setManualCreationError(null);
          }}
          isCreating={isCreatingManualCard}
          creationError={manualCreationError}
        />
      )}

      <footer className="mt-10 text-center text-sky-200 text-sm">
        <p>&copy; {new Date().getFullYear()} LinguaFlip. Spaced repetition for effective learning.</p>
      </footer>
    </div>
  );
};

export default App;