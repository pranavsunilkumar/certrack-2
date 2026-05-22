# Certificates HQ – Deployment Guide

## Architecture

```
Frontend (static HTML/CSS/JS)   ←→   Node.js API (Express)   ←→   PostgreSQL
       Your current files               /home/claude/backend           DB
```

---

## 1. Database Setup (PostgreSQL)

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update && sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql << SQL
CREATE USER chquser WITH PASSWORD 'yourpassword';
CREATE DATABASE certificateshq OWNER chquser;
GRANT ALL PRIVILEGES ON DATABASE certificateshq TO chquser;
SQL

# Run schema
psql -U chquser -d certificateshq -f backend/schema.sql
```

---

## 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env:
# DATABASE_URL=postgresql://chquser:yourpassword@localhost:5432/certificateshq
# JWT_SECRET=a_long_random_secret_string_change_this
# FRONTEND_URL=https://your-domain.com

npm install
npm start
# → API running at http://localhost:3001
```

For production, use PM2:
```bash
npm install -g pm2
pm2 start server.js --name chq-api
pm2 save
pm2 startup
```

---

## 3. Frontend Setup

Update `API_BASE` in `app.js` to point to your server:
```js
const API_BASE = 'https://your-domain.com/api';  // change this line
```

Serve the HTML files with Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    root /var/www/certificateshq;
    index login.html;
    try_files $uri $uri/ =404;

    # Proxy API to Node.js
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Copy files:
```bash
sudo mkdir -p /var/www/certificateshq
sudo cp *.html *.css *.js /var/www/certificateshq/
```

---

## 4. Cloud Deployment Options

### Railway (easiest)
1. Push backend folder to GitHub
2. Connect to railway.app → New Project → Deploy from GitHub
3. Add PostgreSQL plugin → copy DATABASE_URL to env vars
4. Set PORT, JWT_SECRET, FRONTEND_URL env vars
5. Deploy frontend to Vercel or Netlify (drag-and-drop HTML folder)

### Render
1. Create Web Service → connect repo → Build: `npm install`, Start: `node server.js`
2. Create PostgreSQL database → copy connection string to env vars

### VPS (DigitalOcean/Linode)
Follow steps 1–3 above. Use Certbot for HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 5. Default Login Credentials

| Role    | Email                    | Password |
|---------|--------------------------|----------|
| Student | student1@example.com     | pass123  |
| Teacher | teacher1@example.com     | pass123  |
| Admin   | admin1@example.com       | pass123  |

> Change these after first login!

---

## 6. API Endpoints Reference

### Auth
| Method | Path                    | Body                        |
|--------|-------------------------|-----------------------------|
| POST   | /api/auth/signup        | name, email, password, role |
| POST   | /api/auth/login         | email, password, role       |
| POST   | /api/auth/forgot-password | email                     |

### Student (Bearer token required)
| Method | Path                          | Notes                    |
|--------|-------------------------------|--------------------------|
| GET    | /api/student/profile          | Get full profile         |
| PUT    | /api/student/profile          | Update profile           |
| GET    | /api/student/certificates     | List certificates        |
| POST   | /api/student/certificates     | Add certificate          |
| DELETE | /api/student/certificates/:id | Delete certificate       |
| GET    | /api/student/requests         | List leave requests      |
| POST   | /api/student/requests         | Submit leave request     |

### Teacher (Bearer token required)
| Method | Path                              | Notes               |
|--------|-----------------------------------|---------------------|
| GET    | /api/teacher/profile              | Get profile         |
| PUT    | /api/teacher/profile              | Update profile      |
| GET    | /api/teacher/requests/pending     | Pending requests    |
| GET    | /api/teacher/requests/approved    | Approved requests   |
| PATCH  | /api/teacher/requests/:id/approve | Approve request     |
| PATCH  | /api/teacher/requests/:id/reject  | Reject request      |
| GET    | /api/teacher/students             | All students        |

### Admin (Bearer token required)
| Method | Path                        | Notes                |
|--------|-----------------------------|----------------------|
| GET    | /api/admin/dashboard        | Dashboard stats      |
| GET    | /api/admin/analytics        | Full analytics data  |
| GET    | /api/admin/requests         | All requests         |
| POST   | /api/admin/requests/:id/mail| Send email notify    |
| GET    | /api/admin/institutes       | List institutes      |
| POST   | /api/admin/institutes       | Add institute        |
| DELETE | /api/admin/institutes/:id   | Delete institute     |
| GET    | /api/admin/users            | List users by role   |

---

## 7. Bugs Fixed

### Teacher Portal
- **Approve/Reject buttons broken for UUID IDs**: Fixed by using `data-id` attributes + event listeners instead of `onclick` with string IDs
- **"Invalid Date" on approved requests**: Fixed by null-checking `approvedAt` before calling `toLocaleDateString()`
- **Double save-profile listener**: Fixed by proper listener registration
- **`allRequests` not persisted after approve/reject**: Fixed with proper localStorage sync
- **Students list was hardcoded**: Now fetches real data from API

### Student Profile
- Expanded from 4 fields to 19 fields (personal, academic, links, address)

### Admin Analytics
- Was showing random mock data; now fetches real DB analytics
- Added 7 chart types: signups/day, logins/day, requests/day (stacked), approval doughnut, certs/day, monthly growth, top institutes
- Added KPI cards: active users (7d), approval rate, approved/rejected/pending counts
- Charts properly destroyed+recreated on tab switch (no canvas reuse errors)
