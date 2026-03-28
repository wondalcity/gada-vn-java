-- ================================================================
-- GADA VN — Local development seed data
-- Run with: pnpm db:seed
--
-- Creates a minimal set of users and business entities that let
-- a new developer exercise the full application flow immediately:
--   worker registers → applies → contract signed → attendance marked
--   manager registers → approved → posts job → accepts applicant
--   admin logs in → approves manager
--
-- Firebase UIDs below are placeholder values that work with the
-- Firebase Auth emulator (firebase emulators:start --only auth).
-- They will NOT work against a real Firebase project unless you
-- create matching users there first.
--
-- SAFE TO RE-RUN: all inserts use ON CONFLICT DO NOTHING.
-- ================================================================

-- ──────────────────────────────────────────────────────────────
-- DEV USERS (auth.users)
-- ──────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, firebase_uid, phone, email, role, status)
VALUES
    -- Admin account
    ('00000000-0000-0000-0000-000000000001',
     'dev-firebase-admin-001',
     '+82100000001',
     'admin@gada.local',
     'ADMIN',
     'ACTIVE'),

    -- Manager account (starts ACTIVE; manager_profile below has PENDING approval)
    ('00000000-0000-0000-0000-000000000002',
     'dev-firebase-manager-001',
     '+82100000002',
     'manager@gada.local',
     'MANAGER',
     'ACTIVE'),

    -- Worker accounts
    ('00000000-0000-0000-0000-000000000003',
     'dev-firebase-worker-001',
     '+84900000001',
     NULL,
     'WORKER',
     'ACTIVE'),

    ('00000000-0000-0000-0000-000000000004',
     'dev-firebase-worker-002',
     '+84900000002',
     NULL,
     'WORKER',
     'ACTIVE')
ON CONFLICT (id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- MANAGER PROFILE (app.manager_profiles)
-- approval_status = APPROVED so the manager can post jobs immediately
-- ──────────────────────────────────────────────────────────────

INSERT INTO app.manager_profiles (
    id, user_id, business_type, company_name,
    representative_name, representative_dob,
    contact_phone, contact_address, province,
    approval_status, approved_at,
    terms_accepted, privacy_accepted
)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000002',
    'CORPORATE',
    '가다 건설 (Dev Corp)',
    '김매니저',
    '1980-05-15',
    '+82100000002',
    '서울시 강남구 테헤란로 1',
    'HN',                                   -- Hà Nội province code
    'APPROVED',
    NOW(),
    TRUE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- WORKER PROFILES (app.worker_profiles)
-- ──────────────────────────────────────────────────────────────

INSERT INTO app.worker_profiles (
    id, user_id, full_name, date_of_birth, gender,
    experience_months, primary_trade_id,
    current_province, profile_complete
)
VALUES
    (
        '00000000-0000-0000-0000-000000000020',
        '00000000-0000-0000-0000-000000000003',
        'Nguyễn Văn An',
        '1995-03-10',
        'MALE',
        36,
        (SELECT id FROM ref.construction_trades WHERE code = 'CONCRETE' LIMIT 1),
        'HCM',          -- Hồ Chí Minh province code
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000004',
        'Trần Thị Bình',
        '1998-07-22',
        'FEMALE',
        12,
        (SELECT id FROM ref.construction_trades WHERE code = 'FINISHING' LIMIT 1),
        'BD',           -- Bình Dương province code
        FALSE
    )
ON CONFLICT (id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- CONSTRUCTION SITE (app.construction_sites)
-- ──────────────────────────────────────────────────────────────

INSERT INTO app.construction_sites (
    id, manager_id, name, address, province, district,
    lat, lng, site_type, status
)
VALUES (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000010',
    'Dự án Chung cư Hà Nội (Dev)',
    '123 Đường Lê Duẩn, Quận Đống Đa',
    'HN',
    'Quận Đống Đa',
    21.0245,
    105.8412,
    'RESIDENTIAL',
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- JOB POSTING (app.jobs)
-- Work date set 7 days in the future so it is always "upcoming"
-- ──────────────────────────────────────────────────────────────

INSERT INTO app.jobs (
    id, site_id, manager_id, title, description,
    trade_id, work_date, start_time, end_time,
    daily_wage, currency,
    benefits, requirements,
    slots_total, slots_filled,
    status, slug, published_at
)
VALUES (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000010',
    '콘크리트 타설 작업 (Dev Job)',
    '하노이 신축 아파트 콘크리트 타설 작업입니다. 경험자 우대.',
    (SELECT id FROM ref.construction_trades WHERE code = 'CONCRETE' LIMIT 1),
    CURRENT_DATE + INTERVAL '7 days',
    '07:00',
    '17:00',
    500000,
    'VND',
    '{"meals": true, "transport": false, "accommodation": false, "insurance": true}',
    '{"experience_months": 12, "tools_provided": true}',
    3,
    0,
    'OPEN',
    'dev-concrete-hanoi-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- JOB APPLICATION (app.job_applications)
-- Worker 1 has applied — ready to be accepted by the manager
-- ──────────────────────────────────────────────────────────────

INSERT INTO app.job_applications (
    id, job_id, worker_id, status, applied_at
)
VALUES (
    '00000000-0000-0000-0000-000000000050',
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000020',
    'PENDING',
    NOW()
)
ON CONFLICT (id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- SUMMARY
-- ──────────────────────────────────────────────────────────────
-- After this seed you can immediately:
--   • Log in as admin   → phone +82100000001 (Firebase emulator OTP: 123456)
--   • Log in as manager → phone +82100000002 (Firebase emulator OTP: 123456)
--   • Log in as worker  → phone +84900000001 (Firebase emulator OTP: 123456)
--   • Manager can view the pending application and accept it
--   • Admin can see the approved manager on the dashboard
--   • Public job listing shows the dev job at /ko/jobs
