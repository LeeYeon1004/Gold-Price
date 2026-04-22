#!/usr/bin/env node
/**
 * migrate-from-sqlite.js
 *
 * Exports all users and portfolio items from local SQLite (gold.db)
 * and inserts them into the remote PostgreSQL database on Render.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/migrate-from-sqlite.js
 *
 * Or create a .env file at project root and run:
 *   node -r dotenv/config scripts/migrate-from-sqlite.js
 */

const path   = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set.');
  console.error('   Run: DATABASE_URL="postgresql://..." node scripts/migrate-from-sqlite.js');
  process.exit(1);
}

const SQLITE_PATH = path.join(__dirname, '../backend/data/gold.db');

async function main() {
  // ─── Connect to local SQLite ────────────────────────────────────────────
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('❌ better-sqlite3 is not installed. Run: npm --prefix backend install');
    process.exit(1);
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  console.log(`✅ Connected to SQLite: ${SQLITE_PATH}`);

  // ─── Connect to PostgreSQL ──────────────────────────────────────────────
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pool.query('SELECT 1'); // test connection
  console.log('✅ Connected to PostgreSQL');

  // ─── Migrate Users ──────────────────────────────────────────────────────
  const users = sqlite.prepare('SELECT * FROM users').all();
  console.log(`\n📋 Found ${users.length} user(s) in SQLite...`);

  for (const u of users) {
    try {
      await pool.query(
        `INSERT INTO users (id, username, password, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO NOTHING`,
        [u.id, u.username, u.password, u.created_at]
      );
      console.log(`  ✔ User: ${u.username}`);
    } catch (e) {
      console.warn(`  ⚠ Skipped user ${u.username}: ${e.message}`);
    }
  }

  // ─── Migrate Portfolio ──────────────────────────────────────────────────
  const items = sqlite.prepare('SELECT * FROM portfolio').all();
  console.log(`\n📋 Found ${items.length} portfolio item(s) in SQLite...`);

  for (const item of items) {
    try {
      await pool.query(
        `INSERT INTO portfolio (id, user_id, code, quantity, buy_price, buy_date, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [item.id, item.user_id, item.code, item.quantity, item.buy_price, item.buy_date, item.note || '', item.created_at]
      );
      console.log(`  ✔ Portfolio item #${item.id} (${item.code})`);
    } catch (e) {
      console.warn(`  ⚠ Skipped item #${item.id}: ${e.message}`);
    }
  }

  // ─── Sync sequences (PostgreSQL SERIAL needs to know next ID) ──────────
  console.log('\n🔧 Syncing PostgreSQL sequences...');
  await pool.query(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)`);
  await pool.query(`SELECT setval('portfolio_id_seq', COALESCE((SELECT MAX(id) FROM portfolio), 0) + 1, false)`);

  console.log('\n🎉 Migration complete!');
  await pool.end();
  sqlite.close();
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
