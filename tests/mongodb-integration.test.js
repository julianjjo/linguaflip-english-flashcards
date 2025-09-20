// MongoDB Integration Tests with Memory Server
const { TestDatabaseSetup, TestFlashcardsService } = require('./test-utils.js');

describe('MongoDB Integration Tests', () => {
  let testDb;
  let flashcardsService;

  beforeAll(async () => {
    testDb = new TestDatabaseSetup();
    await testDb.setup();
    
    flashcardsService = new TestFlashcardsService(testDb.getDatabase());
    
    console.log('MongoDB Integration test environment initialized');
  });

  afterAll(async () => {
    await testDb.cleanup();
    console.log('MongoDB Integration test cleanup completed');
  });

  beforeEach(async () => {
    await testDb.clearDatabase();
  });

  describe('Flashcard Service Integration', () => {
    const testUserId = 'test_user_123';
    const testFlashcard = {
      cardId: 'card_001',
      userId: testUserId,
      front: 'Hello',
      back: 'Hola',
      category: 'greetings',
      tags: ['basic', 'common'],
      difficulty: 'medium'
    };

    test('should create and retrieve flashcard', async () => {
      const createResult = await flashcardsService.createFlashcard(testFlashcard, testUserId);
      
      expect(createResult.success).toBe(true);
      expect(createResult.data.front).toBe('Hello');
      expect(createResult.data.back).toBe('Hola');
      expect(createResult.data.sm2).toBeDefined();
      expect(createResult.data.sm2.easeFactor).toBe(2.5);
      expect(createResult.data.sm2.interval).toBe(1);
      expect(createResult.data.sm2.repetitions).toBe(0);
    });

    test('should process SM-2 algorithm correctly', async () => {
      // Create flashcard
      const createResult = await flashcardsService.createFlashcard(testFlashcard, testUserId);
      expect(createResult.success).toBe(true);
      
      const cardId = createResult.data.cardId;
      
      // Process correct response (quality 4)
      const reviewResult = await flashcardsService.processReviewResponse(
        cardId, 4, 3000, testUserId
      );
      
      expect(reviewResult.success).toBe(true);
      expect(reviewResult.data.sm2.repetitions).toBe(1);
      expect(reviewResult.data.sm2.interval).toBe(1);
      expect(reviewResult.data.statistics.timesCorrect).toBe(1);
      expect(reviewResult.data.statistics.timesIncorrect).toBe(0);
      
      // Process another correct response
      const secondReview = await flashcardsService.processReviewResponse(
        cardId, 5, 2500, testUserId
      );
      
      expect(secondReview.success).toBe(true);
      expect(secondReview.data.sm2.repetitions).toBe(2);
      expect(secondReview.data.sm2.interval).toBe(6);
      expect(secondReview.data.statistics.timesCorrect).toBe(2);
    });

    test('should get due flashcards', async () => {
      // Create several flashcards
      const cards = [
        { ...testFlashcard, cardId: 'card_001' },
        { ...testFlashcard, cardId: 'card_002', front: 'Goodbye', back: 'Adiós' },
        { ...testFlashcard, cardId: 'card_003', front: 'Thank you', back: 'Gracias' }
      ];
      
      for (const card of cards) {
        await flashcardsService.createFlashcard(card, testUserId);
      }
      
      const dueCards = await flashcardsService.getDueFlashcards(testUserId);
      
      expect(dueCards.success).toBe(true);
      expect(dueCards.data.length).toBe(3);
    });

    test('should search flashcards by content', async () => {
      // Create test flashcards
      const cards = [
        { ...testFlashcard, cardId: 'card_001', front: 'Hello', back: 'Hola' },
        { ...testFlashcard, cardId: 'card_002', front: 'Goodbye', back: 'Adiós' },
        { ...testFlashcard, cardId: 'card_003', front: 'Thank you', back: 'Gracias' }
      ];
      
      for (const card of cards) {
        await flashcardsService.createFlashcard(card, testUserId);
      }
      
      const searchResult = await flashcardsService.searchFlashcards(testUserId, 'Hello');
      
      expect(searchResult.success).toBe(true);
      expect(searchResult.data.length).toBe(1);
      expect(searchResult.data[0].front).toBe('Hello');
    });

    test('should get flashcard statistics', async () => {
      // Create several flashcards and simulate reviews
      const cards = [
        { ...testFlashcard, cardId: 'card_001' },
        { ...testFlashcard, cardId: 'card_002', front: 'Goodbye', back: 'Adiós' }
      ];
      
      for (const card of cards) {
        await flashcardsService.createFlashcard(card, testUserId);
        // Simulate some reviews
        await flashcardsService.processReviewResponse(card.cardId, 4, 3000, testUserId);
      }
      
      const stats = await flashcardsService.getFlashcardStats(testUserId);
      
      expect(stats.success).toBe(true);
      expect(stats.data.totalCards).toBe(2);
      expect(stats.data.totalReviews).toBe(2);
      expect(stats.data.averageEaseFactor).toBeGreaterThan(2.4);
    });

    test('should handle suspended cards correctly', async () => {
      // Create card
      await flashcardsService.createFlashcard(testFlashcard, testUserId);
      
      // Suspend the card
      const suspendResult = await flashcardsService.suspendFlashcard(
        testFlashcard.cardId, true, 'Too difficult', testUserId
      );
      
      expect(suspendResult.success).toBe(true);
      expect(suspendResult.data.sm2.isSuspended).toBe(true);
      expect(suspendResult.data.sm2.suspensionReason).toBe('Too difficult');
      
      // Suspended card should not appear in due cards
      const dueCards = await flashcardsService.getDueFlashcards(testUserId);
      expect(dueCards.success).toBe(true);
      expect(dueCards.data.length).toBe(0);
      
      // But should appear when including suspended cards
      const allCards = await flashcardsService.getDueFlashcards(testUserId, {
        includeSuspended: true
      });
      
      expect(allCards.success).toBe(true);
      expect(allCards.data.length).toBe(1);
    });
  });

  describe('SM-2 Algorithm Behavior', () => {
    const testUserId = 'sm2_user';
    const testCard = {
      cardId: 'sm2_test_card',
      userId: testUserId,
      front: 'Algorithm Test',
      back: 'Prueba de Algoritmo',
      category: 'algorithm'
    };

    test('should handle perfect learning progression', async () => {
      await flashcardsService.createFlashcard(testCard, testUserId);
      
      // Review with quality 5 (perfect) multiple times
      const qualities = [5, 5, 5, 5];
      
      for (let i = 0; i < qualities.length; i++) {
        const result = await flashcardsService.processReviewResponse(
          testCard.cardId, qualities[i], 2000, testUserId
        );
        
        expect(result.success).toBe(true);
        expect(result.data.sm2.repetitions).toBe(i + 1);
        
        if (i === 0) {
          expect(result.data.sm2.interval).toBe(1);
        } else if (i === 1) {
          expect(result.data.sm2.interval).toBe(6);
        } else {
          expect(result.data.sm2.interval).toBeGreaterThan(6);
        }
      }
    });

    test('should reset on poor performance', async () => {
      await flashcardsService.createFlashcard(testCard, testUserId);
      
      // Build up card
      await flashcardsService.processReviewResponse(testCard.cardId, 4, 2000, testUserId);
      await flashcardsService.processReviewResponse(testCard.cardId, 4, 2000, testUserId);
      
      const beforeReset = await flashcardsService.getFlashcardById(testCard.cardId, testUserId);
      expect(beforeReset.data.sm2.repetitions).toBe(2);
      
      // Poor response (quality 1)
      const resetResult = await flashcardsService.processReviewResponse(
        testCard.cardId, 1, 8000, testUserId
      );
      
      expect(resetResult.success).toBe(true);
      expect(resetResult.data.sm2.repetitions).toBe(0);
      expect(resetResult.data.sm2.interval).toBe(1);
      expect(resetResult.data.sm2.incorrectStreak).toBe(1);
    });
  });

  describe('Database Performance', () => {
    const testUserId = 'perf_user';

    test('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create 20 flashcards
      const promises = Array.from({ length: 20 }, (_, i) => 
        flashcardsService.createFlashcard({
          cardId: `bulk_${i}`,
          userId: testUserId,
          front: `Front ${i}`,
          back: `Back ${i}`,
          category: 'bulk'
        }, testUserId)
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      console.log(`Created 20 cards in ${duration}ms`);
      expect(duration).toBeLessThan(5000);
      
      // Verify all cards exist
      const dueCards = await flashcardsService.getDueFlashcards(testUserId, { limit: 30 });
      expect(dueCards.success).toBe(true);
      expect(dueCards.data.length).toBe(20);
    });
  });
});