/**
 * Fixtures para datos de prueba de flashcards
 * Genera datos únicos para evitar conflictos entre pruebas
 */

export interface TestFlashcard {
  cardId?: string;
  userId?: string;
  front: string;
  back: string;
  exampleFront?: string;
  exampleBack?: string;
  audioUrl?: string;
  imageUrl?: string;
  tags?: string[];
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  metadata?: {
    source?: string;
    createdByAI?: boolean;
    aiModel?: string;
    confidence?: number;
  };
  sm2?: {
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    nextReviewDate?: Date;
    lastReviewed?: Date;
    qualityResponses?: number[];
    totalReviews?: number;
    correctStreak?: number;
    incorrectStreak?: number;
    isSuspended?: boolean;
    suspensionReason?: string;
  };
  statistics?: {
    timesCorrect?: number;
    timesIncorrect?: number;
    averageResponseTime?: number;
    lastDifficulty?: 'easy' | 'medium' | 'hard';
  };
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export interface FlashcardFormData {
  front: string;
  back: string;
  exampleFront?: string;
  exampleBack?: string;
  category: string;
  tags?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Genera un ID único para flashcards usando timestamp
 */
export function generateUniqueCardId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `testcard_${timestamp}_${random}`;
}

/**
 * Genera una categoría única para pruebas
 */
export function generateUniqueCategory(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `test_category_${timestamp}_${random}`;
}

/**
 * Genera tags únicos para pruebas
 */
export function generateUniqueTags(count: number = 3): string[] {
  const timestamp = Date.now();
  const tags: string[] = [];
  for (let i = 0; i < count; i++) {
    const random = Math.random().toString(36).substring(2, 6);
    tags.push(`test_tag_${timestamp}_${random}_${i}`);
  }
  return tags;
}

/**
 * Datos de prueba para flashcard básica (texto simple)
 */
export function createBasicFlashcard(): TestFlashcard {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    cardId,
    front: `Front content for ${cardId}`,
    back: `Back content for ${cardId}`,
    category,
    tags: generateUniqueTags(2),
    difficulty: 'medium',
    metadata: {
      source: 'test-data',
      createdByAI: false,
    },
    sm2: {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
      qualityResponses: [],
      totalReviews: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      isSuspended: false,
    },
    statistics: {
      timesCorrect: 0,
      timesIncorrect: 0,
      averageResponseTime: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

/**
 * Datos de prueba para flashcard con audio
 */
export function createAudioFlashcard(): TestFlashcard {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    cardId,
    front: `Audio front content for ${cardId}`,
    back: `Audio back content for ${cardId}`,
    category,
    tags: generateUniqueTags(3),
    difficulty: 'hard',
    audioUrl: 'https://example.com/audio/test-audio.mp3',
    metadata: {
      source: 'test-audio-data',
      createdByAI: true,
      aiModel: 'test-tts-model',
      confidence: 0.85,
    },
    sm2: {
      easeFactor: 2.3,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      qualityResponses: [],
      totalReviews: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      isSuspended: false,
    },
    statistics: {
      timesCorrect: 0,
      timesIncorrect: 0,
      averageResponseTime: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

/**
 * Datos de prueba para flashcard con imagen
 */
export function createImageFlashcard(): TestFlashcard {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    cardId,
    front: `Image front content for ${cardId}`,
    back: `Image back content for ${cardId}`,
    exampleFront: `Example sentence in front language for ${cardId}`,
    exampleBack: `Example sentence in back language for ${cardId}`,
    category,
    tags: generateUniqueTags(4),
    difficulty: 'easy',
    imageUrl: 'https://example.com/images/test-image.jpg',
    metadata: {
      source: 'test-image-data',
      createdByAI: false,
    },
    sm2: {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      qualityResponses: [],
      totalReviews: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      isSuspended: false,
    },
    statistics: {
      timesCorrect: 0,
      timesIncorrect: 0,
      averageResponseTime: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

/**
 * Datos de prueba para flashcard con ejemplos
 */
export function createExampleFlashcard(): TestFlashcard {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    cardId,
    front: `Example front content for ${cardId}`,
    back: `Example back content for ${cardId}`,
    exampleFront: `This is an example sentence using the front word in context for ${cardId}`,
    exampleBack: `This is an example sentence using the back word in context for ${cardId}`,
    category,
    tags: generateUniqueTags(2),
    difficulty: 'medium',
    metadata: {
      source: 'test-example-data',
      createdByAI: true,
      aiModel: 'test-example-model',
      confidence: 0.92,
    },
    sm2: {
      easeFactor: 2.4,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      qualityResponses: [],
      totalReviews: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      isSuspended: false,
    },
    statistics: {
      timesCorrect: 0,
      timesIncorrect: 0,
      averageResponseTime: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

/**
 * Datos de prueba para flashcard con estadísticas avanzadas
 */
export function createAdvancedFlashcard(): TestFlashcard {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    cardId,
    front: `Advanced front content for ${cardId}`,
    back: `Advanced back content for ${cardId}`,
    category,
    tags: generateUniqueTags(5),
    difficulty: 'hard',
    audioUrl: 'https://example.com/audio/advanced-audio.mp3',
    imageUrl: 'https://example.com/images/advanced-image.jpg',
    metadata: {
      source: 'test-advanced-data',
      createdByAI: true,
      aiModel: 'test-advanced-model',
      confidence: 0.95,
    },
    sm2: {
      easeFactor: 2.5,
      interval: 6,
      repetitions: 3,
      nextReviewDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 días
      lastReviewed: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ayer
      qualityResponses: [4, 5, 3],
      totalReviews: 3,
      correctStreak: 2,
      incorrectStreak: 0,
      isSuspended: false,
    },
    statistics: {
      timesCorrect: 2,
      timesIncorrect: 1,
      averageResponseTime: 2.5,
      lastDifficulty: 'medium',
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
    updatedAt: new Date(),
    version: 1,
  };
}

/**
 * Datos de formulario para crear flashcard básica
 */
export function createBasicFlashcardForm(): FlashcardFormData {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    front: `Form front content for ${cardId}`,
    back: `Form back content for ${cardId}`,
    exampleFront: `Example sentence for ${cardId}`,
    exampleBack: `Example sentence in target language for ${cardId}`,
    category,
    tags: generateUniqueTags(2).join(', '),
    difficulty: 'medium',
  };
}

/**
 * Datos de formulario para crear flashcard con audio
 */
export function createAudioFlashcardForm(): FlashcardFormData {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    front: `Audio form front content for ${cardId}`,
    back: `Audio form back content for ${cardId}`,
    category,
    tags: generateUniqueTags(3).join(', '),
    difficulty: 'hard',
  };
}

/**
 * Datos de formulario para crear flashcard con imagen
 */
export function createImageFlashcardForm(): FlashcardFormData {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    front: `Image form front content for ${cardId}`,
    back: `Image form back content for ${cardId}`,
    exampleFront: `Image example for ${cardId}`,
    exampleBack: `Image example in target language for ${cardId}`,
    category,
    tags: generateUniqueTags(4).join(', '),
    difficulty: 'easy',
  };
}

/**
 * Datos inválidos para pruebas de validación
 */
export function createInvalidFlashcardForm(): Partial<FlashcardFormData> {
  return {
    front: '', // Campo requerido vacío
    back: '', // Campo requerido vacío
    category: '', // Campo requerido vacío
  };
}

/**
 * Datos con campos demasiado largos para pruebas de validación
 */
export function createOversizedFlashcardForm(): FlashcardFormData {
  const cardId = generateUniqueCardId();
  const longText = 'A'.repeat(1001); // Más de 1000 caracteres

  return {
    front: longText,
    back: longText,
    category: `test_category_${cardId}`,
    tags: generateUniqueTags(2).join(', '),
    difficulty: 'medium',
  };
}

/**
 * Datos para pruebas de edición de flashcards
 */
export function createEditableFlashcard(): TestFlashcard {
  const cardId = generateUniqueCardId();
  const category = generateUniqueCategory();

  return {
    cardId,
    front: `Editable front content for ${cardId}`,
    back: `Editable back content for ${cardId}`,
    category,
    tags: generateUniqueTags(3),
    difficulty: 'medium',
    metadata: {
      source: 'test-editable-data',
      createdByAI: false,
    },
    sm2: {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(),
      qualityResponses: [],
      totalReviews: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      isSuspended: false,
    },
    statistics: {
      timesCorrect: 0,
      timesIncorrect: 0,
      averageResponseTime: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

/**
 * Datos actualizados para pruebas de edición
 */
export function createUpdatedFlashcardData(): Partial<TestFlashcard> {
  const cardId = generateUniqueCardId();
  const newCategory = generateUniqueCategory();

  return {
    front: `Updated front content for ${cardId}`,
    back: `Updated back content for ${cardId}`,
    exampleFront: `Updated example for ${cardId}`,
    exampleBack: `Updated example in target language for ${cardId}`,
    category: newCategory,
    tags: generateUniqueTags(4),
    difficulty: 'hard',
    audioUrl: 'https://example.com/audio/updated-audio.mp3',
    imageUrl: 'https://example.com/images/updated-image.jpg',
  };
}