-- ============================================================
-- Certificates HQ – PostgreSQL Schema
-- Run: psql -U postgres -d certificateshq -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  role        VARCHAR(20)  NOT NULL CHECK (role IN ('student','teacher','admin')),
  institute   VARCHAR(255) DEFAULT '',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- STUDENT PROFILES (extended)
CREATE TABLE IF NOT EXISTS student_profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  roll_no     VARCHAR(100) DEFAULT '',
  degree      VARCHAR(255) DEFAULT '',
  branch      VARCHAR(255) DEFAULT '',
  college     VARCHAR(255) DEFAULT '',
  grad_year   VARCHAR(10)  DEFAULT '',
  cgpa        VARCHAR(20)  DEFAULT '',
  phone       VARCHAR(30)  DEFAULT '',
  linkedin    VARCHAR(500) DEFAULT '',
  github      VARCHAR(500) DEFAULT '',
  skills      TEXT         DEFAULT '',
  bio         TEXT         DEFAULT '',
  dob         DATE,
  gender      VARCHAR(20)  DEFAULT '',
  address     TEXT         DEFAULT '',
  city        VARCHAR(100) DEFAULT '',
  state       VARCHAR(100) DEFAULT '',
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- TEACHER PROFILES (extended)
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone       VARCHAR(30)  DEFAULT '',
  department  VARCHAR(255) DEFAULT '',
  designation VARCHAR(255) DEFAULT '',
  employee_id VARCHAR(100) DEFAULT '',
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- INSTITUTES
CREATE TABLE IF NOT EXISTS institutes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  location    VARCHAR(255) DEFAULT '',
  email       VARCHAR(255) DEFAULT '',
  phone       VARCHAR(50)  DEFAULT '',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- CERTIFICATES
CREATE TABLE IF NOT EXISTS certificates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  org          VARCHAR(255) DEFAULT '',
  link         VARCHAR(500) DEFAULT '',
  issued_date  DATE,
  expiry_date  DATE,
  credential_id VARCHAR(255) DEFAULT '',
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  event_name   VARCHAR(255) NOT NULL,
  event_type   VARCHAR(100) DEFAULT 'competition',
  date_from    DATE         NOT NULL,
  date_to      DATE         NOT NULL,
  proof_file   VARCHAR(500) DEFAULT '',
  notes        TEXT         DEFAULT '',
  status       VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by  UUID REFERENCES users(id),
  approved_at  TIMESTAMPTZ,
  mail_sent    BOOLEAN      DEFAULT FALSE,
  mail_sent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ANALYTICS EVENTS (for real analytics)
CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,  -- 'login','signup','request_created','cert_added'
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  role       VARCHAR(20),
  metadata   JSONB        DEFAULT '{}',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_leave_requests_student  ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status   ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_certificates_user       ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type   ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date   ON analytics_events(created_at);

-- SEED: Default admin
INSERT INTO users (name, email, password, role, institute)
VALUES (
  'Admin ji',
  'admin1@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5oFZRW.Rcy', -- pass123
  'admin',
  'System'
) ON CONFLICT (email) DO NOTHING;

-- SEED: Default teacher
INSERT INTO users (name, email, password, role, institute)
VALUES (
  'Dr. Sarvepalli Radhakrishnan',
  'teacher1@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5oFZRW.Rcy', -- pass123
  'teacher',
  'DSI'
) ON CONFLICT (email) DO NOTHING;

-- SEED: Default student
INSERT INTO users (name, email, password, role, institute)
VALUES (
  'Pranav',
  'student1@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5oFZRW.Rcy', -- pass123
  'student',
  'DSATM'
) ON CONFLICT (email) DO NOTHING;
