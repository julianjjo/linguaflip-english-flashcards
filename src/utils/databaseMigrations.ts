import { dbConnection, initializeDatabase } from './database';
import { d1Client } from './d1Client';

export interface Migration {
  id: string;
  version: string;
  description: string;
  checksum?: string;
}

export interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  errors: string[];
  duration: number;
}

export async function initializeDatabaseWithMigrations(): Promise<MigrationResult> {
  const start = Date.now();
  try {
    await initializeDatabase();
    return {
      success: true,
      appliedMigrations: [],
      errors: [],
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      appliedMigrations: [],
      errors: [message],
      duration: Date.now() - start,
    };
  }
}

export async function getDatabaseHealthWithMigrations(): Promise<{
  status: string;
  currentVersion: string;
  pendingMigrations: number;
  lastMigration?: Date;
  collections: string[];
}> {
  const health = await dbConnection.healthCheck();
  return {
    status: health.status,
    currentVersion: '1.0.0',
    pendingMigrations: 0,
    lastMigration: undefined,
    collections: health.tables || [],
  };
}

export async function createMigrationBackup(
  collectionName: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${collectionName}_backup_${timestamp}`;
  console.warn(
    `Backups are not implemented for Cloudflare D1. Requested backup: ${backupName}`
  );
  return backupName;
}

export async function restoreMigrationBackup(
  _collectionName: string,
  _backupName: string
): Promise<void> {
  throw new Error('Backup restoration is not implemented for Cloudflare D1');
}

export async function listMigrations(): Promise<Migration[]> {
  const result = await d1Client.execute(
    'SELECT id, version, description, checksum FROM migrations ORDER BY appliedAt DESC'
  );
  return (result.results || []).map((row) => ({
    id: String(row.id),
    version: String(row.version),
    description: String(row.description || ''),
    checksum: row.checksum ? String(row.checksum) : undefined,
  }));
}
