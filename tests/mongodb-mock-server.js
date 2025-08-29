// Mock MongoDB Server for Testing
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

class MockMongoDBServer {
  constructor() {
    this.mongoServer = null;
    this.client = null;
    this.db = null;
    this.isRunning = false;
  }

  async start() {
    try {
      console.log('Starting Mock MongoDB Server...');

      // Start in-memory MongoDB server
      this.mongoServer = await MongoMemoryServer.create();
      const mongoUri = this.mongoServer.getUri();

      console.log('Mock MongoDB Server started at:', mongoUri);

      // Connect to the mock server
      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      this.db = this.client.db('linguaflip_test');
      this.isRunning = true;

      console.log('Mock MongoDB Server ready for testing');
      return mongoUri;
    } catch (error) {
      console.error('Failed to start Mock MongoDB Server:', error);
      throw error;
    }
  }

  async stop() {
    try {
      if (this.client) {
        await this.client.close();
        console.log('Mock MongoDB client closed');
      }

      if (this.mongoServer) {
        await this.mongoServer.stop();
        console.log('Mock MongoDB Server stopped');
      }

      this.isRunning = false;
    } catch (error) {
      console.error('Error stopping Mock MongoDB Server:', error);
    }
  }

  getDatabase() {
    if (!this.db || !this.isRunning) {
      throw new Error('Mock MongoDB Server not running');
    }
    return this.db;
  }

  getUri() {
    if (!this.mongoServer) {
      throw new Error('Mock MongoDB Server not started');
    }
    return this.mongoServer.getUri();
  }

  isServerRunning() {
    return this.isRunning;
  }

  // Utility method to clear all collections
  async clearDatabase() {
    if (!this.db || !this.isRunning) {
      throw new Error('Mock MongoDB Server not running');
    }

    const collections = await this.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    for (const collectionName of collectionNames) {
      await this.db.collection(collectionName).deleteMany({});
    }

    console.log('Mock database cleared');
  }

  // Utility method to seed test data
  async seedTestData(testData = {}) {
    if (!this.db || !this.isRunning) {
      throw new Error('Mock MongoDB Server not running');
    }

    for (const [collectionName, documents] of Object.entries(testData)) {
      if (Array.isArray(documents) && documents.length > 0) {
        await this.db.collection(collectionName).insertMany(documents);
        console.log(`Seeded ${documents.length} documents into ${collectionName}`);
      }
    }
  }
}

// Singleton instance
let mockServerInstance = null;

export function getMockMongoDBServer() {
  if (!mockServerInstance) {
    mockServerInstance = new MockMongoDBServer();
  }
  return mockServerInstance;
}

export { MockMongoDBServer };

// Export for CommonJS compatibility
export default MockMongoDBServer;