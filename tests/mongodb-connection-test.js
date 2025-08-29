// MongoDB Connection Test Suite
import { MongoClient } from 'mongodb';
import { validateMongoDBEnvironment, buildSecureConnectionString, sanitizeConnectionString } from '../src/utils/security.js';

// Test configuration
const TEST_CONFIG = {
  connectionTimeout: 5000,
  testDatabase: 'linguaflip_test',
  testCollection: 'connection_test',
};

describe('MongoDB Connection Setup', () => {
  let client;
  let db;

  beforeAll(async () => {
    // Validate environment before testing
    const validation = validateMongoDBEnvironment();
    if (!validation.isValid) {
      console.error('Environment validation failed:', validation.errors);
      throw new Error('Invalid MongoDB environment configuration');
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Environment validation warnings:', validation.warnings);
    }

    try {
      const connectionString = buildSecureConnectionString();
      console.log('Testing connection to:', sanitizeConnectionString(connectionString));

      client = new MongoClient(connectionString, {
        serverSelectionTimeoutMS: TEST_CONFIG.connectionTimeout,
        maxPoolSize: 5,
      });

      await client.connect();
      db = client.db(TEST_CONFIG.testDatabase);

      console.log('Successfully connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  });

  describe('Connection Management', () => {
    test('should establish connection successfully', async () => {
      expect(client).toBeDefined();
      expect(db).toBeDefined();
      expect(db.databaseName).toBe(TEST_CONFIG.testDatabase);
    });

    test('should handle ping command', async () => {
      const pingResult = await db.admin().ping();
      expect(pingResult).toBeDefined();
      expect(pingResult.ok).toBe(1);
    });

    test('should list collections', async () => {
      const collections = await db.listCollections().toArray();
      expect(Array.isArray(collections)).toBe(true);
    });
  });

  describe('Basic CRUD Operations', () => {
    const testDocument = {
      _id: 'test-connection-doc',
      testField: 'connection-test-value',
      timestamp: new Date(),
      metadata: {
        testSuite: 'mongodb-connection',
        version: '1.0.0',
      },
    };

    test('should insert document', async () => {
      const collection = db.collection(TEST_CONFIG.testCollection);
      const result = await collection.insertOne(testDocument);

      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBe(testDocument._id);
    });

    test('should find document', async () => {
      const collection = db.collection(TEST_CONFIG.testCollection);
      const found = await collection.findOne({ _id: testDocument._id });

      expect(found).toBeDefined();
      expect(found.testField).toBe(testDocument.testField);
      expect(found.metadata.testSuite).toBe(testDocument.metadata.testSuite);
    });

    test('should update document', async () => {
      const collection = db.collection(TEST_CONFIG.testCollection);
      const updateResult = await collection.updateOne(
        { _id: testDocument._id },
        {
          $set: {
            updatedField: 'updated-value',
            updatedAt: new Date(),
          },
        }
      );

      expect(updateResult.acknowledged).toBe(true);
      expect(updateResult.modifiedCount).toBe(1);

      // Verify update
      const updated = await collection.findOne({ _id: testDocument._id });
      expect(updated.updatedField).toBe('updated-value');
    });

    test('should delete document', async () => {
      const collection = db.collection(TEST_CONFIG.testCollection);
      const deleteResult = await collection.deleteOne({ _id: testDocument._id });

      expect(deleteResult.acknowledged).toBe(true);
      expect(deleteResult.deletedCount).toBe(1);

      // Verify deletion
      const notFound = await collection.findOne({ _id: testDocument._id });
      expect(notFound).toBeNull();
    });
  });

  describe('Connection Pooling', () => {
    test('should handle multiple concurrent operations', async () => {
      const collection = db.collection(TEST_CONFIG.testCollection);
      const operations = Array.from({ length: 10 }, (_, i) => ({
        _id: `concurrent-test-${i}`,
        value: `test-value-${i}`,
        createdAt: new Date(),
      }));

      // Insert multiple documents concurrently
      const insertPromises = operations.map(doc => collection.insertOne(doc));
      const insertResults = await Promise.all(insertPromises);

      insertResults.forEach(result => {
        expect(result.acknowledged).toBe(true);
      });

      // Find all inserted documents
      const foundDocuments = await collection
        .find({ _id: { $in: operations.map(op => op._id) } })
        .toArray();

      expect(foundDocuments.length).toBe(operations.length);

      // Clean up
      await collection.deleteMany({ _id: { $in: operations.map(op => op._id) } });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid operations gracefully', async () => {
      const collection = db.collection(TEST_CONFIG.testCollection);

      // Test invalid update operation
      await expect(
        collection.updateOne(
          { _id: 'non-existent-id' },
          { $set: { field: 'value' } }
        )
      ).resolves.toBeDefined();

      // Test invalid query
      const result = await collection.findOne({ $invalidOperator: 1 });
      expect(result).toBeNull();
    });

    test('should handle connection errors', async () => {
      // Create a client with invalid connection string
      const invalidClient = new MongoClient('mongodb://invalid-host:27017', {
        serverSelectionTimeoutMS: 1000,
      });

      await expect(invalidClient.connect()).rejects.toThrow();
    });
  });

  describe('Security Validation', () => {
    test('should validate environment configuration', () => {
      const validation = validateMongoDBEnvironment();

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    test('should sanitize connection strings', () => {
      const testUri = 'mongodb+srv://user:password123@cluster.mongodb.net/db';
      const sanitized = sanitizeConnectionString(testUri);

      expect(sanitized).not.toContain('password123');
      expect(sanitized).toContain('user');
      expect(sanitized).toContain('****');
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  let client;
  let db;

  beforeAll(async () => {
    const connectionString = buildSecureConnectionString();
    client = new MongoClient(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(TEST_CONFIG.testDatabase);
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  test('should perform operations within acceptable time', async () => {
    const collection = db.collection(TEST_CONFIG.testCollection);
    const startTime = Date.now();

    // Perform 100 insert operations
    const operations = Array.from({ length: 100 }, (_, i) => ({
      _id: `perf-test-${Date.now()}-${i}`,
      data: `performance-test-data-${i}`,
      timestamp: new Date(),
    }));

    const insertPromises = operations.map(doc => collection.insertOne(doc));
    await Promise.all(insertPromises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`100 insert operations took ${duration}ms`);

    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(10000); // 10 seconds

    // Clean up
    await collection.deleteMany({
      _id: { $in: operations.map(op => op._id) },
    });
  });
});