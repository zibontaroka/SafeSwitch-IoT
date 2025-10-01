const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRoles('Operator'));

// ✅ GET all relays with zone and feeder info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*, 
        z.name AS zone_name,
        f.name AS feeder_name
      FROM relays r
      LEFT JOIN zones z ON r.zone_id = z.id
      LEFT JOIN feeders f ON r.feeder_id = f.id
      ORDER BY r.device_uid, r.gpio_pin
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching relays:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET relay usage summary
router.get('/summary', async (req, res) => {
  try {
    const totalRes = await pool.query('SELECT COUNT(*) FROM relays');
    const usedRes = await pool.query('SELECT COUNT(*) FROM relays WHERE zone_id IS NOT NULL');
    const total = parseInt(totalRes.rows[0].count);
    const used = parseInt(usedRes.rows[0].count);
    const free = total - used;

    res.json({ success: true, total, used, free });
  } catch (err) {
    console.error('Error fetching relay summary:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ✅ GET only free relays (not assigned to zone or feeder)
router.get('/free', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT relay_uid, gpio_pin FROM relays
      WHERE zone_id IS NULL AND feeder_id IS NULL
      ORDER BY device_uid, gpio_pin
    `);
    res.json({ success: true, relays: result.rows });
  } catch (err) {
    console.error('Error fetching free relays:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
