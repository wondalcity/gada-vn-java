-- ================================================================
-- 029_attendance_status_flow.sql
--
-- 출퇴근 상태 흐름 확장:
--   1. 새 상태값 추가: PRE_CONFIRMED, COMMUTING, WORK_STARTED, WORK_COMPLETED
--   2. 상태 이력 테이블: attendance_status_history
--   3. updated_by 컬럼: 마지막으로 상태를 변경한 주체(WORKER/MANAGER/SYSTEM)
--
-- 상태 흐름:
--   PENDING
--     → PRE_CONFIRMED  (출근 예정 확인, work_date - 1일부터 가능)
--     → COMMUTING      (출근 중, 현장으로 이동 시작)
--     → WORK_STARTED   (작업 시작, 현장 도착)
--     → WORK_COMPLETED (작업 마감, 근로 시간 입력 후)
--     → ATTENDED / EARLY_LEAVE / ABSENT  (최종 확정)
-- ================================================================

-- ── 1. status CHECK 제약 확장 ─────────────────────────────────────────────

ALTER TABLE app.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE app.attendance_records
  ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN (
    'PENDING',
    'PRE_CONFIRMED',
    'COMMUTING',
    'WORK_STARTED',
    'WORK_COMPLETED',
    'ATTENDED',
    'ABSENT',
    'HALF_DAY',
    'EARLY_LEAVE'
  ));

-- ── 2. worker_status CHECK 확장 ───────────────────────────────────────────

ALTER TABLE app.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_worker_status_check;

ALTER TABLE app.attendance_records
  ADD CONSTRAINT attendance_records_worker_status_check
  CHECK (worker_status IN (
    'PRE_CONFIRMED',
    'COMMUTING',
    'WORK_STARTED',
    'WORK_COMPLETED',
    'ATTENDED',
    'ABSENT',
    'EARLY_LEAVE'
  ));

-- ── 3. updated_by 컬럼 추가 ───────────────────────────────────────────────
-- 현재 상태를 마지막으로 변경한 주체 추적 (status 컬럼 기준)

ALTER TABLE app.attendance_records
  ADD COLUMN IF NOT EXISTS updated_by_role TEXT
    CHECK (updated_by_role IN ('WORKER', 'MANAGER', 'SYSTEM')),
  ADD COLUMN IF NOT EXISTS updated_by_id UUID;

-- ── 4. 상태 이력 테이블 ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app.attendance_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id   UUID NOT NULL
    REFERENCES app.attendance_records(id) ON DELETE CASCADE,
  changed_by_role TEXT NOT NULL
    CHECK (changed_by_role IN ('WORKER', 'MANAGER', 'SYSTEM')),
  changed_by_id   UUID,               -- worker_profiles.id or manager_profiles.id
  changed_by_name TEXT,               -- 비정규화 표시용
  old_status      TEXT,               -- NULL = 최초 생성
  new_status      TEXT NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note            TEXT
);

CREATE INDEX IF NOT EXISTS idx_att_status_history_attendance
  ON app.attendance_status_history(attendance_id, changed_at DESC);
