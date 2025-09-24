import { d1Client } from './d1Client';
import { dbConnection } from './database';
import type {
  DatabaseOperationResult,
  BulkOperationResult,
} from '../types/database';

const RANDOM_ID_BYTES = 12;

function generateRandomHexId(bytes: number): string {
  const globalCrypto =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (globalCrypto?.getRandomValues) {
    const values = new Uint8Array(bytes);
    globalCrypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID().replace(/-/g, '').slice(0, bytes * 2);
  }

  let fallback = '';
  for (let index = 0; index < bytes; index += 1) {
    const randomValue = Math.floor(Math.random() * 256);
    fallback += randomValue.toString(16).padStart(2, '0');
  }
  return fallback;
}

type Filter = Record<string, unknown>;
type UpdateFilter = Record<string, unknown> & {
  $set?: Record<string, unknown>;
};

interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

interface CollectionConfig {
  table: string;
  filterColumns: Record<string, string>;
}

const COLLECTION_CONFIGS: Record<string, CollectionConfig> = {
  users: {
    table: 'users',
    filterColumns: {
      _id: 'id',
      userId: 'userId',
      email: 'email',
      username: 'username',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
  flashcards: {
    table: 'flashcards',
    filterColumns: {
      _id: 'id',
      userId: 'userId',
      cardId: 'cardId',
      category: 'category',
      difficulty: 'difficulty',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
  study_sessions: {
    table: 'study_sessions',
    filterColumns: {
      _id: 'id',
      userId: 'userId',
      sessionId: 'sessionId',
      sessionType: 'sessionType',
      startTime: 'startTime',
      endTime: 'endTime',
    },
  },
  study_statistics: {
    table: 'study_statistics',
    filterColumns: {
      _id: 'id',
      userId: 'userId',
      statsId: 'statsId',
      date: 'date',
      period: 'period',
    },
  },
  migrations: {
    table: 'migrations',
    filterColumns: {
      _id: 'id',
      id: 'id',
      version: 'version',
    },
  },
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const DATE_KEY_HINTS = [
  'createdAt',
  'updatedAt',
  'startTime',
  'endTime',
  'nextReviewDate',
  'lastStudyDate',
  'passwordChangedAt',
  'passwordResetExpires',
  'emailVerifiedAt',
  'lastLogin',
  'accountLockedUntil',
  'timestamp',
  'date',
  'appliedAt',
];

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/;

export class DatabaseOperations {
  private readonly collectionName: keyof typeof COLLECTION_CONFIGS;

  constructor(collectionName: string) {
    if (!(collectionName in COLLECTION_CONFIGS)) {
      throw new Error(`Unsupported collection: ${collectionName}`);
    }
    this.collectionName = collectionName as keyof typeof COLLECTION_CONFIGS;
  }

  private get config(): CollectionConfig {
    return COLLECTION_CONFIGS[this.collectionName];
  }

  private async ensureReady(): Promise<void> {
    await dbConnection.connect();
  }

  private generateId(): string {
    return generateRandomHexId(RANDOM_ID_BYTES);
  }

  private normalizeValue(value: unknown): unknown {
    if (value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      return JSON.stringify(value, (_key, nestedValue) => {
        if (nestedValue instanceof Date) {
          return nestedValue.toISOString();
        }
        return nestedValue;
      });
    }

    return value;
  }

  private serializeDocument(document: Record<string, unknown>): string {
    return JSON.stringify(document, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  private restoreDates(value: unknown, keyHint?: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.restoreDates(item));
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, nestedValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        result[key] = this.restoreDates(nestedValue, key);
      }
      return result;
    }

    if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
      if (
        keyHint &&
        (DATE_KEY_HINTS.includes(keyHint) ||
          keyHint.endsWith('At') ||
          keyHint.endsWith('Date') ||
          keyHint.includes('Time'))
      ) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return value;
  }

  private deserializeDocument(json: string): Record<string, unknown> {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return this.restoreDates(parsed) as Record<string, unknown>;
  }

  private setNestedValue(
    target: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const segments = path.split('.');
    let current: Record<string, unknown> = target;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const existing = current[segment];
      if (
        typeof existing !== 'object' ||
        existing === null ||
        Array.isArray(existing)
      ) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }

    current[segments[segments.length - 1]] = value;
  }

  private applyUpdates(
    document: Record<string, unknown>,
    updates: Record<string, unknown>
  ): void {
    for (const [key, value] of Object.entries(updates)) {
      if (key.includes('.')) {
        this.setNestedValue(document, key, value);
      } else {
        document[key] = value;
      }
    }
  }

  private getColumnForField(field: string): string | null {
    const direct = this.config.filterColumns[field];
    if (direct) {
      return direct;
    }
    if (field === '_id') {
      return 'id';
    }
    return null;
  }

  private getNestedValue(
    object: Record<string, unknown>,
    path: string
  ): unknown {
    const segments = path.split('.');
    let current: unknown = object;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }

  private prepareDocument(
    document: Record<string, unknown>
  ): Record<string, unknown> {
    const now = new Date();
    const prepared: Record<string, unknown> = { ...document };
    if (!prepared._id) {
      prepared._id = this.generateId();
    }
    if (!prepared.createdAt) {
      prepared.createdAt = now;
    }
    prepared.updatedAt = prepared.updatedAt ? prepared.updatedAt : now;
    return prepared;
  }

  private prepareRow(
    document: Record<string, unknown>
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {
      id: document._id,
      createdAt: this.normalizeValue(document.createdAt),
      updatedAt: this.normalizeValue(document.updatedAt),
      document: this.serializeDocument(document),
    };

    for (const [field, column] of Object.entries(this.config.filterColumns)) {
      if (column === 'id') {
        row[column] = document._id;
        continue;
      }
      const value = this.getNestedValue(document, field);
      row[column] = this.normalizeValue(value);
    }

    return row;
  }

  private buildInsert(row: Record<string, unknown>): {
    sql: string;
    params: unknown[];
  } {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.config.table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const params = columns.map((column) => row[column]);
    return { sql, params };
  }

  private buildUpdate(row: Record<string, unknown>): {
    sql: string;
    params: unknown[];
  } {
    const columns = Object.keys(row).filter((column) => column !== 'id');
    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    const sql = `UPDATE ${this.config.table} SET ${assignments} WHERE id = ?`;
    const params = columns.map((column) => row[column]);
    params.push(row.id);
    return { sql, params };
  }

  private rowToDocument(row: Record<string, unknown>): Record<string, unknown> {
    const document = this.deserializeDocument(row.document as string);
    document._id = (document._id as string) || (row.id as string);
    if (row.createdAt) {
      document.createdAt = this.restoreDates(row.createdAt, 'createdAt');
    }
    if (row.updatedAt) {
      document.updatedAt = this.restoreDates(row.updatedAt, 'updatedAt');
    }
    return document;
  }

  private buildWhereClause(filter: Filter): {
    clause: string;
    params: unknown[];
    fallback: Filter;
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const fallback: Filter = {};

    for (const [field, value] of Object.entries(filter || {})) {
      const column = this.getColumnForField(field);
      if (!column) {
        fallback[field] = value;
        continue;
      }

      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        const operatorEntries = Object.entries(
          value as Record<string, unknown>
        );
        const supported = ['$ne', '$in', '$nin', '$gte', '$lte', '$gt', '$lt'];
        if (operatorEntries.every(([op]) => supported.includes(op))) {
          for (const [operator, operand] of operatorEntries) {
            switch (operator) {
              case '$ne':
                conditions.push(`${column} <> ?`);
                params.push(this.normalizeValue(operand));
                break;
              case '$in':
                if (Array.isArray(operand) && operand.length) {
                  const placeholders = operand.map(() => '?').join(', ');
                  conditions.push(`${column} IN (${placeholders})`);
                  params.push(
                    ...operand.map((item) => this.normalizeValue(item))
                  );
                }
                break;
              case '$nin':
                if (Array.isArray(operand) && operand.length) {
                  const placeholders = operand.map(() => '?').join(', ');
                  conditions.push(`${column} NOT IN (${placeholders})`);
                  params.push(
                    ...operand.map((item) => this.normalizeValue(item))
                  );
                }
                break;
              case '$gte':
                conditions.push(`${column} >= ?`);
                params.push(this.normalizeValue(operand));
                break;
              case '$lte':
                conditions.push(`${column} <= ?`);
                params.push(this.normalizeValue(operand));
                break;
              case '$gt':
                conditions.push(`${column} > ?`);
                params.push(this.normalizeValue(operand));
                break;
              case '$lt':
                conditions.push(`${column} < ?`);
                params.push(this.normalizeValue(operand));
                break;
            }
          }
        } else {
          fallback[field] = value;
        }
        continue;
      }

      if (value === null) {
        conditions.push(`${column} IS NULL`);
      } else {
        conditions.push(`${column} = ?`);
        params.push(this.normalizeValue(value));
      }
    }

    const clause = conditions.length
      ? ` WHERE ${conditions.join(' AND ')}`
      : '';
    return { clause, params, fallback };
  }

  private applyFallbackFilter(
    documents: Record<string, unknown>[],
    filter: Filter
  ): Record<string, unknown>[] {
    if (!filter || Object.keys(filter).length === 0) {
      return documents;
    }

    return documents.filter((document) => this.matchesFilter(document, filter));
  }

  private matchesFilter(
    document: Record<string, unknown>,
    filter: Filter
  ): boolean {
    for (const [field, condition] of Object.entries(filter)) {
      const value = this.getNestedValue(document, field);

      if (
        condition &&
        typeof condition === 'object' &&
        !Array.isArray(condition) &&
        !(condition instanceof Date)
      ) {
        const objectCondition = condition as Record<string, unknown>;
        for (const [operator, operand] of Object.entries(objectCondition)) {
          switch (operator) {
            case '$ne':
              if (this.areEqual(value, operand)) {
                return false;
              }
              break;
            case '$in':
              if (Array.isArray(operand)) {
                if (!operand.some((item) => this.areEqual(value, item))) {
                  return false;
                }
              }
              break;
            case '$nin':
              if (Array.isArray(operand)) {
                if (operand.some((item) => this.areEqual(value, item))) {
                  return false;
                }
              }
              break;
            case '$gte':
              if (!this.compare(value, operand, (a, b) => a >= b)) {
                return false;
              }
              break;
            case '$lte':
              if (!this.compare(value, operand, (a, b) => a <= b)) {
                return false;
              }
              break;
            case '$gt':
              if (!this.compare(value, operand, (a, b) => a > b)) {
                return false;
              }
              break;
            case '$lt':
              if (!this.compare(value, operand, (a, b) => a < b)) {
                return false;
              }
              break;
            default:
              if (typeof operand === 'object' && operand !== null) {
                if (
                  !this.matchesFilter(value as Record<string, unknown>, {
                    [operator]: operand,
                  })
                ) {
                  return false;
                }
              }
          }
        }
      } else {
        if (!this.areEqual(value, condition)) {
          return false;
        }
      }
    }

    return true;
  }

  private areEqual(a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    if (a instanceof Date && typeof b === 'string' && ISO_DATE_REGEX.test(b)) {
      return a.getTime() === new Date(b).getTime();
    }
    if (b instanceof Date && typeof a === 'string' && ISO_DATE_REGEX.test(a)) {
      return b.getTime() === new Date(a).getTime();
    }
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private compare(
    left: unknown,
    right: unknown,
    comparator: (a: number | string, b: number | string) => boolean
  ): boolean {
    if (
      left instanceof Date ||
      (typeof left === 'string' && ISO_DATE_REGEX.test(left))
    ) {
      const leftDate = left instanceof Date ? left : new Date(left);
      const rightDate = right instanceof Date ? right : new Date(String(right));
      return comparator(leftDate.getTime(), rightDate.getTime());
    }

    if (typeof left === 'number' || typeof left === 'string') {
      const rightValue =
        typeof right === 'number' || typeof right === 'string'
          ? right
          : Number(right);
      return comparator(left as number | string, rightValue as number | string);
    }

    return false;
  }

  private async query(
    filter: Filter,
    options: QueryOptions = {}
  ): Promise<Record<string, unknown>[]> {
    await this.ensureReady();
    const { clause, params, fallback } = this.buildWhereClause(filter);

    let sql = `SELECT * FROM ${this.config.table}${clause}`;

    if (options.sort && Object.keys(options.sort).length > 0) {
      const sortParts: string[] = [];
      for (const [field, direction] of Object.entries(options.sort)) {
        const column = this.getColumnForField(field);
        if (column) {
          sortParts.push(`${column} ${direction === -1 ? 'DESC' : 'ASC'}`);
        }
      }
      if (sortParts.length) {
        sql += ` ORDER BY ${sortParts.join(', ')}`;
      }
    }

    if (typeof options.limit === 'number') {
      sql += ` LIMIT ${options.limit}`;
    }

    if (typeof options.skip === 'number') {
      if (!sql.includes('LIMIT')) {
        sql += ' LIMIT -1';
      }
      sql += ` OFFSET ${options.skip}`;
    }

    const result = await d1Client.execute(sql, params);
    const rows = (result.results || []) as Record<string, unknown>[];
    const documents = rows.map((row) => this.rowToDocument(row));
    return this.applyFallbackFilter(documents, fallback);
  }

  public async create(
    document: Record<string, unknown>
  ): Promise<DatabaseOperationResult<Record<string, unknown>>> {
    const start = Date.now();
    try {
      const prepared = this.prepareDocument(document);
      const row = this.prepareRow(prepared);
      const { sql, params } = this.buildInsert(row);
      const result = await d1Client.execute(sql, params);

      if (!result.success) {
        throw new Error(result.error || 'Failed to insert document');
      }

      return {
        success: true,
        data: prepared,
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async findOne(
    filter: Filter,
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<Record<string, unknown> | null>> {
    const start = Date.now();
    try {
      const documents = await this.query(filter, { ...options, limit: 1 });
      return {
        success: true,
        data: documents.length ? documents[0] : null,
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async findMany(
    filter: Filter = {},
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<Record<string, unknown>[]>> {
    const start = Date.now();
    try {
      const documents = await this.query(filter, options);
      return {
        success: true,
        data: documents,
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async updateOne(
    filter: Filter,
    update: UpdateFilter,
    options: { upsert?: boolean } = {}
  ): Promise<DatabaseOperationResult<Record<string, unknown> | null>> {
    const start = Date.now();
    try {
      const existing = await this.findOne(filter);
      if (!existing.success) {
        return existing;
      }

      if (!existing.data) {
        if (options.upsert) {
          const base: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(filter)) {
            if (
              typeof value !== 'object' ||
              value instanceof Date ||
              Array.isArray(value)
            ) {
              base[key] = value;
            }
          }
          const upsertDocument = {
            ...base,
            ...(update.$set || update),
          } as Record<string, unknown>;
          return this.create(upsertDocument);
        }

        return {
          success: true,
          data: null,
          operationTime: Date.now() - start,
        };
      }

      const updatedDocument = {
        ...existing.data,
        updatedAt: new Date(),
      } as Record<string, unknown>;

      this.applyUpdates(updatedDocument, update.$set || update);

      const row = this.prepareRow(updatedDocument);
      const { sql, params } = this.buildUpdate(row);
      const result = await d1Client.execute(sql, params);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update document');
      }

      return {
        success: true,
        data: updatedDocument,
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async updateMany(
    filter: Filter,
    update: UpdateFilter
  ): Promise<DatabaseOperationResult<{ modifiedCount: number }>> {
    const start = Date.now();
    try {
      const documents = await this.query(filter);
      let modified = 0;

      for (const document of documents) {
        const updatedDocument = {
          ...document,
          updatedAt: new Date(),
        } as Record<string, unknown>;
        this.applyUpdates(updatedDocument, update.$set || update);
        const row = this.prepareRow(updatedDocument);
        const { sql, params } = this.buildUpdate(row);
        const result = await d1Client.execute(sql, params);
        if (result.success) {
          modified++;
        }
      }

      return {
        success: true,
        data: { modifiedCount: modified },
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async deleteOne(
    filter: Filter
  ): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    const start = Date.now();
    try {
      const existing = await this.findOne(filter);
      if (!existing.success) {
        return {
          success: false,
          error: existing.error,
          operationTime: Date.now() - start,
        };
      }

      if (!existing.data) {
        return {
          success: true,
          data: { deletedCount: 0 },
          operationTime: Date.now() - start,
        };
      }

      const sql = `DELETE FROM ${this.config.table} WHERE id = ?`;
      const result = await d1Client.execute(sql, [existing.data._id]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete document');
      }

      return {
        success: true,
        data: { deletedCount: 1 },
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async deleteMany(
    filter: Filter
  ): Promise<DatabaseOperationResult<{ deletedCount: number }>> {
    const start = Date.now();
    try {
      const documents = await this.query(filter);
      let deleted = 0;

      for (const document of documents) {
        const sql = `DELETE FROM ${this.config.table} WHERE id = ?`;
        const result = await d1Client.execute(sql, [document._id]);
        if (result.success) {
          deleted++;
        }
      }

      return {
        success: true,
        data: { deletedCount: deleted },
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async count(
    filter: Filter = {}
  ): Promise<DatabaseOperationResult<number>> {
    const start = Date.now();
    try {
      const { clause, params } = this.buildWhereClause(filter);
      const sql = `SELECT COUNT(*) as count FROM ${this.config.table}${clause}`;
      const result = await d1Client.execute(sql, params);
      const count =
        (result.results &&
          result.results[0] &&
          (result.results[0] as Record<string, unknown>).count) ||
        0;
      return {
        success: true,
        data: typeof count === 'number' ? count : Number(count),
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }

  public async exists(
    filter: Filter
  ): Promise<DatabaseOperationResult<boolean>> {
    const countResult = await this.count(filter);
    if (!countResult.success) {
      return {
        success: false,
        error: countResult.error,
        operationTime: countResult.operationTime,
      };
    }
    return {
      success: true,
      data: (countResult.data || 0) > 0,
      operationTime: countResult.operationTime,
    };
  }

  public async bulkWrite(
    operations: Record<string, unknown>[]
  ): Promise<DatabaseOperationResult<BulkOperationResult>> {
    const start = Date.now();
    const result: BulkOperationResult = {
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      errors: [],
      operationTime: 0,
    };

    for (const operation of operations) {
      try {
        if (operation.insertOne) {
          const { document } = operation.insertOne as {
            document: Record<string, unknown>;
          };
          const createResult = await this.create(document);
          if (!createResult.success) {
            throw new Error(createResult.error || 'Insert failed');
          }
          result.insertedCount++;
        } else if (operation.updateOne) {
          const { filter, update, options } = operation.updateOne as {
            filter: Filter;
            update: UpdateFilter;
            options?: { upsert?: boolean };
          };
          const updateResult = await this.updateOne(filter, update, options);
          if (!updateResult.success) {
            throw new Error(updateResult.error || 'Update failed');
          }
          if (updateResult.data) {
            result.updatedCount++;
          }
        } else if (operation.deleteOne) {
          const { filter } = operation.deleteOne as { filter: Filter };
          const deleteResult = await this.deleteOne(filter);
          if (!deleteResult.success) {
            throw new Error(deleteResult.error || 'Delete failed');
          }
          result.deletedCount += deleteResult.data?.deletedCount || 0;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(message);
        result.success = false;
      }
    }

    result.operationTime = Date.now() - start;

    return {
      success: result.errors.length === 0,
      data: result,
      error: result.errors.length ? result.errors.join('; ') : undefined,
      operationTime: result.operationTime,
    };
  }

  public async aggregate(): Promise<
    DatabaseOperationResult<Record<string, unknown>[]>
  > {
    return {
      success: false,
      error: 'Aggregation pipelines are not supported in the D1 adapter',
      operationTime: 0,
    };
  }

  public async createIndexes(): Promise<DatabaseOperationResult<string[]>> {
    return {
      success: true,
      data: [],
      operationTime: 0,
    };
  }

  public async distinct(
    field: string,
    filter: Filter = {}
  ): Promise<DatabaseOperationResult<unknown[]>> {
    const start = Date.now();
    try {
      const documentsResult = await this.findMany(filter);
      if (!documentsResult.success || !documentsResult.data) {
        throw new Error(
          documentsResult.error ||
            'Failed to retrieve documents for distinct query'
        );
      }

      const values = new Set<unknown>();
      for (const document of documentsResult.data) {
        const value = this.getNestedValue(document, field);
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item) => values.add(item));
          } else {
            values.add(value);
          }
        }
      }

      return {
        success: true,
        data: Array.from(values),
        operationTime: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start,
      };
    }
  }
}

export function createDatabaseOperations(
  collectionName: string
): DatabaseOperations {
  return new DatabaseOperations(collectionName);
}

export const databaseUtils = {
  isValidObjectId(id: string): boolean {
    return OBJECT_ID_REGEX.test(id);
  },

  toObjectId(id: string): string {
    if (!this.isValidObjectId(id)) {
      throw new Error(`Invalid identifier: ${id}`);
    }
    return id;
  },

  generateId(): string {
    return generateRandomHexId(RANDOM_ID_BYTES);
  },

  idToString(id: string): string {
    return id;
  },

  validateDocument(
    document: Record<string, unknown>,
    requiredFields: string[]
  ): Error | null {
    for (const field of requiredFields) {
      if (
        !(field in document) ||
        document[field] === null ||
        document[field] === undefined
      ) {
        return new Error(`Missing required field: ${field}`);
      }
    }
    return null;
  },
};

export type { DatabaseOperationResult, BulkOperationResult };
