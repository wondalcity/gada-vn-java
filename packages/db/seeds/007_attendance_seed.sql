-- ================================================================
-- GADA VN — Attendance Feature Seed Data
-- 007_attendance_seed.sql
--
-- Creates contracts and attendance records to test the full
-- attendance management flow for workers, managers, and admin.
--
-- Depends on: 001_dev_data.sql and 006_interconnected_demo.sql
--
-- Test scenarios:
--   Past job    : djob-4 (work_date = today-2) — finalised attendance
--   Today's job : djob-2 (work_date = today)  — mixed active statuses
--   Tomorrow job: djob-1 (work_date = today+1) — activation day is today
--
-- Firebase UIDs for testing (OTP: 123456):
--   manager2 (이현장): dev-firebase-manager-lotte
--   worker1  (Nguyễn Văn An): dev-firebase-worker-001
--   worker3  (Lê Văn Cường):  dev-firebase-worker-cuong
--   worker4  (Phạm Quốc Dũng): dev-firebase-worker-dung
--
-- SAFE TO RE-RUN: all inserts use ON CONFLICT DO NOTHING.
-- ================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. CONTRACTS — for djob-2 (today's job, 이현장 manages)
--    Workers: Nguyễn Văn An (worker1) + Lê Văn Cường (worker3)
-- ─────────────────────────────────────────────────────────────

-- First, add job applications so FK chains are valid
-- Note: djob-1 already has an ACCEPTED application for Lê Văn Cường
--       in seed 006 (id=00000000-0000-0006-0003-000000000004), so we
--       only insert the djob-2 applications here.

INSERT INTO app.job_applications (
    id, job_id, worker_id, status, applied_at, reviewed_at, reviewed_by
) VALUES

  -- Nguyễn Văn An → djob-2 (콘크리트 타설, today)
  -- reviewed_by = manager_profiles.id for 이현장 = 00000000-0000-0006-0000-000000000010
  (
    '00000000-0000-0007-0003-000000000001',
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0000-0000-000000000020',
    'CONTRACTED',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days',
    '00000000-0000-0006-0000-000000000010'
  ),

  -- Lê Văn Cường → djob-2 (콘크리트 타설, today)
  (
    '00000000-0000-0007-0003-000000000002',
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0006-0000-000000000020',
    'CONTRACTED',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days',
    '00000000-0000-0006-0000-000000000010'
  )

ON CONFLICT (id) DO NOTHING;

-- Update existing djob-1 application for Lê Văn Cường to CONTRACTED status
-- (seed 006 inserted it as ACCEPTED; we need it CONTRACTED for the contract FK)
UPDATE app.job_applications
SET status = 'CONTRACTED'
WHERE id = '00000000-0000-0006-0003-000000000004'
  AND status = 'ACCEPTED';

-- Contracts
INSERT INTO app.contracts (
    id, application_id, job_id, worker_id, manager_id,
    contract_html, status,
    worker_signed_at, manager_signed_at,
    created_at
) VALUES

  -- Nguyễn Văn An ↔ djob-2
  (
    '00000000-0000-0007-0004-000000000001',
    '00000000-0000-0007-0003-000000000001',
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0006-0000-000000000010',
    '<p>근로계약서 (seed)</p>',
    'FULLY_SIGNED',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '5 days'
  ),

  -- Lê Văn Cường ↔ djob-2
  (
    '00000000-0000-0007-0004-000000000002',
    '00000000-0000-0007-0003-000000000002',
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0006-0000-000000000020',
    '00000000-0000-0006-0000-000000000010',
    '<p>근로계약서 (seed)</p>',
    'FULLY_SIGNED',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '5 days'
  ),

  -- Lê Văn Cường ↔ djob-1 (tomorrow's job)
  -- application_id references existing seed 006 application
  (
    '00000000-0000-0007-0004-000000000003',
    '00000000-0000-0006-0003-000000000004',
    '00000000-0000-0006-0002-000000000001',
    '00000000-0000-0006-0000-000000000020',
    '00000000-0000-0006-0000-000000000010',
    '<p>근로계약서 (seed)</p>',
    'FULLY_SIGNED',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '6 days'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. ATTENDANCE RECORDS
-- ─────────────────────────────────────────────────────────────

-- ── djob-4: 철근 조립 (work_date = today - 2, COMPLETED) ───────
-- Phạm Quốc Dũng — manager marked ATTENDED, worker also ATTENDED
-- Work duration finalised: 8 hours 30 minutes, confirmed by manager

INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, marked_by, marked_at, manager_status_at,
    worker_status, worker_status_at,
    work_hours, work_minutes, work_duration_set_by,
    work_duration_confirmed, work_duration_confirmed_at,
    notes
) VALUES (
    '00000000-0000-0007-0001-000000000001',
    '00000000-0000-0006-0002-000000000004',
    '00000000-0000-0006-0000-000000000021',
    '00000000-0000-0006-0004-000000000002',
    CURRENT_DATE - INTERVAL '2 days',
    'ATTENDED',
    '00000000-0000-0000-0000-000000000010',
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '17 hours',
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '17 hours',
    'ATTENDED',
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '7 hours 30 minutes',
    8, 30,
    'WORKER',
    TRUE,
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '17 hours 10 minutes',
    '철근 조립 완료'
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- ── djob-2: 콘크리트 타설 (work_date = today, FILLED) ─────────
-- Nguyễn Văn An: manager→ATTENDED, worker→ATTENDED
-- Work hours not yet confirmed (manager set 8h, pending worker confirm)

INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, marked_by, marked_at, manager_status_at,
    worker_status, worker_status_at,
    work_hours, work_minutes, work_duration_set_by,
    work_duration_confirmed, work_duration_confirmed_at
) VALUES (
    '00000000-0000-0007-0001-000000000002',
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0007-0004-000000000001',
    CURRENT_DATE,
    'ATTENDED',
    '00000000-0000-0006-0000-000000000010',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours',
    'ATTENDED',
    NOW() - INTERVAL '3 hours',
    8, 0,
    'MANAGER',
    FALSE,
    NULL
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- Lê Văn Cường: worker→EARLY_LEAVE, manager→PENDING
-- No work duration set yet

INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, manager_status_at,
    worker_status, worker_status_at,
    work_duration_confirmed
) VALUES (
    '00000000-0000-0007-0001-000000000003',
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0006-0000-000000000020',
    '00000000-0000-0007-0004-000000000002',
    CURRENT_DATE,
    'PENDING',
    NULL,
    'EARLY_LEAVE',
    NOW() - INTERVAL '1 hour',
    FALSE
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- ── djob-1: 전기 배선 작업 (work_date = today+1, OPEN) ─────────
-- Lê Văn Cường — attendance activated today (work_date - 1 day)
-- No status set yet — both sides PENDING

INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, work_duration_confirmed
) VALUES (
    '00000000-0000-0007-0001-000000000004',
    '00000000-0000-0006-0002-000000000001',
    '00000000-0000-0006-0000-000000000020',
    '00000000-0000-0007-0004-000000000003',
    CURRENT_DATE + INTERVAL '1 day',
    'PENDING',
    FALSE
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SUMMARY
-- ─────────────────────────────────────────────────────────────
-- After this seed you can test:
--   Worker1 (Nguyễn Văn An) attendance tab:
--     • djob-2 (today): manager=ATTENDED, worker=ATTENDED, 8h unconfirmed
--   Worker3 (Lê Văn Cường) attendance tab:
--     • djob-2 (today): manager=PENDING, worker=EARLY_LEAVE
--     • djob-1 (tomorrow): both PENDING, activation starts today
--   Worker4 (Phạm Quốc Dũng) attendance tab:
--     • djob-4 (2 days ago): ATTENDED, 8h30m confirmed
--   Manager2 (이현장) attendance for djob-2:
--     • Nguyễn Văn An: ATTENDED (both sides)
--     • Lê Văn Cường: manager=PENDING, worker=EARLY_LEAVE
-- ─────────────────────────────────────────────────────────────

COMMIT;
