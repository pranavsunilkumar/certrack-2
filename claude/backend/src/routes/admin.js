const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const adminOnly = [authMiddleware, requireRole('admin')];

router.get('/dashboard', ...adminOnly, async (req, res) => {
  try {
    const [institutes, students, teachers, todayReqs, totalReqs, pendingReqs] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM institutes`),
      db.query(`SELECT COUNT(*)::int AS count FROM users WHERE role='student'`),
      db.query(`SELECT COUNT(*)::int AS count FROM users WHERE role='teacher'`),
      db.query(`SELECT COUNT(*)::int AS count FROM leave_requests WHERE created_at::date = CURRENT_DATE`),
      db.query(`SELECT COUNT(*)::int AS count FROM leave_requests`),
      db.query(`SELECT COUNT(*)::int AS count FROM leave_requests WHERE status='pending'`),
    ]);

    res.json({
      institutes: institutes.rows[0].count,
      students: students.rows[0].count,
      teachers: teachers.rows[0].count,
      requests_today: todayReqs.rows[0].count,
      requests_total: totalReqs.rows[0].count,
      requests_pending: pendingReqs.rows[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/analytics', ...adminOnly, async (req, res) => {
  try {
    const signupsPerDay = await db.query(`
      SELECT DATE(created_at) AS day, role, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY day, role ORDER BY day
    `);

    const loginsPerDay = await db.query(`
      SELECT DATE(created_at) AS day, COUNT(*)::int AS count
      FROM analytics_events
      WHERE event_type = 'login' AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY day ORDER BY day
    `);

    const requestsPerDay = await db.query(`
      SELECT DATE(created_at) AS day, status, COUNT(*)::int AS count
      FROM leave_requests
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY day, status ORDER BY day
    `);

    const requestsByType = await db.query(`
      SELECT event_type, COUNT(*)::int AS count
      FROM leave_requests
      GROUP BY event_type ORDER BY count DESC
    `);

    const certsPerDay = await db.query(`
      SELECT DATE(created_at) AS day, COUNT(*)::int AS count
      FROM certificates
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY day ORDER BY day
    `);

    const topInstitutes = await db.query(`
      SELECT institute, COUNT(*)::int AS students
      FROM users WHERE role='student' AND institute != ''
      GROUP BY institute ORDER BY students DESC LIMIT 10
    `);

    const approvalRate = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='approved')::int AS approved,
        COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status='pending')::int  AS pending,
        COUNT(*)::int AS total
      FROM leave_requests
    `);

    const activeUsers = await db.query(`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM analytics_events
      WHERE event_type='login' AND created_at >= NOW() - INTERVAL '7 days'
    `);

    const monthlyGrowth = await db.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
             COUNT(*)::int AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    res.json({
      signups_per_day: signupsPerDay.rows,
      logins_per_day: loginsPerDay.rows,
      requests_per_day: requestsPerDay.rows,
      requests_by_type: requestsByType.rows,
      certs_per_day: certsPerDay.rows,
      top_institutes: topInstitutes.rows,
      approval_rate: approvalRate.rows[0],
      active_users_7d: activeUsers.rows[0].count,
      monthly_growth: monthlyGrowth.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests', ...adminOnly, async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT lr.*, u.name AS approver_name
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.approved_by
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` WHERE lr.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY lr.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await db.query(query, params);
    const countResult = await db.query(
      `SELECT COUNT(*)::int FROM leave_requests` + (status && status !== 'all' ? ` WHERE status=$1` : ''),
      params
    );

    res.json({ requests: result.rows, total: countResult.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/requests/:id/mail', ...adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE leave_requests SET mail_sent=true, mail_sent_at=NOW()
       WHERE id=$1 AND status='approved' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(400).json({ error: 'Request not found or not approved' });
    }
    res.json({ message: 'Email notification sent', request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/institutes', ...adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*,
             COUNT(DISTINCT u.id) FILTER (WHERE u.role='student')::int AS students,
             COUNT(DISTINCT u.id) FILTER (WHERE u.role='teacher')::int AS teachers
      FROM institutes i
      LEFT JOIN users u ON u.institute = i.name
      GROUP BY i.id ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/institutes', ...adminOnly, async (req, res) => {
  const { name, location, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Institute name required' });
  try {
    const result = await db.query(
      `INSERT INTO institutes (name, location, email, phone) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, location || '', email || '', phone || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/institutes/:id', ...adminOnly, async (req, res) => {
  try {
    await db.query(`DELETE FROM institutes WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', ...adminOnly, async (req, res) => {
  const { role } = req.query;
  try {
    let query = `SELECT id, name, email, role, institute, created_at FROM users`;
    const params = [];
    if (role) {
      query += ` WHERE role=$1`;
      params.push(role);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

