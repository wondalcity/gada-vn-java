-- Migration 019: Allow managers to apply as workers
-- Makes date_of_birth nullable so a minimal worker_profile can be auto-created
-- when a manager applies for a job (without requiring full registration flow).

ALTER TABLE app.worker_profiles
  ALTER COLUMN date_of_birth DROP NOT NULL;
