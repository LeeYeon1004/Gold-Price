require('dotenv').config();
const { initSchema, syncToSQLite, isPg } = require('../src/db/database');

async function main() {
  if (!isPg) {
    console.error('❌ DATABASE_URL not set. Please set it to the remote PostgreSQL URL.');
    process.exit(1);
  }

  try {
    console.log('⏳ Initializing local SQLite schema...');
    await initSchema();
    
    console.log('⏳ Syncing data from PostgreSQL to SQLite...');
    await syncToSQLite();
    
    console.log('✅ Sync complete! Your local backup is at backend/data/gold.db');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

main();
