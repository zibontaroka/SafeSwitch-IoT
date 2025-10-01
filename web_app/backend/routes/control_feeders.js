// 📁 backend/routes/control_feeders.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// ✅ GET feeders with control info
router.get('/with-control', authenticate, authorizeRoles('Operator'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        f.id, f.name, f.status,
        fch.control_active,
        u.full_name AS lineman_name
      FROM feeders f
      LEFT JOIN feeder_control_handover fch
        ON fch.feeder_id = f.id AND fch.control_active = TRUE
      LEFT JOIN users u ON u.id = fch.lineman_id
      ORDER BY f.name;
    `);
    res.json({ success: true, feeders: result.rows });
  } catch (err) {
    console.error('Error fetching feeders with control info:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ POST: Toggle feeder ON/OFF (with handover safety checks)
router.post('/:id/toggle', authenticate, authorizeRoles('Operator', 'Lineman'), async (req, res) => {
  const feederId = parseInt(req.params.id);
  const { status } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    // 🔒 Check if any zones under this feeder are handed over
    const handedOverZones = await db.query(`
      SELECT 1 FROM zone_control_handover zch
      JOIN feeder_zones fz ON fz.zone_id = zch.zone_id
      WHERE fz.feeder_id = $1 AND zch.control_active = TRUE
      LIMIT 1
    `, [feederId]);

    if (handedOverZones.rowCount > 0 && role === 'Operator') {
      return res.status(403).json({ success: false, message: 'Some zones are under handover' });
    }

    // 🔒 Check if feeder is under handover
    const handover = await db.query(`
      SELECT lineman_id FROM feeder_control_handover
      WHERE feeder_id = $1 AND control_active = TRUE
      LIMIT 1
    `, [feederId]);

    if (handover.rowCount > 0) {
      const { lineman_id } = handover.rows[0];

      // ❌ Operator cannot toggle if handed over
      if (role === 'Operator') {
        return res.status(403).json({ success: false, message: 'Feeder is under handover' });
      }

      // ❌ Lineman can only toggle if it's assigned to them
      if (role === 'Lineman' && lineman_id !== userId) {
        return res.status(403).json({ success: false, message: 'Feeder not assigned to you' });
      }
    } else {
      // ❌ Lineman cannot toggle if feeder is not handed over
      if (role === 'Lineman') {
        return res.status(403).json({ success: false, message: 'Feeder not handed over to you' });
      }
    }

    // ✅ Safe to toggle feeder
    await db.query(`
      UPDATE feeders SET status = $1, updated_at = NOW() WHERE id = $2
    `, [status, feederId]);

    // ✅ Update relays under zones of this feeder
    await db.query(`
      UPDATE relays SET relay_status = $1, updated_at = NOW()
      WHERE zone_id IN (
        SELECT zone_id FROM feeder_zones WHERE feeder_id = $2
      )
    `, [status, feederId]);

    res.json({ success: true, message: 'Feeder toggled successfully' });
  } catch (err) {
    console.error('Feeder toggle error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ POST: Hand over feeder to lineman
router.post('/handover', authenticate, authorizeRoles('Operator'), async (req, res) => {
  const { feeder_id, lineman_id } = req.body;
  const operator_id = req.user.id;

  if (!feeder_id || !lineman_id) {
    return res.status(400).json({ success: false, message: 'Missing feeder_id or lineman_id' });
  }

  try {
    const existing = await db.query(`
      SELECT 1 FROM feeder_control_handover
      WHERE feeder_id = $1 AND control_active = TRUE
      LIMIT 1
    `, [feeder_id]);

    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Feeder already handed over' });
    }

    await db.query(`
      INSERT INTO feeder_control_handover
      (feeder_id, operator_id, lineman_id, control_active, handed_over_at)
      VALUES ($1, $2, $3, TRUE, NOW())
    `, [feeder_id, operator_id, lineman_id]);

    res.json({ success: true, message: 'Feeder handed over successfully' });
  } catch (err) {
    console.error('Feeder handover error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ POST: Revoke feeder control (by Lineman)
router.post('/revoke', authenticate, authorizeRoles('Lineman'), async (req, res) => {
  const linemanId = req.user.id;
  const { id, type, pin } = req.body;

  if (!id || !type || !pin) {
    return res.status(400).json({ success: false, message: 'Missing id, type, or pin' });
  }

  if (type !== 'feeder') {
    return res.status(400).json({ success: false, message: 'Invalid type' });
  }

  try {
    const userResult = await db.query(`SELECT pin_hash FROM users WHERE id = $1`, [linemanId]);
    if (userResult.rowCount === 0 || !userResult.rows[0].pin_hash) {
      return res.status(401).json({ success: false, message: 'PIN not set' });
    }

    const isValid = await bcrypt.compare(pin, userResult.rows[0].pin_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    const revokeResult = await db.query(`
      UPDATE feeder_control_handover
      SET control_active = FALSE, revoked_at = NOW()
      WHERE feeder_id = $1 AND lineman_id = $2 AND control_active = TRUE
    `, [id, linemanId]);

    if (revokeResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'No active control found' });
    }

    res.json({ success: true, message: 'Feeder control revoked successfully' });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
