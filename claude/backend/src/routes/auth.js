const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

router.post('/signup', async (req, res) => {
  const { name, email, password, role, institute } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (name, email, password, role, institute)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role`,
      [name, email, hash, role, institute || '']
    );

    const user = result.rows[0];
    if (role === 'student') {
      await db.query('INSERT INTO student_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    } else if (role === 'teacher') {
      await db.query('INSERT INTO teacher_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    }

    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, role) VALUES ('signup', $1, $2)`,
      [user.id, role]
    );

    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.role !== role) return res.status(401).json({ error: 'Role mismatch' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, role) VALUES ('login', $1, $2)`,
      [user.id, user.role]
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, institute: user.institute }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    await db.query('SELECT id FROM users WHERE email = $1', [email]);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

