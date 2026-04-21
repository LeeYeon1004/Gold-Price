const express = require('express');
const { fetchAndCacheRates, fetchAndCacheChart, getLatestRates, getCachedChart, getHistoricalRates } = require('../services/goldService');

const router = express.Router();

// GET /api/gold/rates — latest cached rates, refresh if stale > 3h
router.get('/rates', async (req, res) => {
  try {
    const db = require('../db/database').getDb();
    const latest = db.prepare(`
      SELECT MAX(fetched_at) as last FROM gold_prices
    `).get();

    const staleMs = latest?.last
      ? Date.now() - new Date(latest.last + 'Z').getTime()
      : Infinity;

    let rates = getLatestRates();
    if (!rates.length || staleMs > 3 * 60 * 60 * 1000) {
      await fetchAndCacheRates();
      rates = getLatestRates();
    }
    res.json({ data: rates, fetched_at: latest?.last || null });
  } catch (err) {
    // Try returning cached data even on error
    const rates = getLatestRates();
    if (rates.length) return res.json({ data: rates, cached: true });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gold/chart?code=SJC — historical chart data
router.get('/chart', async (req, res) => {
  const { code } = req.query;
  try {
    let cached = getCachedChart(code || 'ALL');
    const staleMs = cached?.fetched_at
      ? Date.now() - new Date(cached.fetched_at + 'Z').getTime()
      : Infinity;

    if (!cached || staleMs > 3 * 60 * 60 * 1000) {
      const fresh = await fetchAndCacheChart(code || null);
      return res.json({ data: fresh });
    }
    res.json({ data: JSON.parse(cached.data) });
  } catch (err) {
    const cached = getCachedChart(code || 'ALL');
    if (cached) return res.json({ data: JSON.parse(cached.data), cached: true });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gold/history?code=SJC&days=30 — local historical prices
router.get('/history', (req, res) => {
  const { code = 'SJC', days = 30 } = req.query;
  const data = getHistoricalRates(code, parseInt(days));
  res.json({ data });
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

module.exports = router;
