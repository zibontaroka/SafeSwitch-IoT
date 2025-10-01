// backend/routes/control_relays.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all relays
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM relays ORDER BY device_uid, relay_uid');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching relays:', err);
    res.status(500).json({ error: 'Failed to fetch relays' });
  }
});

// PUT: toggle relay_status
router.put('/:relay_uid', async (req, res) => {
  const { relay_uid } = req.params;
  const { relay_status } = req.body;

  // Validate relay_status is boolean
  if (typeof relay_status !== 'boolean') {
    return res.status(400).json({ error: 'relay_status must be boolean' });
  }

  // console.log(`PUT /api/relays/${relay_uid} with relay_status=${relay_status}`);

  try {
    const result = await db.query(
      'UPDATE relays SET relay_status = $1, updated_at = NOW() WHERE relay_uid = $2 RETURNING *',
      [relay_status, relay_uid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Relay not found' });
    }

    // Return the updated relay row
    res.json({ message: 'Relay status updated', relay: result.rows[0] });
  } catch (err) {
    console.error('Error updating relay:', err);
    res.status(500).json({ error: 'Failed to update relay' });
  }
});

module.exports = router;
