//  routs/profile.js
// routes/profile.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// ✅ GET current user's theme
router.get('/theme', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT theme_mode FROM users WHERE id = $1', [req.user.id]);
    const theme = result.rows.length > 0 ? result.rows[0].theme_mode : 'light';
    res.json({ success: true, theme });
  } catch (err) {
    console.error('Theme GET error:', err);
    res.status(500).json({ success: false, error: 'Failed to get theme' });
  }
});

// ✅ PUT update current user's theme
router.put('/theme', authenticate, async (req, res) => {
  const { theme } = req.body;
  if (!['light', 'dark'].includes(theme)) {
    return res.status(400).json({ success: false, error: 'Invalid theme value' });
  }

  try {
    await db.query('UPDATE users SET theme_mode = $1 WHERE id = $2', [theme, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Theme PUT error:', err);
    res.status(500).json({ success: false, error: 'Failed to update theme' });
  }
});

module.exports = router;
