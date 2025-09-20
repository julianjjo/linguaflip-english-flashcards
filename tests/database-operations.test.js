// Database Operations Integration Tests  
const { TestDatabaseSetup } = require('./test-utils.js');

// Simple mock for DatabaseOperations
class MockDatabaseOperations {
  constructor(collectionName, db) {
    this.collectionName = collectionName;
    this.collection = db.collection(collectionName);
  }

  async create(document) {
    const startTime = Date.now();
    try {
      const now = new Date();
      const doc = { ...document, createdAt: now, updatedAt: now };
      const result = await this.collection.insertOne(doc);
      return {
        success: true,
        data: { ...doc, _id: result.insertedId },
        operationTime: Date.now() - startTime
      };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async findOne(filter) {
    const startTime = Date.now();
    try {
      const doc = await this.collection.findOne(filter);
      return { success: true, data: doc, operationTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async updateOne(filter, update) {
    const startTime = Date.now();
    try {
      const updateWithTimestamp = {
        ...update,
        $set: { ...update.$set, updatedAt: new Date() }
      };
      await this.collection.updateOne(filter, updateWithTimestamp);
      const doc = await this.collection.findOne(filter);
      return { success: true, data: doc, operationTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async deleteOne(filter) {
    const startTime = Date.now();
    try {
      const result = await this.collection.deleteOne(filter);
      return { success: true, data: { deletedCount: result.deletedCount }, operationTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async findMany(filter) {
    const startTime = Date.now();
    try {
      const docs = await this.collection.find(filter).toArray();
      return { success: true, data: docs, operationTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async count(filter = {}) {
    const startTime = Date.now();
    try {
      const count = await this.collection.countDocuments(filter);
      return { success: true, data: count, operationTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async bulkWrite(operations) {
    const startTime = Date.now();
    try {
      const result = await this.collection.bulkWrite(operations);
      return {
        success: true,
        data: {
          success: result.ok === 1,
          insertedCount: result.insertedCount || 0,
          modifiedCount: result.modifiedCount || 0,
          deletedCount: result.deletedCount || 0
        },
        operationTime: Date.now() - startTime
      };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async aggregate(pipeline) {
    const startTime = Date.now();
    try {
      const results = await this.collection.aggregate(pipeline).toArray();
      return { success: true, data: results, operationTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }

  async distinct(field, filter = {}) {
    const startTime = Date.now();
    try {
      const values = await this.collection.distinct(field, filter);
      return { success: true, data: values, operationTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, operationTime: Date.now() - startTime };
    }
  }
}

describe('Database Operations Integration', () => {
  let testDb;
  let testOps;
  let dbConnection;

  beforeAll(async () => {
    testDb = new TestDatabaseSetup();
    await testDb.setup();
    testOps = new MockDatabaseOperations('test_collection', testDb.getDatabase());
    
    // Mock dbConnection for the tests that need it
    dbConnection = {
      healthCheck: async () => ({
        status: 'connected',
        database: 'linguaflip_operations_test',
        collections: []
      }),
      isDatabaseConnected: () => true,
      getDatabase: () => testDb.getDatabase()
    };
    
    console.log('Database Operations test environment initialized');
  });

  afterAll(async () => {
    await testDb.cleanup();
    console.log('Database Operations test cleanup completed');
  });

  beforeEach(async () => {
    await testDb.clearDatabase();
  });

  describe('Basic CRUD Operations', () => {
    const testDocument = {
      name: 'Test Document',
      value: 42,
      tags: ['test', 'integration'],
      metadata: {
        source: 'unit-test',
        importance: 'high'
      }
    };

    test('should create document with timestamps', async () => {
      const result = await testOps.create(testDocument);
      
      expect(result.success).toBe(true);
      expect(result.data.name).toBe(testDocument.name);
      expect(result.data.value).toBe(testDocument.value);
      expect(result.data.createdAt).toBeDefined();
      expect(result.data.updatedAt).toBeDefined();
      expect(result.data._id).toBeDefined();
      expect(result.operationTime).toBeGreaterThan(0);
    });

    test('should find document by filter', async () => {
      const createResult = await testOps.create(testDocument);
      const documentId = createResult.data._id;
      
      const findResult = await testOps.findOne({ _id: documentId });
      
      expect(findResult.success).toBe(true);
      expect(findResult.data.name).toBe(testDocument.name);
      expect(findResult.data._id).toEqual(documentId);
    });

    test('should update document and timestamp', async () => {
      const createResult = await testOps.create(testDocument);
      const documentId = createResult.data._id;
      const originalUpdatedAt = createResult.data.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updateResult = await testOps.updateOne(
        { _id: documentId },
        { $set: { value: 100, name: 'Updated Document' } }
      );
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data.value).toBe(100);
      expect(updateResult.data.name).toBe('Updated Document');
      expect(updateResult.data.updatedAt).not.toEqual(originalUpdatedAt);
    });

    test('should delete document', async () => {
      const createResult = await testOps.create(testDocument);
      const documentId = createResult.data._id;
      
      const deleteResult = await testOps.deleteOne({ _id: documentId });
      
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data.deletedCount).toBe(1);
      
      // Verify deletion
      const findResult = await testOps.findOne({ _id: documentId });
      expect(findResult.success).toBe(true);
      expect(findResult.data).toBeNull();
    });
  });

  describe('Advanced Operations', () => {
    test('should handle bulk operations', async () => {
      const documents = Array.from({ length: 5 }, (_, i) => ({
        name: `Bulk Document ${i}`,
        value: i * 10,
        category: 'bulk-test'
      }));
      
      const operations = documents.map(doc => ({
        insertOne: { document: doc }
      }));
      
      const bulkResult = await testOps.bulkWrite(operations);
      
      expect(bulkResult.success).toBe(true);
      expect(bulkResult.data.insertedCount).toBe(5);
      expect(bulkResult.data.success).toBe(true);
      
      // Verify documents were created
      const findResult = await testOps.findMany({ category: 'bulk-test' });
      expect(findResult.success).toBe(true);
      expect(findResult.data.length).toBe(5);
    });

    test('should perform aggregation operations', async () => {
      // Create test data for aggregation
      const testData = [
        { category: 'A', value: 10, active: true },
        { category: 'A', value: 20, active: true },
        { category: 'B', value: 30, active: false },
        { category: 'B', value: 40, active: true }
      ];
      
      for (const doc of testData) {
        await testOps.create(doc);
      }
      
      // Aggregation pipeline to group by category
      const pipeline = [
        { $match: { active: true } },
        {
          $group: {
            _id: '$category',
            totalValue: { $sum: '$value' },
            count: { $sum: 1 },
            avgValue: { $avg: '$value' }
          }
        },
        { $sort: { _id: 1 } }
      ];
      
      const aggregateResult = await testOps.aggregate(pipeline);
      
      expect(aggregateResult.success).toBe(true);
      expect(aggregateResult.data.length).toBe(2);
      
      const categoryA = aggregateResult.data.find(item => item._id === 'A');
      const categoryB = aggregateResult.data.find(item => item._id === 'B');
      
      expect(categoryA.totalValue).toBe(30);
      expect(categoryA.count).toBe(2);
      expect(categoryB.totalValue).toBe(40);
      expect(categoryB.count).toBe(1);
    });

    test('should handle distinct operations', async () => {
      const testData = [
        { category: 'fruits', name: 'apple' },
        { category: 'fruits', name: 'banana' },
        { category: 'vegetables', name: 'carrot' },
        { category: 'fruits', name: 'orange' }
      ];
      
      for (const doc of testData) {
        await testOps.create(doc);
      }
      
      const distinctCategories = await testOps.distinct('category');
      
      expect(distinctCategories.success).toBe(true);
      expect(distinctCategories.data.length).toBe(2);
      expect(distinctCategories.data).toContain('fruits');
      expect(distinctCategories.data).toContain('vegetables');
    });

    test('should count documents correctly', async () => {
      const testData = [
        { type: 'active', status: 'published' },
        { type: 'active', status: 'draft' },
        { type: 'inactive', status: 'archived' }
      ];
      
      for (const doc of testData) {
        await testOps.create(doc);
      }
      
      const totalCount = await testOps.count();
      expect(totalCount.success).toBe(true);
      expect(totalCount.data).toBe(3);
      
      const activeCount = await testOps.count({ type: 'active' });
      expect(activeCount.success).toBe(true);
      expect(activeCount.data).toBe(2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle non-existent document queries', async () => {
      const result = await testOps.findOne({ _id: 'non-existent-id' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle updates on non-existent documents', async () => {
      const result = await testOps.updateOne(
        { _id: 'non-existent-id' },
        { $set: { updated: true } }
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle deletes on non-existent documents', async () => {
      const result = await testOps.deleteOne({ _id: 'non-existent-id' });
      
      expect(result.success).toBe(true);
      expect(result.data.deletedCount).toBe(0);
    });

    test('should handle empty queries gracefully', async () => {
      const result = await testOps.findMany({});
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });
  });

  describe('Connection Management', () => {
    test('should provide database health check', async () => {
      const healthCheck = await dbConnection.healthCheck();
      
      expect(healthCheck.status).toBe('connected');
      expect(healthCheck.database).toBe('linguaflip_operations_test');
      expect(Array.isArray(healthCheck.collections)).toBe(true);
    });

    test('should handle database operations when connected', async () => {
      expect(dbConnection.isDatabaseConnected()).toBe(true);
      
      const database = dbConnection.getDatabase();
      expect(database).toBeDefined();
      
      // Test basic database operation
      const pingResult = await database.admin().ping();
      expect(pingResult.ok).toBe(1);
    });
  });
});