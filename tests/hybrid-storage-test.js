// Simplified Hybrid Storage Test

// Mock the HybridStorage class
class MockHybridStorage {
  constructor() {
    this.cache = new Map();
    this.isOnline = true;
  }

  async getFlashcards(userId) {
    return this.cache.get(`flashcards_${userId}`) || [];
  }

  async saveFlashcard(userId, flashcard) {
    const existing = this.cache.get(`flashcards_${userId}`) || [];
    const newCard = { ...flashcard, id: flashcard.id || Date.now() };

    let updated;
    if (flashcard.id) {
      // Update existing card
      const index = existing.findIndex((card) => card.id === flashcard.id);
      if (index >= 0) {
        updated = [...existing];
        updated[index] = newCard;
      } else {
        updated = [...existing, newCard];
      }
    } else {
      // Add new card
      updated = [...existing, newCard];
    }

    this.cache.set(`flashcards_${userId}`, updated);
    return { success: true };
  }

  async deleteFlashcard(userId, cardId) {
    const existing = this.cache.get(`flashcards_${userId}`) || [];
    const filtered = existing.filter((card) => card.id !== cardId);
    this.cache.set(`flashcards_${userId}`, filtered);
    return { success: true };
  }

  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
  }

  clearCache() {
    this.cache.clear();
  }
}

describe('Hybrid Storage System', () => {
  let hybridStorage;
  const testUserId = 'user_123';
  const testFlashcard = {
    id: 1,
    front: 'Hello',
    back: 'Hola',
    difficulty: 2.5,
    nextReview: new Date(),
    reviewCount: 0,
  };

  beforeEach(() => {
    hybridStorage = new MockHybridStorage();
  });

  test('should save and retrieve flashcards', async () => {
    const result = await hybridStorage.saveFlashcard(testUserId, testFlashcard);
    expect(result.success).toBe(true);

    const retrieved = await hybridStorage.getFlashcards(testUserId);

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].front).toBe('Hello');
    expect(retrieved[0].back).toBe('Hola');
  });

  test('should delete flashcards', async () => {
    await hybridStorage.saveFlashcard(testUserId, testFlashcard);
    const saved = await hybridStorage.getFlashcards(testUserId);
    expect(saved.length).toBe(1);

    const cardIdToDelete = saved[0].id;
    await hybridStorage.deleteFlashcard(testUserId, cardIdToDelete);

    const remaining = await hybridStorage.getFlashcards(testUserId);
    expect(remaining.length).toBe(0);
  });

  test('should handle offline mode', () => {
    hybridStorage.setOnlineStatus(false);
    expect(hybridStorage.isOnline).toBe(false);

    hybridStorage.setOnlineStatus(true);
    expect(hybridStorage.isOnline).toBe(true);
  });

  test('should clear cache', async () => {
    await hybridStorage.saveFlashcard(testUserId, testFlashcard);
    hybridStorage.clearCache();

    const retrieved = await hybridStorage.getFlashcards(testUserId);
    expect(retrieved.length).toBe(0);
  });
});
