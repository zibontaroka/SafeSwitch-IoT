// 📁 backend/routes/control_zones.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { notifyDeviceRelayUpdate } = require('../ws_server'); 
// ✅ GET all zones with handover info
router.get('/with-control', authenticate, authorizeRoles('Operator'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        z.id, z.name, z.status,
        zch.control_active,
        u.full_name AS lineman_name
      FROM zones z
      LEFT JOIN zone_control_handover zch 
        ON z.id = zch.zone_id AND zch.control_active = TRUE
      LEFT JOIN users u ON zch.lineman_id = u.id
      ORDER BY z.name;
    `);
    res.json({ success: true, zones: result.rows });
  } catch (err) {
    console.error('Error fetching zones with control:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ✅ POST: Toggle zone ON/OFF (secure by role)
router.post('/:id/toggle', authenticate, authorizeRoles('Operator', 'Lineman'), async (req, res) => {
  const zoneId = parseInt(req.params.id);
  const { status } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  // 🔄 Normalize to integer (1 or 0)
  const relayStatus = status === true || status === 'true' ? 1 : 0;

  try {
    // 🔐 Handover Access Validation
    const handover = await db.query(`
      SELECT lineman_id FROM zone_control_handover
      WHERE zone_id = $1 AND control_active = TRUE
    `, [zoneId]);

    if (handover.rowCount > 0) {
      const { lineman_id } = handover.rows[0];

      if (role === 'Operator') {
        return res.status(403).json({ success: false, message: 'Zone is under handover' });
      }

      if (role === 'Lineman' && lineman_id !== userId) {
        return res.status(403).json({ success: false, message: 'Zone not assigned to you' });
      }
    } else {
      if (role === 'Lineman') {
        return res.status(403).json({ success: false, message: 'Zone not handed over to you' });
      }
    }

    // ✅ Update DB
    await db.query(`
      UPDATE relays SET relay_status = $1, updated_at = NOW()
      WHERE zone_id = $2
    `, [relayStatus, zoneId]);

    await db.query(`
      UPDATE zones SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [relayStatus, zoneId]);

    // 📡 Notify Devices via WebSocket
    await notifyDeviceRelayUpdate(zoneId);

    // ✅ Respond
    res.json({ success: true, message: 'Zone toggled successfully' });

  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ POST: Handover zone to Lineman
router.post('/handover/zone', authenticate, authorizeRoles('Operator'), async (req, res) => {
  const { zone_id, lineman_id } = req.body;
  const operator_id = req.user.id;

  if (!zone_id || !lineman_id) {
    return res.status(400).json({ success: false, message: 'Missing zone_id or lineman_id' });
  }

  try {
    const exists = await db.query(`
      SELECT 1 FROM zone_control_handover
      WHERE zone_id = $1 AND control_active = TRUE
    `, [zone_id]);

    if (exists.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Zone already handed over' });
    }

    await db.query(`
      INSERT INTO zone_control_handover
      (zone_id, operator_id, lineman_id, control_active, handed_over_at)
      VALUES ($1, $2, $3, TRUE, NOW())
    `, [zone_id, operator_id, lineman_id]);

    res.json({ success: true, message: 'Zone handed over successfully' });
  } catch (err) {
    console.error('Zone handover error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
