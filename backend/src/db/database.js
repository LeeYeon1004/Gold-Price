/**
 * Unified async database interface.
 * - If DATABASE_URL is set → connects to PostgreSQL (production/Render)
 * - Otherwise → uses SQLite file (local dev)
 *
 * All public functions return Promises to keep callers consistent.
 */

const isPg = !!process.env.DATABASE_URL;

// ─── PostgreSQL pool ────────────────────────────────────────────────────────
let _pool = null;
function getPool() {
  if (!_pool) {
    const { Pool } = require('pg');
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

// ─── SQLite db ──────────────────────────────────────────────────────────────
let _sqlite = null;
function getSqlite() {
  if (!_sqlite) {
    const path = require('path');
    const fs   = require('fs');
    const Database = require('better-sqlite3');
    const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/gold.db');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    _sqlite = new Database(DB_PATH);
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('foreign_keys = ON');
  }
  return _sqlite;
}

// ─── SQL helpers ────────────────────────────────────────────────────────────
// Convert PostgreSQL $1,$2 placeholders → ? for SQLite
function toSqlite(sql) {
  return sql.replace(/\$\d+/g, '?');
}
// Strip RETURNING clause (SQLite older builds may not support it)
function stripReturning(sql) {
  return sql.replace(/\s+RETURNING\s+\S+/gi, '');
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Run a SELECT that returns multiple rows. */
async function query(text, params = []) {
  if (isPg) {
    const result = await getPool().query(text, params);
    return result.rows;
  }
  return getSqlite().prepare(toSqlite(text)).all(...params);
}

/** Run a SELECT that returns a single row (or null). */
async function queryOne(text, params = []) {
  if (isPg) {
    const result = await getPool().query(text, params);
    return result.rows[0] || null;
  }
  return getSqlite().prepare(toSqlite(text)).get(...params) || null;
}

/**
 * Run an INSERT / UPDATE / DELETE.
 * Returns { insertId, rowCount }.
 * For INSERTs add `RETURNING id` at the end to get insertId on PostgreSQL.
 */
async function execute(text, params = []) {
  if (isPg) {
    const result = await getPool().query(text, params);
    // Trigger background sync on write (non-blocking)
    syncToSQLite().catch(() => {});
    return { insertId: result.rows[0]?.id || null, rowCount: result.rowCount };
  }
  const result = getSqlite().prepare(toSqlite(stripReturning(text))).run(...params);
  return { insertId: result.lastInsertRowid, rowCount: result.changes };
}

/** Create all tables if they don't exist. Called once on startup. */
async function initSchema() {
  const pgSchema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gold_prices (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      vendor_name TEXT,
      buy_price REAL,
      sell_price REAL,
      trend TEXT,
      unit TEXT,
      fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gold_chart_cache (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      data TEXT NOT NULL,
      fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL DEFAULT 'SJC9999',
      quantity REAL NOT NULL,
      buy_price REAL NOT NULL,
      buy_date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const sqliteSchema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gold_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      vendor_name TEXT,
      buy_price REAL,
      sell_price REAL,
      trend TEXT,
      unit TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gold_chart_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(code)
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL DEFAULT 'SJC9999',
      quantity REAL NOT NULL,
      buy_price REAL NOT NULL,
      buy_date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  if (isPg) {
    await getPool().query(pgSchema);
    // Always initialize SQLite too for backup
    try {
      getSqlite().exec(sqliteSchema);
    } catch (err) {
      console.warn('[DB] SQLite backup initialization failed (normal on some cloud environments):', err.message);
    }
  } else {
    getSqlite().exec(sqliteSchema);
  }
  console.log(`[DB] Schema initialized (${isPg ? 'PostgreSQL + SQLite Backup' : 'SQLite'})`);
}

/** 
 * Synchronize all data from PostgreSQL to SQLite. 
 * Use this to keep the local backup up-to-date.
 */
async function syncToSQLite() {
  if (!isPg) return;
  try {
    const sqlite = getSqlite();
    const tables = ['users', 'gold_prices', 'gold_chart_cache', 'portfolio'];
    
    for (const table of tables) {
      const rows = await query(`SELECT * FROM ${table}`);
      if (rows.length === 0) continue;

      // Clear local table
      sqlite.prepare(`DELETE FROM ${table}`).run();

      // Insert all rows
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
      const stmt = sqlite.prepare(sql);
      
      const transaction = sqlite.transaction((data) => {
        for (const row of data) {
          const values = cols.map(c => {
            const v = row[c];
            if (v instanceof Date) return v.toISOString();
            if (v && typeof v === 'object') return JSON.stringify(v);
            return v;
          });
          stmt.run(...values);
        }
      });
      transaction(rows);
    }
    // console.log('[DB] Backup synced to SQLite');
  } catch (err) {
    console.error('[DB] Sync to SQLite failed:', err.message);
  }
}

module.exports = { query, queryOne, execute, initSchema, syncToSQLite, isPg };
