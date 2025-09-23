import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

type QueryParam = unknown;

export interface D1QueryResult {
  success: boolean;
  results?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
  error?: string;
}

const DEFAULT_DATABASE_FILENAME = 'linguaflip-d1.sqlite';

type RemoteStatus = 'unknown' | 'available' | 'failed';

export class CloudflareD1Client {
  private remoteUrl: string | null;
  private apiKey: string | null;
  private accountId: string | null;
  private databaseId: string | null;
  private remoteStatus: RemoteStatus = 'unknown';
  private localDb: Database.Database | null = null;
  private schemaInitialized = false;

  constructor() {
    this.remoteUrl = process.env.D1_URL
      ? process.env.D1_URL.replace(/\/$/, '')
      : null;
    this.apiKey = process.env.D1_API_KEY || null;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || null;
    this.databaseId = process.env.D1_DATABASE_ID || null;

    if (!this.remoteUrl && this.accountId && this.databaseId) {
      this.remoteUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
    }
  }

  public async execute(
    sql: string,
    params: QueryParam[] = []
  ): Promise<D1QueryResult> {
    if (this.shouldUseRemote()) {
      try {
        const result = await this.executeRemote(sql, params);
        this.remoteStatus = 'available';
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Remote D1 query failed (${message}). Falling back to local SQLite.`
        );
        this.remoteStatus = 'failed';
        this.ensureLocalDatabase();
      }
    }

    this.ensureLocalDatabase();
    return this.executeLocal(sql, params);
  }

  public async executeBatch(
    queries: Array<{ sql: string; params?: QueryParam[] }>
  ): Promise<D1QueryResult[]> {
    const results: D1QueryResult[] = [];

    if (this.shouldUseRemote()) {
      try {
        const remoteResult = await this.executeRemoteBatch(queries);
        this.remoteStatus = 'available';
        return remoteResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Remote D1 batch failed (${message}). Falling back to local SQLite.`
        );
        this.remoteStatus = 'failed';
        this.ensureLocalDatabase();
      }
    }

    this.ensureLocalDatabase();
    const db = this.localDb!;
    const transaction = db.transaction(
      (batchedQueries: Array<{ sql: string; params?: QueryParam[] }>) => {
        for (const { sql, params } of batchedQueries) {
          const result = this.executeLocal(sql, params || []);
          results.push(result);
          if (!result.success) {
            throw new Error(result.error || 'Unknown SQLite error');
          }
        }
      }
    );

    try {
      transaction(queries);
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [{ success: false, error: message }];
    }
  }

  public isRemote(): boolean {
    return this.remoteStatus === 'available';
  }

  public async close(): Promise<void> {
    if (this.localDb) {
      this.localDb.close();
      this.localDb = null;
    }
  }

  public async initializeSchema(schemaStatements: string[]): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    for (const statement of schemaStatements) {
      const result = await this.execute(statement);
      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize D1 schema');
      }
    }

    this.schemaInitialized = true;
  }

  private shouldUseRemote(): boolean {
    if (!this.remoteUrl || !this.apiKey) {
      return false;
    }
    if (this.remoteStatus === 'failed') {
      return false;
    }
    return true;
  }

  private async executeRemote(
    sql: string,
    params: QueryParam[]
  ): Promise<D1QueryResult> {
    const payload = Array.isArray(sql) ? { sql, params } : { sql, params };

    const response = await fetch(`${this.remoteUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Cloudflare D1 responded with ${response.status}: ${text}`
      );
    }

    const data = await response.json();

    if (Array.isArray(data?.result)) {
      const primary = data.result[0];
      return {
        success: true,
        results: primary?.results || [],
        meta: primary?.meta,
      };
    }

    if (data?.result?.results) {
      return {
        success: true,
        results: data.result.results,
        meta: data.result.meta,
      };
    }

    return {
      success: data?.success ?? false,
      results: Array.isArray(data?.result) ? data.result : [],
      meta: data?.result?.meta,
      error: data?.errors?.length ? JSON.stringify(data.errors) : undefined,
    };
  }

  private async executeRemoteBatch(
    queries: Array<{ sql: string; params?: QueryParam[] }>
  ): Promise<D1QueryResult[]> {
    const payload = queries.map((query) => ({
      sql: query.sql,
      params: query.params || [],
    }));

    const response = await fetch(`${this.remoteUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Cloudflare D1 responded with ${response.status}: ${text}`
      );
    }

    const data = await response.json();

    if (Array.isArray(data?.result)) {
      return data.result.map((entry: any) => ({
        success: true,
        results: entry?.results || [],
        meta: entry?.meta,
      }));
    }

    return [
      {
        success: data?.success ?? false,
        results: data?.result?.results || [],
        meta: data?.result?.meta,
        error: data?.errors?.length ? JSON.stringify(data.errors) : undefined,
      },
    ];
  }

  private executeLocal(sql: string, params: QueryParam[]): D1QueryResult {
    if (!this.localDb) {
      throw new Error('Local SQLite database not initialized');
    }

    const normalizedParams = params.map((param) => this.normalizeParam(param));
    const trimmed = sql.trim().toLowerCase();
    const statement = this.localDb.prepare(sql);

    if (
      trimmed.startsWith('select') ||
      trimmed.startsWith('with') ||
      trimmed.startsWith('pragma')
    ) {
      const rows = statement.all(...normalizedParams) as Array<
        Record<string, unknown>
      >;
      return { success: true, results: rows };
    }

    const info = statement.run(...normalizedParams);
    return {
      success: true,
      meta: {
        changes: info.changes,
        lastInsertRowid: Number(info.lastInsertRowid || 0),
      },
    };
  }

  private ensureLocalDatabase(): void {
    if (this.localDb) {
      return;
    }

    const cacheDir = path.join(process.cwd(), '.d1-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const dbPath = path.join(cacheDir, DEFAULT_DATABASE_FILENAME);
    this.localDb = new Database(dbPath);
  }

  private normalizeParam(param: QueryParam): QueryParam {
    if (param === undefined) {
      return null;
    }

    if (param instanceof Date) {
      return param.toISOString();
    }

    if (Array.isArray(param)) {
      return JSON.stringify(param);
    }

    return param;
  }
}

export const d1Client = new CloudflareD1Client();
