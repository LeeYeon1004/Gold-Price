const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { getLatestRates } = require('../services/goldService');

const router = express.Router();
router.use(authMiddleware);

// GET /api/portfolio — list user's gold holdings
router.get('/', (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT * FROM portfolio WHERE user_id = ? ORDER BY buy_date DESC
  `).all(req.user.id);

  const rates = getLatestRates();
  const rateMap = {};
  for (const r of rates) rateMap[r.code] = r.sell_price;

  const enriched = items.map(item => {
    // Try exact match, then SJC9999 fallback, then first available rate, then 0
    const currentPrice = rateMap[item.code] || rateMap['SJC9999'] || (rates.length > 0 ? rates[0].sell_price : 0);
    const costBasis = item.quantity * item.buy_price;
    const currentValue = item.quantity * currentPrice;
    const pnl = currentValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return { ...item, current_price: currentPrice, cost_basis: costBasis, current_value: currentValue, pnl, pnl_pct: pnlPct };
  });

  const totalCost = enriched.reduce((s, i) => s + i.cost_basis, 0);
  const totalValue = enriched.reduce((s, i) => s + i.current_value, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  res.json({ data: enriched, summary: { total_cost: totalCost, total_value: totalValue, total_pnl: totalPnl, total_pnl_pct: totalPnlPct } });
});

// POST /api/portfolio — add a holding
router.post('/', (req, res) => {
  const { code, quantity, buy_price, buy_date, note } = req.body;
  if (!quantity || !buy_price || !buy_date) return res.status(400).json({ error: 'quantity, buy_price, buy_date required' });
  if (quantity <= 0 || buy_price <= 0) return res.status(400).json({ error: 'quantity and buy_price must be positive' });

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO portfolio (user_id, code, quantity, buy_price, buy_date, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, code || 'SJC', quantity, buy_price, buy_date, note || '');

  res.json({ id: result.lastInsertRowid, message: 'Added successfully' });
});

// PUT /api/portfolio/:id — update a holding
router.put('/:id', (req, res) => {
  const { code, quantity, buy_price, buy_date, note } = req.body;
  const db = getDb();
  const item = db.prepare('SELECT * FROM portfolio WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE portfolio SET code = ?, quantity = ?, buy_price = ?, buy_date = ?, note = ?
    WHERE id = ? AND user_id = ?
  `).run(code ?? item.code, quantity ?? item.quantity, buy_price ?? item.buy_price, buy_date ?? item.buy_date, note ?? item.note, req.params.id, req.user.id);

  res.json({ message: 'Updated successfully' });
});

// DELETE /api/portfolio/:id — delete a holding
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM portfolio WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted successfully' });
});

module.exports = router;
