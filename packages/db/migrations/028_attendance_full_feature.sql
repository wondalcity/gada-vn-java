-- ================================================================
-- 028_attendance_full_feature.sql
--
-- Extends app.attendance_records with:
--   1. EARLY_LEAVE status (조퇴) added to the status constraint
--   2. Worker-side status tracking: worker_status, worker_status_at
--   3. Manager status timestamp: manager_status_at
--   4. Work duration: work_hours, work_minutes, work_duration_set_by,
--      work_duration_confirmed, work_duration_confirmed_at
--
-- Activation rule (enforced in application layer):
--   Attendance UI activates on: work_date - 1 day (day before work)
-- ================================================================

-- ── 1. Extend the status CHECK constraint ────────────────────────────────────
-- Drop the auto-named constraint and recreate with EARLY_LEAVE added.
-- HALF_DAY is kept for backwards-compatibility with existing data.

ALTER TABLE app.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE app.attendance_records
  ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN ('ATTENDED', 'ABSENT', 'HALF_DAY', 'EARLY_LEAVE', 'PENDING'));

-- ── 2. Worker-side status columns ───────────────────────────────────────────
-- The worker can independently report their own status.
-- This is displayed alongside the manager's status.

ALTER TABLE app.attendance_records
  ADD COLUMN IF NOT EXISTS worker_status TEXT
    CHECK (worker_status IN ('ATTENDED', 'ABSENT', 'EARLY_LEAVE')),
  ADD COLUMN IF NOT EXISTS worker_status_at TIMESTAMPTZ;

-- ── 3. Manager status timestamp ─────────────────────────────────────────────
-- marked_at already exists but only gets set on bulk-upsert.
-- manager_status_at tracks when the manager last changed the status.

ALTER TABLE app.attendance_records
  ADD COLUMN IF NOT EXISTS manager_status_at TIMESTAMPTZ;

-- ── 4. Work duration columns ─────────────────────────────────────────────────
-- Either worker or manager can input the day's work duration (hours + minutes).
-- The other party then confirms it to finalize.

ALTER TABLE app.attendance_records
  ADD COLUMN IF NOT EXISTS work_hours   SMALLINT
    CHECK (work_hours >= 0 AND work_hours <= 24),
  ADD COLUMN IF NOT EXISTS work_minutes SMALLINT
    CHECK (work_minutes >= 0 AND work_minutes < 60),
  ADD COLUMN IF NOT EXISTS work_duration_set_by   TEXT
    CHECK (work_duration_set_by IN ('WORKER', 'MANAGER')),
  ADD COLUMN IF NOT EXISTS work_duration_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS work_duration_confirmed_at   TIMESTAMPTZ;
