-- ================================================================
-- GADA VN — Interconnected Demo Data
-- 006_interconnected_demo.sql
--
-- Mirrors the demo data shown in the UI (SiteListClient,
-- AllJobsClient, admin pages) so testing across all environments
-- (worker ↔ manager ↔ admin) tells one consistent story.
--
-- Personas:
--   Admin    : admin@gada.local      / +82100000001 (from 001)
--   Manager1 : 김매니저 / 가다 건설   / +82100000002 (from 001)
--   Manager2 : 이현장 / 롯데 건설      NEW
--   Manager3 : 박부장 / 다낭 리조트    NEW (PENDING approval)
--   Worker1  : Nguyễn Văn An          / +84900000001 (from 001)
--   Worker2  : Trần Thị Bình          / +84900000002 (from 001)
--   Worker3  : Lê Văn Cường           NEW
--   Worker4  : Phạm Quốc Dũng         NEW
--   Worker5  : Hoàng Thị Mai          NEW
--
-- Site / Job IDs match web-next UI demo-data for visual consistency.
-- SAFE TO RE-RUN: all inserts use ON CONFLICT DO NOTHING.
-- ================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. NEW AUTH USERS
-- ─────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, firebase_uid, phone, email, role, status) VALUES
  -- Manager 2 (이현장)
  ('00000000-0000-0006-0000-000000000001',
   'dev-firebase-manager-lotte',
   '+82100000010',
   'lotte@gada.local',
   'MANAGER', 'ACTIVE'),

  -- Manager 3 (박부장 / PENDING approval)
  ('00000000-0000-0006-0000-000000000002',
   'dev-firebase-manager-danang',
   '+82100000011',
   'danang@gada.local',
   'MANAGER', 'ACTIVE'),

  -- Worker 3 (Lê Văn Cường)
  ('00000000-0000-0006-0000-000000000003',
   'dev-firebase-worker-cuong',
   '+84900000003',
   NULL,
   'WORKER', 'ACTIVE'),

  -- Worker 4 (Phạm Quốc Dũng)
  ('00000000-0000-0006-0000-000000000004',
   'dev-firebase-worker-dung',
   '+84900000004',
   NULL,
   'WORKER', 'ACTIVE'),

  -- Worker 5 (Hoàng Thị Mai)
  ('00000000-0000-0006-0000-000000000005',
   'dev-firebase-worker-mai',
   '+84900000005',
   NULL,
   'WORKER', 'ACTIVE')

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. NEW MANAGER PROFILES
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.manager_profiles (
    id, user_id, business_type, company_name,
    representative_name, representative_dob,
    contact_phone, contact_address, province,
    approval_status, approved_at,
    terms_accepted, privacy_accepted
) VALUES

  -- 이현장 / 롯데 건설 — APPROVED
  (
    '00000000-0000-0006-0000-000000000010',
    '00000000-0000-0006-0000-000000000001',
    'CORPORATE', '롯데 건설 (주)',
    '이현장', '1975-08-20',
    '+82100000010',
    'Ha Noi, Cau Giay',
    'HN',
    'APPROVED', NOW() - INTERVAL '10 days',
    TRUE, TRUE
  ),

  -- 박부장 / 다낭 리조트 — PENDING (needs admin approval)
  (
    '00000000-0000-0006-0000-000000000011',
    '00000000-0000-0006-0000-000000000002',
    'INDIVIDUAL', '다낭 리조트 건설',
    '박부장', '1982-03-15',
    '+82100000011',
    '78 Vo Nguyen Giap, Da Nang',
    'DN',
    'PENDING', NULL,
    TRUE, TRUE
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. NEW WORKER PROFILES
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.worker_profiles (
    id, user_id, full_name, date_of_birth, gender,
    experience_months, primary_trade_id,
    current_province, id_number, id_verified,
    profile_complete
) VALUES

  -- Lê Văn Cường — verified, electrical
  (
    '00000000-0000-0006-0000-000000000020',
    '00000000-0000-0006-0000-000000000003',
    'Lê Văn Cường', '1993-11-05', 'MALE',
    48,
    (SELECT id FROM ref.construction_trades WHERE code = 'ELECTRICAL' LIMIT 1),
    'DN', '012345678910', TRUE,
    TRUE
  ),

  -- Phạm Quốc Dũng — verified, rebar
  (
    '00000000-0000-0006-0000-000000000021',
    '00000000-0000-0006-0000-000000000004',
    'Phạm Quốc Dũng', '1990-06-18', 'MALE',
    72,
    (SELECT id FROM ref.construction_trades WHERE code = 'REBAR' LIMIT 1),
    'HN', '029876543210', TRUE,
    TRUE
  ),

  -- Hoàng Thị Mai — not verified, finishing
  (
    '00000000-0000-0006-0000-000000000022',
    '00000000-0000-0006-0000-000000000005',
    'Hoàng Thị Mai', '1997-02-28', 'FEMALE',
    18,
    (SELECT id FROM ref.construction_trades WHERE code = 'FINISHING' LIMIT 1),
    'HCM', NULL, FALSE,
    FALSE
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. CONSTRUCTION SITES (matching web-next UI demo IDs)
-- ─────────────────────────────────────────────────────────────
-- Note: UUIDs use prefix 0006-0001..0005 to avoid collision

INSERT INTO app.construction_sites (
    id, manager_id, name, address, province, district,
    lat, lng, site_type, status
) VALUES

  -- 롯데몰 하노이 지하 1층 공사 (이현장 manages)
  (
    '00000000-0000-0006-0001-000000000001',
    '00000000-0000-0006-0000-000000000010',
    '롯데몰 하노이 지하 1층 공사',
    '54 Liễu Giai, Ba Đình, Hà Nội',
    'HN', 'Ba Đình',
    21.0380, 105.8186,
    'COMMERCIAL', 'ACTIVE'
  ),

  -- 인천 송도 물류센터 자재 운반 (이현장 manages)
  (
    '00000000-0000-0006-0001-000000000002',
    '00000000-0000-0006-0000-000000000010',
    '인천 송도 물류센터 자재 운반',
    '45 Phạm Hùng, Bình Chánh, Hồ Chí Minh',
    'HCM', 'Bình Chánh',
    10.7230, 106.6230,
    'INDUSTRIAL', 'ACTIVE'
  ),

  -- 광명역 복합쇼핑몰 신축 (김매니저 manages, from 001 seed)
  (
    '00000000-0000-0006-0001-000000000003',
    '00000000-0000-0000-0000-000000000010',
    '광명역 복합쇼핑몰 신축',
    '178 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
    'HN', 'Cầu Giấy',
    21.0317, 105.7947,
    'COMMERCIAL', 'ACTIVE'
  ),

  -- 다낭 해양 리조트 기초 슬라브 (박부장 manages — PAUSED)
  (
    '00000000-0000-0006-0001-000000000004',
    '00000000-0000-0006-0000-000000000011',
    '다낭 해양 리조트 기초 슬라브',
    '78 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng',
    'DN', 'Ngũ Hành Sơn',
    15.9900, 108.2760,
    'RESORT', 'PAUSED'
  ),

  -- 호치민 스카이라인 빌딩 마감 (김매니저 manages — COMPLETED)
  (
    '00000000-0000-0006-0001-000000000005',
    '00000000-0000-0000-0000-000000000010',
    '호치민 스카이라인 빌딩 마감',
    '15 Nguyễn Thị Thập, Quận 7, Hồ Chí Minh',
    'HCM', 'Quận 7',
    10.7300, 106.7200,
    'COMMERCIAL', 'COMPLETED'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. JOBS (matching web-next UI demo IDs)
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.jobs (
    id, site_id, manager_id, title, description,
    trade_id, work_date, start_time, end_time,
    daily_wage, currency,
    benefits, requirements,
    slots_total, slots_filled,
    status, published_at
) VALUES

  -- djob-1: 전기 배선 작업 / 롯데몰 하노이 / OPEN
  (
    '00000000-0000-0006-0002-000000000001',
    '00000000-0000-0006-0001-000000000001',
    '00000000-0000-0006-0000-000000000010',
    '전기 배선 작업',
    '지하 1층 전기 배선 및 조명 설치 작업. 경력자 우대.',
    (SELECT id FROM ref.construction_trades WHERE code = 'ELECTRICAL' LIMIT 1),
    CURRENT_DATE + INTERVAL '1 day', '07:00', '17:00',
    700000, 'VND',
    '{"meals": true, "transport": false, "accommodation": false, "insurance": true}',
    '{"experience_months": 24}',
    5, 3,
    'OPEN', NOW() - INTERVAL '7 days'
  ),

  -- djob-2: 콘크리트 타설 — 기초 슬라브 / 롯데몰 하노이 / FILLED
  (
    '00000000-0000-0006-0002-000000000002',
    '00000000-0000-0006-0001-000000000001',
    '00000000-0000-0006-0000-000000000010',
    '콘크리트 타설 — 기초 슬라브',
    '지하 슬라브 콘크리트 타설 작업. 당일 완료 목표.',
    (SELECT id FROM ref.construction_trades WHERE code = 'CONCRETE' LIMIT 1),
    CURRENT_DATE,
    '06:00', '16:00',
    560000, 'VND',
    '{"meals": true, "transport": true, "accommodation": false, "insurance": false}',
    '{"experience_months": 12}',
    8, 8,
    'FILLED', NOW() - INTERVAL '9 days'
  ),

  -- djob-3: 잡부 — 자재 운반 / 물류센터 / OPEN
  (
    '00000000-0000-0006-0002-000000000003',
    '00000000-0000-0006-0001-000000000002',
    '00000000-0000-0006-0000-000000000010',
    '잡부 — 자재 운반',
    '창고 자재 운반 및 정리 작업. 체력 요구.',
    (SELECT id FROM ref.construction_trades WHERE code = 'GENERAL' LIMIT 1),
    CURRENT_DATE + INTERVAL '2 days', '08:00', '17:00',
    410000, 'VND',
    '{"meals": false, "transport": false, "accommodation": false, "insurance": false}',
    '{}',
    10, 4,
    'OPEN', NOW() - INTERVAL '5 days'
  ),

  -- djob-4: 철근 조립 — 3층 골조 / 광명역 쇼핑몰 / COMPLETED
  (
    '00000000-0000-0006-0002-000000000004',
    '00000000-0000-0006-0001-000000000003',
    '00000000-0000-0000-0000-000000000010',
    '철근 조립 — 3층 골조',
    '3층 골조 철근 조립 완료 작업.',
    (SELECT id FROM ref.construction_trades WHERE code = 'REBAR' LIMIT 1),
    CURRENT_DATE - INTERVAL '2 days', '07:00', '17:00',
    620000, 'VND',
    '{"meals": true, "transport": false, "accommodation": false, "insurance": true}',
    '{"experience_months": 36}',
    6, 6,
    'COMPLETED', NOW() - INTERVAL '12 days'
  ),

  -- djob-5: 타일 시공 — 로비 바닥 / 광명역 쇼핑몰 / OPEN
  (
    '00000000-0000-0006-0002-000000000005',
    '00000000-0000-0006-0001-000000000003',
    '00000000-0000-0000-0000-000000000010',
    '타일 시공 — 로비 바닥',
    '쇼핑몰 1층 로비 바닥 타일 시공. 정밀 작업.',
    (SELECT id FROM ref.construction_trades WHERE code = 'TILING' LIMIT 1),
    CURRENT_DATE + INTERVAL '5 days', '08:00', '17:00',
    580000, 'VND',
    '{"meals": false, "transport": false, "accommodation": false, "insurance": false}',
    '{"experience_months": 24}',
    4, 0,
    'OPEN', NOW() - INTERVAL '2 days'
  ),

  -- djob-6: 도장 작업 — 외벽 마감 / 스카이라인 빌딩 / CANCELLED
  (
    '00000000-0000-0006-0002-000000000006',
    '00000000-0000-0006-0001-000000000005',
    '00000000-0000-0000-0000-000000000010',
    '도장 작업 — 외벽 마감',
    '고층 빌딩 외벽 도장 마감 작업. 안전장비 필수.',
    (SELECT id FROM ref.construction_trades WHERE code = 'PAINTING' LIMIT 1),
    CURRENT_DATE - INTERVAL '7 days', '08:00', '17:00',
    490000, 'VND',
    '{"meals": false, "transport": false, "accommodation": false, "insurance": false}',
    '{}',
    3, 3,
    'CANCELLED', NOW() - INTERVAL '10 days'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. JOB APPLICATIONS (연계된 지원 내역)
-- ─────────────────────────────────────────────────────────────
-- worker-001 (Nguyễn Văn An) applied to djob-1 and djob-3
-- worker-002 (Trần Thị Bình) applied to djob-3
-- worker-003 (Lê Văn Cường) applied to djob-1 and accepted
-- worker-004 (Phạm Quốc Dũng) applied to djob-4 (completed)
-- worker-005 (Hoàng Thị Mai) applied to djob-3

INSERT INTO app.job_applications (
    id, job_id, worker_id, status, applied_at
) VALUES

  -- Nguyễn Văn An → 전기 배선 작업 (PENDING)
  (
    '00000000-0000-0006-0003-000000000001',
    '00000000-0000-0006-0002-000000000001',
    '00000000-0000-0000-0000-000000000020',
    'PENDING', NOW() - INTERVAL '6 days'
  ),

  -- Nguyễn Văn An → 잡부 자재 운반 (ACCEPTED)
  (
    '00000000-0000-0006-0003-000000000002',
    '00000000-0000-0006-0002-000000000003',
    '00000000-0000-0000-0000-000000000020',
    'ACCEPTED', NOW() - INTERVAL '4 days'
  ),

  -- Trần Thị Bình → 잡부 자재 운반 (PENDING)
  (
    '00000000-0000-0006-0003-000000000003',
    '00000000-0000-0006-0002-000000000003',
    '00000000-0000-0000-0000-000000000021',
    'PENDING', NOW() - INTERVAL '3 days'
  ),

  -- Lê Văn Cường → 전기 배선 작업 (ACCEPTED)
  (
    '00000000-0000-0006-0003-000000000004',
    '00000000-0000-0006-0002-000000000001',
    '00000000-0000-0006-0000-000000000020',
    'ACCEPTED', NOW() - INTERVAL '5 days'
  ),

  -- Phạm Quốc Dũng → 철근 조립 (CONTRACTED / completed job)
  (
    '00000000-0000-0006-0003-000000000005',
    '00000000-0000-0006-0002-000000000004',
    '00000000-0000-0006-0000-000000000021',
    'CONTRACTED', NOW() - INTERVAL '11 days'
  ),

  -- Hoàng Thị Mai → 잡부 자재 운반 (PENDING)
  (
    '00000000-0000-0006-0003-000000000006',
    '00000000-0000-0006-0002-000000000003',
    '00000000-0000-0006-0000-000000000022',
    'PENDING', NOW() - INTERVAL '2 days'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. CONTRACTS (계약서 — for accepted applications)
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.contracts (
    id, job_id, worker_id, manager_id,
    status,
    worker_signed_at, manager_signed_at,
    created_at
) VALUES

  -- Nguyễn Văn An ↔ 잡부 자재 운반 — FULLY_SIGNED
  (
    '00000000-0000-0006-0004-000000000001',
    '00000000-0000-0006-0002-000000000003',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0006-0000-000000000010',
    'FULLY_SIGNED',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '4 days'
  ),

  -- Phạm Quốc Dũng ↔ 철근 조립 — FULLY_SIGNED (completed job)
  (
    '00000000-0000-0006-0004-000000000002',
    '00000000-0000-0006-0002-000000000004',
    '00000000-0000-0006-0000-000000000021',
    '00000000-0000-0000-0000-000000000010',
    'FULLY_SIGNED',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '11 days'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SUMMARY
-- ─────────────────────────────────────────────────────────────
-- After this seed you can test the full flow:
--   • Admin    → logs in → sees 1 PENDING manager (박부장) on dashboard
--   • Manager2 (이현장) → logs in → sees 2 sites with 3 jobs
--   • Manager1 (김매니저) → logs in → sees 3 sites (2 active + 1 completed)
--   • Worker1  (Nguyễn Văn An) → logs in → sees their applications
--   • Worker3  (Lê Văn Cường) → logs in → sees accepted application
--
-- Firebase UIDs for testing with emulator:
--   admin:    dev-firebase-admin-001    OTP: 123456
--   manager1: dev-firebase-manager-001 OTP: 123456
--   manager2: dev-firebase-manager-lotte OTP: 123456
--   manager3: dev-firebase-manager-danang OTP: 123456
--   worker1:  dev-firebase-worker-001  OTP: 123456
--   worker3:  dev-firebase-worker-cuong OTP: 123456

COMMIT;
