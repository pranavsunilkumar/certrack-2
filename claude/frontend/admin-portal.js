// ============================================================
// Admin Portal JS – API-connected + rich analytics
// ============================================================

const auth = requireRole('admin');
if (!auth) throw new Error('Not authenticated. Stopping execution to wait for redirect.');
document.getElementById('user-name').textContent = auth.name;

let institutes = JSON.parse(localStorage.getItem('chq-institutes') || '[]');
let allRequests = JSON.parse(localStorage.getItem('chq-all-requests') || '[]');
let currentFilter = 'all';
const chartInstances = {};

// ── TAB SWITCHING ─────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="' + tab + '"]').classList.add('active');
    if (tab === 'analytics') renderCharts();
  });
});

// ── DASHBOARD ─────────────────────────────────────────────────
async function updateStats() {
  try {
    const data = await apiCall('GET', '/admin/dashboard');
    if (data) {
      document.getElementById('stat-institutes').textContent      = data.institutes;
      document.getElementById('stat-students').textContent        = data.students;
      document.getElementById('stat-teachers').textContent        = data.teachers;
      document.getElementById('stat-requests').textContent        = data.requests_today;
      document.getElementById('stat-requests-total').textContent  = data.requests_total;
      document.getElementById('stat-requests-pending').textContent= data.requests_pending;
      return;
    }
  } catch (_) {}

  // Fallback
  document.getElementById('stat-institutes').textContent      = institutes.length;
  document.getElementById('stat-students').textContent        = '—';
  document.getElementById('stat-teachers').textContent        = '—';
  document.getElementById('stat-requests').textContent        = allRequests.filter(r => r.createdAt && r.createdAt.split('T')[0] === new Date().toISOString().split('T')[0]).length;
  document.getElementById('stat-requests-total').textContent  = allRequests.length;
  document.getElementById('stat-requests-pending').textContent = allRequests.filter(r => r.status === 'pending').length;
}

updateStats();

// ── ALL REQUESTS ──────────────────────────────────────────────
async function renderAllRequests() {
  const list  = document.getElementById('all-requests-list');
  const empty = document.getElementById('requests-empty');
  list.innerHTML = '';

  try {
    const data = await apiCall('GET', '/admin/requests?status=' + currentFilter);
    if (data) {
      if (!data.requests.length) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      data.requests.forEach(r => list.appendChild(buildRequestCard(r)));
      return;
    }
  } catch (_) {}

  // Fallback
  let filtered = allRequests;
  if (currentFilter !== 'all') filtered = allRequests.filter(r => r.status === currentFilter);
  if (!filtered.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  filtered.forEach(r => list.appendChild(buildRequestCard(r)));
}

function buildRequestCard(r) {
  const card = document.createElement('div');
  card.className = 'card';
  const status = r.status || 'pending';
  const bg = status === 'approved' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#ef4444';
  const mailSent = r.mail_sent || r.mailSent;
  card.innerHTML =
    '<strong>' + (r.event_name || r.eventName) + '</strong>' +
    '<small>' + (r.student_name || r.studentName) + ' — ' + (r.student_email || r.studentEmail) + '</small>' +
    '<small>' + (r.date_from || r.from) + ' → ' + (r.date_to || r.to) + '</small>' +
    '<small>Type: ' + (r.event_type || r.eventType || '—') + '</small>' +
    '<small>Status: <span class="badge" style="background:' + bg + '">' + status + '</span></small>' +
    (mailSent ? '<small style="color:#10b981">✉ Email sent</small>' : '') +
    (status === 'approved' && !mailSent
      ? '<button class="btn-primary btn-sm mail-btn" data-id="' + r.id + '">Send Email</button>'
      : '');
  return card;
}

// Filter chips
document.querySelectorAll('[data-status]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('[data-status]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.status;
    renderAllRequests();
  });
});

// Mail button via event delegation
document.getElementById('all-requests-list').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('mail-btn')) return;
  const id = e.target.dataset.id;
  try {
    const data = await apiCall('POST', '/admin/requests/' + id + '/mail');
    if (data) { alert('Email notification sent!'); renderAllRequests(); return; }
  } catch (_) {}
  // Fallback
  const req = allRequests.find(r => r.id == id);
  if (req) {
    req.mailSent = true;
    localStorage.setItem('chq-all-requests', JSON.stringify(allRequests));
    alert('Email would be sent (demo mode)');
    renderAllRequests();
  }
});

renderAllRequests();

// ── INSTITUTES ────────────────────────────────────────────────
async function renderInstitutes() {
  const list = document.getElementById('inst-list');
  list.innerHTML = '';

  try {
    const data = await apiCall('GET', '/admin/institutes');
    if (data) {
      data.forEach(inst => list.appendChild(buildInstCard(inst, true)));
      return;
    }
  } catch (_) {}

  institutes.forEach((inst, idx) => list.appendChild(buildInstCard(inst, false, idx)));
}

function buildInstCard(inst, isApi, idx) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML =
    '<strong>' + inst.name + '</strong>' +
    '<small>' + (inst.location || '—') + '</small>' +
    (inst.email ? '<small>' + inst.email + '</small>' : '') +
    '<small>Students: ' + (inst.students ?? '—') + ' | Teachers: ' + (inst.teachers ?? '—') + '</small>' +
    '<button class="btn-secondary btn-sm del-inst-btn" data-id="' + (inst.id || idx) + '" data-api="' + isApi + '">Delete</button>';
  return card;
}

document.getElementById('inst-list').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('del-inst-btn')) return;
  if (!confirm('Delete this institute?')) return;
  const id = e.target.dataset.id;
  const isApi = e.target.dataset.api === 'true';
  if (isApi) {
    try { await apiCall('DELETE', '/admin/institutes/' + id); } catch (_) {}
  } else {
    institutes.splice(parseInt(id), 1);
    localStorage.setItem('chq-institutes', JSON.stringify(institutes));
  }
  renderInstitutes();
  updateStats();
});

document.getElementById('add-inst-btn').addEventListener('click', () => {
  document.getElementById('inst-form').style.display = 'block';
});
document.getElementById('cancel-inst-btn').addEventListener('click', () => {
  document.getElementById('inst-form').style.display = 'none';
});
document.getElementById('submit-inst-btn').addEventListener('click', async () => {
  const name  = document.getElementById('inst-name-input').value;
  const location = document.getElementById('inst-location-input').value;
  const email = document.getElementById('inst-email-input').value;
  const phone = document.getElementById('inst-phone-input').value;
  if (!name) { alert('Institute name required'); return; }

  try {
    const data = await apiCall('POST', '/admin/institutes', { name, location, email, phone });
    if (data) {
      document.getElementById('inst-form').style.display = 'none';
      renderInstitutes(); updateStats(); return;
    }
  } catch (_) {}

  institutes.push({ name, location });
  localStorage.setItem('chq-institutes', JSON.stringify(institutes));
  document.getElementById('inst-form').style.display = 'none';
  renderInstitutes(); updateStats();
});

renderInstitutes();

// ── ANALYTICS ────────────────────────────────────────────────
function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function makeChart(id, config) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (ctx) chartInstances[id] = new Chart(ctx, config);
}

// Generate last-14-days labels
function last14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function mapToLabels(labels, rows, keyField, valField) {
  return labels.map(l => {
    const row = rows.find(r => r[keyField] === l);
    return row ? row[valField] : 0;
  });
}

async function renderCharts() {
  try {
    const data = await apiCall('GET', '/admin/analytics');
    if (data) {
      renderChartsFromApi(data);
      return;
    }
  } catch (_) {}
  renderMockCharts();
}

function renderChartsFromApi(data) {
  const labels14 = last14Days();

  // KPIs
  const kpiEl = document.getElementById('analytics-kpis');
  kpiEl.innerHTML = '';
  const kpis = [
    { label: 'Active Users (7d)', value: data.active_users_7d },
    { label: 'Approval Rate', value: data.approval_rate.total > 0 ? Math.round(data.approval_rate.approved / data.approval_rate.total * 100) + '%' : '—' },
    { label: 'Approved', value: data.approval_rate.approved },
    { label: 'Rejected', value: data.approval_rate.rejected },
    { label: 'Pending', value: data.approval_rate.pending },
  ];
  kpis.forEach(k => {
    kpiEl.innerHTML += '<div class="stat-card"><div class="stat-number">' + k.value + '</div><div class="stat-label">' + k.label + '</div></div>';
  });

  // Signups chart
  const signupRows = data.signups_per_day;
  const studentSeries = mapToLabels(labels14, signupRows.filter(r => r.role === 'student'), 'day', 'count');
  const teacherSeries = mapToLabels(labels14, signupRows.filter(r => r.role === 'teacher'), 'day', 'count');
  makeChart('signupsChart', {
    type: 'line',
    data: {
      labels: labels14.map(d => d.slice(5)),
      datasets: [
        { label: 'Students', data: studentSeries, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.4 },
        { label: 'Teachers', data: teacherSeries, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4 },
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Logins chart
  const loginData = mapToLabels(labels14, data.logins_per_day, 'day', 'count');
  makeChart('loginsChart', {
    type: 'bar',
    data: { labels: labels14.map(d => d.slice(5)), datasets: [{ label: 'Logins', data: loginData, backgroundColor: '#7c3aed' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // Requests per day (approved vs rejected)
  const approvedSeries = mapToLabels(labels14, data.requests_per_day.filter(r => r.status === 'approved'), 'day', 'count');
  const rejectedSeries = mapToLabels(labels14, data.requests_per_day.filter(r => r.status === 'rejected'), 'day', 'count');
  const pendingSeries  = mapToLabels(labels14, data.requests_per_day.filter(r => r.status === 'pending'),  'day', 'count');
  makeChart('requestsChart', {
    type: 'bar',
    data: {
      labels: labels14.map(d => d.slice(5)),
      datasets: [
        { label: 'Approved', data: approvedSeries, backgroundColor: '#10b981' },
        { label: 'Rejected', data: rejectedSeries, backgroundColor: '#ef4444' },
        { label: 'Pending',  data: pendingSeries,  backgroundColor: '#f59e0b' },
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
  });

  // Approval breakdown doughnut
  const ar = data.approval_rate;
  makeChart('approvalChart', {
    type: 'doughnut',
    data: {
      labels: ['Approved', 'Rejected', 'Pending'],
      datasets: [{ data: [ar.approved, ar.rejected, ar.pending], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Certs chart
  const certData = mapToLabels(labels14, data.certs_per_day, 'day', 'count');
  makeChart('certsChart', {
    type: 'line',
    data: { labels: labels14.map(d => d.slice(5)), datasets: [{ label: 'Certs Added', data: certData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4 }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // Monthly growth
  makeChart('growthChart', {
    type: 'line',
    data: {
      labels: data.monthly_growth.map(r => r.month),
      datasets: [{ label: 'New Users', data: data.monthly_growth.map(r => r.count), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // Top institutes bar
  makeChart('institutesChart', {
    type: 'bar',
    data: {
      labels: data.top_institutes.map(i => i.institute),
      datasets: [{ label: 'Students', data: data.top_institutes.map(i => i.students), backgroundColor: '#2563eb' }]
    },
    options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
}

function renderMockCharts() {
  // KPIs placeholder
  document.getElementById('analytics-kpis').innerHTML =
    '<div class="stat-card"><div class="stat-number">—</div><div class="stat-label">Connect backend for live analytics</div></div>';

  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  makeChart('signupsChart', {
    type: 'line',
    data: { labels, datasets: [{ label: 'Students (mock)', data: [3,5,2,8,4,6,9], borderColor: '#2563eb', tension: 0.4 }] },
    options: { responsive: true }
  });
  makeChart('loginsChart', {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Logins (mock)', data: [12,19,3,5,2,3,15], backgroundColor: '#7c3aed' }] },
    options: { responsive: true }
  });
  makeChart('requestsChart', {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Approved', data: [5,8,4,7,9,6,8], backgroundColor: '#10b981' },
      { label: 'Rejected', data: [1,2,1,0,2,1,1], backgroundColor: '#ef4444' },
    ]},
    options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
  });
  makeChart('approvalChart', {
    type: 'doughnut',
    data: { labels: ['Approved','Rejected','Pending'], datasets: [{ data: [48,12,8], backgroundColor: ['#10b981','#ef4444','#f59e0b'] }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
  makeChart('certsChart', {
    type: 'line',
    data: { labels, datasets: [{ label: 'Certs (mock)', data: [2,4,1,6,3,5,7], borderColor: '#f59e0b', tension: 0.4 }] },
    options: { responsive: true }
  });
  makeChart('growthChart', {
    type: 'line',
    data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ label: 'Users (mock)', data: [10,22,35,50,68,90], borderColor: '#2563eb', tension: 0.4 }] },
    options: { responsive: true }
  });
  makeChart('institutesChart', {
    type: 'bar',
    data: { labels: ['DSATM','DSI','RVCE','PES','BMS'], datasets: [{ label: 'Students', data: [120,90,70,55,40], backgroundColor: '#2563eb' }] },
    options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
}
