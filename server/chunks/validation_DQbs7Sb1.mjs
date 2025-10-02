import { f as d1Client } from './utils_B4MKaY9u.mjs';
import { config } from 'dotenv';

config({ path: ".env.local" });
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    username TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    document TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
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
  )`
];
class DatabaseConnection {
  constructor() {
    this.initialized = false;
    this.mode = "local";
  }
  static getInstance() {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
  async connect() {
    if (this.initialized) {
      return true;
    }
    try {
      await d1Client.initializeSchema(SCHEMA_STATEMENTS);
      this.mode = d1Client.isRemote() ? "remote" : "local";
      this.initialized = true;
      console.log(`Cloudflare D1 ready (mode: ${this.mode})`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to initialize Cloudflare D1:", message);
      this.initialized = false;
      return false;
    }
  }
  isDatabaseConnected() {
    return this.initialized;
  }
  getMode() {
    return this.mode;
  }
  async close() {
    await d1Client.close();
    this.initialized = false;
  }
  async healthCheck() {
    try {
      await this.connect();
      const tableResult = await d1Client.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const tables = (tableResult.results || []).map((row) => typeof row.name === "string" ? row.name : void 0).filter((name) => Boolean(name));
      return {
        status: "connected",
        database: "cloudflare-d1",
        mode: this.mode,
        tables
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "error",
        database: "cloudflare-d1",
        mode: this.mode,
        error: message
      };
    }
  }
}
const dbConnection = DatabaseConnection.getInstance();
const initializeDatabase = async () => {
  return dbConnection.connect();
};
const closeDatabase = async () => {
  await dbConnection.close();
};
const getDatabase = () => ({
  provider: "cloudflare-d1",
  mode: dbConnection.getMode()
});
const databaseConfig = {
  provider: "cloudflare-d1",
  mode: dbConnection.getMode(),
  database: "cloudflare-d1"
};

const RANDOM_ID_BYTES = 12;
function generateRandomHexId(bytes) {
  const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : void 0;
  if (globalCrypto?.getRandomValues) {
    const values = new Uint8Array(bytes);
    globalCrypto.getRandomValues(values);
    return Array.from(
      values,
      (value) => value.toString(16).padStart(2, "0")
    ).join("");
  }
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID().replace(/-/g, "").slice(0, bytes * 2);
  }
  let fallback = "";
  for (let index = 0; index < bytes; index += 1) {
    const randomValue = Math.floor(Math.random() * 256);
    fallback += randomValue.toString(16).padStart(2, "0");
  }
  return fallback;
}
const COLLECTION_CONFIGS = {
  users: {
    table: "users",
    filterColumns: {
      _id: "id",
      userId: "userId",
      email: "email",
      username: "username",
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }
  },
  flashcards: {
    table: "flashcards",
    filterColumns: {
      _id: "id",
      userId: "userId",
      cardId: "cardId",
      category: "category",
      difficulty: "difficulty",
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }
  },
  study_sessions: {
    table: "study_sessions",
    filterColumns: {
      _id: "id",
      userId: "userId",
      sessionId: "sessionId",
      sessionType: "sessionType",
      startTime: "startTime",
      endTime: "endTime"
    }
  },
  study_statistics: {
    table: "study_statistics",
    filterColumns: {
      _id: "id",
      userId: "userId",
      statsId: "statsId",
      date: "date",
      period: "period"
    }
  },
  migrations: {
    table: "migrations",
    filterColumns: {
      _id: "id",
      id: "id",
      version: "version"
    }
  }
};
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const DATE_KEY_HINTS = [
  "createdAt",
  "updatedAt",
  "startTime",
  "endTime",
  "nextReviewDate",
  "lastStudyDate",
  "passwordChangedAt",
  "passwordResetExpires",
  "emailVerifiedAt",
  "lastLogin",
  "accountLockedUntil",
  "timestamp",
  "date",
  "appliedAt"
];
const OBJECT_ID_REGEX$1 = /^[a-f0-9]{24}$/;
class DatabaseOperations {
  constructor(collectionName) {
    if (!(collectionName in COLLECTION_CONFIGS)) {
      throw new Error(`Unsupported collection: ${collectionName}`);
    }
    this.collectionName = collectionName;
  }
  get config() {
    return COLLECTION_CONFIGS[this.collectionName];
  }
  async ensureReady() {
    await dbConnection.connect();
  }
  generateId() {
    return generateRandomHexId(RANDOM_ID_BYTES);
  }
  normalizeValue(value) {
    if (value === void 0) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value) || typeof value === "object" && value !== null) {
      return JSON.stringify(value, (_key, nestedValue) => {
        if (nestedValue instanceof Date) {
          return nestedValue.toISOString();
        }
        return nestedValue;
      });
    }
    return value;
  }
  serializeDocument(document) {
    return JSON.stringify(document, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }
  restoreDates(value, keyHint) {
    if (value === null || value === void 0) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.restoreDates(item));
    }
    if (typeof value === "object") {
      const result = {};
      for (const [key, nestedValue] of Object.entries(
        value
      )) {
        result[key] = this.restoreDates(nestedValue, key);
      }
      return result;
    }
    if (typeof value === "string" && ISO_DATE_REGEX.test(value)) {
      if (keyHint && (DATE_KEY_HINTS.includes(keyHint) || keyHint.endsWith("At") || keyHint.endsWith("Date") || keyHint.includes("Time"))) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return value;
  }
  deserializeDocument(json) {
    const parsed = JSON.parse(json);
    return this.restoreDates(parsed);
  }
  setNestedValue(target, path, value) {
    const segments = path.split(".");
    let current = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const existing = current[segment];
      if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
        current[segment] = {};
      }
      current = current[segment];
    }
    current[segments[segments.length - 1]] = value;
  }
  applyUpdates(document, updates) {
    for (const [key, value] of Object.entries(updates)) {
      if (key.includes(".")) {
        this.setNestedValue(document, key, value);
      } else {
        document[key] = value;
      }
    }
  }
  getColumnForField(field) {
    const direct = this.config.filterColumns[field];
    if (direct) {
      return direct;
    }
    if (field === "_id") {
      return "id";
    }
    return null;
  }
  getNestedValue(object, path) {
    const segments = path.split(".");
    let current = object;
    for (const segment of segments) {
      if (current === null || current === void 0) {
        return void 0;
      }
      if (typeof current !== "object") {
        return void 0;
      }
      current = current[segment];
    }
    return current;
  }
  prepareDocument(document) {
    const now = /* @__PURE__ */ new Date();
    const prepared = { ...document };
    if (!prepared._id) {
      prepared._id = this.generateId();
    }
    if (!prepared.createdAt) {
      prepared.createdAt = now;
    }
    prepared.updatedAt = prepared.updatedAt ? prepared.updatedAt : now;
    return prepared;
  }
  prepareRow(document) {
    const row = {
      id: document._id,
      createdAt: this.normalizeValue(document.createdAt),
      updatedAt: this.normalizeValue(document.updatedAt),
      document: this.serializeDocument(document)
    };
    for (const [field, column] of Object.entries(this.config.filterColumns)) {
      if (column === "id") {
        row[column] = document._id;
        continue;
      }
      const value = this.getNestedValue(document, field);
      row[column] = this.normalizeValue(value);
    }
    return row;
  }
  buildInsert(row) {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${this.config.table} (${columns.join(", ")}) VALUES (${placeholders})`;
    const params = columns.map((column) => row[column]);
    return { sql, params };
  }
  buildUpdate(row) {
    const columns = Object.keys(row).filter((column) => column !== "id");
    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    const sql = `UPDATE ${this.config.table} SET ${assignments} WHERE id = ?`;
    const params = columns.map((column) => row[column]);
    params.push(row.id);
    return { sql, params };
  }
  rowToDocument(row) {
    const document = this.deserializeDocument(row.document);
    document._id = document._id || row.id;
    if (row.createdAt) {
      document.createdAt = this.restoreDates(row.createdAt, "createdAt");
    }
    if (row.updatedAt) {
      document.updatedAt = this.restoreDates(row.updatedAt, "updatedAt");
    }
    return document;
  }
  buildWhereClause(filter) {
    const conditions = [];
    const params = [];
    const fallback = {};
    for (const [field, value] of Object.entries(filter || {})) {
      const column = this.getColumnForField(field);
      if (!column) {
        fallback[field] = value;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        const operatorEntries = Object.entries(
          value
        );
        const supported = ["$ne", "$in", "$nin", "$gte", "$lte", "$gt", "$lt"];
        if (operatorEntries.every(([op]) => supported.includes(op))) {
          for (const [operator, operand] of operatorEntries) {
            switch (operator) {
              case "$ne":
                conditions.push(`${column} <> ?`);
                params.push(this.normalizeValue(operand));
                break;
              case "$in":
                if (Array.isArray(operand) && operand.length) {
                  const placeholders = operand.map(() => "?").join(", ");
                  conditions.push(`${column} IN (${placeholders})`);
                  params.push(
                    ...operand.map((item) => this.normalizeValue(item))
                  );
                }
                break;
              case "$nin":
                if (Array.isArray(operand) && operand.length) {
                  const placeholders = operand.map(() => "?").join(", ");
                  conditions.push(`${column} NOT IN (${placeholders})`);
                  params.push(
                    ...operand.map((item) => this.normalizeValue(item))
                  );
                }
                break;
              case "$gte":
                conditions.push(`${column} >= ?`);
                params.push(this.normalizeValue(operand));
                break;
              case "$lte":
                conditions.push(`${column} <= ?`);
                params.push(this.normalizeValue(operand));
                break;
              case "$gt":
                conditions.push(`${column} > ?`);
                params.push(this.normalizeValue(operand));
                break;
              case "$lt":
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
    const clause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    return { clause, params, fallback };
  }
  applyFallbackFilter(documents, filter) {
    if (!filter || Object.keys(filter).length === 0) {
      return documents;
    }
    return documents.filter((document) => this.matchesFilter(document, filter));
  }
  matchesFilter(document, filter) {
    for (const [field, condition] of Object.entries(filter)) {
      const value = this.getNestedValue(document, field);
      if (condition && typeof condition === "object" && !Array.isArray(condition) && !(condition instanceof Date)) {
        const objectCondition = condition;
        for (const [operator, operand] of Object.entries(objectCondition)) {
          switch (operator) {
            case "$ne":
              if (this.areEqual(value, operand)) {
                return false;
              }
              break;
            case "$in":
              if (Array.isArray(operand)) {
                if (!operand.some((item) => this.areEqual(value, item))) {
                  return false;
                }
              }
              break;
            case "$nin":
              if (Array.isArray(operand)) {
                if (operand.some((item) => this.areEqual(value, item))) {
                  return false;
                }
              }
              break;
            case "$gte":
              if (!this.compare(value, operand, (a, b) => a >= b)) {
                return false;
              }
              break;
            case "$lte":
              if (!this.compare(value, operand, (a, b) => a <= b)) {
                return false;
              }
              break;
            case "$gt":
              if (!this.compare(value, operand, (a, b) => a > b)) {
                return false;
              }
              break;
            case "$lt":
              if (!this.compare(value, operand, (a, b) => a < b)) {
                return false;
              }
              break;
            default:
              if (typeof operand === "object" && operand !== null) {
                if (!this.matchesFilter(value, {
                  [operator]: operand
                })) {
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
  areEqual(a, b) {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    if (a instanceof Date && typeof b === "string" && ISO_DATE_REGEX.test(b)) {
      return a.getTime() === new Date(b).getTime();
    }
    if (b instanceof Date && typeof a === "string" && ISO_DATE_REGEX.test(a)) {
      return b.getTime() === new Date(a).getTime();
    }
    return JSON.stringify(a) === JSON.stringify(b);
  }
  compare(left, right, comparator) {
    if (left instanceof Date || typeof left === "string" && ISO_DATE_REGEX.test(left)) {
      const leftDate = left instanceof Date ? left : new Date(left);
      const rightDate = right instanceof Date ? right : new Date(String(right));
      return comparator(leftDate.getTime(), rightDate.getTime());
    }
    if (typeof left === "number" || typeof left === "string") {
      const rightValue = typeof right === "number" || typeof right === "string" ? right : Number(right);
      return comparator(left, rightValue);
    }
    return false;
  }
  async query(filter, options = {}) {
    await this.ensureReady();
    const { clause, params, fallback } = this.buildWhereClause(filter);
    let sql = `SELECT * FROM ${this.config.table}${clause}`;
    if (options.sort && Object.keys(options.sort).length > 0) {
      const sortParts = [];
      for (const [field, direction] of Object.entries(options.sort)) {
        const column = this.getColumnForField(field);
        if (column) {
          sortParts.push(`${column} ${direction === -1 ? "DESC" : "ASC"}`);
        }
      }
      if (sortParts.length) {
        sql += ` ORDER BY ${sortParts.join(", ")}`;
      }
    }
    if (typeof options.limit === "number") {
      sql += ` LIMIT ${options.limit}`;
    }
    if (typeof options.skip === "number") {
      if (!sql.includes("LIMIT")) {
        sql += " LIMIT -1";
      }
      sql += ` OFFSET ${options.skip}`;
    }
    const result = await d1Client.execute(sql, params);
    const rows = result.results || [];
    const documents = rows.map((row) => this.rowToDocument(row));
    return this.applyFallbackFilter(documents, fallback);
  }
  async create(document) {
    const start = Date.now();
    try {
      const prepared = this.prepareDocument(document);
      const row = this.prepareRow(prepared);
      const { sql, params } = this.buildInsert(row);
      const result = await d1Client.execute(sql, params);
      if (!result.success) {
        throw new Error(result.error || "Failed to insert document");
      }
      return {
        success: true,
        data: prepared,
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async findOne(filter, options) {
    const start = Date.now();
    try {
      const documents = await this.query(filter, { ...options, limit: 1 });
      return {
        success: true,
        data: documents.length ? documents[0] : null,
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async findMany(filter = {}, options) {
    const start = Date.now();
    try {
      const documents = await this.query(filter, options);
      return {
        success: true,
        data: documents,
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async updateOne(filter, update, options = {}) {
    const start = Date.now();
    try {
      const existing = await this.findOne(filter);
      if (!existing.success) {
        return existing;
      }
      if (!existing.data) {
        if (options.upsert) {
          const base = {};
          for (const [key, value] of Object.entries(filter)) {
            if (typeof value !== "object" || value instanceof Date || Array.isArray(value)) {
              base[key] = value;
            }
          }
          const upsertDocument = {
            ...base,
            ...update.$set || update
          };
          return this.create(upsertDocument);
        }
        return {
          success: true,
          data: null,
          operationTime: Date.now() - start
        };
      }
      const updatedDocument = {
        ...existing.data,
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.applyUpdates(updatedDocument, update.$set || update);
      const row = this.prepareRow(updatedDocument);
      const { sql, params } = this.buildUpdate(row);
      const result = await d1Client.execute(sql, params);
      if (!result.success) {
        throw new Error(result.error || "Failed to update document");
      }
      return {
        success: true,
        data: updatedDocument,
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async updateMany(filter, update) {
    const start = Date.now();
    try {
      const documents = await this.query(filter);
      let modified = 0;
      for (const document of documents) {
        const updatedDocument = {
          ...document,
          updatedAt: /* @__PURE__ */ new Date()
        };
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
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async deleteOne(filter) {
    const start = Date.now();
    try {
      const existing = await this.findOne(filter);
      if (!existing.success) {
        return {
          success: false,
          error: existing.error,
          operationTime: Date.now() - start
        };
      }
      if (!existing.data) {
        return {
          success: true,
          data: { deletedCount: 0 },
          operationTime: Date.now() - start
        };
      }
      const sql = `DELETE FROM ${this.config.table} WHERE id = ?`;
      const result = await d1Client.execute(sql, [existing.data._id]);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete document");
      }
      return {
        success: true,
        data: { deletedCount: 1 },
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async deleteMany(filter) {
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
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async count(filter = {}) {
    const start = Date.now();
    try {
      const { clause, params } = this.buildWhereClause(filter);
      const sql = `SELECT COUNT(*) as count FROM ${this.config.table}${clause}`;
      const result = await d1Client.execute(sql, params);
      const count = result.results && result.results[0] && result.results[0].count || 0;
      return {
        success: true,
        data: typeof count === "number" ? count : Number(count),
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
  async exists(filter) {
    const countResult = await this.count(filter);
    if (!countResult.success) {
      return {
        success: false,
        error: countResult.error,
        operationTime: countResult.operationTime
      };
    }
    return {
      success: true,
      data: (countResult.data || 0) > 0,
      operationTime: countResult.operationTime
    };
  }
  async bulkWrite(operations) {
    const start = Date.now();
    const result = {
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      errors: [],
      operationTime: 0
    };
    for (const operation of operations) {
      try {
        if (operation.insertOne) {
          const { document } = operation.insertOne;
          const createResult = await this.create(document);
          if (!createResult.success) {
            throw new Error(createResult.error || "Insert failed");
          }
          result.insertedCount++;
        } else if (operation.updateOne) {
          const { filter, update, options } = operation.updateOne;
          const updateResult = await this.updateOne(filter, update, options);
          if (!updateResult.success) {
            throw new Error(updateResult.error || "Update failed");
          }
          if (updateResult.data) {
            result.updatedCount++;
          }
        } else if (operation.deleteOne) {
          const { filter } = operation.deleteOne;
          const deleteResult = await this.deleteOne(filter);
          if (!deleteResult.success) {
            throw new Error(deleteResult.error || "Delete failed");
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
      error: result.errors.length ? result.errors.join("; ") : void 0,
      operationTime: result.operationTime
    };
  }
  async aggregate() {
    return {
      success: false,
      error: "Aggregation pipelines are not supported in the D1 adapter",
      operationTime: 0
    };
  }
  async createIndexes() {
    return {
      success: true,
      data: [],
      operationTime: 0
    };
  }
  async distinct(field, filter = {}) {
    const start = Date.now();
    try {
      const documentsResult = await this.findMany(filter);
      if (!documentsResult.success || !documentsResult.data) {
        throw new Error(
          documentsResult.error || "Failed to retrieve documents for distinct query"
        );
      }
      const values = /* @__PURE__ */ new Set();
      for (const document of documentsResult.data) {
        const value = this.getNestedValue(document, field);
        if (value !== void 0 && value !== null) {
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
        operationTime: Date.now() - start
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        operationTime: Date.now() - start
      };
    }
  }
}
function createDatabaseOperations(collectionName) {
  return new DatabaseOperations(collectionName);
}
const databaseUtils = {
  isValidObjectId(id) {
    return OBJECT_ID_REGEX$1.test(id);
  },
  toObjectId(id) {
    if (!this.isValidObjectId(id)) {
      throw new Error(`Invalid identifier: ${id}`);
    }
    return id;
  },
  generateId() {
    return generateRandomHexId(RANDOM_ID_BYTES);
  },
  idToString(id) {
    return id;
  },
  validateDocument(document, requiredFields) {
    for (const field of requiredFields) {
      if (!(field in document) || document[field] === null || document[field] === void 0) {
        return new Error(`Missing required field: ${field}`);
      }
    }
    return null;
  }
};

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/;
var CollectionName = /* @__PURE__ */ ((CollectionName2) => {
  CollectionName2["USERS"] = "users";
  CollectionName2["FLASHCARDS"] = "flashcards";
  CollectionName2["STUDY_SESSIONS"] = "study_sessions";
  CollectionName2["CARD_PROGRESS"] = "card_progress";
  CollectionName2["STUDY_STATISTICS"] = "study_statistics";
  return CollectionName2;
})(CollectionName || {});
class DatabaseError extends Error {
  constructor(message, code = "DATABASE_ERROR", operation = "unknown", collection, details) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
    this.operation = operation;
    this.collection = collection;
    this.timestamp = /* @__PURE__ */ new Date();
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      operation: this.operation,
      collection: this.collection,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack
    };
  }
}
class ConnectionError extends DatabaseError {
  constructor(message, operation = "connect", details) {
    super(message, "CONNECTION_ERROR", operation, void 0, details);
    this.name = "ConnectionError";
  }
}
class ValidationError extends DatabaseError {
  constructor(message, operation = "validate", collection, field, value, details) {
    super(message, "VALIDATION_ERROR", operation, collection, details);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}
class NotFoundError extends DatabaseError {
  constructor(message, operation = "find", collection, documentId, details) {
    super(message, "NOT_FOUND_ERROR", operation, collection, details);
    this.name = "NotFoundError";
    this.documentId = documentId;
  }
}
class DuplicateError extends DatabaseError {
  constructor(message, operation = "insert", collection, field, value, details) {
    super(message, "DUPLICATE_ERROR", operation, collection, details);
    this.name = "DuplicateError";
    this.field = field;
    this.value = value;
  }
}
class PermissionError extends DatabaseError {
  constructor(message, operation = "authorize", collection, userId, requiredPermission, details) {
    super(message, "PERMISSION_ERROR", operation, collection, details);
    this.name = "PermissionError";
    this.userId = userId;
    this.requiredPermission = requiredPermission;
  }
}
class RateLimitError extends DatabaseError {
  constructor(message, operation = "rate_limit", retryAfter, details) {
    super(message, "RATE_LIMIT_ERROR", operation, void 0, details);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}
class SM2Error extends DatabaseError {
  constructor(message, operation = "sm2_calculation", collection = "flashcards", quality, currentInterval, details) {
    super(message, "SM2_ERROR", operation, collection, details);
    this.name = "SM2Error";
    this.quality = quality;
    this.currentInterval = currentInterval;
  }
}
class BulkOperationError extends DatabaseError {
  constructor(message, operation = "bulk_operation", collection, successfulCount = 0, failedCount = 0, errors = [], details) {
    super(message, "BULK_OPERATION_ERROR", operation, collection, details);
    this.name = "BulkOperationError";
    this.successfulCount = successfulCount;
    this.failedCount = failedCount;
    this.errors = errors;
  }
}
class MigrationError extends DatabaseError {
  constructor(message, operation = "migration", migrationId, version, details) {
    super(message, "MIGRATION_ERROR", operation, void 0, details);
    this.name = "MigrationError";
    this.migrationId = migrationId;
    this.version = version;
  }
}
const defaultErrorHandlerConfig = {
  logErrors: true,
  throwOnError: true,
  includeStackTrace: process.env.NODE_ENV === "development"
};
class ErrorHandler {
  constructor(config = {}) {
    this.config = { ...defaultErrorHandlerConfig, ...config };
  }
  /**
   * Handle database errors with consistent logging and formatting
   */
  handle(error, context) {
    let dbError;
    if (error instanceof DatabaseError) {
      dbError = error;
    } else {
      if (error.name === "MongoError" || error.name === "MongoServerError") {
        dbError = this.handleMongoError(error, context);
      } else {
        dbError = new DatabaseError(
          error.message,
          "UNKNOWN_ERROR",
          context?.operation || "unknown",
          context?.collection,
          { originalError: error }
        );
      }
    }
    if (context) {
      const dbErrorWithDetails = dbError;
      dbErrorWithDetails.details = {
        ...dbError.details,
        context: {
          operation: context.operation,
          collection: context.collection,
          userId: context.userId,
          documentId: context.documentId
        }
      };
    }
    if (this.config.logErrors) {
      this.logError(dbError);
    }
    if (this.config.throwOnError) {
      throw dbError;
    }
    return dbError;
  }
  /**
   * Handle MongoDB-specific errors
   */
  handleMongoError(error, context) {
    const { operation, collection } = context || {};
    if (error.code === 11e3) {
      const field = Object.keys(error.keyPattern || {})[0];
      const value = Object.values(error.keyValue || {})[0];
      return new DuplicateError(
        `Duplicate value for field '${field}': ${value}`,
        operation,
        collection,
        field,
        value,
        { originalError: error }
      );
    }
    if (error.name === "MongoNetworkError" || error.name === "MongoTimeoutError") {
      return new ConnectionError(
        `Database connection error: ${error.message}`,
        operation,
        { originalError: error }
      );
    }
    if (error.name === "ValidationError") {
      return new ValidationError(
        `Validation failed: ${error.message}`,
        operation,
        collection,
        void 0,
        void 0,
        { originalError: error }
      );
    }
    return new DatabaseError(
      error.message,
      `MONGODB_ERROR_${error.code || "UNKNOWN"}`,
      operation || "unknown",
      collection,
      { originalError: error }
    );
  }
  /**
   * Log error using configured logger or console
   */
  logError(error) {
    if (this.config.customLogger) {
      this.config.customLogger(error);
    } else {
      const logData = this.config.includeStackTrace ? error.toJSON() : {
        name: error.name,
        message: error.message,
        code: error.code,
        operation: error.operation,
        collection: error.collection,
        timestamp: error.timestamp.toISOString(),
        details: error.details
      };
      console.error("[Database Error]", JSON.stringify(logData, null, 2));
    }
  }
  /**
   * Create user-friendly error messages
   */
  static createUserMessage(error) {
    switch (error.code) {
      case "CONNECTION_ERROR":
        return "Unable to connect to the database. Please check your internet connection and try again.";
      case "VALIDATION_ERROR":
        return "The provided data is invalid. Please check your input and try again.";
      case "NOT_FOUND_ERROR":
        return "The requested item was not found.";
      case "DUPLICATE_ERROR":
        return "This item already exists. Please use a different value.";
      case "PERMISSION_ERROR":
        return "You do not have permission to perform this action.";
      case "RATE_LIMIT_ERROR":
        return "Too many requests. Please wait a moment and try again.";
      case "SM2_ERROR":
        return "There was an error processing your study progress. Please try again.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
}
async function safeAsync(operation, context) {
  try {
    return await operation();
  } catch (error) {
    const errorHandler2 = new ErrorHandler();
    errorHandler2.handle(error, context);
    throw error;
  }
}
function validateObjectId(id, fieldName = "id") {
  if (!OBJECT_ID_REGEX.test(id)) {
    throw new ValidationError(
      `Invalid ObjectId format for field '${fieldName}': ${id}`,
      "validate_object_id",
      void 0,
      fieldName,
      id
    );
  }
}
function validateRequired(data, requiredFields, collection) {
  const missingFields = requiredFields.filter((field) => {
    const value = data[field];
    return value === null || value === void 0 || value === "";
  });
  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(", ")}`,
      "validate_required_fields",
      collection,
      missingFields[0]
    );
  }
}
function validateQuality(quality) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new SM2Error(
      `Invalid quality value: ${quality}. Must be an integer between 0 and 5.`,
      "validate_quality",
      "flashcards",
      quality
    );
  }
}
function validateOwnership(documentUserId, requestUserId, collection, documentId) {
  if (typeof documentUserId !== "string") {
    throw new ValidationError(
      "Invalid document owner identifier",
      "validate_ownership",
      collection,
      "userId",
      documentUserId,
      { documentId, requestUserId }
    );
  }
  if (documentUserId !== requestUserId) {
    throw new PermissionError(
      "Access denied: You do not own this resource",
      "validate_ownership",
      collection,
      requestUserId,
      "owner",
      { documentId, documentUserId, requestUserId }
    );
  }
}
const errorHandler = new ErrorHandler();

const emailValidator = function(email) {
  if (!email || typeof email !== "string") return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
const urlValidator = function(url) {
  if (!url || typeof url !== "string") return true;
  const urlRegex = /^https?:\/\/.+/;
  return urlRegex.test(url);
};
const qualityValidator = function(quality) {
  return quality >= 0 && quality <= 5;
};
function sanitizeInput(input) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>]/g, "");
}

const sm2Validator = function(sm2) {
  if (!sm2) return true;
  const { easeFactor, interval, repetitions } = sm2;
  if (easeFactor !== void 0 && (easeFactor < 1.3 || easeFactor > 2.5)) {
    return false;
  }
  if (interval !== void 0 && interval < 1) {
    return false;
  }
  if (repetitions !== void 0 && repetitions < 0) {
    return false;
  }
  return true;
};
function validateSM2Params(params) {
  const { quality, easeFactor, interval } = params;
  return quality >= 0 && quality <= 5 && easeFactor >= 1.3 && easeFactor <= 2.5 && interval >= 1;
}
function getDefaultSM2Params() {
  return {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: /* @__PURE__ */ new Date()
  };
}
function calculateNextReviewDate(currentInterval, easeFactor, quality) {
  let newInterval;
  if (quality >= 3) {
    if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * easeFactor);
    }
  } else {
    newInterval = 1;
  }
  const nextReview = /* @__PURE__ */ new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  return nextReview;
}

function validateDocument(document, schema) {
  const errors = [];
  try {
    const required = schema.validator?.$jsonSchema?.required;
    if (required && Array.isArray(required)) {
      for (const field of required) {
        if (!(field in document) || document[field] === null || document[field] === void 0) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }
    if (document.sm2 && !sm2Validator(document.sm2)) {
      errors.push("Invalid SM-2 parameters");
    }
    if (document.email && !emailValidator(document.email)) {
      errors.push("Invalid email format");
    }
    if (document.audioUrl && !urlValidator(document.audioUrl)) {
      errors.push("Invalid audio URL format");
    }
    if (document.imageUrl && !urlValidator(document.imageUrl)) {
      errors.push("Invalid image URL format");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`
      ]
    };
  }
}

export { BulkOperationError as B, CollectionName as C, DatabaseError as D, ErrorHandler as E, MigrationError as M, NotFoundError as N, PermissionError as P, RateLimitError as R, SM2Error as S, ValidationError as V, sanitizeInput as a, DuplicateError as b, createDatabaseOperations as c, validateDocument as d, validateOwnership as e, validateQuality as f, getDefaultSM2Params as g, calculateNextReviewDate as h, validateObjectId as i, closeDatabase as j, initializeDatabase as k, getDatabase as l, databaseUtils as m, errorHandler as n, ConnectionError as o, dbConnection as p, databaseConfig as q, validateSM2Params as r, safeAsync as s, emailValidator as t, urlValidator as u, validateRequired as v, sm2Validator as w, qualityValidator as x };
