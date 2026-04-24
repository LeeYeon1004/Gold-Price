const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { query, execute } = require('../db/database');

const router = express.Router();
router.use(authMiddleware);

// GET /api/members — list current user's members
router.get('/', async (req, res) => {
  try {
    const members = await query(
      'SELECT id, name, created_at FROM members WHERE owner_id = $1 ORDER BY name ASC',
      [req.user.id]
    );
    res.json({ data: members });
  } catch (err) {
    console.error('[Members] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members — create a member
router.post('/', async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await execute(
      'INSERT INTO members (owner_id, name) VALUES ($1, $2) RETURNING id',
      [req.user.id, name]
    );
    res.json({ id: result.insertId, name, message: 'Member created' });
  } catch (err) {
    console.error('[Members] POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/:id — rename a member
router.put('/:id', async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await execute(
      'UPDATE members SET name = $1 WHERE id = $2 AND owner_id = $3',
      [name, req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Renamed successfully' });
  } catch (err) {
    console.error('[Members] PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/members/:id — remove a member (also removes their portfolio entries via CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute(
      'DELETE FROM members WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error('[Members] DELETE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
