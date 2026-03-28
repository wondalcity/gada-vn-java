-- Migration 009: Worker experiences table
-- Stores work history entries for worker profiles

CREATE TABLE IF NOT EXISTS app.worker_experiences (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    UUID        NOT NULL REFERENCES app.worker_profiles(id) ON DELETE CASCADE,
  company_name VARCHAR(200) NOT NULL,
  role         VARCHAR(200) NOT NULL,
  start_date   DATE        NOT NULL,
  end_date     DATE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_experiences_worker_id ON app.worker_experiences(worker_id);
