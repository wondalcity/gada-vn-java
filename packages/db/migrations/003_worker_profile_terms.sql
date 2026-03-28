-- Add terms/privacy tracking to worker_profiles
ALTER TABLE app.worker_profiles
    ADD COLUMN IF NOT EXISTS terms_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS privacy_accepted   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS terms_accepted_at  TIMESTAMPTZ;
