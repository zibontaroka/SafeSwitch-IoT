// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login/:role', async (req, res) => {
  const { role } = req.params;
  const { identifier, password } = req.body;

  try {
    const result = await db.query(`
      SELECT u.id, u.username, u.email, u.password, r.role_name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE (u.username = $1 OR u.email = $1) AND r.role_name = $2
      LIMIT 1
    `, [identifier, role.charAt(0).toUpperCase() + role.slice(1)]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials or role' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
