const express = require('express');
const router = express.Router();
const db = require('../db');

const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = {};

    const relaysRes = await db.query('SELECT COUNT(*) FROM relays');
    stats.total_relays = parseInt(relaysRes.rows[0].count);

    const usedRelaysRes = await db.query(`
      SELECT COUNT(*) FROM relays
      WHERE zone_id IS NOT NULL OR feeder_id IS NOT NULL
    `);
    stats.used_relays = parseInt(usedRelaysRes.rows[0].count);

    stats.free_relays = stats.total_relays - stats.used_relays;

    const deviceRes = await db.query('SELECT COUNT(*) FROM devices');
    stats.total_devices = parseInt(deviceRes.rows[0].count);

    const activeDevicesRes = await db.query('SELECT COUNT(*) FROM devices WHERE status = true');
    stats.active_devices = parseInt(activeDevicesRes.rows[0].count);

    const zonesRes = await db.query('SELECT COUNT(*) FROM zones');
    stats.total_zones = parseInt(zonesRes.rows[0].count);

    const activeZonesRes = await db.query('SELECT COUNT(*) FROM zones WHERE status = true');
    stats.active_zones = parseInt(activeZonesRes.rows[0].count);

    const feedersRes = await db.query('SELECT COUNT(*) FROM feeders');
    stats.total_feeders = parseInt(feedersRes.rows[0].count);

    const activeFeedersRes = await db.query('SELECT COUNT(*) FROM feeders WHERE status = true');
    stats.active_feeders = parseInt(activeFeedersRes.rows[0].count);

    // Log all for debugging

    return res.json({ success: true, ...stats });

  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
  }
});

router.get('/zones-status', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT
        z.id,
        z.name,
        z.status,
        CASE
          WHEN h.control_active = true AND h.lineman_id IS NOT NULL AND z.status = false THEN '🛠️ Maintenance'
          WHEN (h.control_active IS NULL OR h.control_active = false) AND z.status = false THEN 'Loadshedding'
          ELSE ''
        END AS reason
      FROM zones z
      LEFT JOIN zone_control_handover h ON h.zone_id = z.id AND h.control_active = true;
    `;

    const result = await db.query(query);
    return res.json({ success: true, zones: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
  }
});







router.get('/relays-status', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.device_uid, d.status AS device_status, 
        r.relay_uid, r.gpio_pin, r.relay_status
      FROM devices d
      LEFT JOIN relays r ON d.device_uid = r.device_uid
      ORDER BY d.device_uid, r.gpio_pin
    `);

    const rows = result.rows;

    // Structure data: { device_uid: { device_status, relays: [...] } }
    const devices = {};

    rows.forEach(row => {
      if (!devices[row.device_uid]) {
        devices[row.device_uid] = {
          device_status: row.device_status,
          relays: Array(7).fill(null)  // since each device has 7 relays
        };
      }

      if (row.gpio_pin !== null && row.relay_uid !== null) {
        const pinIndex = getRelayIndex(row.gpio_pin);
        if (pinIndex !== -1) {
          devices[row.device_uid].relays[pinIndex] = {
            relay_uid: row.relay_uid,
            status: row.relay_status
          };
        }
      }
    });

    return res.json({ success: true, devices });

  } catch (err) {
    console.error('Error fetching relay status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GPIO pin → relay index mapping (based on your 7 relays)
function getRelayIndex(gpio) {
  const gpioMap = [4, 5, 12, 13, 14, 15, 16];
  return gpioMap.indexOf(gpio); // returns -1 if not matched
}



module.exports = router;
