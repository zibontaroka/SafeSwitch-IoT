const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db'); // Your database connection module
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Middleware: authenticate + restrict to Lineman role only
router.use(authenticate);
router.use(authorizeRoles('Lineman'));

// POST /api/pin/set
// Set or update the PIN for the logged-in user (if not set already)
router.post('/set', async (req, res) => {
  const userId = req.user.id;
  const { pin } = req.body;

  if (!pin || pin.length < 4) {
    return res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
  }

  try {
    // Hash the PIN before storing
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(pin, saltRounds);

    // Update user's pin_hash in DB
    await db.query(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [pinHash, userId]);

    return res.json({ success: true, message: 'PIN set successfully' });
  } catch (error) {
    console.error('Error setting PIN:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pin/verify
// Verify the user's PIN
router.post('/verify', async (req, res) => {
  const userId = req.user.id;
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ success: false, message: 'PIN is required' });
  }

  try {
    const result = await db.query(`SELECT pin_hash FROM users WHERE id = $1`, [userId]);

    if (result.rows.length === 0 || !result.rows[0].pin_hash) {
      return res.status(404).json({ success: false, message: 'PIN not set' });
    }

    const pinHash = result.rows[0].pin_hash;

    const isMatch = await bcrypt.compare(pin, pinHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    return res.json({ success: true, message: 'PIN verified successfully' });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pin/change
// Change PIN by verifying old PIN, validating new PIN, and updating
router.post('/change', async (req, res) => {
  const userId = req.user.id;
  const { oldPin, newPin } = req.body;

  if (!oldPin || !newPin) {
    return res.status(400).json({ success: false, message: 'Old PIN and new PIN are required' });
  }

  if (newPin.length < 4) {
    return res.status(400).json({ success: false, message: 'New PIN must be at least 4 digits' });
  }

  try {
    // Get current pin_hash
    const result = await db.query(`SELECT pin_hash FROM users WHERE id = $1`, [userId]);

    if (result.rows.length === 0 || !result.rows[0].pin_hash) {
      return res.status(404).json({ success: false, message: 'PIN not set. Use /set to create a PIN first' });
    }

    const currentPinHash = result.rows[0].pin_hash;

    // Verify old PIN
    const isOldPinMatch = await bcrypt.compare(oldPin, currentPinHash);
    if (!isOldPinMatch) {
      return res.status(401).json({ success: false, message: 'Old PIN is incorrect' });
    }

    // Optional: Check if new PIN is different from old PIN
    const isNewPinSameAsOld = await bcrypt.compare(newPin, currentPinHash);
    if (isNewPinSameAsOld) {
      return res.status(400).json({ success: false, message: 'New PIN must be different from old PIN' });
    }

    // Hash new PIN and update
    const saltRounds = 10;
    const newPinHash = await bcrypt.hash(newPin, saltRounds);

    await db.query(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [newPinHash, userId]);

    return res.json({ success: true, message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Error changing PIN:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
