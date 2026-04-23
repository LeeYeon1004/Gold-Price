const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { query, queryOne, execute } = require('../db/database');
const { getLatestRates } = require('../services/goldService');

const router = express.Router();
router.use(authMiddleware);

// Verify a member belongs to the requesting user. Returns member row or null.
async function verifyMember(memberId, userId) {
  if (!memberId) return null;
  return queryOne('SELECT id FROM members WHERE id = $1 AND owner_id = $2', [memberId, userId]);
}

// GET /api/portfolio — list holdings. Pass ?member_id=X to view a member's data.
router.get('/', async (req, res) => {
  try {
    const memberId = req.query.member_id ? Number(req.query.member_id) : null;

    if (memberId) {
      const member = await verifyMember(memberId, req.user.id);
      if (!member) return res.status(404).json({ error: 'Member not found' });
    }

    const items = memberId
      ? await query('SELECT * FROM portfolio WHERE user_id = $1 AND member_id = $2 ORDER BY buy_date DESC', [req.user.id, memberId])
      : await query('SELECT * FROM portfolio WHERE user_id = $1 AND member_id IS NULL ORDER BY buy_date DESC', [req.user.id]);

    const rates = await getLatestRates();
    const rateMap = {};
    for (const r of rates) rateMap[r.code] = r.buy_price;

    const enriched = items.map(item => {
      const currentPrice = rateMap[item.code] || rateMap['SJC9999'] || (rates.length > 0 ? rates[0].buy_price : 0);
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

// POST /api/portfolio — add a holding. Pass member_id in body for a member's entry.
router.post('/', async (req, res) => {
  const { code, quantity, buy_price, buy_date, note, member_id } = req.body;
  if (!quantity || !buy_price || !buy_date)
    return res.status(400).json({ error: 'quantity, buy_price, buy_date required' });
  if (quantity <= 0 || buy_price <= 0)
    return res.status(400).json({ error: 'quantity and buy_price must be positive' });

  try {
    if (member_id) {
      const member = await verifyMember(member_id, req.user.id);
      if (!member) return res.status(404).json({ error: 'Member not found' });
    }

    const result = await execute(
      'INSERT INTO portfolio (user_id, code, quantity, buy_price, buy_date, note, member_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [req.user.id, code || 'SJC9999', quantity, buy_price, buy_date, note || '', member_id || null]
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

// PUT /api/portfolio/:id/sell — sell all or partial quantity
router.put('/:id/sell', async (req, res) => {
  const { sell_price, sell_date, market_price_at_sell, sell_quantity } = req.body;
  if (!sell_price || !sell_date || !sell_quantity)
    return res.status(400).json({ error: 'sell_price, sell_date and sell_quantity are required' });

  const qty = Number(sell_quantity);
  if (!Number.isFinite(qty) || qty <= 0)
    return res.status(400).json({ error: 'sell_quantity must be a positive number' });

  try {
    const item = await queryOne(
      'SELECT * FROM portfolio WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (qty > item.quantity)
      return res.status(400).json({ error: `Cannot sell ${qty}, only ${item.quantity} available` });

    if (qty === item.quantity) {
      await execute(
        'UPDATE portfolio SET sell_price = $1, sell_date = $2, market_price_at_sell = $3 WHERE id = $4 AND user_id = $5',
        [sell_price, sell_date, market_price_at_sell || null, req.params.id, req.user.id]
      );
    } else {
      await execute(
        'UPDATE portfolio SET quantity = $1 WHERE id = $2 AND user_id = $3',
        [item.quantity - qty, req.params.id, req.user.id]
      );
      await execute(
        `INSERT INTO portfolio (user_id, code, quantity, buy_price, buy_date, note, sell_price, sell_date, market_price_at_sell, member_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [req.user.id, item.code, qty, item.buy_price, item.buy_date, item.note || '',
         sell_price, sell_date, market_price_at_sell || null, item.member_id || null]
      );
    }

    res.json({ message: 'Sold successfully' });
  } catch (err) {
    console.error('[Portfolio] SELL error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/portfolio/:id/reopen — revert a sold holding back to holding
router.put('/:id/reopen', async (req, res) => {
  try {
    const item = await queryOne(
      'SELECT * FROM portfolio WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!item) return res.status(404).json({ error: 'Not found' });

    await execute(
      'UPDATE portfolio SET sell_price = NULL, sell_date = NULL, market_price_at_sell = NULL WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Reopened as holding' });
  } catch (err) {
    console.error('[Portfolio] REOPEN error:', err.message);
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
