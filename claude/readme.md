## Certificates HQ – Project Overview

**What it is:** A web app for managing student certificates, leave/event requests, and approvals across students, teachers, and admins.

---

### Tech Stack
**Frontend:** Plain HTML + CSS + Vanilla JS (no framework)
**Backend:** Node.js + Express
**Database:** PostgreSQL
**Auth:** JWT (with bcrypt password hashing)
**Demo mode:** Falls back to localStorage if backend is unreachable

---

### Roles & Portals

**Student Portal** (`student-portal.html`)
- Add/delete certificates
- Browse trending courses & competitions
- Submit leave/event requests (with teacher routing)
- Full profile editor (19 fields: personal, academic, links, address)
- Resume builder with live preview, copy & download

**Teacher Portal** (`teacher-portal.html`)
- View & approve/reject pending student requests
- See approved and rejected request history
- View assigned students with profile, certs, attendance, achievements, GitHub streak
- HOD mode: can override teacher decisions (final approval)
- Profile editor

**Admin Portal** (`admin-portal.html`)
- Dashboard stats (institutes, students, teachers, requests)
- All requests with status filtering + email notification trigger
- Institute management (add/delete)
- Analytics with 7 charts: signups/day, logins/day, requests/day (stacked), approval doughnut, certs/day, monthly growth, top institutes by students

---

### Backend Routes (all under `/api/`)
| Prefix | Key actions |
|--------|-------------|
| `/auth` | signup, login, forgot-password |
| `/student` | profile CRUD, certificates CRUD, requests CRUD |
| `/teacher` | profile, pending/approved requests, approve/reject, students list |
| `/admin` | dashboard stats, analytics, all requests, institutes CRUD, users list |

---

### File Map
| File | Purpose |
|------|---------|
| `server.js` | Express entry point |
| `auth.js / student.js / teacher.js / admin.js` | Route handlers |
| `db.js` | PostgreSQL pool |
| `schema.sql` | DB schema + seed data |
| `app.js` | Frontend auth, API helper, demo users |
| `style2.css` | Auth pages styling (glassmorphism) |
| `style-portal.css` | Portal pages styling |

---

### Key Design Decisions to Know
- **Dual mode:** Every API call has a localStorage fallback for demo/offline use
- **UUID primary keys** throughout the DB
- **HOD is a teacher** with a special flag — can override any teacher decision
- **Analytics events table** tracks logins, signups, cert additions for charts
- Backend not yet restructured into `/backend` folder (see `TODO.md`)
