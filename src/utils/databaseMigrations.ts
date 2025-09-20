/**
 * Database Migration Utilities for LinguaFlip
 *
 * Handles schema versioning, data transformations, and migration tracking
 * for MongoDB collections in the LinguaFlip application.
 */

import { Db, Collection } from 'mongodb';
import { getDatabase } from './database';
import type { MigrationDocument } from '../types/database';
import { Schemas, DatabaseIndexes } from '../schemas/mongodb';

// ============================================================================
// MIGRATION TYPES
// ============================================================================

export interface Migration {
  id: string;
  version: string;
  description: string;
  up: (db: Db) => Promise<void>;
  down?: (db: Db) => Promise<void>;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  errors: string[];
  duration: number;
}

// ============================================================================
// MIGRATION REGISTRY
// ============================================================================

/**
 * Registry of all database migrations
 */
const migrations: Migration[] = [
  {
    id: '001_initial_schema_setup',
    version: '1.0.0',
    description: 'Initial schema setup with users, flashcards, study_sessions, and study_statistics collections',
    checksum: 'a1b2c3d4e5f6',
    up: async (db: Db) => {
      // Create collections with schemas
      await db.createCollection('users', Schemas.UserSchema);
      await db.createCollection('flashcards', Schemas.FlashcardSchema);
      await db.createCollection('study_sessions', Schemas.StudySessionSchema);
      await db.createCollection('study_statistics', Schemas.StudyStatisticsSchema);
      await db.createCollection('migrations', Schemas.MigrationSchema);

      // Create indexes
      for (const [collectionName, indexes] of Object.entries(DatabaseIndexes)) {
        const collection = db.collection(collectionName);
        for (const indexDef of indexes) {
          const indexSpec = { ...indexDef.key } as any;
          if (indexDef.options) {
            await collection.createIndex(indexSpec, indexDef.options);
          } else {
            await collection.createIndex(indexSpec);
          }
        }
      }
    }
  },

  {
    id: '002_add_user_preferences_defaults',
    version: '1.0.1',
    description: 'Add default values for user preferences and enhance validation',
    checksum: 'b2c3d4e5f6g7',
    up: async (db: Db) => {
      const usersCollection = db.collection('users');

      // Update existing users with default preferences
      await usersCollection.updateMany(
        { 'preferences.dailyCardLimit': { $exists: false } },
        {
          $set: {
            'preferences.dailyCardLimit': 25,
            'preferences.sessionDuration': 30,
            'profile.timezone': 'UTC',
            'profile.joinDate': new Date()
          }
        }
      );
    },
    down: async (db: Db) => {
      const usersCollection = db.collection('users');

      // Remove added fields
      await usersCollection.updateMany(
        {},
        {
          $unset: {
            'preferences.dailyCardLimit': '',
            'preferences.sessionDuration': '',
            'profile.timezone': '',
            'profile.joinDate': ''
          }
        }
      );
    }
  },

  {
    id: '003_enhance_sm2_algorithm_support',
    version: '1.0.2',
    description: 'Enhance SM-2 algorithm support with additional tracking fields',
    checksum: 'c3d4e5f6g7h8',
    up: async (db: Db) => {
      const flashcardsCollection = db.collection('flashcards');

      // Add new SM-2 tracking fields
      await flashcardsCollection.updateMany(
        { 'sm2.correctStreak': { $exists: false } },
        {
          $set: {
            'sm2.correctStreak': 0,
            'sm2.incorrectStreak': 0,
            'sm2.isSuspended': false,
            'statistics.timesCorrect': 0,
            'statistics.timesIncorrect': 0
          }
        }
      );

      // Create additional indexes for SM-2 queries
      await flashcardsCollection.createIndex(
        { userId: 1, 'sm2.isSuspended': 1, 'sm2.nextReviewDate': 1 }
      );
    },
    down: async (db: Db) => {
      const flashcardsCollection = db.collection('flashcards');

      // Remove added fields
      await flashcardsCollection.updateMany(
        {},
        {
          $unset: {
            'sm2.correctStreak': '',
            'sm2.incorrectStreak': '',
            'sm2.isSuspended': '',
            'statistics.timesCorrect': '',
            'statistics.timesIncorrect': ''
          }
        }
      );
    }
  },

  {
    id: '004_add_study_session_performance_tracking',
    version: '1.0.3',
    description: 'Add performance tracking and analytics to study sessions',
    checksum: 'd4e5f6g7h8i9',
    up: async (db: Db) => {
      const sessionsCollection = db.collection('study_sessions');

      // Add performance tracking fields
      await sessionsCollection.updateMany(
        { performance: { $exists: false } },
        {
          $set: {
            performance: {
              overallScore: 0,
              improvement: 0,
              focusAreas: [],
              retentionRate: 0,
              consistency: 0
            },
            interruptions: []
          }
        }
      );

      // Create performance indexes
      await sessionsCollection.createIndex(
        { userId: 1, 'performance.overallScore': -1 }
      );
    },
    down: async (db: Db) => {
      const sessionsCollection = db.collection('study_sessions');

      // Remove performance fields
      await sessionsCollection.updateMany(
        {},
        {
          $unset: {
            performance: '',
            interruptions: ''
          }
        }
      );
    }
  },

  {
    id: '005_add_data_integrity_constraints',
    version: '1.0.4',
    description: 'Add data integrity constraints and validation rules',
    checksum: 'e5f6g7h8i9j0',
    up: async (db: Db) => {
      // Update collection validators with enhanced constraints
      const collections = ['users', 'flashcards', 'study_sessions', 'study_statistics'];

      for (const collectionName of collections) {
        let schema: Record<string, unknown> | null = null;

        // Safely access schema by collection name
        switch (collectionName) {
          case 'users':
            schema = Schemas.UserSchema;
            break;
          case 'flashcards':
            schema = Schemas.FlashcardSchema;
            break;
          case 'study_sessions':
            schema = Schemas.StudySessionSchema;
            break;
          case 'study_statistics':
            schema = Schemas.StudyStatisticsSchema;
            break;
        }

        if (schema) {
          await db.command({
            collMod: collectionName,
            validator: schema.validator
          });
        }
      }
    }
  }
];

// ============================================================================
// MIGRATION ENGINE
// ============================================================================

/**
 * Database migration engine
 */
export class MigrationEngine {
  private db: Db;
  private migrationsCollection: Collection<MigrationDocument>;

  constructor(db: Db) {
    this.db = db;
    this.migrationsCollection = db.collection<MigrationDocument>('migrations');
  }

  /**
   * Get current database version
   */
  async getCurrentVersion(): Promise<string> {
    const latestMigration = await this.migrationsCollection
      .find({})
      .sort({ appliedAt: -1 })
      .limit(1)
      .toArray();

    return latestMigration.length > 0 ? latestMigration[0].version : '0.0.0';
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const currentVersion = await this.getCurrentVersion();
    const appliedMigrationIds = await this.migrationsCollection
      .find({ success: true })
      .project({ migrationId: 1 })
      .toArray()
      .then(docs => docs.map(doc => doc.migrationId));

    return migrations.filter(migration =>
      !appliedMigrationIds.includes(migration.id) &&
      this.compareVersions(migration.version, currentVersion) > 0
    );
  }

  /**
   * Apply pending migrations
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    const pendingMigrations = await this.getPendingMigrations();
    const appliedMigrations: string[] = [];
    const errors: string[] = [];

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration: ${migration.id} (${migration.version})`);

        // Apply migration
        await migration.up(this.db);

        // Record successful migration
        await this.migrationsCollection.insertOne({
          migrationId: migration.id,
          version: migration.version,
          description: migration.description,
          appliedAt: new Date(),
          checksum: migration.checksum,
          success: true
        });

        appliedMigrations.push(migration.id);
        console.log(`✅ Migration ${migration.id} applied successfully`);

      } catch (error) {
        const errorMessage = `Failed to apply migration ${migration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);

        // Record failed migration
        await this.migrationsCollection.insertOne({
          migrationId: migration.id,
          version: migration.version,
          description: migration.description,
          appliedAt: new Date(),
          checksum: migration.checksum,
          success: false,
          error: errorMessage
        });

        errors.push(errorMessage);

        // Stop on first error to prevent inconsistent state
        break;
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: errors.length === 0,
      appliedMigrations,
      errors,
      duration
    };
  }

  /**
   * Rollback last migration
   */
  async rollback(): Promise<MigrationResult> {
    const startTime = Date.now();
    const lastMigration = await this.migrationsCollection
      .find({ success: true })
      .sort({ appliedAt: -1 })
      .limit(1)
      .toArray();

    if (lastMigration.length === 0) {
      return {
        success: false,
        appliedMigrations: [],
        errors: ['No migrations to rollback'],
        duration: Date.now() - startTime
      };
    }

    const migrationDoc = lastMigration[0];
    const migration = migrations.find(m => m.id === migrationDoc.migrationId);

    if (!migration || !migration.down) {
      return {
        success: false,
        appliedMigrations: [],
        errors: [`Migration ${migrationDoc.migrationId} does not support rollback`],
        duration: Date.now() - startTime
      };
    }

    try {
      console.log(`Rolling back migration: ${migration.id}`);

      // Apply rollback
      await migration.down(this.db);

      // Remove migration record
      await this.migrationsCollection.deleteOne({ migrationId: migration.id });

      console.log(`✅ Migration ${migration.id} rolled back successfully`);

      return {
        success: true,
        appliedMigrations: [migration.id],
        errors: [],
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = `Failed to rollback migration ${migration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);

      return {
        success: false,
        appliedMigrations: [],
        errors: [errorMessage],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<MigrationDocument[]> {
    return await this.migrationsCollection
      .find({})
      .sort({ appliedAt: -1 })
      .toArray();
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 > v2) return 1;
      if (v1 < v2) return -1;
    }

    return 0;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Initialize database with migrations
 */
export async function initializeDatabaseWithMigrations(): Promise<MigrationResult> {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  const migrationEngine = new MigrationEngine(db);

  console.log('🔄 Checking for pending database migrations...');

  const result = await migrationEngine.migrate();

  if (result.success) {
    console.log(`✅ Database migration completed successfully. Applied ${result.appliedMigrations.length} migrations in ${result.duration}ms`);
  } else {
    console.error(`❌ Database migration failed:`, result.errors);
  }

  return result;
}

/**
 * Get database health status including migration info
 */
export async function getDatabaseHealthWithMigrations(): Promise<{
  status: string;
  currentVersion: string;
  pendingMigrations: number;
  lastMigration?: Date;
  collections: string[];
}> {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  const migrationEngine = new MigrationEngine(db);

  try {
    const currentVersion = await migrationEngine.getCurrentVersion();
    const pendingMigrations = await migrationEngine.getPendingMigrations();
    const migrationHistory = await migrationEngine.getMigrationHistory();

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    return {
      status: 'healthy',
      currentVersion,
      pendingMigrations: pendingMigrations.length,
      lastMigration: migrationHistory.length > 0 ? migrationHistory[0].appliedAt : undefined,
      collections: collectionNames
    };
  } catch {
    return {
      status: 'error',
      currentVersion: 'unknown',
      pendingMigrations: 0,
      collections: []
    };
  }
}

/**
 * Create backup before migration
 */
export async function createMigrationBackup(collectionName: string): Promise<string> {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupCollectionName = `${collectionName}_backup_${timestamp}`;

  console.log(`📦 Creating backup of ${collectionName} as ${backupCollectionName}`);

  // Copy collection data
  const sourceCollection = db.collection(collectionName);
  const backupCollection = db.collection(backupCollectionName);

  const documents = await sourceCollection.find({}).toArray();
  if (documents.length > 0) {
    await backupCollection.insertMany(documents);
  }

  return backupCollectionName;
}

/**
 * Validate migration checksum
 */
export function validateMigrationChecksum(migration: Migration): boolean {
  // Simple checksum validation (can be enhanced with proper hashing)
  const expectedChecksum = migration.checksum;
  const calculatedChecksum = migration.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString();

  return expectedChecksum === calculatedChecksum;
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export { migrations };
export default MigrationEngine;