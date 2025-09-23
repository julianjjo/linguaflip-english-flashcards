// Database Operations Integration Tests for Cloudflare D1 adapter
const { initializeDatabase } = require('../src/utils/database');
const { d1Client } = require('../src/utils/d1Client');
const { createDatabaseOperations } = require('../src/utils/databaseOperations');

describe('Database Operations Integration (Cloudflare D1)', () => {
  let flashcardOps;

  beforeAll(async () => {
    await initializeDatabase();
    flashcardOps = createDatabaseOperations('flashcards');
  });

  beforeEach(async () => {
    await d1Client.execute('DELETE FROM flashcards');
  });

  const createSampleFlashcard = (overrides = {}) => ({
    cardId: `card_${Math.random().toString(36).slice(2, 10)}`,
    userId: overrides.userId || 'user_test',
    front: 'Hello',
    back: 'Hola',
    tags: ['greeting'],
    difficulty: 'easy',
    category: 'Vocabulary',
    metadata: { source: 'unit-test', createdByAI: false },
    sm2: {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(),
      totalReviews: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      qualityResponses: [],
      isSuspended: false,
    },
    statistics: {
      timesCorrect: 0,
      timesIncorrect: 0,
      averageResponseTime: 0,
      lastDifficulty: 'medium',
    },
    ...overrides,
  });

  test('create() should insert document with timestamps and id', async () => {
    const flashcard = createSampleFlashcard();
    const result = await flashcardOps.create(flashcard);

    expect(result.success).toBe(true);
    expect(result.data.cardId).toBe(flashcard.cardId);
    expect(result.data.createdAt).toBeInstanceOf(Date);
    expect(result.data.updatedAt).toBeInstanceOf(Date);
    expect(typeof result.data._id).toBe('string');
  });

  test('findOne() should retrieve inserted document', async () => {
    const flashcard = createSampleFlashcard();
    const createResult = await flashcardOps.create(flashcard);

    const findResult = await flashcardOps.findOne({
      cardId: flashcard.cardId,
      userId: flashcard.userId,
    });

    expect(findResult.success).toBe(true);
    expect(findResult.data.cardId).toBe(flashcard.cardId);
    expect(findResult.data._id).toBe(createResult.data._id);
  });

  test('updateOne() should modify document fields', async () => {
    const flashcard = createSampleFlashcard();
    const createResult = await flashcardOps.create(flashcard);

    await new Promise((resolve) => setTimeout(resolve, 5));

    const updateResult = await flashcardOps.updateOne(
      { cardId: flashcard.cardId, userId: flashcard.userId },
      { $set: { back: 'Bonjour', difficulty: 'medium' } }
    );

    expect(updateResult.success).toBe(true);
    expect(updateResult.data.back).toBe('Bonjour');
    expect(updateResult.data.difficulty).toBe('medium');
    expect(updateResult.data.updatedAt.getTime()).toBeGreaterThan(
      createResult.data.updatedAt.getTime()
    );
  });

  test('deleteOne() should remove document', async () => {
    const flashcard = createSampleFlashcard();
    await flashcardOps.create(flashcard);

    const deleteResult = await flashcardOps.deleteOne({
      cardId: flashcard.cardId,
      userId: flashcard.userId,
    });
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.data.deletedCount).toBe(1);

    const findResult = await flashcardOps.findOne({
      cardId: flashcard.cardId,
      userId: flashcard.userId,
    });
    expect(findResult.data).toBeNull();
  });

  test('findMany() and count() should handle multiple documents', async () => {
    const flashcardA = createSampleFlashcard({ userId: 'user_alpha' });
    const flashcardB = createSampleFlashcard({ userId: 'user_beta' });
    await flashcardOps.create(flashcardA);
    await flashcardOps.create(flashcardB);

    const countResult = await flashcardOps.count({});
    expect(countResult.success).toBe(true);
    expect(countResult.data).toBe(2);

    const userCards = await flashcardOps.findMany({ userId: 'user_alpha' });
    expect(userCards.success).toBe(true);
    expect(userCards.data).toHaveLength(1);
    expect(userCards.data[0].userId).toBe('user_alpha');
  });

  test('exists() should report presence of documents', async () => {
    const flashcard = createSampleFlashcard({ userId: 'user_exists' });
    await flashcardOps.create(flashcard);

    const existsResult = await flashcardOps.exists({
      userId: 'user_exists',
      cardId: flashcard.cardId,
    });
    expect(existsResult.success).toBe(true);
    expect(existsResult.data).toBe(true);

    const missingResult = await flashcardOps.exists({
      userId: 'user_missing',
      cardId: 'none',
    });
    expect(missingResult.success).toBe(true);
    expect(missingResult.data).toBe(false);
  });
});
