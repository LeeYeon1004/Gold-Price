/**
 * One-time migration: local SQLite → PostgreSQL (Neon)
 * Run: node scripts/migrate-to-pg.js
 */

const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, '../data/gold.db');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sqlite = new Database(DB_PATH);
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('⏳ Creating schema...');
    await client.query(`
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
    `);

    const tables = ['users', 'gold_prices', 'gold_chart_cache', 'portfolio'];

    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      if (!rows.length) {
        console.log(`⚠️  ${table}: empty, skipping`);
        continue;
      }

      await client.query(`DELETE FROM ${table}`);

      const cols = Object.keys(rows[0]);
      let count = 0;
      for (const row of rows) {
        const values = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          return v;
        });
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        count++;
      }

      // Reset sequence for SERIAL columns
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`
      );

      console.log(`✅ ${table}: ${count} rows migrated`);
    }

    console.log('\n🎉 Migration complete!');
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
