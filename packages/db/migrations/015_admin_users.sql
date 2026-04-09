-- 015_admin_users.sql
-- Admin accounts with role-based permissions per menu section

CREATE TABLE IF NOT EXISTS ops.admin_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT UNIQUE NOT NULL,
  name              TEXT,
  password_hash     TEXT,                         -- NULL until invite accepted
  role              TEXT NOT NULL DEFAULT 'ADMIN'
                      CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER')),
  permissions       JSONB NOT NULL DEFAULT '{
    "dashboard": true,
    "managers": false,
    "workers": false,
    "jobs": false,
    "sites": false,
    "notifications": false,
    "admin_users": false
  }'::jsonb,
  status            TEXT NOT NULL DEFAULT 'INVITED'
                      CHECK (status IN ('INVITED', 'ACTIVE', 'DISABLED')),
  invite_token      TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  invited_by        UUID REFERENCES ops.admin_users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admin_users_invite_token_idx
  ON ops.admin_users(invite_token)
  WHERE invite_token IS NOT NULL;

-- Seed the initial superadmin so the system is usable immediately.
-- Password is 'admin1234' (BCrypt) — must be changed on first login.
INSERT INTO ops.admin_users (email, name, password_hash, role, status, permissions)
VALUES (
  'admin@gada.vn',
  'Super Admin',
  '$2a$12$f/COCg.OyJ6wSqwjJrJP.ON8w0FY4Ydd/P4DY36oQ2cjd4HBEQklK',
  'SUPER_ADMIN',
  'ACTIVE',
  '{"dashboard":true,"managers":true,"workers":true,"jobs":true,"sites":true,"notifications":true,"admin_users":true}'::jsonb
)
ON CONFLICT (email) DO NOTHING;
