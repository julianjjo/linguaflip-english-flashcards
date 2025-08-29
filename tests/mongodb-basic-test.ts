// Basic MongoDB Connection and CRUD Test
import 'mocha';
import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { getMockMongoDBServer } from './mongodb-mock-server.js';

describe('Basic MongoDB Operations', () => {
  let mockServer: any;
  let client: MongoClient;
  let db: any;

  before(async function() {
    this.timeout(30000);

    try {
      // Start mock MongoDB server
      mockServer = getMockMongoDBServer();
      const mongoUri = await mockServer.start();

      // Connect to the mock server
      client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });

      await client.connect();
      db = client.db('linguaflip_test');

      console.log('Mock MongoDB connection established');
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  });

  after(async () => {
    try {
      if (client) {
        await client.close();
      }
      if (mockServer) {
        await mockServer.stop();
      }
      console.log('Test cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  beforeEach(async () => {
    // Clear all collections before each test
    if (mockServer && mockServer.isServerRunning()) {
      await mockServer.clearDatabase();
    }
  });

  describe('Connection Tests', () => {
    it('should connect to MongoDB successfully', async () => {
      expect(client).to.be.an('object');
      expect(db).to.be.an('object');
      expect(db.databaseName).to.equal('linguaflip_test');
    });

    it('should ping the database', async () => {
      const pingResult = await db.admin().ping();
      expect(pingResult).to.be.an('object');
      expect(pingResult.ok).to.equal(1);
    });

    it('should list collections', async () => {
      const collections = await db.listCollections().toArray();
      expect(collections).to.be.an('array');
    });
  });

  describe('Basic CRUD Operations', () => {
    const testDocument = {
      _id: 'test-doc-1',
      name: 'Test Document',
      value: 42,
      createdAt: new Date(),
    };

    it('should insert a document', async () => {
      const collection = db.collection('test_collection');
      const result = await collection.insertOne(testDocument);

      expect(result.acknowledged).to.be.true;
      expect(result.insertedId).to.equal(testDocument._id);
    });

    it('should find a document', async () => {
      const collection = db.collection('test_collection');
      await collection.insertOne(testDocument);

      const found = await collection.findOne({ _id: testDocument._id });

      expect(found).to.be.an('object');
      expect(found.name).to.equal(testDocument.name);
      expect(found.value).to.equal(testDocument.value);
    });

    it('should update a document', async () => {
      const collection = db.collection('test_collection');
      await collection.insertOne(testDocument);

      const updateResult = await collection.updateOne(
        { _id: testDocument._id },
        { $set: { value: 100, updatedAt: new Date() } }
      );

      expect(updateResult.acknowledged).to.be.true;
      expect(updateResult.modifiedCount).to.equal(1);

      // Verify update
      const updated = await collection.findOne({ _id: testDocument._id });
      expect(updated.value).to.equal(100);
      expect(updated.updatedAt).to.be.a('date');
    });

    it('should delete a document', async () => {
      const collection = db.collection('test_collection');
      await collection.insertOne(testDocument);

      const deleteResult = await collection.deleteOne({ _id: testDocument._id });

      expect(deleteResult.acknowledged).to.be.true;
      expect(deleteResult.deletedCount).to.equal(1);

      // Verify deletion
      const notFound = await collection.findOne({ _id: testDocument._id });
      expect(notFound).to.be.null;
    });
  });

  describe('Bulk Operations', () => {
    it('should perform bulk insert', async () => {
      const collection = db.collection('bulk_test');
      const documents = [
        { _id: 'bulk-1', data: 'test1' },
        { _id: 'bulk-2', data: 'test2' },
        { _id: 'bulk-3', data: 'test3' },
      ];

      const result = await collection.insertMany(documents);

      expect(result.acknowledged).to.be.true;
      expect(result.insertedCount).to.equal(3);
    });

    it('should perform bulk update', async () => {
      const collection = db.collection('bulk_update_test');
      const documents = [
        { _id: 'update-1', status: 'active' },
        { _id: 'update-2', status: 'active' },
        { _id: 'update-3', status: 'inactive' },
      ];

      await collection.insertMany(documents);

      const updateResult = await collection.updateMany(
        { status: 'active' },
        { $set: { status: 'updated', modifiedAt: new Date() } }
      );

      expect(updateResult.acknowledged).to.be.true;
      expect(updateResult.modifiedCount).to.equal(2);
    });
  });

  describe('Query Operations', () => {
    let testData: any[];

    beforeEach(async () => {
      const collection = db.collection('query_test');
      testData = [
        { name: 'Alice', age: 25, city: 'New York' },
        { name: 'Bob', age: 30, city: 'London' },
        { name: 'Charlie', age: 35, city: 'New York' },
        { name: 'Diana', age: 28, city: 'Paris' },
      ];
      await collection.insertMany(testData);
    });

    it('should find documents with filter', async () => {
      const collection = db.collection('query_test');
      const results = await collection.find({ city: 'New York' }).toArray();

      expect(results).to.be.an('array');
      expect(results.length).to.equal(2);
      results.forEach(doc => {
        expect(doc.city).to.equal('New York');
      });
    });

    it('should sort documents', async () => {
      const collection = db.collection('query_test');
      const results = await collection.find().sort({ age: 1 }).toArray();

      expect(results).to.be.an('array');
      expect(results.length).to.equal(4);
      expect(results[0].age).to.equal(25);
      expect(results[3].age).to.equal(35);
    });

    it('should limit results', async () => {
      const collection = db.collection('query_test');
      const results = await collection.find().limit(2).toArray();

      expect(results).to.be.an('array');
      expect(results.length).to.equal(2);
    });

    it('should count documents', async () => {
      const collection = db.collection('query_test');
      const count = await collection.countDocuments({ city: 'New York' });

      expect(count).to.equal(2);
    });
  });

  describe('Index Operations', () => {
    it('should create and use an index', async () => {
      const collection = db.collection('index_test');

      // Create index
      const indexResult = await collection.createIndex({ email: 1 }, { unique: true });
      expect(indexResult).to.be.a('string');

      // Insert document
      await collection.insertOne({ email: 'test@example.com', name: 'Test' });

      // Try to insert duplicate (should fail if unique index works)
      try {
        await collection.insertOne({ email: 'test@example.com', name: 'Duplicate' });
        // If we get here, the unique index didn't work as expected
        expect.fail('Should have thrown duplicate key error');
      } catch (error: any) {
        expect(error.code).to.equal(11000); // MongoDB duplicate key error code
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operations gracefully', async () => {
      const collection = db.collection('error_test');

      // Test with invalid query - should throw error
      try {
        await collection.findOne({ $invalidOperator: 1 });
        expect.fail('Should have thrown an error for invalid operator');
      } catch (error: any) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('unknown top level operator');
      }
    });

    it('should handle connection errors', async () => {
      const invalidClient = new MongoClient('mongodb://invalid-host:27017', {
        serverSelectionTimeoutMS: 1000,
      });

      try {
        await invalidClient.connect();
        expect.fail('Should have thrown connection error');
      } catch (error) {
        expect(error).to.be.an('error');
      } finally {
        await invalidClient.close();
      }
    });
  });
});