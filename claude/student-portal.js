// ===== AUTH & USER =====
let auth;
try {
  auth = requireRole('student');
} catch (e) {
  // If requireRole() itself fails (e.g., bad localStorage JSON), force re-login.
  window.location.href = 'login.html';
}

if (!auth) {
  // requireRole() normally redirects/alerts when unauthenticated.
  // Stop execution so we don't touch auth.email/auth.name.
  throw new Error('Not authenticated. Stopping execution to wait for redirect.');
}

const userNameEl = document.getElementById('user-name');
if (userNameEl) userNameEl.textContent = auth.name;

// ===== DATA =====

let certificates = JSON.parse(
  localStorage.getItem('chq-student-certs-' + auth.email) || '[]'
);
let requests = JSON.parse(
  localStorage.getItem('chq-student-reqs-' + auth.email) || '[]'
);

const allCourses = [
  { title: 'Intro too Generative AI', topic: 'ai', provider: 'Coursera', link: 'https://www.coursera.org/professional-certificates/generative-ai-for-leaders' },
  { title: 'Data Analytics with Python', topic: 'ai', provider: 'Udemy', link: 'https://www.coursera.org/search?query=data%20analytics' },
  { title: 'AWS Cloud Practitioner', topic: 'cloud', provider: 'AWS', link: 'https://aws.amazon.com' },
  { title: 'Docker & Kubernetes', topic: 'cloud', provider: 'Linux Academy', link: 'https://training.linuxfoundation.org/awsmarketplace/' },
  { title: 'Ethical Hacking Basics', topic: 'security', provider: 'Udemy', link: 'https://online-em.isb.edu/cybersecurity-for-leaders?utm_source=bing&utm_medium=Search&utm_campaign=B-365d_IN_BG_SE_isb-cysl_Core_Phrase_New&utm_content=Online_phrase&utm_term=courses%20in%20cyber%20security%20online&msclkid=1e89659dc32d108b83910cea82d3e774' },
  { title: 'Web Security 101', topic: 'security', provider: 'Coursera', link: 'https://www.udemy.com/courses/search/?src=ukw&q=web+security+101' },
  { title: 'Modern React', topic: 'web', provider: 'Frontend Masters', link: 'https://frontendmasters.com' },
  { title: 'JavaScript Fundamentals', topic: 'web', provider: 'freeCodeCamp', link: 'https://freecodecamp.org' }
];

const allContests = [
  { title: 'CodeChef Starters', ctype: 'coding', host: 'CodeChef', link: 'https://codechef.com' },
  { title: 'LeetCode Weekly', ctype: 'coding', host: 'LeetCode', link: 'https://leetcode.com' },
  { title: 'College Hackathon', ctype: 'hackathon', host: 'Local', link: '#' },
  { title: 'Open Source Hackathon', ctype: 'hackathon', host: 'Online', link: '#' },
  { title: 'Merit Scholarship Exam', ctype: 'scholar', host: 'Institute', link: '#' },
  { title: 'Coding Scholar Challenge', ctype: 'scholar', host: 'Online', link: '#' }
];

// ===== TAB SWITCHING =====
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-panel="${tab}"]`).classList.add('active');
  });
});

// ===== CERTIFICATES =====
function renderCerts() {
  const list = document.getElementById('cert-list');
  const empty = document.getElementById('cert-empty');

  list.innerHTML = '';

  if (!certificates.length) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  certificates.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <strong>${c.name}</strong>
      <small>${c.org}</small>
      <small><a href="${c.link}" target="_blank">Open</a></small>
      <button class="btn-sm" data-idx="${idx}">Delete</button>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('button[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      deleteCert(idx);
    });
  });
}

function deleteCert(idx) {
  certificates.splice(idx, 1);
  localStorage.setItem('chq-student-certs-' + auth.email, JSON.stringify(certificates));
  renderCerts();
}

document.getElementById('add-cert-btn').addEventListener('click', () => {
  const name = prompt('Certificate name:');
  if (!name) return;

  const org = prompt('Organization:') || '';
  const link = prompt('Link:') || '#';

  certificates.push({ name, org, link });
  localStorage.setItem('chq-student-certs-' + auth.email, JSON.stringify(certificates));
  renderCerts();
});

renderCerts();

// ===== COURSES & CONTESTS =====
let courseFilter = 'all';
let contestFilter = 'all';

function renderCourses() {
  const list = document.getElementById('course-list');
  list.innerHTML = '';

  allCourses
    .filter(c => courseFilter === 'all' || c.topic === courseFilter)
    .forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <strong>${c.title}</strong>
        <small>${c.provider}</small>
        <small><a href="${c.link}" target="_blank">Explore</a></small>
      `;
      list.appendChild(card);
    });
}

function renderContests() {
  const list = document.getElementById('contest-list');
  list.innerHTML = '';

  allContests
    .filter(c => contestFilter === 'all' || c.ctype === contestFilter)
    .forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <strong>${c.title}</strong>
        <small>${c.host}</small>
        <small><a href="${c.link}" target="_blank">Details</a></small>
      `;
      list.appendChild(card);
    });
}

document.querySelectorAll('#course-filters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#course-filters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    courseFilter = chip.dataset.topic;
    renderCourses();
  });
});

document.querySelectorAll('#contest-filters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#contest-filters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    contestFilter = chip.dataset.ctype;
    renderContests();
  });
});

renderCourses();
renderContests();

// ===== REQUESTS =====
function renderRequests() {
  const list = document.getElementById('request-list');
  const empty = document.getElementById('request-empty');

  list.innerHTML = '';

  if (!requests.length) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  requests.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';

    const statusBg =
      r.status === 'approved'
        ? '#10b981'
        : r.status === 'pending'
        ? '#f2a41e'
        : '#ef4444';

    card.innerHTML = `
      <strong>${r.eventName || 'Event'}</strong>
      <small>Type: ${r.eventType || r.event_type || '—'}</small>
      <small>${r.from || r.date_from || '—'} → ${r.to || r.date_to || '—'}</small>
      <small>
        Status:
        <span class="badge" style="background: ${statusBg}">${r.status || 'pending'}</span>
      </small>
      ${(() => {
        const approvedAt = r.approved_at || r.approvedAt || r.approvedOn || r.date_approved || r.status_updated_at;
        const rejectedAt = r.rejected_at || r.rejectedAt || r.rejectedOn || r.date_rejected || r.status_updated_at;
        const dateStr = (r.status === 'approved' && approvedAt)
          ? new Date(approvedAt).toLocaleDateString()
          : (r.status === 'rejected' && rejectedAt)
            ? new Date(rejectedAt).toLocaleDateString()
            : '';
        const label = r.status === 'approved' ? 'Approved on ' : r.status === 'rejected' ? 'Rejected on ' : '';
        return dateStr ? `<small>${label}${dateStr}</small>` : '';
      })()}


      <div style="margin-top:8px; padding:10px; border-radius:12px; background: rgba(37,99,235,0.06); border:1px solid rgba(37,99,235,0.18);">
        <div style="font-weight:600; font-size:12px; color: var(--accent);">Student Proof</div>
        <div style="margin-top:4px; font-size:13px;">File: ${r.proofFile || r.proof_file || '—'}</div>
        <div style="margin-top:4px; font-size:13px;">Notes: ${r.notes || '—'}</div>
      </div>
    `;

    list.appendChild(card);
  });
}

document.getElementById('new-request-btn').addEventListener('click', () => {
  document.getElementById('request-form').style.display = 'block';
});

document.getElementById('cancel-request-btn').addEventListener('click', () => {
  document.getElementById('request-form').style.display = 'none';
});

// ===== TEACHER PICKER (demo + localStorage) =====
const teacherSelectListEl = document.getElementById('teacher-select-list');

// In a real DB-backed app, teachers would be loaded from backend filtered by student dept/class.
// For now (demo mode), we use hardcoded mapping for CSD-2/CSD-3 from app.js demo users.
function getAvailableTeachersForStudent() {
  const studentClass = auth.class || null;

  const all = [
    { email: 'teacher1@example.com', name: 'Teacher 1 (CSD-2)', class: 'CSD-2' },
    { email: 'teacher2@example.com', name: 'Teacher 2 (CSD-3)', class: 'CSD-3' },
    { email: 'teacher3@example.com', name: 'Teacher 3 (CSD-3)', class: 'CSD-3' },
    { email: 'hod1@example.com', name: 'HOD – CSD (DSATM)', class: 'ALL', isHod: true },
  ];

  // Choose teachers based on student's class
  const allowed = all.filter(t => t.isHod || (studentClass ? t.class === studentClass : true));

  // Exclude HOD from multi-select list (HOD receives/overrides automatically)
  return allowed.filter(t => !t.isHod);
}

function renderTeacherPicker() {
  if (!teacherSelectListEl) return;
  teacherSelectListEl.innerHTML = '';

  const teachers = getAvailableTeachersForStudent();
  if (!teachers.length) {
    teacherSelectListEl.innerHTML = '<div class="empty-state" style="margin:0">No teachers assigned.</div>';
    return;
  }

  teachers.forEach(t => {
    const wrapper = document.createElement('label');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;border:1px solid rgba(37,99,235,0.18);background:rgba(37,99,235,0.05);padding:10px 12px;border-radius:12px;cursor:pointer;';

    wrapper.innerHTML = `
      <input type="checkbox" class="teacher-checkbox" value="${t.email}" checked />
      <div style="display:flex;flex-direction:column;gap:2px;">
        <strong style="font-size:13px;">${t.name}</strong>
        <small style="opacity:.8;font-size:12px;">${t.email}</small>
      </div>
    `;

    teacherSelectListEl.appendChild(wrapper);
  });
}

function getSelectedTeacherEmails() {
  const checks = document.querySelectorAll('#teacher-select-list .teacher-checkbox');
  const selected = [];
  checks.forEach(ch => {
    if (ch.checked) selected.push(ch.value);
  });
  return selected;
}

// initialize picker
renderTeacherPicker();

document.getElementById('submit-request-btn').addEventListener('click', () => {
  const eventName = document.getElementById('event-name').value;
  const eventType = document.getElementById('event-type').value;
  const from = document.getElementById('date-from').value;
  const to = document.getElementById('date-to').value;

  if (!eventName || !from || !to) {
    alert('Please fill required fields');
    return;
  }

  const selectedTeacherEmails = getSelectedTeacherEmails();
  if (!selectedTeacherEmails.length) {
    alert('Select at least one teacher.');
    return;
  }

  const req = {
    id: Date.now(),
    eventName,
    eventType,
    from,
    to,
    proofFile: document.getElementById('proof-file').files[0]?.name || '',
    notes: document.getElementById('req-notes').value,
    status: 'pending',
    createdAt: new Date().toISOString(),

    studentEmail: auth.email,
    studentName: auth.name,

    // new routing fields (demo/localStorage)
    requestedTeacherEmails: selectedTeacherEmails,
  // Always notify/route to HOD (override capability)
    hodEmail: 'hod1@example.com',

    // Track multi-teacher decisions in the UI/local demo.
    // (In real backend, store these per-teacher and have HOD override logic server-side.)
    teacherDecisions: {} // { [teacherEmail]: 'approved'|'rejected' }
  };

  // persist student request list
  requests.push(req);
  localStorage.setItem('chq-student-reqs-' + auth.email, JSON.stringify(requests));

  // persist global request list (teacher portal reads this)
  let allReqs = JSON.parse(localStorage.getItem('chq-all-requests') || '[]');
  allReqs.push(req);
  localStorage.setItem('chq-all-requests', JSON.stringify(allReqs));

  document.getElementById('request-form').style.display = 'none';
  alert('Request submitted! Waiting for teacher approval (HOD can override).');
  renderRequests();
});

renderRequests();

// ===== PROFILE =====
// EXPANDED loadProfile for student-portal.js
async function loadProfile() {
  let profile = {};

  // Try API
  try {
    const data = await apiCall('GET', '/student/profile');
    if (data) profile = data;
  } catch (_) {}

  // Fallback localStorage
  if (!Object.keys(profile).length) {
    profile = JSON.parse(
      localStorage.getItem('chq-student-profile-' + auth.email) || '{}'
    );
  }

  // Personal
  document.getElementById('p-name').value    = profile.name     || auth.name  || '';
  document.getElementById('p-email').value   = profile.email    || auth.email || '';
  document.getElementById('p-phone').value   = profile.phone    || '';
  document.getElementById('p-dob').value     = (profile.dob     || '').split('T')[0];
  document.getElementById('p-gender').value  = profile.gender   || '';
  // Academic
  document.getElementById('p-institute').value = profile.institute || '';
  document.getElementById('p-roll').value      = profile.roll_no   || profile.roll || '';
  document.getElementById('p-degree').value    = profile.degree    || '';
  document.getElementById('p-branch').value    = profile.branch    || '';
  document.getElementById('p-college').value   = profile.college   || '';
  document.getElementById('p-grad-year').value = profile.grad_year || '';
  document.getElementById('p-cgpa').value      = profile.cgpa      || '';
  // Links
  document.getElementById('p-linkedin').value  = profile.linkedin  || '';
  document.getElementById('p-github').value    = profile.github    || '';
  document.getElementById('p-skills').value    = profile.skills    || '';
  document.getElementById('p-bio').value       = profile.bio       || '';
  // Address
  document.getElementById('p-address').value   = profile.address   || '';
  document.getElementById('p-city').value      = profile.city      || '';
  document.getElementById('p-state').value     = profile.state     || '';

  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
}

async function saveProfile() {
  const profile = {
    name:       document.getElementById('p-name').value,
    email:      document.getElementById('p-email').value,
    phone:      document.getElementById('p-phone').value,
    dob:        document.getElementById('p-dob').value || null,
    gender:     document.getElementById('p-gender').value,
    institute:  document.getElementById('p-institute').value,
    roll_no:    document.getElementById('p-roll').value,
    degree:     document.getElementById('p-degree').value,
    branch:     document.getElementById('p-branch').value,
    college:    document.getElementById('p-college').value,
    grad_year:  document.getElementById('p-grad-year').value,
    cgpa:       document.getElementById('p-cgpa').value,
    linkedin:   document.getElementById('p-linkedin').value,
    github:     document.getElementById('p-github').value,
    skills:     document.getElementById('p-skills').value,
    bio:        document.getElementById('p-bio').value,
    address:    document.getElementById('p-address').value,
    city:       document.getElementById('p-city').value,
    state:      document.getElementById('p-state').value,
  };

  // Try API
  try {
    const data = await apiCall('PUT', '/student/profile', profile);
    if (data) { alert('Profile saved!'); return; }
  } catch (err) {
    alert(err.message || 'Save failed'); return;
  }

  // Fallback
  localStorage.setItem('chq-student-profile-' + auth.email, JSON.stringify(profile));
  alert('Profile saved! (Demo mode)');
}


loadProfile();


// ===== RESUME BUILDER =====

// map some job role keywords to course topics
const roleKeywordMap = [
  { keyword: 'web', topic: 'web' },
  { keyword: 'frontend', topic: 'web' },
  { keyword: 'backend', topic: 'web' },
  { keyword: 'full stack', topic: 'web' },
  { keyword: 'data', topic: 'ai' },
  { keyword: 'ml', topic: 'ai' },
  { keyword: 'machine learning', topic: 'ai' },
  { keyword: 'cloud', topic: 'cloud' },
  { keyword: 'devops', topic: 'cloud' },
  { keyword: 'security', topic: 'security' },
  { keyword: 'cyber', topic: 'security' }
];

function findTopicForRole(role) {
  const r = role.toLowerCase();
  for (const item of roleKeywordMap) {
    if (r.includes(item.keyword)) return item.topic;
  }
  return 'all';
}

function updateResumeSuggestions() {
  const roleInput = document.getElementById('res-role');
  if (!roleInput) return;

  const role = roleInput.value.trim();
  const listEl = document.getElementById('resume-suggest-list');
  const textEl = document.getElementById('resume-suggest-text');

  listEl.innerHTML = '';

  if (!role) {
    textEl.textContent = 'Enter a job role above to see suggestions.';
    return;
  }

  const topic = findTopicForRole(role);
  let suggestions = [];
  const roleLower = role.toLowerCase();

  certificates.forEach(c => {
    if (
      c.name.toLowerCase().includes(roleLower) ||
      c.name.toLowerCase().includes(topic)
    ) {
      suggestions.push({
        label: `${c.name} – ${c.org || 'Certificate'}`,
        type: 'cert'
      });
    }
  });

  suggestions = suggestions.slice(0, 3);

  if (suggestions.length < 3) {
    const needed = 3 - suggestions.length;
    const courseMatches = allCourses
      .filter(c => topic === 'all' || c.topic === topic)
      .slice(0, needed)
      .map(c => ({
        label: `${c.title} – ${c.provider}`,
        type: 'course'
      }));
    suggestions = suggestions.concat(courseMatches);
  }

  if (!suggestions.length) {
    textEl.textContent = 'No matching certificates/courses found yet. Try another role.';
    return;
  }

  textEl.textContent = 'You can highlight these in your resume:';

  suggestions.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s.label;
    listEl.appendChild(li);
  });
}

function generateResumePreview() {
  const name = document.getElementById('res-name')?.value || auth.name || '';
  const email = document.getElementById('res-email')?.value || auth.email || '';
  const phone = document.getElementById('res-phone')?.value || '';
  const linkedin = document.getElementById('res-linkedin')?.value || '';
  const github = document.getElementById('res-github')?.value || '';
  const role = document.getElementById('res-role')?.value || '';

  const degree = document.getElementById('res-degree')?.value || '';
  const college = document.getElementById('res-college')?.value || '';
  const gradYear = document.getElementById('res-grad-year')?.value || '';
  const cgpa = document.getElementById('res-cgpa')?.value || '';

  const summary = document.getElementById('res-summary')?.value || '';
  const skills = document.getElementById('res-skills')?.value || '';
  const projects = document.getElementById('res-projects')?.value || '';
  const extra = document.getElementById('res-extra')?.value || '';

  const preview = document.getElementById('resume-preview');
  if (!preview) return;

  preview.innerHTML = `
<strong>${name}</strong> | ${role || 'Aspiring Engineer'}
${email} | ${phone}
${linkedin ? `LinkedIn: ${linkedin}` : ''}${linkedin && github ? ' | ' : ''}${github ? `GitHub: ${github}` : ''}
----------------------------------------------------
EDUCATION
${degree || 'B.E. / B.Tech – Branch'}
${college || 'College Name'}, ${gradYear || 'Year'}
${cgpa ? `CGPA: ${cgpa}` : 'CGPA: X.X / 10'}

SKILLS
${skills || 'Java, HTML, CSS, JavaScript, Python'}

PROJECTS
${projects || 'Project Title – Tech stack – What you built and impact.'}

POSITIONS / ACHIEVEMENTS / HOBBIES
${extra || 'Add your positions of responsibility, achievements and hobbies.'}

SUMMARY
${summary || 'Brief 2–3 line summary about your skills and goals.'}
  `;
}

// plain text for copy / download
function getResumePlainText() {
  const preview = document.getElementById('resume-preview');
  if (!preview) return '';
  return preview.innerText || '';
}

// copy to clipboard
function copyResumeToClipboard() {
  const text = getResumePlainText();
  if (!text) {
    alert('Build your resume first.');
    return;
  }

  if (!navigator.clipboard) {
    alert('Clipboard not supported in this browser.');
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => alert('Resume copied to clipboard!'))
    .catch(() => alert('Could not copy. Try manually selecting and copying.'));
}

// download as .txt
function downloadResumeAsTxt() {
  const text = getResumePlainText();
  if (!text) {
    alert('Build your resume first.');
    return;
  }

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// init resume builder: prefill + live preview + buttons
(function initResumeBuilder() {
  const profile = JSON.parse(
    localStorage.getItem('chq-student-profile-' + auth.email) ||
      '{"name":"","email":""}'
  );

  const nameInput = document.getElementById('res-name');
  const emailInput = document.getElementById('res-email');

  if (nameInput) nameInput.value = profile.name || auth.name || '';
  if (emailInput) emailInput.value = profile.email || auth.email || '';

  const liveInputs = [
    'res-name',
    'res-email',
    'res-phone',
    'res-linkedin',
    'res-github',
    'res-role',
    'res-degree',
    'res-college',
    'res-grad-year',
    'res-cgpa',
    'res-summary',
    'res-skills',
    'res-projects',
    'res-extra'
  ];

  liveInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (id === 'res-role') updateResumeSuggestions();
        generateResumePreview();
      });
    }
  });

  const buildBtn = document.getElementById('build-resume-btn');
  if (buildBtn) {
    buildBtn.addEventListener('click', generateResumePreview);
  }

  const copyBtn = document.getElementById('copy-resume-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyResumeToClipboard);
  }

  const downloadBtn = document.getElementById('download-resume-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadResumeAsTxt);
  }

  // initial suggestions + preview
  updateResumeSuggestions();
  generateResumePreview();
})();
