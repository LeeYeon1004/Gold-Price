const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, execute } = require('../db/database');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const username = req.body.username?.trim().toLowerCase();
  const { password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Please enter username and password' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await execute(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashed]
    );
    const userId = result.insertId;

    // Create default member
    await execute(
      'INSERT INTO members (owner_id, name) VALUES ($1, $2)',
      [userId, 'Main Portfolio']
    );

    const token = signToken({ id: userId, username });
    res.json({ token, user: { id: userId, username, display_name: null } });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const username = req.body.username?.trim().toLowerCase();
  const { password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Please enter username and password' });

  try {
    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) return res.status(401).json({ error: 'Incorrect username or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Incorrect username or password' });

    const token = signToken({ id: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, username, display_name FROM users WHERE id = $1', [req.user.id]);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  const display_name = req.body.display_name?.trim() || null;
  try {
    await execute('UPDATE users SET display_name = $1 WHERE id = $2', [display_name, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[Auth] Profile update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
