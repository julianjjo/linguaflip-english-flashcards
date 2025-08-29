import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { FlashcardData } from '../types';
import { DEFAULT_EASINESS_FACTOR } from '../constants';
import {
  validateGeminiApiKey,
  sanitizeTextInput,
  validatePrompt,
  checkRateLimit,
  SecurityError,
  loadSecurityConfig
} from './security';
import type { SecurityConfig } from './security';

export interface AiGeneratedCard {
  english: string;
  spanish: string;
  exampleEnglish: string;
  exampleSpanish: string;
}

export interface AiManualCardResponse {
  spanish: string;
  exampleEnglish: string;
  exampleSpanish: string;
}

export class AICardGenerator {
  private ai: GoogleGenAI;
  private securityConfig: SecurityConfig;
  private userIdentifier: string;

  constructor(apiKey?: string, userIdentifier: string = 'default-user') {
    this.userIdentifier = userIdentifier;

    // Load security configuration
    try {
      this.securityConfig = loadSecurityConfig();
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError('Failed to load security configuration', 'CONFIG_LOAD_ERROR');
    }

    // Use provided API key or load from secure config
    const keyToUse = apiKey || this.securityConfig.geminiApiKey;

    // Validate API key format
    if (!validateGeminiApiKey(keyToUse)) {
      throw new SecurityError('Invalid API key format', 'INVALID_API_KEY_FORMAT');
    }

    this.ai = new GoogleGenAI({ apiKey: keyToUse });
  }

  async generateBulkCards(existingWords: string[]): Promise<AiGeneratedCard[]> {
    // Check rate limiting
    const rateLimitResult = checkRateLimit(
      `bulk-cards-${this.userIdentifier}`,
      this.securityConfig.rateLimitMaxRequests,
      this.securityConfig.rateLimitWindowMs
    );

    if (!rateLimitResult.allowed) {
      throw new SecurityError(
        `Rate limit exceeded. Please wait before making another request.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Sanitize existing words
    const sanitizedExistingWords = existingWords.map(word => sanitizeTextInput(word)).filter(word => word.length > 0);

    // Create and validate prompt
    const prompt = `You are an expert AI assistant creating English vocabulary flashcards for a Spanish speaker.
Your primary directive is to generate 3 completely new flashcards.

CRITICAL RULE: Do NOT generate any words or phrases that are already on this list. This is the user's existing vocabulary list:
[${sanitizedExistingWords.join(', ')}]

Your task is to generate 3 flashcards that are complementary to the user's existing list, suitable for a beginner to intermediate level. Focus on common English words or short, useful phrases.

For each of the 3 new flashcards, provide:
1. "english": The English word or short common phrase (string).
2. "spanish": Its Spanish translation (string).
3. "exampleEnglish": A simple example sentence in English using the word/phrase (string).
4. "exampleSpanish": The Spanish translation of the example sentence (string).

Your entire response MUST be a single, valid JSON array containing exactly 3 objects. Each object must strictly follow the structure:
{ "english": "string", "spanish": "string", "exampleEnglish": "string", "exampleSpanish": "string" }

Do not include any other text, explanations, or markdown formatting like \`\`\`json ... \`\`\` before or after the JSON array. Your output must be only the raw JSON.`;

    // Validate prompt
    const promptValidation = validatePrompt(prompt, this.securityConfig.maxPromptLength);
    if (!promptValidation.isValid) {
      throw new SecurityError(`Prompt validation failed: ${promptValidation.error}`, 'INVALID_PROMPT');
    }

    console.log(`[SECURITY] Generating bulk cards for user ${this.userIdentifier}`);

    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text?.trim() || '';
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

    return aiGeneratedItems;
  }

  async generateManualCard(englishWord: string): Promise<AiManualCardResponse> {
    // Check rate limiting
    const rateLimitResult = checkRateLimit(
      `manual-card-${this.userIdentifier}`,
      this.securityConfig.rateLimitMaxRequests,
      this.securityConfig.rateLimitWindowMs
    );

    if (!rateLimitResult.allowed) {
      throw new SecurityError(
        `Rate limit exceeded. Please wait before making another request.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Sanitize input
    const sanitizedWord = sanitizeTextInput(englishWord);
    if (!sanitizedWord || sanitizedWord.length === 0) {
      throw new SecurityError('Invalid input: word cannot be empty after sanitization', 'INVALID_INPUT');
    }

    if (sanitizedWord.length > 100) {
      throw new SecurityError('Input too long: maximum 100 characters allowed', 'INPUT_TOO_LONG');
    }

    const prompt = `You are an AI assistant for a language learning app. The user wants to create a flashcard for the English word/phrase: "${sanitizedWord}".

Provide the following:
1. "spanish": The most common and accurate Spanish translation for "${sanitizedWord}".
2. "exampleEnglish": A simple and clear example sentence in English that uses "${sanitizedWord}".
3. "exampleSpanish": The Spanish translation of the example sentence.

Return your response as a single, valid JSON object strictly following this structure: { "spanish": "string", "exampleEnglish": "string", "exampleSpanish": "string" }
Do not include any other text, explanations, or markdown formatting like \`\`\`json ... \`\`\` before or after the JSON object.`;

    // Validate prompt
    const promptValidation = validatePrompt(prompt, this.securityConfig.maxPromptLength);
    if (!promptValidation.isValid) {
      throw new SecurityError(`Prompt validation failed: ${promptValidation.error}`, 'INVALID_PROMPT');
    }

    console.log(`[SECURITY] Generating manual card for word "${sanitizedWord}" by user ${this.userIdentifier}`);

    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text?.trim() || '';
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const cardDetails: AiManualCardResponse = JSON.parse(jsonStr);

    if (!cardDetails.spanish || !cardDetails.exampleEnglish || !cardDetails.exampleSpanish) {
      throw new Error("AI response was missing required fields.");
    }

    return cardDetails;
  }
}

export const createFlashcardFromAIGenerated = (
  aiCard: AiGeneratedCard,
  existingCards: FlashcardData[],
  getTodayDateString: () => string
): FlashcardData => {
  const newId = (existingCards.length > 0 ? Math.max(...existingCards.map(c => c.id)) : 0) + 1;

  return {
    ...aiCard,
    id: newId,
    dueDate: getTodayDateString(),
    interval: 0,
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    repetitions: 0,
    lastReviewed: null,
    image: `https://picsum.photos/320/180?random=${newId}`,
  };
};

export const createFlashcardFromManual = (
  englishWord: string,
  aiResponse: AiManualCardResponse,
  existingCards: FlashcardData[],
  getTodayDateString: () => string
): FlashcardData => {
  const newId = (existingCards.length > 0 ? Math.max(...existingCards.map(c => c.id)) : 0) + 1;

  return {
    id: newId,
    english: englishWord,
    spanish: aiResponse.spanish,
    exampleEnglish: aiResponse.exampleEnglish,
    exampleSpanish: aiResponse.exampleSpanish,
    dueDate: getTodayDateString(),
    interval: 0,
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    repetitions: 0,
    lastReviewed: null,
    image: `https://picsum.photos/320/180?random=${newId}`,
  };
};