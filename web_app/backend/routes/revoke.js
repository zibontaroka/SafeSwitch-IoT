// routes/revoke.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 🔍 GET: Fetch active handovers for current lineman
router.get('/active', authenticate, authorizeRoles('Lineman'), async (req, res) => {
  const linemanId = req.user.id;

  try {
    const [zonesResult, feedersResult] = await Promise.all([
      db.query(`
        SELECT z.id, z.name, z.status, 'zone' as type
        FROM zone_control_handover zch
        JOIN zones z ON zch.zone_id = z.id
        WHERE zch.lineman_id = $1 AND zch.control_active = TRUE
      `, [linemanId]),

      db.query(`
        SELECT f.id, f.name, f.status, 'feeder' as type
        FROM feeder_control_handover fch
        JOIN feeders f ON fch.feeder_id = f.id
        WHERE fch.lineman_id = $1 AND fch.control_active = TRUE
      `, [linemanId])
    ]);

    res.json({
      zones: zonesResult.rows,
      feeders: feedersResult.rows
    });

  } catch (err) {
    console.error('Failed to fetch active handovers:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🔐 POST: Revoke control (zone or feeder) after verifying PIN
router.post('/', authenticate, authorizeRoles('Lineman'), async (req, res) => {
  const userId = req.user.id;
  const { id, type, pin } = req.body;

  if (!id || !type || !pin) {
    return res.status(400).json({ success: false, message: 'Missing data' });
  }

  try {
    const result = await db.query(
      `SELECT pin_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].pin_hash) {
      return res.status(403).json({ success: false, message: 'PIN not set' });
    }

    const pinHash = result.rows[0].pin_hash;
    const isMatch = await bcrypt.compare(pin, pinHash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    if (type === 'zone') {
      await db.query(`
        UPDATE zone_control_handover
        SET control_active = FALSE
        WHERE zone_id = $1 AND lineman_id = $2 AND control_active = TRUE
      `, [id, userId]);
    } else if (type === 'feeder') {
      await db.query(`
        UPDATE feeder_control_handover
        SET control_active = FALSE
        WHERE feeder_id = $1 AND lineman_id = $2 AND control_active = TRUE
      `, [id, userId]);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    res.json({ success: true, message: `${type} control revoked` });

  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
