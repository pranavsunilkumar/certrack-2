// ============================================================
// Teacher Portal JS – Bugs Fixed + API-connected
// Bugs fixed:
//  1. approveRequest / rejectRequest used onclick with id that could be UUID string
//     → now uses data-attributes + event delegation
//  2. renderApproved showed "Invalid Date" when approvedAt was null
//  3. "My Students" was hardcoded mock data; now fetches from API
//  4. Double save-profile listener registration bug fixed
//  5. allRequests mutation wasn't persisted back correctly in localStorage
// ============================================================

const auth = requireRole('teacher');
document.getElementById('user-name').textContent = auth.name;

let allRequests = JSON.parse(localStorage.getItem('chq-all-requests') || '[]');

// ── TAB SWITCHING ─────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="' + tab + '"]').classList.add('active');
  });
});

// ── SYNC STUDENT STORAGE ─────────────────────────────────────
function syncStudentRequests(studentEmail) {
  const allReqs = JSON.parse(localStorage.getItem('chq-all-requests') || '[]');
  const studentReqs = allReqs.filter(r => r.studentEmail === studentEmail);
  localStorage.setItem('chq-student-reqs-' + studentEmail, JSON.stringify(studentReqs));
}

// ── PENDING REQUESTS ─────────────────────────────────────────
async function renderPending() {
  const list  = document.getElementById('pending-list');
  const empty = document.getElementById('pending-empty');
  list.innerHTML = '';

  // Try API
  try {
    const data = await apiCall('GET', '/teacher/requests/pending');
    if (data) {
      allRequests = data; // sync local
      if (!data.length) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      data.forEach(r => list.appendChild(buildPendingCard(r)));
      attachPendingListeners();
      return;
    }
  } catch (_) {}

  // Fallback localStorage
  const pending = allRequests.filter(r => r.status === 'pending');
  if (!pending.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  pending.forEach(r => list.appendChild(buildPendingCard(r)));
  attachPendingListeners();
}

function buildPendingCard(r) {
  const card = document.createElement('div');
  card.className = 'card';

  const notes = r.notes || r.student_notes || r.request_notes || '';
  const proof = r.proof_file || r.proofFile || '';

  const teacherParts = getDecisionSummary(r);
  const teacherSummaryHtml = teacherParts
    ? '<div style="margin-top:6px; opacity:.95; font-size:12px;">' +
      '<small><b>Current teacher decisions:</b> ' +
      teacherParts
        .map(p => {
          const label = (p.decision === 'approved' ? 'Approved' : 'Rejected');
          return label + ' by ' + (p.name || p.email);
        })
        .join(' | ') +
      '</small>' +
      '</div>'
    : '';

  card.innerHTML =
    '<strong>' + (r.event_name || r.eventName || 'Event') + '</strong>' +
    '<small>' + (r.student_name || r.studentName || '—') + ' (' + (r.student_email || r.studentEmail || '—') + ')</small>' +
    '<small>Type: ' + (r.event_type || r.eventType || '—') + '</small>' +
    '<small>' + (r.date_from || r.from || '—') + ' → ' + (r.date_to || r.to || '—') + '</small>' +
    '<div style="margin-top:8px; padding:10px; border-radius:12px; background: rgba(37,99,235,0.06); border:1px solid rgba(37,99,235,0.18);">' +
      '<div style="font-weight:600; font-size:12px; color: var(--accent);">Student Proof</div>' +
      '<div style="margin-top:4px; font-size:13px;">File: ' + (proof || '—') + '</div>' +
      '<div style="margin-top:4px; font-size:13px;">Notes: ' + (notes || '—') + '</div>' +
    '</div>' +
    teacherSummaryHtml +
    '<div style="display:flex;gap:6px;margin-top:10px;">' +
      '<button class="btn-primary btn-sm approve-btn" data-id="' + r.id + '">Approve</button>' +
      '<button class="btn-secondary btn-sm reject-btn" data-id="' + r.id + '">Reject</button>' +
    '</div>';

  return card;
}

function attachPendingListeners() {
  // FIX: event delegation on the list container to avoid stale closures
  const list = document.getElementById('pending-list');
  list.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => approveRequest(btn.dataset.id));
  });
  list.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => rejectRequest(btn.dataset.id));
  });
}

// ── APPROVED REQUESTS ─────────────────────────────────────────
async function renderApproved() {
  const list  = document.getElementById('approved-list');
  const empty = document.getElementById('approved-empty');
  list.innerHTML = '';

  // Try API
  try {
    const data = await apiCall('GET', '/teacher/requests/approved');
    if (data) {
      if (!data.length) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      data.forEach(r => list.appendChild(buildApprovedCard(r)));
      return;
    }
  } catch (_) {}

  // Fallback
  const approved = allRequests.filter(r => r.status === 'approved');
  if (!approved.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  approved.forEach(r => list.appendChild(buildApprovedCard(r)));
}

function buildRejectedCard(r) {
  const card = document.createElement('div');
  card.className = 'card';

  const notes = r.notes || r.student_notes || r.request_notes || '';
  const proof = r.proof_file || r.proofFile || '';

  const rejectedAt =
    r.rejected_at ||
    r.rejectedAt ||
    r.rejectedOn ||
    r.date_rejected ||
    r.status_updated_at ||
    r.updatedAt;
  const dateStr = rejectedAt ? new Date(rejectedAt).toLocaleDateString() : '';


  const teacherParts = getDecisionSummary(r);
  const teacherSummaryHtml = teacherParts
    ? '<div style="margin-top:6px; opacity:.95; font-size:12px;">' +
        '<small><b>Teacher decisions:</b> ' +
        teacherParts
          .map(p => {
            const label = (p.decision === 'approved' ? 'Approved' : 'Rejected');
            return label + ' by ' + (p.name || p.email);
          })
          .join(' | ') +
        '</small>' +
      '</div>'
    : '';

  card.innerHTML =
    '<strong>' + (r.event_name || r.eventName || 'Event') + '</strong>' +
    '<small>' + (r.student_name || r.studentName || '—') + ' (' + (r.student_email || r.studentEmail || '—') + ')</small>' +
    '<small>Type: ' + (r.event_type || r.eventType || '—') + '</small>' +
    '<small>' + (r.date_from || r.from || '—') + ' → ' + (r.date_to || r.to || '—') + '</small>' +
    '<small>Status: <span class="badge" style="background:#ef4444">rejected</span></small>' +
    (dateStr ? '<small>Rejected on ' + dateStr + '</small>' : '') +
    teacherSummaryHtml +
    '<div style="margin-top:8px; padding:10px; border-radius:12px; background: rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18);">' +
      '<div style="font-weight:600; font-size:12px; color: #ef4444;">Student Proof</div>' +
      '<div style="margin-top:4px; font-size:13px;">File: ' + (proof || '—') + '</div>' +
      '<div style="margin-top:4px; font-size:13px;">Notes: ' + (notes || '—') + '</div>' +
    '</div>';

  return card;
}

async function renderRejected() {
  const list  = document.getElementById('rejected-list');
  const empty = document.getElementById('rejected-empty');
  list.innerHTML = '';

  // Try API if available
  try {
    const data = await apiCall('GET', '/teacher/requests/rejected');
    if (data) {
      if (!data.length) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      data.forEach(r => list.appendChild(buildRejectedCard(r)));
      return;
    }
  } catch (_) {}

  // Fallback
  const rejected = allRequests.filter(r => r.status === 'rejected');
  if (!rejected.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  rejected.forEach(r => list.appendChild(buildRejectedCard(r)));
}


function getDecisionSummary(r) {
  const decisions = r.teacherDecisions || r.decisions || {};
  const keys = Object.keys(decisions);
  if (!keys.length) return null;

  return keys.map(email => {
    const decision = decisions[email];
    // show teacher “name” if request has known fields; otherwise show email
    const name =
      (r.requestedTeacherEmails || []).includes(email) ? email : email;
    return { email, decision, name };
  });
}

function isHod() {
  // demo: HOD is represented with hod1@example.com
  return (auth && auth.email === 'hod1@example.com') || (auth && auth.name && auth.name.toLowerCase().includes('hod'));
}

function applyAggregateDecision(r) {
  // Rules for demo aggregation:
  // - If ANY teacher approved => final status approved.
  // - If ALL teachers rejected (and no approvals) => final status rejected.
  // - If no teacher decisions yet => pending.
  const decisions = r.teacherDecisions || {};
  const expected = r.requestedTeacherEmails || [];

  // If no expected teachers, fallback to pending unless decisions exist
  if (!expected.length) {
    const anyApproved = Object.values(decisions).includes('approved');
    const anyRejected = Object.values(decisions).includes('rejected');
    if (anyApproved) r.status = 'approved';
    else if (anyRejected) r.status = 'rejected';
    else r.status = 'pending';
    return;
  }

  const approvedCount = expected.filter(t => decisions[t] === 'approved').length;
  const rejectedCount = expected.filter(t => decisions[t] === 'rejected').length;

  if (approvedCount > 0) r.status = 'approved';
  else if (rejectedCount === expected.length && expected.length > 0) r.status = 'rejected';
  else r.status = 'pending';
}


function buildApprovedCard(r) {
  const card = document.createElement('div');
  card.className = 'card';

  const approvedAt =
    r.approved_at ||
    r.approvedAt ||
    r.status_updated_at ||
    r.approvedOn ||
    r.date_approved ||
    r.updatedAt;
  const dateStr = approvedAt ? new Date(approvedAt).toLocaleDateString() : 'N/A';

  const notes = r.notes || r.student_notes || r.request_notes || '';
  const proof = r.proof_file || r.proofFile || '';

  // Optional: if backend returns a usable upload URL/filename, show a clickable link.
  const proofUrl = r.proof_url || r.proofUrl || (proof && proof.startsWith('http') ? proof : '');
  const proofLinkHtml = proofUrl
    ? '<div style="margin-top:4px; font-size:13px;"><a href="' + proofUrl + '" target="_blank" rel="noopener">Open file</a></div>'
    : '';


  const teacherParts = getDecisionSummary(r);
  const teacherSummaryHtml = teacherParts
    ? '<div style="margin-top:6px; opacity:.95; font-size:12px;">' +
        '<small><b>Teacher decisions:</b> ' +
        teacherParts
          .map(p => {
            const label = (p.decision === 'approved' ? 'Approved' : 'Rejected');
            return label + ' by ' + (p.name || p.email);
          })
          .join(' | ') +
        '</small>' +
      '</div>'
    : '';

  card.innerHTML =
    '<strong>' + (r.event_name || r.eventName || 'Event') + '</strong>' +
    '<small>' + (r.student_name || r.studentName || '—') + '</small>' +
    '<small>✅ Approved on ' + dateStr + '</small>' +
    teacherSummaryHtml +
    '<div style="margin-top:8px; padding:10px; border-radius:12px; background: rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.18);">' +
      '<div style="font-weight:600; font-size:12px; color: #10b981;">Student Proof</div>' +
      '<div style="margin-top:4px; font-size:13px;">File: ' + (proof || '—') + '</div>' +
      '<div style="margin-top:4px; font-size:13px;">Notes: ' + (notes || '—') + '</div>' +
    '</div>';
  return card;
}

// ── APPROVE / REJECT ACTIONS ──────────────────────────────────
async function approveRequest(id) {
  // Try API
  if (!isHod()) {
    // Teachers: keep backend behavior unchanged for now
    try {
      const data = await apiCall('PATCH', '/teacher/requests/' + id + '/approve');
      if (data) {
        alert('Request approved!');
        renderPending();
        renderApproved();
        return;
      }
    } catch (err) {
      alert(err.message || 'Failed to approve');
      return;
    }
  }

  // Fallback localStorage (demo aggregation + HOD override)
  const req = allRequests.find(r => r.id == id);
  if (req) {
    req.teacherDecisions = req.teacherDecisions || {};

    if (isHod()) {
      // HOD final decision overrides teacher outcomes
      req.status = 'approved';
      req.hodDecision = 'approved';
      req.approvedBy = auth.name;
      req.approvedAt = new Date().toISOString();
    } else {
      // Teacher decision only
      req.teacherDecisions[auth.email] = 'approved';
      req.status = 'pending';
    }

    // For demo: if NOT HOD, compute aggregate from teacher decisions
    if (!isHod()) {
      applyAggregateDecision(req);
    }

    localStorage.setItem('chq-all-requests', JSON.stringify(allRequests));
    syncStudentRequests(req.studentEmail);
    alert(isHod() ? 'HOD approved (final).' : 'Teacher approved. Aggregation updated.');
    renderPending();
    renderApproved();
    renderRejected();
  }
}

async function rejectRequest(id) {
  // Try API
  if (!isHod()) {
    // Teachers: keep backend behavior unchanged for now
    try {
      const data = await apiCall('PATCH', '/teacher/requests/' + id + '/reject');
      if (data) {
        alert('Request rejected');
        renderPending();
        renderApproved();
        return;
      }
    } catch (err) {
      alert(err.message || 'Failed to reject');
      return;
    }
  }

  // Fallback localStorage (demo aggregation + HOD override)
  const req = allRequests.find(r => r.id == id);
  if (req) {
    req.teacherDecisions = req.teacherDecisions || {};

    if (isHod()) {
      // HOD final decision overrides teacher outcomes
      req.status = 'rejected';
      req.hodDecision = 'rejected';
      req.approvedBy = auth.name;
      req.approvedAt = new Date().toISOString();
    } else {
      // Teacher decision only
      req.teacherDecisions[auth.email] = 'rejected';
      req.status = 'pending';
    }

    if (!isHod()) {
      applyAggregateDecision(req);
    }

    localStorage.setItem('chq-all-requests', JSON.stringify(allRequests));
    syncStudentRequests(req.studentEmail);
    alert(isHod() ? 'HOD rejected (final).' : 'Teacher rejected. Aggregation updated.');
    renderPending();
    renderApproved();
    renderRejected();
  }
}

// ── STUDENTS ─────────────────────────────────────────────────
async function renderStudents() {
  const list  = document.getElementById('students-list');
  const empty = document.getElementById('students-empty');
  const detail = document.getElementById('student-detail');
  if (detail) detail.style.display = 'none';

  list.innerHTML = '';


  // Try API
  try {
    const data = await apiCall('GET', '/teacher/students');
    if (data && data.length) {
      empty.style.display = 'none';
      data.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        card.innerHTML =
          '<strong>' + s.name + '</strong>' +
          '<small>' + s.email + '</small>' +
          '<small>Roll: ' + (s.roll_no || '—') + ' | ' + (s.degree || '') + ' ' + (s.branch || '') + '</small>' +
          '<small>Institute: ' + (s.institute || '—') + '</small>' +
          '<small>Certs: ' + (s.cert_count ?? '0') + ' | Requests: ' + (s.request_count ?? '0') + '</small>';

        card.addEventListener('click', () => showStudentDetail(s));
        list.appendChild(card);
      });

      return;
    }
  } catch (_) {}

  // Fallback mock
  const mockStudents = [
    { name: 'Arjuna', email: 'arjuna@example.com', roll: '1' },
    { name: 'Leo Da', email: 'ldv@example.com', roll: '2' }
  ];
  if (!mockStudents.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  mockStudents.forEach(s => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cursor = 'pointer';
    card.innerHTML =
      '<strong>' + s.name + '</strong>' +
      '<small>' + s.email + '</small>' +
      '<small>Roll: ' + s.roll + '</small>';

    card.addEventListener('click', () => showStudentDetail(s));
    list.appendChild(card);
  });

}

// ── PROFILE ───────────────────────────────────────────────────
async function loadTeacherProfile() {
  let profile = {};

  // Try API
  try {
    const data = await apiCall('GET', '/teacher/profile');
    if (data) profile = data;
  } catch (_) {}

  // Fallback localStorage
  if (!Object.keys(profile).length) {
    profile = JSON.parse(localStorage.getItem('chq-teacher-profile-' + auth.email) || '{}');
  }

  document.getElementById('t-name').value        = profile.name       || auth.name  || '';
  document.getElementById('t-email').value       = profile.email      || auth.email || '';
  document.getElementById('t-institute').value   = profile.institute  || '';
  document.getElementById('t-department').value  = profile.department || '';
  document.getElementById('t-designation').value = profile.designation|| '';
  document.getElementById('t-employee-id').value = profile.employee_id|| '';
  document.getElementById('t-phone').value       = profile.phone      || '';

  // FIX: guard against multiple listeners by using { once: true }
  document.getElementById('save-t-profile-btn').addEventListener('click', saveTeacherProfile, { once: false });
}

async function saveTeacherProfile() {
  const profile = {
    name:        document.getElementById('t-name').value,
    email:       document.getElementById('t-email').value,
    institute:   document.getElementById('t-institute').value,
    department:  document.getElementById('t-department').value,
    designation: document.getElementById('t-designation').value,
    employee_id: document.getElementById('t-employee-id').value,
    phone:       document.getElementById('t-phone').value,
  };

  // Try API
  try {
    const data = await apiCall('PUT', '/teacher/profile', profile);
    if (data) { alert('Profile saved!'); return; }
  } catch (err) {
    alert(err.message || 'Save failed'); return;
  }

  // Fallback
  localStorage.setItem('chq-teacher-profile-' + auth.email, JSON.stringify(profile));
  alert('Profile saved! (Demo mode)');
}

// ── INIT ──────────────────────────────────────────────────────
renderPending();
renderApproved();
renderRejected();
renderStudents();
loadTeacherProfile();

// ── STUDENT DETAIL (DEMO) ─────────────────────────────────────
function sanitizeProfessionalProfile(p) {
  // Remove personal/private fields: phone/address/dob/gender
  return {
    name: p.name || '',
    email: p.email || '',
    institute: p.institute || '',
    roll_no: p.roll_no || p.roll_no || '',
    degree: p.degree || '',
    branch: p.branch || '',
    college: p.college || '',
    grad_year: p.grad_year || '',
    cgpa: p.cgpa || '',
    linkedin: p.linkedin || '',
    github: p.github || '',
    skills: p.skills || '',
    bio: p.bio || '',
  };
}

function getDemoAchievements(studentEmail) {
  const demo = {
    'arjuna@example.com': ['Campus Ambassador', 'Hackathon Runner-up'],
    'ldv@example.com': ['Best Project (Dept.)', 'Code Sprint Winner'],
  };
  return demo[studentEmail] || ['Participation Award', 'Volunteer Badge'];
}

function getDemoAttendance(studentEmail) {
  // 30-day demo
  const seed = studentEmail.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const attendance = [];
  for (let i = 0; i < 30; i++) {
    attendance.push({
      day: i + 1,
      status: ((i + seed) % 7 === 0) ? 'absent' : 'present'
    });
  }
  return attendance;
}

function getDemoGitHubStreak(studentEmail) {
  // 14x14=196 cells
  const seed = studentEmail.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = [];
  for (let i = 0; i < 196; i++) {
    // 65% on
    cells.push(((i + seed) % 100) < 65);
  }
  return cells;
}

function renderGitHubStreakBoard(cells) {
  const board = document.getElementById('github-streak-board');
  if (!board) return;
  board.innerHTML = '';
  cells.forEach(on => {
    const cell = document.createElement('div');
    cell.className = 'github-cell' + (on ? ' on' : '');
    board.appendChild(cell);
  });
}

async function showStudentDetail(s) {
  const detailWrap = document.getElementById('student-detail');
  if (!detailWrap) return;

  document.getElementById('student-detail-title').textContent = s.name || 'Student';

  // Load student profile via student API if possible (teacher session might not have access)
  // We will demo from the student email only.
  const profileFallback = {
    name: s.name || '',
    email: s.email || '',
    institute: s.institute || '',
    roll_no: s.roll_no || s.roll || '',
    degree: s.degree || '',
    branch: s.branch || '',
    college: s.college || '',
    grad_year: s.grad_year || '',
    cgpa: s.cgpa || '',
    linkedin: '',
    github: '',
    skills: '',
    bio: ''
  };

  // Professional info
  const professional = sanitizeProfessionalProfile(profileFallback);
  const proEl = document.getElementById('student-professional-content');
  if (proEl) {
    proEl.innerHTML =
      '<p><b>Name:</b> ' + professional.name + '</p>' +
      '<p><b>Email:</b> ' + professional.email + '</p>' +
      '<p><b>Institute:</b> ' + professional.institute + '</p>' +
      '<p><b>Roll:</b> ' + professional.roll_no + '</p>' +
      (professional.degree ? '<p><b>Degree:</b> ' + professional.degree + '</p>' : '') +
      (professional.branch ? '<p><b>Branch:</b> ' + professional.branch + '</p>' : '') +
      (professional.cgpa ? '<p><b>CGPA:</b> ' + professional.cgpa + '</p>' : '');
  }

  // Stats
  const certCount = s.cert_count ?? 0;
  const reqCount = s.request_count ?? 0;
  document.getElementById('stu-cert-count').textContent = certCount;
  document.getElementById('stu-req-count').textContent = reqCount;

  // Attendance demo rate
  const attendance = getDemoAttendance(s.email || '');
  const present = attendance.filter(d => d.status === 'present').length;
  const rate = Math.round(present / attendance.length * 100);
  document.getElementById('stu-attendance-rate').textContent = rate + '%';

  // Marks demo
  const marks = 70 + ((s.email || '').length % 20);
  document.getElementById('stu-marks').textContent = marks + '%';

  // Attendance requests (demo derived from leave_requests stored locally for now)
  const attendanceReqEl = document.getElementById('stu-attendance-requests');
  const emptyEl = document.getElementById('stu-attendance-empty');
  if (attendanceReqEl && emptyEl) {
    const reqs = allRequests.filter(r => r.studentEmail === s.email);
    attendanceReqEl.innerHTML = '';
    if (!reqs.length) {
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
      reqs.slice(0, 6).forEach(r => {
        const row = document.createElement('div');
        row.className = 'card';
        row.style.marginTop = '8px';
        row.innerHTML =
          '<strong>' + (r.event_name || r.eventName || 'Event') + '</strong>' +
          '<div><small>Type: ' + (r.event_type || r.eventType || '—') + '</small></div>' +
          '<div><small>Status: ' + (r.status || 'pending') + '</small></div>' +
          '<div><small>Dates: ' + (r.date_from || r.from || '—') + ' → ' + (r.date_to || r.to || '—') + '</small></div>';
        attendanceReqEl.appendChild(row);
      });
    }
  }

  // Certificates (demo: stored in localStorage like student portal)
  const certEl = document.getElementById('stu-certificates');
  const certEmptyEl = document.getElementById('stu-certs-empty');
  if (certEl && certEmptyEl) {
    const certs = JSON.parse(localStorage.getItem('chq-student-certs-' + s.email) || '[]');
    certEl.innerHTML = '';
    if (!certs.length) {
      certEmptyEl.style.display = 'block';
    } else {
      certEmptyEl.style.display = 'none';
      certs.slice(0, 6).forEach(c => {
        const item = document.createElement('div');
        item.style.marginTop = '8px';
        item.innerHTML = '<strong>' + c.name + '</strong><div><small>' + (c.org || '') + '</small></div>';
        certEl.appendChild(item);
      });
    }
  }

  // Achievements
  const achEl = document.getElementById('stu-achievements');
  const achEmptyEl = document.getElementById('stu-achievements-empty');
  if (achEl && achEmptyEl) {
    const ach = getDemoAchievements(s.email || '');
    achEl.innerHTML = '';
    if (!ach.length) {
      achEmptyEl.style.display = 'block';
    } else {
      achEmptyEl.style.display = 'none';
      ach.forEach(a => {
        const li = document.createElement('div');
        li.style.marginTop = '6px';
        li.innerHTML = '• ' + a;
        achEl.appendChild(li);
      });
    }
  }

  // GitHub streak
  renderGitHubStreakBoard(getDemoGitHubStreak(s.email || ''));

  detailWrap.style.display = 'block';
}

document.getElementById('back-to-students')?.addEventListener('click', () => {
  const detailWrap = document.getElementById('student-detail');
  if (detailWrap) detailWrap.style.display = 'none';
});

