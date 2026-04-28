const express = require('express');
const { fetchAndCacheRates, fetchAndCacheChart, getLatestRates, getCachedChart, getHistoricalRates } = require('../services/goldService');
const { queryOne } = require('../db/database');

const router = express.Router();

// GET /api/gold/rates — latest cached rates, refresh if stale > 3h
router.get('/rates', async (req, res) => {
  try {
    const latest = await queryOne('SELECT MAX(fetched_at) AS last FROM gold_prices');
    const staleMs = latest?.last
      ? Date.now() - new Date(latest.last).getTime()
      : Infinity;

    let rates = await getLatestRates();
    if (!rates.length || staleMs > 3 * 60 * 60 * 1000) {
      await fetchAndCacheRates();
      rates = await getLatestRates();
    }
    res.json({ data: rates, fetched_at: latest?.last || null });
  } catch (err) {
    // Return cached data even on external API error
    try {
      const rates = await getLatestRates();
      if (rates.length) return res.json({ data: rates, cached: true });
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gold/chart?code=SJC9999&from_date=...
router.get('/chart', async (req, res) => {
  const { code, from_date, to_date, max_days } = req.query;
  try {
    // If specific date filters are provided, bypass the cache
    if (from_date || to_date || max_days) {
      const fresh = await fetchAndCacheChart(code || null, from_date, to_date, max_days ? parseInt(max_days) : null);
      return res.json({ data: fresh });
    }

    const cached  = await getCachedChart(code || 'ALL');
    const staleMs = cached?.fetched_at
      ? Date.now() - new Date(cached.fetched_at).getTime()
      : Infinity;

    if (!cached || staleMs > 3 * 60 * 60 * 1000) {
      const fresh = await fetchAndCacheChart(code || null);
      return res.json({ data: fresh });
    }
    res.json({ data: JSON.parse(cached.data) });
  } catch (err) {
    try {
      if (!from_date && !to_date && !max_days) {
        const cached = await getCachedChart(code || 'ALL');
        if (cached) return res.json({ data: JSON.parse(cached.data), cached: true });
      }
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gold/history?code=SJC9999&days=30 — local historical prices
router.get('/history', async (req, res) => {
  const { code = 'SJC9999', days = 30 } = req.query;
  try {
    const data = await getHistoricalRates(code, parseInt(days));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gold/refresh — manual refresh trigger
router.post('/refresh', async (req, res) => {
  try {
    await fetchAndCacheRates();
    res.json({ success: true, message: 'Gold rates refreshed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gold/cron/fetch — called by external cron service (cron-job.org / Vercel Cron)
// Replaces the node-cron scheduler which cannot run in serverless environments.
// Protect with CRON_SECRET env var to prevent unauthorized triggers.
router.get('/cron/fetch', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { fetchAndCacheChart } = require('../services/goldService');
    await fetchAndCacheRates();
    const DEFAULT_CODES = ['KHS', 'SJC9999', 'BT24K', 'KGB'];
    for (const code of DEFAULT_CODES) {
      try { await fetchAndCacheChart(code); } catch (_) {}
    }
    res.json({ success: true, message: 'Cron fetch complete', at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

