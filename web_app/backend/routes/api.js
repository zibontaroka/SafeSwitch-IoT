//backend/routes/api.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Devices endpoints

// GET /api/devices - list all devices
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM devices ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/devices - add new device (optional, mostly via websocket)
router.post('/', [
  body('device_uid').notEmpty().withMessage('Device UID is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { device_uid } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO devices (device_uid, status, is_online, last_seen, created_at, updated_at) 
       VALUES ($1, false, false, NOW(), NOW(), NOW())
       ON CONFLICT (device_uid) DO NOTHING RETURNING *`,
      [device_uid]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: 'Device already exists' });

    res.status(201).json(result.rows[0]);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/devices/:device_uid
router.delete('/:device_uid', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM devices WHERE device_uid = $1 RETURNING *',
      [req.params.device_uid]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Device not found' });
    res.json({ message: 'Device deleted successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/devices/:device_uid/status - update device manual status (on/off)
router.put('/:device_uid/status', [
  body('status').isBoolean().withMessage('Status must be boolean'),
], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { status } = req.body;
  const device_uid = req.params.device_uid;

  try {
    const result = await db.query(
      'UPDATE devices SET status = $1, updated_at = NOW() WHERE device_uid = $2 RETURNING *',
      [status, device_uid]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Device not found' });

    res.json({ success: true, device: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Relays endpoints

// GET /api/relays - list all relays
router.get('/relays', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM relays ORDER BY device_uid, gpio_pin');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/relays/:relay_uid/toggle - toggle relay status (on/off)
router.put('/relays/:relay_uid/toggle', async (req, res) => {
  const relay_uid = req.params.relay_uid;

  try {
    // Get current relay status
    const relayRes = await db.query('SELECT relay_status FROM relays WHERE relay_uid = $1', [relay_uid]);
    if (relayRes.rows.length === 0) {
      return res.status(404).json({ error: 'Relay not found' });
    }

    const currentStatus = relayRes.rows[0].relay_status;
    const newStatus = !currentStatus;

    // Update status in DB
    await db.query(
      'UPDATE relays SET relay_status = $1, updated_at = NOW() WHERE relay_uid = $2',
      [newStatus, relay_uid]
    );

    // Here you can send a websocket command to the ESP device for real hardware control
    // For now, just respond success

    res.json({ success: true, relay_uid, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
