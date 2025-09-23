// Cloudflare D1 integration tests for FlashcardsService
const { initializeDatabase } = require('../src/utils/database');
const { d1Client } = require('../src/utils/d1Client');
const { flashcardsService } = require('../src/services/flashcards');

describe('Cloudflare D1 Flashcards Integration', () => {
  const testUserId = 'integration_user';

  beforeAll(async () => {
    await initializeDatabase();
  });

  beforeEach(async () => {
    await d1Client.execute('DELETE FROM flashcards');
  });

  const buildFlashcard = (overrides = {}) => ({
    cardId: 'card_001',
    userId: testUserId,
    front: 'Hello',
    back: 'Hola',
    tags: ['greeting'],
    difficulty: 'medium',
    category: 'Vocabulary',
    metadata: { source: 'integration-test', createdByAI: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  test('should create and retrieve flashcard', async () => {
    const flashcardInput = buildFlashcard();
    const createResult = await flashcardsService.createFlashcard(
      flashcardInput,
      testUserId
    );
    expect(createResult.success).toBe(true);

    const getResult = await flashcardsService.getFlashcardById(
      flashcardInput.cardId,
      testUserId
    );
    expect(getResult.success).toBe(true);
    expect(getResult.data.front).toBe('Hello');
    expect(getResult.data.back).toBe('Hola');
  });

  test('should process SM-2 review responses', async () => {
    const flashcardInput = buildFlashcard();
    const createResult = await flashcardsService.createFlashcard(
      flashcardInput,
      testUserId
    );
    expect(createResult.success).toBe(true);

    const cardId = flashcardInput.cardId;
    const reviewResult = await flashcardsService.processReviewResponse(
      cardId,
      4,
      3000,
      testUserId
    );
    expect(reviewResult.success).toBe(true);
    expect(reviewResult.data.sm2.repetitions).toBeGreaterThan(0);
    expect(reviewResult.data.statistics.timesCorrect).toBe(1);
  });

  test('should suspend and include suspended cards when requested', async () => {
    const flashcardInput = buildFlashcard();
    await flashcardsService.createFlashcard(flashcardInput, testUserId);

    const suspendResult = await flashcardsService.suspendFlashcard(
      flashcardInput.cardId,
      true,
      'Review later',
      testUserId
    );

    expect(suspendResult.success).toBe(true);
    expect(suspendResult.data.sm2.isSuspended).toBe(true);

    const dueCards = await flashcardsService.getDueFlashcards(testUserId);
    expect(dueCards.success).toBe(true);
    expect(dueCards.data.length).toBe(0);

    const withSuspended = await flashcardsService.getDueFlashcards(testUserId, {
      includeSuspended: true,
    });
    expect(withSuspended.success).toBe(true);
    expect(withSuspended.data.length).toBe(1);
  });
});
