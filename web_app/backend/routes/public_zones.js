// backend/routes/public_zones.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 🔍 GET /api/public/zones - Public/Read-only zone status
router.get('/', async (req, res) => {
  try {
    const zonesRes = await db.query(`SELECT id, name, status FROM zones`);
    const zones = zonesRes.rows;

    // Get active handovers (maintenance zones)
    const handoverRes = await db.query(`
      SELECT zone_id FROM zone_control_handover
      WHERE control_active = TRUE
    `);
    const maintenanceZoneIds = handoverRes.rows.map(row => row.zone_id);

    // Final response
    const response = zones.map(zone => ({
      id: zone.id,
      name: zone.name,
      status: zone.status,
      reason: maintenanceZoneIds.includes(zone.id)
        ? 'Maintenance'
        : 'Regular Loadshedding'
    }));

    res.json(response);
  } catch (err) {
    console.error('Error fetching public zones:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
