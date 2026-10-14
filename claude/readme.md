# Certificates HQ

A web app for managing student certificates, leave/event requests, and approvals across students, teachers, and admins.

## Stack
- **Frontend:** Static HTML, CSS, and vanilla JavaScript in `frontend/`
- **Backend:** Node.js + Express in `backend/`
- **Database:** PostgreSQL
- **Auth:** JWT with bcrypt password hashing
- **Demo mode:** Frontend falls back to localStorage when the API is unreachable

## Project structure
```text
frontend/                 Static client and assets
  login.html              Authentication entrypoint
  student-portal.html     Student portal
  teacher-portal.html     Teacher portal
  admin-portal.html       Admin portal
  app.js                  Shared auth and API helper
backend/
  .env.example            Backend configuration template
  schema.sql              PostgreSQL schema and seed data
  package.json            API scripts and dependencies
  src/
    server.js             Express entrypoint
    db.js                 PostgreSQL pool
    middleware/auth.js    JWT and role middleware
    routes/               Auth, student, teacher, and admin routes
DEPLOYMENT.md             Deployment and API reference
TODO.md                   Remaining work
```

## Run locally
1. Start PostgreSQL and apply the schema:
   ```powershell
   psql -U chquser -d certificateshq -f backend/schema.sql
   ```
2. Create the backend environment file:
   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```
   Edit `backend/.env` with a real `DATABASE_URL` and `JWT_SECRET`.
3. Install and start the API:
   ```powershell
   npm install --prefix backend
   npm start --prefix backend
   ```
   The API runs at `http://localhost:3001`.
4. In another terminal, serve the static frontend:
   ```powershell
   python -m http.server 8080 --directory frontend
   ```
   Open `http://localhost:8080/login.html`.

For a deployed frontend, define `window.CHQ_API_BASE` before loading `app.js`; otherwise local development defaults to `http://localhost:3001/api`.

## Demo credentials
| Role | Email | Password |
|---|---|---|
| Student | student1@example.com | pass123 |
| Teacher | teacher1@example.com | pass123 |
| Admin | admin1@example.com | pass123 |

Change seeded passwords before production use.
