// ============================================================
// Certificates HQ – app.js
// Handles auth, API calls with JWT, and localStorage fallback
// ============================================================

const API_BASE = 'http://localhost:3001/api';

// ── API HELPER ───────────────────────────────────────────────
async function apiCall(method, path, body = null) {
  const token = localStorage.getItem('chq-token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      console.warn('[CHQ] Backend not reachable – using localStorage mode');
      return null;
    }
    throw err;
  }
}

// ── AUTH ─────────────────────────────────────────────────────

const loginForm = document.querySelector('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = loginForm.elements.email.value.trim();
    const password = loginForm.elements.password.value.trim();
    const role     = document.getElementById('role-select').value;

    if (!email || !password) { alert('Please enter both email and password.'); return; }

    try {
      const data = await apiCall('POST', '/auth/login', { email, password, role });
      if (data) {
        localStorage.setItem('chq-token', data.token);
        localStorage.setItem('chq-auth', JSON.stringify(data.user));
        alert('Welcome, ' + data.user.name + '!');
        redirectByRole(role);
        return;
      }
    } catch (err) {
      alert(err.message || 'Invalid credentials or role mismatch.');
      return;
    }

    // LocalStorage fallback (demo mode)
    const users = getDemoUsers();
    if (users[email] && users[email].password === password && users[email].role === role) {
      localStorage.setItem('chq-auth', JSON.stringify({ email, role, name: users[email].name }));
      alert('Welcome, ' + users[email].name + '! (Demo mode)');
      redirectByRole(role);
    } else {
      alert('OOPS – Invalid credentials or role mismatch.');
    }
  });
}

const signupForm = document.querySelector('#signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = signupForm.elements.name.value.trim();
    const email    = signupForm.elements.email.value.trim();
    const password = signupForm.elements.password.value.trim();
    const role     = document.getElementById('signup-role').value;

    if (!name || !email || !password) { alert('Please fill all fields.'); return; }

    try {
      const data = await apiCall('POST', '/auth/signup', { name, email, password, role });
      if (data) {
        alert('Account created! Redirecting to login...');
        window.location.href = 'login.html';
        return;
      }
    } catch (err) {
      alert(err.message || 'Signup failed.');
      return;
    }

    alert('Account created! (Demo mode) Redirecting to login...');
    window.location.href = 'login.html';
  });
}

const forgotForm = document.querySelector('#forgot-form');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotForm.elements.email.value.trim();
    if (!email) { alert('Please enter your email.'); return; }
    try { await apiCall('POST', '/auth/forgot-password', { email }); } catch (_) {}
    alert('Password reset link sent (if that email is registered).');
    window.location.href = 'login.html';
  });
}

// ── UTILITY ──────────────────────────────────────────────────

function redirectByRole(role) {
  if (role === 'student') window.location.href = 'student-portal.html';
  else if (role === 'teacher') window.location.href = 'teacher-portal.html';
  else if (role === 'admin') window.location.href = 'admin-portal.html';
}

function checkAuth() {
  const auth = localStorage.getItem('chq-auth');
  if (!auth) { window.location.href = 'login.html'; return null; }
  return JSON.parse(auth);
}

function logout() {
  localStorage.removeItem('chq-auth');
  localStorage.removeItem('chq-token');
  window.location.href = 'login.html';
}

function requireRole(expectedRole) {
  const auth = checkAuth();
  if (!auth) return null;
  if (auth.role !== expectedRole) {
    alert('Access denied.');
    window.location.href = 'login.html';
    return null;
  }
  return auth;
}

function getDemoUsers() {
  return {
    // Students (CS dept of DSATM)
    // Class mapping (demo only):
    // - CSD-3: student1, student3
    // - CSD-2: student2
    'student1@example.com': { password: 'pass123', role: 'student', name: 'Pranav', institute: 'DSATM', department: 'CSD', class: 'CSD-3' },
    'student2@example.com': { password: 'pass123', role: 'student', name: 'Aarav', institute: 'DSATM', department: 'CSD', class: 'CSD-2' },
    'student3@example.com': { password: 'pass123', role: 'student', name: 'Ishita', institute: 'DSATM', department: 'CSD', class: 'CSD-3' },

    // Admin (kept as-is)
    'admin1@example.com':   { password: 'pass123', role: 'admin',   name: 'Admin ji', institute: 'System' },

    // Teachers (CS dept of DSATM)
    // Class mapping (demo only):
    // - CSD-2: teacher1
    // - CSD-3: teacher2, teacher3
    'teacher1@example.com': { password: 'pass123', role: 'teacher', name: 'Teacher 1 (CSD-2)', institute: 'DSATM', department: 'CSD', class: 'CSD-2' },
    'teacher2@example.com': { password: 'pass123', role: 'teacher', name: 'Teacher 2 (CSD-3)', institute: 'DSATM', department: 'CSD', class: 'CSD-3' },
    'teacher3@example.com': { password: 'pass123', role: 'teacher', name: 'Teacher 3 (CSD-3)', institute: 'DSATM', department: 'CSD', class: 'CSD-3' },

    // HOD (Head of CSD) of DSATM
    // - department: CSD
    // - class scope: all CSD classes (CSD-2 and CSD-3)
    'hod1@example.com':     { password: 'pass123', role: 'teacher', name: 'HOD – CSD (DSATM)', institute: 'DSATM', department: 'CSD', hod: true },

    // Principal (Head of college) of DSATM
    // - institute scope: all (demo)
    'principal1@example.com': { password: 'pass123', role: 'admin', name: 'Principal – DSATM', institute: 'DSATM', principal: true },
  };
}

window.apiCall = apiCall;
