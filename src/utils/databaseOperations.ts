import { Collection, ObjectId } from 'mongodb';
import { getDatabase, dbConnection } from './database.ts';
import type { DatabaseOperationResult, BulkOperationResult } from '../types/database.ts';

// In-memory storage for offline mode
const offlineStorage = new Map<string, Map<string, Record<string, unknown>>>();

// Simplified database operations class
export class DatabaseOperations {
  private collectionName: string;
  private collection: Collection | null = null;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    // Initialize offline storage for this collection
    if (!offlineStorage.has(collectionName)) {
      offlineStorage.set(collectionName, new Map());
    }
  }

  // Initialize collection
  private async initializeCollection(): Promise<Collection | null> {
    if (!this.collection) {
      if (!dbConnection.isDatabaseConnected()) {
        console.warn(`Database not connected, running ${this.collectionName} operations in offline mode`);
        return null;
      }
      try {
        const db = getDatabase();
        if (!db) {
          console.warn(`Database not available, running ${this.collectionName} operations in offline mode`);
          return null;
        }
        this.collection = db.collection(this.collectionName);
      } catch (error) {
        console.warn(`Failed to initialize collection ${this.collectionName}, running in offline mode:`, error);
        return null;
      }
    }
    return this.collection;
  }

  // Create operation with timestamps
  async create(document: Record<string, unknown>): Promise<DatabaseOperationResult<Record<string, unknown>>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), return success with mock data
      if (!collection) {
        console.log(`Database offline: Simulating create operation for ${this.collectionName}`);
        const now = new Date();
        const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const mockDocument = {
          ...document,
          _id: mockId,
          createdAt: now,
          updatedAt: now,
        };

        // Store in offline storage
        const collectionStore = offlineStorage.get(this.collectionName)!;
        collectionStore.set(mockId, mockDocument);

        return {
          success: true,
          data: mockDocument,
          operationTime: Date.now() - startTime,
        };
      }

      const now = new Date();
      const documentWithTimestamps = {
        ...document,
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(documentWithTimestamps);

      if (!result.acknowledged) {
        throw new Error('Insert operation was not acknowledged');
      }

      const insertedDocument = {
        ...documentWithTimestamps,
        _id: result.insertedId,
      };

      return {
        success: true,
        data: insertedDocument,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Find single document
  async findOne(filter: Record<string, unknown>, options?: Record<string, unknown>): Promise<DatabaseOperationResult<Record<string, unknown> | null>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), search in offline storage
      if (!collection) {
        console.log(`Database offline: Simulating findOne operation for ${this.collectionName}`);
        const collectionStore = offlineStorage.get(this.collectionName)!;
        
        // Simple filter matching for offline mode
        for (const [id, doc] of collectionStore) {
          let matches = true;
          for (const [key, value] of Object.entries(filter)) {
            if (doc[key] !== value) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return {
              success: true,
              data: doc,
              operationTime: Date.now() - startTime,
            };
          }
        }
        
        return {
          success: true,
          data: null,
          operationTime: Date.now() - startTime,
        };
      }

      const document = await collection.findOne(filter, options);

      return {
        success: true,
        data: document,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Find multiple documents
  async findMany(filter: Record<string, unknown> = {}, options?: Record<string, unknown>): Promise<DatabaseOperationResult<Record<string, unknown>[]>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), return empty array
      if (!collection) {
        console.log(`Database offline: Simulating findMany operation for ${this.collectionName}`);
        return {
          success: true,
          data: [],
          operationTime: Date.now() - startTime,
        };
      }

      const documents = await collection.find(filter, options).toArray();

      return {
        success: true,
        data: documents,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Update single document
  async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: { upsert?: boolean }): Promise<DatabaseOperationResult<Record<string, unknown> | null>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), simulate update
      if (!collection) {
        console.log(`Database offline: Simulating updateOne operation for ${this.collectionName}`);
        const collectionStore = offlineStorage.get(this.collectionName)!;
        
        // Find document to update
        for (const [id, doc] of collectionStore) {
          let matches = true;
          for (const [key, value] of Object.entries(filter)) {
            if (doc[key] !== value) {
              matches = false;
              break;
            }
          }
          if (matches) {
            // Apply update - handle both direct update and $set syntax
            const updateData = update.$set ? update.$set as Record<string, unknown> : update;
            const updatedDoc = {
              ...doc,
              ...updateData,
              updatedAt: new Date(),
            };
            collectionStore.set(id, updatedDoc);
            return {
              success: true,
              data: updatedDoc,
              operationTime: Date.now() - startTime,
            };
          }
        }
        
        return {
          success: true,
          data: null,
          operationTime: Date.now() - startTime,
        };
      }

      // Add updatedAt timestamp
      const updateWithTimestamp = {
        ...update,
        $set: {
          ...(update.$set && typeof update.$set === 'object' ? update.$set as Record<string, unknown> : {}),
          updatedAt: new Date(),
        },
      };

      const result = await collection.updateOne(filter, updateWithTimestamp, options);

      if (!result.acknowledged) {
        throw new Error('Update operation was not acknowledged');
      }

      // Return the updated document if it was found
      if (result.matchedCount > 0) {
        const updatedDocument = await collection.findOne(filter);
        return {
          success: true,
          data: updatedDocument,
          operationTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: null,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Update multiple documents
  async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<DatabaseOperationResult<{ modifiedCount: number }>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), simulate update
      if (!collection) {
        console.log(`Database offline: Simulating updateMany operation for ${this.collectionName}`);
        return {
          success: true,
          data: { modifiedCount: 0 },
          operationTime: Date.now() - startTime,
        };
      }

      const updateWithTimestamp = {
        ...update,
        $set: {
          ...(update.$set && typeof update.$set === 'object' ? update.$set as Record<string, unknown> : {}),
          updatedAt: new Date(),
        },
      };

      const result = await collection.updateMany(filter, updateWithTimestamp);

      if (!result.acknowledged) {
        throw new Error('Update operation was not acknowledged');
      }

      return {
        success: true,
        data: { modifiedCount: result.modifiedCount },
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Delete single document
  async deleteOne(filter: Record<string, unknown>): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), simulate delete
      if (!collection) {
        console.log(`Database offline: Simulating deleteOne operation for ${this.collectionName}`);
        return {
          success: true,
          data: { deletedCount: 0 },
          operationTime: Date.now() - startTime,
        };
      }

      const result = await collection.deleteOne(filter);

      if (!result.acknowledged) {
        throw new Error('Delete operation was not acknowledged');
      }

      return {
        success: true,
        data: { deletedCount: result.deletedCount },
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Delete multiple documents
  async deleteMany(filter: Record<string, unknown>): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), simulate delete
      if (!collection) {
        console.log(`Database offline: Simulating deleteMany operation for ${this.collectionName}`);
        return {
          success: true,
          data: { deletedCount: 0 },
          operationTime: Date.now() - startTime,
        };
      }

      const result = await collection.deleteMany(filter);

      if (!result.acknowledged) {
        throw new Error('Delete operation was not acknowledged');
      }

      return {
        success: true,
        data: { deletedCount: result.deletedCount },
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Count documents
  async count(filter: Record<string, unknown> = {}): Promise<DatabaseOperationResult<number>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), return 0
      if (!collection) {
        console.log(`Database offline: Simulating count operation for ${this.collectionName}`);
        return {
          success: true,
          data: 0,
          operationTime: Date.now() - startTime,
        };
      }

      const count = await collection.countDocuments(filter);

      return {
        success: true,
        data: count,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Check if document exists
  async exists(filter: Record<string, unknown>): Promise<DatabaseOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), return false
      if (!collection) {
        console.log(`Database offline: Simulating exists operation for ${this.collectionName}`);
        return {
          success: true,
          data: false,
          operationTime: Date.now() - startTime,
        };
      }

      const count = await collection.countDocuments(filter, { limit: 1 });

      return {
        success: true,
        data: count > 0,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Bulk operations
  async bulkWrite(operations: Record<string, unknown>[]): Promise<DatabaseOperationResult<BulkOperationResult>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), simulate bulk write
      if (!collection) {
        console.log(`Database offline: Simulating bulkWrite operation for ${this.collectionName}`);
        const bulkResult: BulkOperationResult = {
          success: true,
          insertedCount: 0,
          updatedCount: 0,
          deletedCount: 0,
          errors: [],
          operationTime: Date.now() - startTime,
        };

        return {
          success: true,
          data: bulkResult,
          operationTime: Date.now() - startTime,
        };
      }

      const result = await collection.bulkWrite(operations as any[]);

      const bulkResult: BulkOperationResult = {
        success: result.ok === 1,
        insertedCount: result.insertedCount || 0,
        updatedCount: result.modifiedCount || 0,
        deletedCount: result.deletedCount || 0,
        errors: [],
        operationTime: Date.now() - startTime,
      };

      return {
        success: true,
        data: bulkResult,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Aggregation pipeline
  async aggregate(pipeline: Record<string, unknown>[], options?: { allowDiskUse?: boolean }): Promise<DatabaseOperationResult<Record<string, unknown>[]>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), return empty array
      if (!collection) {
        console.log(`Database offline: Simulating aggregate operation for ${this.collectionName}`);
        return {
          success: true,
          data: [],
          operationTime: Date.now() - startTime,
        };
      }

      const results = await collection.aggregate(pipeline, options).toArray();

      return {
        success: true,
        data: results,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Create indexes
  async createIndexes(indexes: Array<{ key: Record<string, 1 | -1>; options?: Record<string, unknown> }>): Promise<DatabaseOperationResult<string[]>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), simulate index creation
      if (!collection) {
        console.log(`Database offline: Simulating createIndexes operation for ${this.collectionName}`);
        return {
          success: true,
          data: indexes.map(() => 'simulated_index'),
          operationTime: Date.now() - startTime,
        };
      }

      const results = await Promise.all(
        indexes.map(index => collection.createIndex(index.key, index.options))
      );

      return {
        success: true,
        data: results,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }

  // Get distinct values
  async distinct(field: string, filter: Record<string, unknown> = {}): Promise<DatabaseOperationResult<unknown[]>> {
    const startTime = Date.now();

    try {
      const collection = await this.initializeCollection();

      // If collection is null (offline mode), return empty array
      if (!collection) {
        console.log(`Database offline: Simulating distinct operation for ${this.collectionName}`);
        return {
          success: true,
          data: [],
          operationTime: Date.now() - startTime,
        };
      }

      const values = await collection.distinct(field, filter);

      return {
        success: true,
        data: values,
        operationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationTime: Date.now() - startTime,
      };
    }
  }
}

// Factory function to create database operations instances
export function createDatabaseOperations(collectionName: string): DatabaseOperations {
  return new DatabaseOperations(collectionName);
}

// Utility functions for common operations
export const databaseUtils = {
  // Validate ObjectId
  isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id);
  },

  // Convert string to ObjectId
  toObjectId(id: string): ObjectId {
    if (!this.isValidObjectId(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new ObjectId(id);
  },

  // Generate new ObjectId
  generateId(): ObjectId {
    return new ObjectId();
  },

  // Convert ObjectId to string
  idToString(id: ObjectId): string {
    return id.toHexString();
  },

  // Validate document structure
  validateDocument(document: Record<string, unknown>, requiredFields: string[]): Error | null {
    for (const field of requiredFields) {
      if (!(field in document) || document[field] === null || document[field] === undefined) {
        return new Error(`Missing required field: ${field}`);
      }
    }
    return null;
  },
};

// Export types for use in other modules
export type { DatabaseOperationResult, BulkOperationResult };