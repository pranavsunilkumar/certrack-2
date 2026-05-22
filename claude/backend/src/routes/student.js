const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const studentOnly = [authMiddleware, requireRole('student')];

router.get('/profile', ...studentOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.name, u.email, u.institute,
              sp.roll_no, sp.degree, sp.branch, sp.college, sp.grad_year,
              sp.cgpa, sp.phone, sp.linkedin, sp.github, sp.skills,
              sp.bio, sp.dob, sp.gender, sp.address, sp.city, sp.state
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', ...studentOnly, async (req, res) => {
  const {
    name, institute,
    roll_no, degree, branch, college, grad_year, cgpa,
    phone, linkedin, github, skills, bio, dob, gender, address, city, state
  } = req.body;

  try {
    await db.query(
      `UPDATE users SET name = $1, institute = $2, updated_at = NOW() WHERE id = $3`,
      [name, institute, req.user.id]
    );

    await db.query(
      `INSERT INTO student_profiles (
          user_id, roll_no, degree, branch, college, grad_year, cgpa,
          phone, linkedin, github, skills, bio, dob, gender, address, city, state, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          roll_no=$2, degree=$3, branch=$4, college=$5, grad_year=$6, cgpa=$7,
          phone=$8, linkedin=$9, github=$10, skills=$11, bio=$12, dob=$13,
          gender=$14, address=$15, city=$16, state=$17, updated_at=NOW()`,
      [
        req.user.id,
        roll_no || '',
        degree || '',
        branch || '',
        college || '',
        grad_year || '',
        cgpa || '',
        phone || '',
        linkedin || '',
        github || '',
        skills || '',
        bio || '',
        dob || null,
        gender || '',
        address || '',
        city || '',
        state || ''
      ]
    );

    res.json({ message: 'Profile saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/certificates', ...studentOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM certificates WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/certificates', ...studentOnly, async (req, res) => {
  const { name, org, link, issued_date, expiry_date, credential_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Certificate name required' });

  try {
    const result = await db.query(
      `INSERT INTO certificates (user_id, name, org, link, issued_date, expiry_date, credential_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, name, org || '', link || '', issued_date || null, expiry_date || null, credential_id || '']
    );

    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, role, metadata)
       VALUES ('cert_added', $1, 'student', $2)`,
      [req.user.id, JSON.stringify({ cert_name: name })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/certificates/:id', ...studentOnly, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM certificates WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests', ...studentOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT lr.*, u.name AS approver_name
       FROM leave_requests lr
       LEFT JOIN users u ON u.id = lr.approved_by
       WHERE lr.student_id = $1 ORDER BY lr.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/requests', ...studentOnly, async (req, res) => {
  const { event_name, event_type, date_from, date_to, proof_file, notes } = req.body;
  if (!event_name || !date_from || !date_to) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const result = await db.query(
      `INSERT INTO leave_requests (
          student_id, student_name, student_email, event_name, event_type,
          date_from, date_to, proof_file, notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        req.user.id,
        req.user.name,
        req.user.email,
        event_name,
        event_type || 'competition',
        date_from,
        date_to,
        proof_file || '',
        notes || ''
      ]
    );

    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, role, metadata)
       VALUES ('request_created', $1, 'student', $2)`,
      [req.user.id, JSON.stringify({ event_name })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

