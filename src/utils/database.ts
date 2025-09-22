import { config } from 'dotenv';
config({ path: '.env.local' });

import { d1Client } from './d1Client';

export type DatabaseMode = 'remote' | 'local';

export interface DatabaseConfig {
  provider: 'cloudflare-d1';
  mode: DatabaseMode;
  database: string;
}

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    username TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    document TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)` ,
  `CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    cardId TEXT NOT NULL,
    category TEXT,
    difficulty TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    document TEXT NOT NULL,
    UNIQUE(userId, cardId)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_flashcards_category ON flashcards(userId, category)`,
  `CREATE INDEX IF NOT EXISTS idx_flashcards_difficulty ON flashcards(userId, difficulty)`,
  `CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    sessionType TEXT,
    startTime TEXT,
    endTime TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    document TEXT NOT NULL,
    UNIQUE(userId, sessionId)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions(userId)`,
  `CREATE TABLE IF NOT EXISTS study_statistics (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    statsId TEXT NOT NULL,
    date TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    document TEXT NOT NULL,
    UNIQUE(userId, statsId),
    UNIQUE(userId, date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_statistics_user ON study_statistics(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_statistics_date ON study_statistics(date)`,
  `CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    description TEXT,
    appliedAt TEXT NOT NULL
  )`,
];

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private initialized = false;
  private mode: DatabaseMode = 'local';

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      await d1Client.initializeSchema(SCHEMA_STATEMENTS);
      this.mode = d1Client.isRemote() ? 'remote' : 'local';
      this.initialized = true;
      console.log(`Cloudflare D1 ready (mode: ${this.mode})`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize Cloudflare D1:', message);
      this.initialized = false;
      return false;
    }
  }

  public isDatabaseConnected(): boolean {
    return this.initialized;
  }

  public getMode(): DatabaseMode {
    return this.mode;
  }

  public async close(): Promise<void> {
    await d1Client.close();
    this.initialized = false;
  }

  public async healthCheck(): Promise<{ status: string; database: string; mode: DatabaseMode; tables?: string[]; error?: string }> {
    try {
      await this.connect();
      const tableResult = await d1Client.execute("SELECT name FROM sqlite_master WHERE type='table'");
      const tables = (tableResult.results || [])
        .map(row => (typeof row.name === 'string' ? row.name : undefined))
        .filter((name): name is string => Boolean(name));

      return {
        status: 'connected',
        database: 'cloudflare-d1',
        mode: this.mode,
        tables,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        database: 'cloudflare-d1',
        mode: this.mode,
        error: message,
      };
    }
  }
}

export const dbConnection = DatabaseConnection.getInstance();

export const initializeDatabase = async (): Promise<boolean> => {
  return dbConnection.connect();
};

export const closeDatabase = async (): Promise<void> => {
  await dbConnection.close();
};

export interface DatabaseInfo {
  provider: 'cloudflare-d1';
  mode: DatabaseMode;
}

export const getDatabase = (): DatabaseInfo => ({
  provider: 'cloudflare-d1',
  mode: dbConnection.getMode(),
});

export const databaseConfig: DatabaseConfig = {
  provider: 'cloudflare-d1',
  mode: dbConnection.getMode(),
  database: 'cloudflare-d1',
};
