// backend/route/control_handover.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Feeder Handover
router.post('/handover/feeder', authenticate, authorizeRoles('Operator'), async (req, res) => {
  const { feeder_id, lineman_id } = req.body;
  const operator_id = req.user.id;

  if (!feeder_id || !lineman_id) {
    return res.status(400).json({ success: false, message: 'Missing feeder_id or lineman_id' });
  }

  try {
    const existing = await db.query(
      `SELECT * FROM feeder_control_handover WHERE feeder_id = $1 AND control_active = TRUE`,
      [feeder_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Feeder already handed over' });
    }

    await db.query(
      `INSERT INTO feeder_control_handover 
        (feeder_id, operator_id, lineman_id, control_active, handed_over_at)
       VALUES ($1, $2, $3, TRUE, NOW())`,
      [feeder_id, operator_id, lineman_id]
    );

    res.json({ success: true, message: 'Feeder handed over successfully' });
  } catch (err) {
    console.error('Feeder handover error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Zone Handover
router.post('/handover/zone', authenticate, authorizeRoles('Operator'), async (req, res) => {
  const { zone_id, lineman_id } = req.body;
  const operator_id = req.user.id;

  if (!zone_id || !lineman_id) {
    return res.status(400).json({ success: false, message: 'Missing zone_id or lineman_id' });
  }

  try {
    const existing = await db.query(
      `SELECT * FROM zone_control_handover WHERE zone_id = $1 AND control_active = TRUE`,
      [zone_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Zone already handed over' });
    }

    await db.query(
      `INSERT INTO zone_control_handover 
        (zone_id, operator_id, lineman_id, control_active, handed_over_at)
       VALUES ($1, $2, $3, TRUE, NOW())`,
      [zone_id, operator_id, lineman_id]
    );

    res.json({ success: true, message: 'Zone handed over successfully' });
  } catch (err) {
    console.error('Zone handover error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle Zone (Operator or Lineman if handed over)
router.post('/:id/toggle', authenticate, authorizeRoles('Operator', 'Lineman'), async (req, res) => {
  const zoneId = req.params.id;
  const { status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const result = await db.query(
      `SELECT * FROM zone_control_handover WHERE zone_id = $1 AND control_active = TRUE`,
      [zoneId]
    );

    if (result.rows.length > 0) {
      const record = result.rows[0];
      if (userRole === 'Operator') {
        return res.status(403).json({ success: false, message: 'Zone is currently handed over and locked for Operator control' });
      }
      if (userRole === 'Lineman' && record.lineman_id !== userId) {
        return res.status(403).json({ success: false, message: 'You do not have control of this zone' });
      }
    } else if (userRole !== 'Operator') {
      return res.status(403).json({ success: false, message: 'Only Operator can control this zone' });
    }

    await db.query(
      `UPDATE zones SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, zoneId]
    );

    await db.query(
      `UPDATE relays SET relay_status = $1, updated_at = NOW() WHERE zone_id = $2`,
      [status, zoneId]
    );

    res.json({ success: true, message: 'Zone toggled successfully' });
  } catch (err) {
    console.error('Zone toggle error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle Feeder (Operator or Lineman if handed over)
router.post('/feeder/:id/toggle', authenticate, authorizeRoles('Operator', 'Lineman'), async (req, res) => {
  const feederId = req.params.id;
  const { status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const result = await db.query(
      `SELECT * FROM feeder_control_handover WHERE feeder_id = $1 AND control_active = TRUE`,
      [feederId]
    );

    if (result.rows.length > 0) {
      const record = result.rows[0];
      if (userRole === 'Operator') {
        return res.status(403).json({ success: false, message: 'Feeder is currently handed over and locked for Operator control' });
      }
      if (userRole === 'Lineman' && record.lineman_id !== userId) {
        return res.status(403).json({ success: false, message: 'You do not have control of this feeder' });
      }
    } else if (userRole !== 'Operator') {
      return res.status(403).json({ success: false, message: 'Only Operator can control this feeder' });
    }

    await db.query(
      `UPDATE feeders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, feederId]
    );

    res.json({ success: true, message: 'Feeder toggled successfully' });
  } catch (err) {
    console.error('Feeder toggle error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Revoke Control (by Lineman)
router.post('/revoke', authenticate, authorizeRoles('Lineman'), async (req, res) => {
  const linemanId = req.user.id;
  const { id, type, pin } = req.body;

  if (!id || !type || !pin) {
    return res.status(400).json({ success: false, message: 'Missing id, type, or pin' });
  }

  try {
    const userResult = await db.query(`SELECT pin_hash FROM users WHERE id = $1`, [linemanId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const pinHash = userResult.rows[0].pin_hash;
    if (!pinHash) {
      return res.status(403).json({ success: false, message: 'PIN not set. Please set your PIN first.' });
    }

    const isValid = await bcrypt.compare(pin, pinHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    let query;
    if (type === 'zone') {
      query = `
        UPDATE zone_control_handover 
        SET control_active = FALSE, revoked_at = NOW()
        WHERE zone_id = $1 AND lineman_id = $2 AND control_active = TRUE
      `;
    } else if (type === 'feeder') {
      query = `
        UPDATE feeder_control_handover 
        SET control_active = FALSE, revoked_at = NOW()
        WHERE feeder_id = $1 AND lineman_id = $2 AND control_active = TRUE
      `;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    const result = await db.query(query, [id, linemanId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'No active control found to revoke' });
    }

    res.json({ success: true, message: `${type} control revoked successfully.` });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
