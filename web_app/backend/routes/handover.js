// backend/routes/handover.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticate = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/auth');

// Middleware
router.use(authenticate);

//------------------------------------------
// 🔁 Handover control (Operator -> Lineman)
//------------------------------------------
router.post('/handover', authorizeRoles('Operator'), async (req, res) => {
  const { zone_id, feeder_id, lineman_id } = req.body;
  const operator_id = req.user.id;

  if (!lineman_id || (!zone_id && !feeder_id)) {
    return res.status(400).json({ success: false, message: 'Missing data' });
  }

  try {
    const result = await db.query(`
      INSERT INTO zone_control_handover (zone_id, feeder_id, operator_id, lineman_id, control_active, handed_over_at)
      VALUES ($1, $2, $3, $4, true, NOW()) RETURNING *
    `, [zone_id || null, feeder_id || null, operator_id, lineman_id]);

    res.json({ success: true, handover: result.rows[0] });
  } catch (err) {
    console.error('Handover error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//------------------------------------------
// 🔓 Revoke handover (Lineman finishes work)
//------------------------------------------
router.post('/revoke', authorizeRoles('Lineman'), async (req, res) => {
  const { zone_id, feeder_id } = req.body;

  try {
    const result = await db.query(`
      UPDATE zone_control_handover
      SET control_active = false, revoked_at = NOW()
      WHERE control_active = true
      AND (zone_id = $1 OR feeder_id = $2)
      RETURNING *
    `, [zone_id || null, feeder_id || null]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'No active handover found' });
    }

    res.json({ success: true, revoked: result.rows });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//------------------------------------------
// 🔍 Get active handovers (used by frontend)
//------------------------------------------
router.get('/active', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT zch.*, z.name AS zone_name, f.name AS feeder_name,
             o.full_name AS operator_name, l.full_name AS lineman_name
      FROM zone_control_handover zch
      LEFT JOIN zones z ON z.id = zch.zone_id
      LEFT JOIN feeders f ON f.id = zch.feeder_id
      LEFT JOIN users o ON o.id = zch.operator_id
      LEFT JOIN users l ON l.id = zch.lineman_id
      WHERE zch.control_active = true
    `);
    res.json({ success: true, handovers: result.rows });
  } catch (err) {
    console.error('Fetch handovers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
