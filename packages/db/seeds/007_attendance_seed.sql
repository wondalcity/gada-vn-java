-- ================================================================
-- GADA VN — Attendance Feature Seed Data
-- 007_attendance_seed.sql
--
-- Creates contracts and attendance records to test the full
-- attendance management flow (새 상태 흐름 포함).
--
-- Depends on: 001_dev_data.sql and 006_interconnected_demo.sql
-- Requires:   029_attendance_status_flow.sql (new status values)
--
-- 상태 흐름: PENDING → PRE_CONFIRMED → COMMUTING → WORK_STARTED
--            → WORK_COMPLETED → ATTENDED / EARLY_LEAVE / ABSENT
--
-- Test scenarios:
--   djob-4 (today-2) — 완료: 전체 상태 흐름 + 이력 포함
--   djob-2 (today)   — 진행 중:
--     • worker1 (Nguyễn Văn An): WORK_STARTED, 관리자 ATTENDED 처리, 8h 미확정
--     • worker3 (Lê Văn Cường):  EARLY_LEAVE (조퇴)
--   djob-1 (tomorrow) — 내일 작업: worker3가 오늘 PRE_CONFIRMED 체크
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

INSERT INTO app.job_applications (
    id, job_id, worker_id, status, applied_at, reviewed_at, reviewed_by
) VALUES

  -- Nguyễn Văn An → djob-2 (콘크리트 타설, today)
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
-- 2. ATTENDANCE RECORDS (새 상태 흐름)
-- ─────────────────────────────────────────────────────────────

-- ── djob-4: 철근 조립 (work_date = today-2, 완료) ─────────────
-- Phạm Quốc Dũng — 전체 흐름 완료: WORK_STARTED → 관리자 ATTENDED 확정
-- 근무 8시간 30분, 관리자 최종 확정

INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, marked_by, marked_at, manager_status_at,
    worker_status, worker_status_at,
    work_hours, work_minutes, work_duration_set_by,
    work_duration_confirmed, work_duration_confirmed_at,
    updated_by_role, updated_by_id,
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
    'WORK_STARTED',
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '7 hours 30 minutes',
    8, 30,
    'WORKER',
    TRUE,
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '17 hours 10 minutes',
    'MANAGER',
    '00000000-0000-0006-0000-000000000010',
    '철근 조립 완료'
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- ── djob-2: 콘크리트 타설 (work_date = today, 진행 중) ─────────
-- Nguyễn Văn An: worker→WORK_STARTED, manager→ATTENDED, 8h 미확정

INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, marked_by, marked_at, manager_status_at,
    worker_status, worker_status_at,
    work_hours, work_minutes, work_duration_set_by,
    work_duration_confirmed, work_duration_confirmed_at,
    updated_by_role, updated_by_id
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
    'WORK_STARTED',
    NOW() - INTERVAL '3 hours',
    8, 0,
    'MANAGER',
    FALSE,
    NULL,
    'MANAGER',
    '00000000-0000-0006-0000-000000000010'
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- Lê Văn Cường: worker→EARLY_LEAVE(조퇴), manager→PENDING
INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, manager_status_at,
    worker_status, worker_status_at,
    work_duration_confirmed,
    updated_by_role, updated_by_id
) VALUES (
    '00000000-0000-0007-0001-000000000003',
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0006-0000-000000000020',
    '00000000-0000-0007-0004-000000000002',
    CURRENT_DATE,
    'EARLY_LEAVE',
    NULL,
    'EARLY_LEAVE',
    NOW() - INTERVAL '1 hour',
    FALSE,
    'WORKER',
    '00000000-0000-0006-0000-000000000020'
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- ── djob-1: 전기 배선 작업 (work_date = tomorrow) ──────────────
-- Lê Văn Cường — 오늘 PRE_CONFIRMED 체크 (work_date - 1)

INSERT INTO app.attendance_records (
    id, job_id, worker_id, contract_id, work_date,
    status, work_duration_confirmed,
    updated_by_role, updated_by_id,
    worker_status, worker_status_at
) VALUES (
    '00000000-0000-0007-0001-000000000004',
    '00000000-0000-0006-0002-000000000001',
    '00000000-0000-0006-0000-000000000020',
    '00000000-0000-0007-0004-000000000003',
    CURRENT_DATE + INTERVAL '1 day',
    'PRE_CONFIRMED',
    FALSE,
    'WORKER',
    '00000000-0000-0006-0000-000000000020',
    'PRE_CONFIRMED',
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. STATUS HISTORY (이력 기록)
-- ─────────────────────────────────────────────────────────────

-- ── djob-4 이력: Phạm Quốc Dũng 전체 흐름 ─────────────────────
INSERT INTO app.attendance_status_history (
    id, attendance_id, changed_by_role, changed_by_id, changed_by_name,
    old_status, new_status, changed_at, note
) VALUES
  -- 3일 전 저녁: 근로자 출근 예정 확인
  (
    '00000000-0000-0007-0005-000000000001',
    '00000000-0000-0007-0001-000000000001',
    'WORKER', '00000000-0000-0006-0000-000000000021', 'Phạm Quốc Dũng',
    'PENDING', 'PRE_CONFIRMED',
    (CURRENT_DATE - INTERVAL '3 days')::TIMESTAMPTZ + INTERVAL '20 hours',
    '내일 출근 예정 확인'
  ),
  -- 2일 전 오전 7시: 출근 중 (현장으로 이동)
  (
    '00000000-0000-0007-0005-000000000002',
    '00000000-0000-0007-0001-000000000001',
    'WORKER', '00000000-0000-0006-0000-000000000021', 'Phạm Quốc Dũng',
    'PRE_CONFIRMED', 'COMMUTING',
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '7 hours',
    NULL
  ),
  -- 2일 전 오전 7시 30분: 현장 도착 — 작업 시작
  (
    '00000000-0000-0007-0005-000000000003',
    '00000000-0000-0007-0001-000000000001',
    'WORKER', '00000000-0000-0006-0000-000000000021', 'Phạm Quốc Dũng',
    'COMMUTING', 'WORK_STARTED',
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '7 hours 30 minutes',
    '현장 도착'
  ),
  -- 2일 전 오후 5시: 관리자 출근 확정
  (
    '00000000-0000-0007-0005-000000000004',
    '00000000-0000-0007-0001-000000000001',
    'MANAGER', '00000000-0000-0006-0000-000000000010', '이현장',
    'WORK_STARTED', 'ATTENDED',
    (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMPTZ + INTERVAL '17 hours',
    '출근 확정'
  )

ON CONFLICT (id) DO NOTHING;

-- ── djob-2 이력: Nguyễn Văn An ─────────────────────────────────
INSERT INTO app.attendance_status_history (
    id, attendance_id, changed_by_role, changed_by_id, changed_by_name,
    old_status, new_status, changed_at, note
) VALUES
  -- 어제 저녁: 근로자 출근 예정 확인
  (
    '00000000-0000-0007-0005-000000000005',
    '00000000-0000-0007-0001-000000000002',
    'WORKER', '00000000-0000-0000-0000-000000000020', 'Nguyễn Văn An',
    'PENDING', 'PRE_CONFIRMED',
    (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMPTZ + INTERVAL '19 hours',
    '내일 출근 예정'
  ),
  -- 오늘 오전 6시 50분: 출근 중
  (
    '00000000-0000-0007-0005-000000000006',
    '00000000-0000-0007-0001-000000000002',
    'WORKER', '00000000-0000-0000-0000-000000000020', 'Nguyễn Văn An',
    'PRE_CONFIRMED', 'COMMUTING',
    CURRENT_DATE::TIMESTAMPTZ + INTERVAL '6 hours 50 minutes',
    NULL
  ),
  -- 오늘 오전 7시 45분: 현장 도착 — 작업 시작
  (
    '00000000-0000-0007-0005-000000000007',
    '00000000-0000-0007-0001-000000000002',
    'WORKER', '00000000-0000-0000-0000-000000000020', 'Nguyễn Văn An',
    'COMMUTING', 'WORK_STARTED',
    CURRENT_DATE::TIMESTAMPTZ + INTERVAL '7 hours 45 minutes',
    '현장 도착, 작업 시작'
  ),
  -- 오늘 오전 10시: 관리자 출근 확정
  (
    '00000000-0000-0007-0005-000000000008',
    '00000000-0000-0007-0001-000000000002',
    'MANAGER', '00000000-0000-0006-0000-000000000010', '이현장',
    'WORK_STARTED', 'ATTENDED',
    CURRENT_DATE::TIMESTAMPTZ + INTERVAL '10 hours',
    '출근 확인'
  )

ON CONFLICT (id) DO NOTHING;

-- ── djob-2 이력: Lê Văn Cường (조퇴) ──────────────────────────
INSERT INTO app.attendance_status_history (
    id, attendance_id, changed_by_role, changed_by_id, changed_by_name,
    old_status, new_status, changed_at, note
) VALUES
  -- 어제 저녁: 출근 예정 확인
  (
    '00000000-0000-0007-0005-000000000009',
    '00000000-0000-0007-0001-000000000003',
    'WORKER', '00000000-0000-0006-0000-000000000020', 'Lê Văn Cường',
    'PENDING', 'PRE_CONFIRMED',
    (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMPTZ + INTERVAL '21 hours',
    NULL
  ),
  -- 오늘 오전 7시: 출근 중
  (
    '00000000-0000-0007-0005-000000000010',
    '00000000-0000-0007-0001-000000000003',
    'WORKER', '00000000-0000-0006-0000-000000000020', 'Lê Văn Cường',
    'PRE_CONFIRMED', 'COMMUTING',
    CURRENT_DATE::TIMESTAMPTZ + INTERVAL '7 hours',
    NULL
  ),
  -- 오늘 오전 8시: 작업 시작
  (
    '00000000-0000-0007-0005-000000000011',
    '00000000-0000-0007-0001-000000000003',
    'WORKER', '00000000-0000-0006-0000-000000000020', 'Lê Văn Cường',
    'COMMUTING', 'WORK_STARTED',
    CURRENT_DATE::TIMESTAMPTZ + INTERVAL '8 hours',
    NULL
  ),
  -- 오늘 오후 2시: 조퇴
  (
    '00000000-0000-0007-0005-000000000012',
    '00000000-0000-0007-0001-000000000003',
    'WORKER', '00000000-0000-0006-0000-000000000020', 'Lê Văn Cường',
    'WORK_STARTED', 'EARLY_LEAVE',
    CURRENT_DATE::TIMESTAMPTZ + INTERVAL '14 hours',
    '개인 사유 조퇴'
  )

ON CONFLICT (id) DO NOTHING;

-- ── djob-1 이력: Lê Văn Cường (내일 작업, 오늘 PRE_CONFIRMED) ──
INSERT INTO app.attendance_status_history (
    id, attendance_id, changed_by_role, changed_by_id, changed_by_name,
    old_status, new_status, changed_at, note
) VALUES
  (
    '00000000-0000-0007-0005-000000000013',
    '00000000-0000-0007-0001-000000000004',
    'WORKER', '00000000-0000-0006-0000-000000000020', 'Lê Văn Cường',
    'PENDING', 'PRE_CONFIRMED',
    NOW() - INTERVAL '30 minutes',
    '내일 출근 예정 확인'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SUMMARY
-- ─────────────────────────────────────────────────────────────
-- After this seed you can test:
--
--   Worker4 (Phạm Quốc Dũng):
--     • djob-4 (2 days ago): ATTENDED, 8h30m 확정, 전체 이력
--       이력: PENDING→PRE_CONFIRMED→COMMUTING→WORK_STARTED→ATTENDED
--
--   Worker1 (Nguyễn Văn An):
--     • djob-2 (today): worker=WORK_STARTED, manager=ATTENDED, 8h 미확정
--       이력: PENDING→PRE_CONFIRMED→COMMUTING→WORK_STARTED→ATTENDED(관리자)
--
--   Worker3 (Lê Văn Cường):
--     • djob-2 (today): EARLY_LEAVE(조퇴), 이력 있음
--       이력: PENDING→PRE_CONFIRMED→COMMUTING→WORK_STARTED→EARLY_LEAVE
--     • djob-1 (tomorrow): PRE_CONFIRMED (오늘 체크)
--       이력: PENDING→PRE_CONFIRMED
--
--   Manager2 (이현장) attendance for djob-2:
--     • Nguyễn Văn An: WORK_STARTED(근로자) / ATTENDED(관리자)
--     • Lê Văn Cường: EARLY_LEAVE(조퇴, 관리자 미확인)
-- ─────────────────────────────────────────────────────────────

COMMIT;
