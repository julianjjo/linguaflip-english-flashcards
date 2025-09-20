// Simple database mocks for testing
export class MockDatabaseConnection {
  constructor() {
    this.isConnected = true;
    this.db = new MockDatabase();
  }

  static getInstance() {
    if (!MockDatabaseConnection.instance) {
      MockDatabaseConnection.instance = new MockDatabaseConnection();
    }
    return MockDatabaseConnection.instance;
  }

  async connect() {
    this.isConnected = true;
    return { success: true };
  }

  async close() {
    this.isConnected = false;
    return { success: true };
  }

  getDatabase() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getClient() {
    return { isConnected: () => this.isConnected };
  }

  async healthCheck() {
    return {
      status: 'connected',
      database: 'linguaflip_test',
      collections: []
    };
  }
}

class MockDatabase {
  constructor() {
    this.collections = new Map();
    this.databaseName = 'linguaflip_test';
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection());
    }
    return this.collections.get(name);
  }

  admin() {
    return {
      ping: async () => ({ ok: 1 })
    };
  }

  listCollections() {
    return {
      toArray: async () => Array.from(this.collections.keys()).map(name => ({ name }))
    };
  }
}

class MockCollection {
  constructor() {
    this.documents = new Map();
  }

  async insertOne(doc) {
    const id = doc._id || `mock_${Date.now()}_${Math.random()}`;
    const newDoc = { ...doc, _id: id, createdAt: new Date(), updatedAt: new Date() };
    this.documents.set(id, newDoc);
    return { acknowledged: true, insertedId: id };
  }

  async findOne(query) {
    for (const doc of this.documents.values()) {
      if (this.matchesQuery(doc, query)) {
        return doc;
      }
    }
    return null;
  }

  async updateOne(query, update) {
    for (const [id, doc] of this.documents.entries()) {
      if (this.matchesQuery(doc, query)) {
        const updatedDoc = this.applyUpdate(doc, update);
        this.documents.set(id, updatedDoc);
        return { acknowledged: true, modifiedCount: 1 };
      }
    }
    return { acknowledged: true, modifiedCount: 0 };
  }

  async deleteOne(query) {
    for (const [id, doc] of this.documents.entries()) {
      if (this.matchesQuery(doc, query)) {
        this.documents.delete(id);
        return { acknowledged: true, deletedCount: 1 };
      }
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(query) {
    let deletedCount = 0;
    for (const [id, doc] of this.documents.entries()) {
      if (this.matchesQuery(doc, query)) {
        this.documents.delete(id);
        deletedCount++;
      }
    }
    return { acknowledged: true, deletedCount };
  }

  matchesQuery(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;
    
    for (const [key, value] of Object.entries(query)) {
      if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }

  applyUpdate(doc, update) {
    const updatedDoc = { ...doc, updatedAt: new Date() };
    
    if (update.$set) {
      Object.assign(updatedDoc, update.$set);
    }
    
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        updatedDoc[key] = (updatedDoc[key] || 0) + value;
      }
    }
    
    return updatedDoc;
  }
}

// Export mocks
export { MockDatabase, MockCollection };