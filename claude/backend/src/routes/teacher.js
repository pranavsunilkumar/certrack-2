const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const teacherOnly = [authMiddleware, requireRole('teacher')];

router.get('/profile', ...teacherOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.name, u.email, u.institute,
              tp.phone, tp.department, tp.designation, tp.employee_id
       FROM users u
       LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', ...teacherOnly, async (req, res) => {
  const { name, institute, phone, department, designation, employee_id } = req.body;
  try {
    await db.query(
      `UPDATE users SET name=$1, institute=$2, updated_at=NOW() WHERE id=$3`,
      [name, institute, req.user.id]
    );
    await db.query(
      `INSERT INTO teacher_profiles (user_id, phone, department, designation, employee_id, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         phone=$2, department=$3, designation=$4, employee_id=$5, updated_at=NOW()`,
      [req.user.id, phone || '', department || '', designation || '', employee_id || '']
    );
    res.json({ message: 'Profile saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests/pending', ...teacherOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM leave_requests WHERE status = 'pending' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests/approved', ...teacherOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT lr.*, u.name AS approver_name
       FROM leave_requests lr
       LEFT JOIN users u ON u.id = lr.approved_by
       WHERE lr.status = 'approved' ORDER BY lr.approved_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/requests/:id/approve', ...teacherOnly, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE leave_requests
       SET status='approved', approved_by=$1, approved_at=NOW()
       WHERE id=$2 AND status='pending'
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Request not found or already actioned' });
    }

    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, role, metadata)
       VALUES ('request_approved', $1, 'teacher', $2)`,
      [req.user.id, JSON.stringify({ request_id: req.params.id })]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/requests/:id/reject', ...teacherOnly, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE leave_requests
       SET status='rejected', approved_by=$1, approved_at=NOW()
       WHERE id=$2 AND status='pending'
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Request not found or already actioned' });
    }

    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, role, metadata)
       VALUES ('request_rejected', $1, 'teacher', $2)`,
      [req.user.id, JSON.stringify({ request_id: req.params.id })]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/students', ...teacherOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.institute,
              sp.roll_no, sp.degree, sp.branch, sp.college,
              COUNT(c.id)::int AS cert_count,
              COUNT(lr.id)::int AS request_count
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN certificates c ON c.user_id = u.id
       LEFT JOIN leave_requests lr ON lr.student_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id, u.name, u.email, u.institute, sp.roll_no, sp.degree, sp.branch, sp.college
       ORDER BY u.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

