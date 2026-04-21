const cron = require('node-cron');
const { fetchAndCacheRates, fetchAndCacheChart } = require('./goldService');

const DEFAULT_CODES = ['SJC', 'BTMH', 'PNJ', 'DOJI'];

async function runFetch() {
  console.log(`[Scheduler] Running gold price fetch at ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  await fetchAndCacheRates();
  for (const code of DEFAULT_CODES) {
    try { await fetchAndCacheChart(code); } catch (_) {}
  }
  try { await fetchAndCacheChart(null); } catch (_) {}
}

function startScheduler() {
  // Run at 10:00 AM and 4:00 PM Vietnam time (UTC+7 → 03:00 and 09:00 UTC)
  cron.schedule('0 3,9 * * *', runFetch, { timezone: 'UTC' });
  console.log('[Scheduler] Gold price scheduler started (10:00 AM & 4:00 PM ICT)');

  // Initial fetch on startup
  runFetch().catch(console.error);
}

module.exports = { startScheduler, runFetch };
