import { MongoClient, Db } from 'mongodb';
import type { MongoClientOptions } from 'mongodb';

// Database configuration interface
export interface DatabaseConfig {
  uri: string;
  databaseName: string;
  options: MongoClientOptions;
}

// Environment-specific database configurations
const getDatabaseConfig = (): DatabaseConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Base configuration options
  const baseOptions: MongoClientOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 2000, // Faster timeout for development
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
    directConnection: true, // Use direct connection as specified
  };

  switch (nodeEnv) {
    case 'production':
      return {
        uri: process.env.MONGODB_URI || '',
        databaseName: process.env.MONGODB_DATABASE || 'linguaflip_prod',
        options: {
          ...baseOptions,
          maxPoolSize: 20,
          serverSelectionTimeoutMS: 10000,
        },
      };

    case 'test':
      return {
        uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017',
        databaseName: process.env.MONGODB_TEST_DATABASE || 'linguaflip_test',
        options: {
          ...baseOptions,
          maxPoolSize: 5,
          serverSelectionTimeoutMS: 3000,
        },
      };

    default: // development
      return {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=linguaflip-dev',
        databaseName: process.env.MONGODB_DATABASE || 'linguaflip_dev',
        options: baseOptions,
      };
  }
};

// Database connection class
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected: boolean = false;
  private config: DatabaseConfig;

  private constructor() {
    this.config = getDatabaseConfig();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  // Connect to MongoDB with retry logic (graceful fallback)
  public async connect(maxRetries: number = 3): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true;
    }

    // If no MongoDB URI is configured, skip connection
    if (!this.config.uri || this.config.uri.trim() === '') {
      console.warn('MongoDB URI not configured, running in offline mode');
      return false;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting MongoDB connection (attempt ${attempt}/${maxRetries})...`);

        this.client = new MongoClient(this.config.uri, this.config.options);

        // Set up event listeners
        this.client.on('connected', () => {
          console.log('MongoDB connected successfully');
          this.isConnected = true;
        });

        this.client.on('disconnected', () => {
          console.log('MongoDB disconnected');
          this.isConnected = false;
        });

        this.client.on('error', (error) => {
          console.error('MongoDB connection error:', error);
        });

        // Connect to MongoDB
        await this.client.connect();
        this.db = this.client.db(this.config.databaseName);

        // Test the connection
        await this.client.db(this.config.databaseName).admin().ping();

        this.isConnected = true;
        console.log(`MongoDB connected successfully to database: ${this.config.databaseName}`);
        return true;

      } catch (error) {
        lastError = error as Error;
        console.error(`MongoDB connection attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.warn(`Failed to connect to MongoDB after ${maxRetries} attempts. Running in offline mode. Last error: ${lastError?.message}`);
    return false;
  }

  // Get database instance
  public getDatabase(): Db {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  // Get client instance
  public getClient(): MongoClient {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.client;
  }

  // Check connection status
  public isDatabaseConnected(): boolean {
    return this.isConnected;
  }

  // Close connection
  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.db = null;
      console.log('MongoDB connection closed');
    }
  }

  // Health check
  public async healthCheck(): Promise<{ status: string; database: string; collections?: string[] }> {
    try {
      if (!this.isConnected || !this.db) {
        return { status: 'disconnected', database: this.config.databaseName };
      }

      // Ping the database
      await this.db.admin().ping();

      // Get collection names
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(col => col.name);

      return {
        status: 'connected',
        database: this.config.databaseName,
        collections: collectionNames,
      };
    } catch {
      return {
        status: 'error',
        database: this.config.databaseName,
      };
    }
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();

// Utility function to get database instance
export const getDatabase = (): Db | null => {
  try {
    return dbConnection.getDatabase();
  } catch {
    console.warn('Database not available, using offline mode');
    return null;
  }
};

// Utility function to initialize database connection
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    return await dbConnection.connect();
  } catch (error) {
    console.warn('Database initialization failed, running in offline mode:', error);
    return false;
  }
};

// Utility function to close database connection
export const closeDatabase = async (): Promise<void> => {
  await dbConnection.close();
};

// Export database configuration for external use
export const databaseConfig = getDatabaseConfig();