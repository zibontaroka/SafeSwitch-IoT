const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Protect all routes for Operator role only
router.use(authenticate);
router.use(authorizeRoles('Operator'));

// GET all zones with assigned relays
router.get('/', async (req, res) => {
  try {
    const zonesResult = await pool.query(`
      SELECT id, name, status
      FROM zones
      ORDER BY id DESC
    `);
    const zones = zonesResult.rows;

    const relaysResult = await pool.query(`
      SELECT relay_uid, zone_id
      FROM relays
      WHERE zone_id IS NOT NULL
    `);
    const relays = relaysResult.rows;

    // Group relays by zone
    const relaysByZone = {};
    relays.forEach(relay => {
      if (!relaysByZone[relay.zone_id]) relaysByZone[relay.zone_id] = [];
      relaysByZone[relay.zone_id].push(relay.relay_uid);
    });

    // Attach relays to zones
    const zonesWithRelays = zones.map(zone => ({
      ...zone,
      relays: relaysByZone[zone.id] || []
    }));

    res.json({ success: true, zones: zonesWithRelays });
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET free relays (not assigned to any zone)
router.get('/free', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT relay_uid, gpio_pin
      FROM relays
      WHERE zone_id IS NULL
      ORDER BY device_uid, gpio_pin
    `);
    res.json({ success: true, relays: result.rows });
  } catch (error) {
    console.error('Error fetching free relays:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST create new zone with relays
router.post('/', async (req, res) => {
  const { name, status, relays } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertZone = await client.query(`
      INSERT INTO zones (name, status)
      VALUES ($1, $2)
      RETURNING *
    `, [name, status ?? true]);

    const zone = insertZone.rows[0];

    if (Array.isArray(relays) && relays.length > 0) {
      for (const relayUid of relays) {
        await client.query(
          `UPDATE relays SET zone_id = $1 WHERE relay_uid = $2`,
          [zone.id, relayUid]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, zone });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating zone:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Zone name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  } finally {
    client.release();
  }
});

// PUT update zone and its relays
router.put('/:id', async (req, res) => {
  const zoneId = req.params.id;
  const { name, status, relays } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateZone = await client.query(`
      UPDATE zones SET name = $1, status = $2
      WHERE id = $3
      RETURNING *
    `, [name, status ?? true, zoneId]);

    if (updateZone.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }

    // Clear previous relay assignments
    await client.query(`UPDATE relays SET zone_id = NULL WHERE zone_id = $1`, [zoneId]);

    if (Array.isArray(relays) && relays.length > 0) {
      for (const relayUid of relays) {
        await client.query(
          `UPDATE relays SET zone_id = $1 WHERE relay_uid = $2`,
          [zoneId, relayUid]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, zone: updateZone.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating zone:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// DELETE a zone
// DELETE a zone
router.delete('/:id', async (req, res) => {
  const zoneId = req.params.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete zone_control_handover references for this zone
    await client.query('DELETE FROM zone_control_handover WHERE zone_id = $1', [zoneId]);

    // 2. Unassign relays from this zone
    await client.query('UPDATE relays SET zone_id = NULL WHERE zone_id = $1', [zoneId]);

    // 3. Delete zone
    const deleteResult = await client.query('DELETE FROM zones WHERE id = $1 RETURNING *', [zoneId]);

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting zone:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res) => {
 //  console.log('GET /api/zones/:id called with id =', req.params.id);
  const zoneId = parseInt(req.params.id, 10);
  if (isNaN(zoneId)) {
    return res.status(400).json({ success: false, error: 'Invalid zone ID' });
  }

  try {
    const zoneResult = await pool.query(`
      SELECT id, name, status, last_seen
      FROM zones
      WHERE id = $1
    `, [zoneId]);

   //  console.log('DB query returned rows:', zoneResult.rows.length);

    if (zoneResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }
    const zone = zoneResult.rows[0];

    const relaysResult = await pool.query(`
      SELECT relay_uid
      FROM relays
      WHERE zone_id = $1
    `, [zoneId]);

    zone.relays = relaysResult.rows.map(r => r.relay_uid);

    res.json({ success: true, zone });
  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});





module.exports = router;
