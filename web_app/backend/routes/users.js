// routes/users.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// routes/auth.js
router.post('/login', async (req, res) => {
  // verify user, then:
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,       // ✅ Add this
      full_name: user.full_name,     // ✅ Add this if you want full name
      role: role_name                // ✅ This is needed too
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ success: true, token });
});


// Public route to get linemen list (accessible by Operator and Manager)
router.get('/linemen', authenticate, authorizeRoles('Operator', 'Manager'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, full_name FROM users WHERE role_id = 3 AND is_active = TRUE ORDER BY full_name
    `);
    res.json({ success: true, linemen: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Middleware: all routes below require authentication + Manager role
router.use(authenticate);
router.use(authorizeRoles('Manager'));

// ✅ GET all users (Manager only)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.full_name, u.username, u.email, u.phone, r.role_name AS role_name, u.is_active
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id DESC
    `);
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


router.use(authenticate);
router.use(authorizeRoles('Manager'));
//  POST add new user (Manager only)
router.post('/', async (req, res) => {
  try {
    const { full_name, username, email, phone, password, role } = req.body;
    if (!full_name || !username || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const exists = await db.query(
      'SELECT 1 FROM users WHERE phone=$1 OR email=$2 OR username=$3',
      [phone, email, username]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Phone, email or username already exists' });
    }

    const roleResult = await db.query('SELECT id FROM roles WHERE role_name = $1', [role]);
    if (roleResult.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const role_id = roleResult.rows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await db.query(`
      INSERT INTO users (full_name, username, email, phone, password, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING id
    `, [full_name, username, email, phone, hashedPassword, role_id]);

    const newUserId = insertResult.rows[0].id;

    await db.query(`
      INSERT INTO activity_logs (action, entity, entity_id, performed_by, description, created_at)
      VALUES ('CREATE', 'user', $1, $2, $3, NOW())
    `, [newUserId, req.user.id, `User ${username} created by Manager ${req.user.username}`]);

    res.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.use(authenticate);
router.use(authorizeRoles('Manager'));
//  PUT update user (Manager only)
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { full_name, username, email, phone, password, role, is_active } = req.body;

    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const exists = await db.query(
      'SELECT 1 FROM users WHERE (phone=$1 OR email=$2 OR username=$3) AND id != $4',
      [phone, email, username, userId]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Phone, email or username already exists' });
    }

    const roleResult = await db.query('SELECT id FROM roles WHERE role_name = $1', [role]);
    if (roleResult.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const role_id = roleResult.rows[0].id;

    let hashedPassword = userResult.rows[0].password;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await db.query(`
      UPDATE users SET
        full_name = $1,
        username = $2,
        email = $3,
        phone = $4,
        password = $5,
        role_id = $6,
        is_active = $7
      WHERE id = $8
    `, [full_name, username, email, phone, hashedPassword, role_id, is_active, userId]);

    await db.query(`
      INSERT INTO activity_logs (action, entity, entity_id, performed_by, description, created_at)
      VALUES ('UPDATE', 'user', $1, $2, $3, NOW())
    `, [userId, req.user.id, `User ${username} updated by Manager ${req.user.username}`]);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


router.use(authenticate);
router.use(authorizeRoles('Manager'));
// ✅ PATCH deactivate (soft delete) user (Manager only)
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const userId = req.params.id;
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);

    await db.query(`
      INSERT INTO activity_logs (action, entity, entity_id, performed_by, description, created_at)
      VALUES ('DEACTIVATE', 'user', $1, $2, $3, NOW())
    `, [userId, req.user.id, `User ${userResult.rows[0].username} deactivated by Manager ${req.user.username}`]);

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});





module.exports = router;
