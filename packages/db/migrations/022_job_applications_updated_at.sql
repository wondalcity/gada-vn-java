-- Add updated_at column to job_applications (referenced by ApplicationRepository.kt withdraw query)
ALTER TABLE app.job_applications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
