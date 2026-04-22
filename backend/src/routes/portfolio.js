const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { query, queryOne, execute } = require('../db/database');
const { getLatestRates } = require('../services/goldService');

const router = express.Router();
router.use(authMiddleware);

// GET /api/portfolio — list user's gold holdings
router.get('/', async (req, res) => {
  try {
    const items = await query(
      'SELECT * FROM portfolio WHERE user_id = $1 ORDER BY buy_date DESC',
      [req.user.id]
    );

    const rates = await getLatestRates();
    const rateMap = {};
    for (const r of rates) rateMap[r.code] = r.sell_price;

    const enriched = items.map(item => {
      const currentPrice = rateMap[item.code] || rateMap['SJC9999'] || (rates.length > 0 ? rates[0].sell_price : 0);
      const costBasis    = item.quantity * item.buy_price;
      const currentValue = item.quantity * currentPrice;
      const pnl          = currentValue - costBasis;
      const pnlPct       = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...item, current_price: currentPrice, cost_basis: costBasis, current_value: currentValue, pnl, pnl_pct: pnlPct };
    });

    const totalCost   = enriched.reduce((s, i) => s + i.cost_basis, 0);
    const totalValue  = enriched.reduce((s, i) => s + i.current_value, 0);
    const totalPnl    = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    res.json({
      data: enriched,
      summary: { total_cost: totalCost, total_value: totalValue, total_pnl: totalPnl, total_pnl_pct: totalPnlPct },
    });
  } catch (err) {
    console.error('[Portfolio] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio — add a holding
router.post('/', async (req, res) => {
  const { code, quantity, buy_price, buy_date, note } = req.body;
  if (!quantity || !buy_price || !buy_date)
    return res.status(400).json({ error: 'quantity, buy_price, buy_date required' });
  if (quantity <= 0 || buy_price <= 0)
    return res.status(400).json({ error: 'quantity and buy_price must be positive' });

  try {
    const result = await execute(
      'INSERT INTO portfolio (user_id, code, quantity, buy_price, buy_date, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.user.id, code || 'SJC9999', quantity, buy_price, buy_date, note || '']
    );
    res.json({ id: result.insertId, message: 'Added successfully' });
  } catch (err) {
    console.error('[Portfolio] POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/portfolio/:id — update a holding
router.put('/:id', async (req, res) => {
  const { code, quantity, buy_price, buy_date, note } = req.body;
  try {
    const item = await queryOne(
      'SELECT * FROM portfolio WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!item) return res.status(404).json({ error: 'Not found' });

    await execute(
      'UPDATE portfolio SET code = $1, quantity = $2, buy_price = $3, buy_date = $4, note = $5 WHERE id = $6 AND user_id = $7',
      [
        code       ?? item.code,
        quantity   ?? item.quantity,
        buy_price  ?? item.buy_price,
        buy_date   ?? item.buy_date,
        note       ?? item.note,
        req.params.id,
        req.user.id,
      ]
    );
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error('[Portfolio] PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/portfolio/:id — delete a holding
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute(
      'DELETE FROM portfolio WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('[Portfolio] DELETE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
