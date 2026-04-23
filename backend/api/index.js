/**
 * Vercel Serverless Entry Point
 * 
 * Vercel invokes this file per-request (serverless).
 * We lazily initialize the DB schema on the first cold-start
 * so subsequent warm requests skip the async overhead.
 */

const { initSchema } = require('../src/db/database');
const app = require('../src/app');

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    try {
      await initSchema();
      initialized = true;
      console.log('[Serverless] DB schema initialized on cold start');
    } catch (err) {
      console.error('[Serverless] DB init failed:', err.message);
      // Don't block requests — DB might still work for reads
    }
  }
  return app(req, res);
};
