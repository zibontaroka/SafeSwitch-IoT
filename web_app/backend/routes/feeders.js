// backend/routes/feeders.js

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Protect all routes for Operator role only
router.use(authenticate);
router.use(authorizeRoles('Operator'));

// GET all feeders with assigned zones
router.get('/', async (req, res) => {
  try {
    const feedersQuery = `
      SELECT 
        f.id AS feeder_id,
        f.name AS feeder_name,
        f.status,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', z.id, 'name', z.name))
          FILTER (WHERE z.id IS NOT NULL),
          '[]'
        ) AS zones,
        COALESCE(
          json_agg(DISTINCT r.relay_uid)
          FILTER (WHERE r.relay_uid IS NOT NULL),
          '[]'
        ) AS relays
      FROM feeders f
      LEFT JOIN feeder_zones fz ON f.id = fz.feeder_id
      LEFT JOIN zones z ON fz.zone_id = z.id
      LEFT JOIN relays r ON r.feeder_id = f.id
      GROUP BY f.id
      ORDER BY f.id DESC;
    `;

    const result = await pool.query(feedersQuery);
    res.json({ success: true, feeders: result.rows });
  } catch (error) {
    console.error('Error fetching feeders:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// GET all free relays (not assigned to any feeder or zone)
router.get('/free', async (req, res) => {
  try {
    const freeRelaysQuery = `
      SELECT relay_uid, gpio_pin
      FROM relays
      WHERE feeder_id IS NULL AND zone_id IS NULL
      ORDER BY device_uid, gpio_pin
    `;
    const result = await pool.query(freeRelaysQuery);
    res.json({ success: true, relays: result.rows });
  } catch (error) {
    console.error('Error fetching free relays:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST create new feeder with assigned zones and relays
router.post('/', async (req, res) => {
  const { name, status, zones, relays } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Feeder name required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertFeeder = await client.query(
      `INSERT INTO feeders (name, status) VALUES ($1, $2) RETURNING *`,
      [name, status ?? true]
    );
    const feeder = insertFeeder.rows[0];

    if (Array.isArray(zones) && zones.length > 0) {
      for (const zoneId of zones) {
        await client.query(
          `INSERT INTO feeder_zones (feeder_id, zone_id) VALUES ($1, $2)`,
          [feeder.id, zoneId]
        );
      }
    }

    if (Array.isArray(relays) && relays.length > 0) {
      for (const relayUid of relays) {
        await client.query(
          `UPDATE relays SET feeder_id = $1, zone_id = NULL WHERE relay_uid = $2`,
          [feeder.id, relayUid]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, feeder });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating feeder:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Feeder name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  } finally {
    client.release();
  }
});

// PUT update feeder with zones and relays
router.put('/:id', async (req, res) => {
  const feederId = parseInt(req.params.id);
  const { name, status, zones, relays } = req.body;

  const client = await pool.connect();
  try {
   // console.log('🟡 Updating feeder:', feederId);
   // console.log('📝 Zones:', zones);
    //console.log('🧩 Relays:', relays);

    await client.query('BEGIN');

    // Update feeder info
    const updated = await client.query(`
      UPDATE feeders SET name = $1, status = $2
      WHERE id = $3 RETURNING *`,
      [name, status ?? true, feederId]
    );
    if (updated.rows.length === 0) throw new Error('Feeder not found');

    //console.log('✅ Feeder info updated:', updated.rows[0]);

    // Remove previous zones
    await client.query(`DELETE FROM feeder_zones WHERE feeder_id = $1`, [feederId]);

    if (Array.isArray(zones)) {
      for (const zoneId of zones) {
        await client.query(
          `INSERT INTO feeder_zones (feeder_id, zone_id) VALUES ($1, $2)`,
          [feederId, zoneId]
        );
        //console.log(`🔗 Linked zone ${zoneId} to feeder ${feederId}`);
      }
    }

    // Remove old relay connections
    await client.query(`UPDATE relays SET feeder_id = NULL WHERE feeder_id = $1`, [feederId]);

    // Add new relay connections
    if (Array.isArray(relays)) {
      for (const relayUid of relays) {
        const result = await client.query(
          `UPDATE relays SET feeder_id = $1, zone_id = NULL WHERE relay_uid = $2 RETURNING *`,
          [feederId, relayUid]
        );
        if (result.rowCount > 0) {
         // console.log(`✅ Assigned relay ${relayUid} to feeder ${feederId}`);
        } else {
          console.warn(`⚠️ Relay not found or not updated: ${relayUid}`);
        }
      }
    }

    await client.query('COMMIT');
    // console.log('🎉 Feeder update successful.');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating feeder:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});


// DELETE a feeder
router.delete('/:id', async (req, res) => {
  const feederId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM feeder_zones WHERE feeder_id = $1', [feederId]);
    await client.query('UPDATE relays SET feeder_id = NULL WHERE feeder_id = $1', [feederId]);
    const deleteResult = await client.query('DELETE FROM feeders WHERE id = $1 RETURNING *', [feederId]);
    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Feeder not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Feeder deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting feeder:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// GET feeder by ID with zones and relays
router.get('/:id', async (req, res) => {
  const feederId = parseInt(req.params.id, 10);
  if (isNaN(feederId)) {
    return res.status(400).json({ success: false, error: 'Invalid feeder ID' });
  }

  try {
    const feederResult = await pool.query(
      `SELECT id, name, status FROM feeders WHERE id = $1`,
      [feederId]
    );
    if (feederResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feeder not found' });
    }
    const feeder = feederResult.rows[0];

    const zonesResult = await pool.query(
      `SELECT z.id, z.name FROM zones z
       JOIN feeder_zones fz ON z.id = fz.zone_id
       WHERE fz.feeder_id = $1`,
      [feederId]
    );
    feeder.zones = zonesResult.rows;

    const relaysResult = await pool.query(
      `SELECT relay_uid FROM relays WHERE feeder_id = $1`,
      [feederId]
    );
    feeder.relays = relaysResult.rows.map(r => r.relay_uid);

    res.json({ success: true, feeder });
  } catch (error) {
    console.error('Error fetching feeder:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
