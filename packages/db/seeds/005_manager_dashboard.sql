-- ================================================================
-- GADA VN — Manager Dashboard Dummy Data
-- 005_manager_dashboard.sql
--
-- Adds comprehensive data for the dev manager (manager@gada.local)
-- manager_profile_id = 00000000-0000-0000-0000-000000000010
--
-- Sections:
--   1. 현장 관리  — 3 new construction sites
--   2. 공고 관리  — 10 jobs across those sites (mixed statuses)
--   3. 채용 관리  — 15 applications (PENDING / ACCEPTED / CONTRACTED / REJECTED)
--   4. 계약서 관리 — 8 contracts (FULLY_SIGNED / PENDING_MANAGER_SIGN / PENDING_WORKER_SIGN)
--   5. 출근부     — 10 attendance records for completed/filled jobs
--
-- SAFE TO RE-RUN: all inserts use ON CONFLICT DO NOTHING.
-- UUID prefix scheme (4th group):
--   0008 = new sites
--   0009 = new jobs
--   000a = new applications
--   000b = new contracts
-- ================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. APP.CONSTRUCTION_SITES
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.construction_sites (
    id, manager_id, name, address, province, district,
    lat, lng, site_type, status
) VALUES
(
    '00000000-0000-0000-0008-000000000001',
    '00000000-0000-0000-0000-000000000010',
    '광명역 복합쇼핑몰 신축',
    '178 Đường Hoàng Quốc Việt, Cầu Giấy',
    'HN', 'Cầu Giấy',
    21.0317, 105.7947, 'COMMERCIAL', 'ACTIVE'
),
(
    '00000000-0000-0000-0008-000000000002',
    '00000000-0000-0000-0000-000000000010',
    '인천 송도 물류센터',
    '45 Đường Phạm Hùng, Bình Chánh',
    'HCM', 'Bình Chánh',
    10.7230, 106.6230, 'INDUSTRIAL', 'ACTIVE'
),
(
    '00000000-0000-0000-0008-000000000003',
    '00000000-0000-0000-0000-000000000010',
    '수원 주상복합 D단지',
    '99 Đường Nguyễn Văn Cừ, Quận 5',
    'HCM', 'Quận 5',
    10.7570, 106.6680, 'RESIDENTIAL', 'COMPLETED'
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. APP.JOBS
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.jobs (
    id, site_id, manager_id, title, description, trade_id,
    work_date, start_time, end_time, daily_wage,
    benefits, requirements, slots_total, slots_filled, status, slug, published_at
)
SELECT
    ('00000000-0000-0000-0009-' || job_id)::uuid,
    ('00000000-0000-0000-0008-' || site_suffix)::uuid,
    '00000000-0000-0000-0000-000000000010',
    title, description,
    (SELECT id FROM ref.construction_trades WHERE code = trade_code),
    CURRENT_DATE + days_offset,
    start_t::time, end_t::time, wage::numeric,
    benefits::jsonb, requirements::jsonb,
    slots_total, slots_filled, job_status::text,
    slug, NOW() + (pub_offset || ' days')::interval
FROM (VALUES
    -- ── 광명역 복합쇼핑몰 (ACTIVE) ─────────────────────────────
    ('000000000001','000000000001','CONCRETE',
     '콘크리트 타설 — 쇼핑몰 기초 슬라브',
     '쇼핑몰 기초 슬라브 타설 작업. 레미콘 타설 경험자 우대.',
     3,'07:00','17:00','560000',
     '{"meals":true,"transport":true,"accommodation":false,"insurance":true}',
     '{"minExperienceMonths":12,"toolsProvided":true}',
     4, 1, 'OPEN', 'concrete-mall-foundation', '0'),

    ('000000000002','000000000001','ELECTRICAL',
     '전기 배선 — 쇼핑몰 지하 주차장',
     '지하 주차장 조명 및 동력 배선. 전기 기능사 필수.',
     5,'08:00','18:00','720000',
     '{"meals":true,"transport":true,"accommodation":false,"insurance":true}',
     '{"minExperienceMonths":36,"toolsProvided":false}',
     3, 0, 'OPEN', 'electrical-mall-parking', '0'),

    ('000000000003','000000000001','STEEL',
     '철근 조립 — 쇼핑몰 2층 골조',
     '2층 기둥·보 철근 조립. 고소 작업 가능자.',
     -2,'07:30','17:30','630000',
     '{"meals":true,"transport":false,"accommodation":false,"insurance":true}',
     '{"minExperienceMonths":24,"toolsProvided":false}',
     2, 2, 'FILLED', 'steel-mall-floor2', '-3'),

    ('000000000004','000000000001','MASONRY',
     '미장 — 쇼핑몰 1층 내벽 마감',
     '1층 내벽 전체 미장 마감. 속건성 재료 사용.',
     -7,'08:00','17:00','490000',
     '{"meals":true,"transport":false,"accommodation":false,"insurance":false}',
     '{"minExperienceMonths":6,"toolsProvided":false}',
     3, 2, 'COMPLETED', 'masonry-mall-floor1', '-9'),

    -- ── 인천 송도 물류센터 (ACTIVE) ────────────────────────────
    ('000000000005','000000000002','GENERAL',
     '잡부 — 물류센터 자재 운반',
     '창고 내 자재 운반 및 정리. 초보 가능. 지게차 면허 우대.',
     2,'07:00','16:00','410000',
     '{"meals":true,"transport":true,"accommodation":false,"insurance":false}',
     '{"minExperienceMonths":0,"toolsProvided":true}',
     10, 1, 'OPEN', 'general-logistics-cargo', '0'),

    ('000000000006','000000000002','PLUMBING',
     '배관 — 물류센터 소방 배관 설치',
     '스프링클러 및 소화 배관. 배관 기능사 우대.',
     10,'07:30','17:00','590000',
     '{"meals":true,"transport":false,"accommodation":false,"insurance":true}',
     '{"minExperienceMonths":24,"toolsProvided":true}',
     3, 0, 'OPEN', 'plumbing-logistics-fire', '0'),

    ('000000000007','000000000002','CONCRETE',
     '콘크리트 타설 — 물류센터 바닥',
     '대형 창고 바닥 슬라브 타설. 연속 작업 가능자.',
     -1,'06:30','16:30','540000',
     '{"meals":true,"transport":true,"accommodation":false,"insurance":true}',
     '{"minExperienceMonths":12,"toolsProvided":true}',
     6, 2, 'FILLED', 'concrete-logistics-floor', '-2'),

    -- ── 수원 주상복합 D단지 (COMPLETED) ───────────────────────
    ('000000000008','000000000003','TILING',
     '타일 시공 — 주상복합 욕실 및 발코니',
     '전 세대 욕실·발코니 타일 시공. 실리콘 마감 포함.',
     -14,'07:30','17:30','535000',
     '{"meals":false,"transport":false,"accommodation":false,"insurance":true}',
     '{"minExperienceMonths":12,"toolsProvided":true}',
     4, 2, 'COMPLETED', 'tiling-complex-bathroom', '-16'),

    ('000000000009','000000000003','PAINTING',
     '도장 — 주상복합 외벽 마감',
     '주상복합 전체 외벽 방수 페인트 마감. 로프 작업 포함.',
     -10,'07:00','16:00','520000',
     '{"meals":false,"transport":true,"accommodation":false,"insurance":false}',
     '{"minExperienceMonths":12,"toolsProvided":true}',
     3, 2, 'COMPLETED', 'painting-complex-exterior', '-12'),

    ('000000000010','000000000003','ELECTRICAL',
     '전기 배선 — 주상복합 세대 (취소)',
     '세대 내부 배선 (일정 변경으로 인해 취소됨).',
     -5,'08:00','17:00','680000',
     '{"meals":true,"transport":false,"accommodation":false,"insurance":true}',
     '{"minExperienceMonths":36,"toolsProvided":false}',
     2, 0, 'CANCELLED', 'electrical-complex-units', '-6')

) AS t(job_id, site_suffix, trade_code, title, description,
       days_offset, start_t, end_t, wage, benefits, requirements,
       slots_total, slots_filled, job_status, slug, pub_offset)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. APP.JOB_APPLICATIONS
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.job_applications (
    id, job_id, worker_id, status, applied_at, reviewed_at, reviewed_by
)
SELECT
    ('00000000-0000-0000-000a-' || seq)::uuid,
    ('00000000-0000-0000-0009-' || job_suffix)::uuid,
    wp.id,
    app_status::text,
    NOW() + (applied_offset || ' hours')::interval,
    CASE WHEN app_status IN ('ACCEPTED', 'REJECTED', 'CONTRACTED')
         THEN NOW() + (reviewed_offset || ' hours')::interval ELSE NULL END,
    CASE WHEN app_status IN ('ACCEPTED', 'REJECTED', 'CONTRACTED')
         THEN '00000000-0000-0000-0000-000000000010'::uuid ELSE NULL END
FROM (VALUES
    -- J3 (FILLED STEEL, -2days): 2 CONTRACTED
    ('000000000001', '000000000003', 'dev-firebase-worker-001', 'CONTRACTED', '-72',  '-60'),
    ('000000000002', '000000000003', 'dev-firebase-worker-003', 'CONTRACTED', '-70',  '-58'),
    -- J4 (COMPLETED MASONRY, -7days): 2 CONTRACTED + 1 REJECTED
    ('000000000003', '000000000004', 'dev-firebase-worker-002', 'CONTRACTED', '-192', '-180'),
    ('000000000004', '000000000004', 'dev-firebase-worker-004', 'CONTRACTED', '-190', '-178'),
    ('000000000005', '000000000004', 'dev-firebase-worker-006', 'REJECTED',   '-188', '-176'),
    -- J7 (FILLED CONCRETE, -1day): 2 CONTRACTED
    ('000000000006', '000000000007', 'dev-firebase-worker-005', 'CONTRACTED', '-48',  '-36'),
    ('000000000007', '000000000007', 'dev-firebase-worker-007', 'CONTRACTED', '-46',  '-34'),
    -- J8 (COMPLETED TILING, -14days): 2 CONTRACTED
    ('000000000008', '000000000008', 'dev-firebase-worker-001', 'CONTRACTED', '-360', '-348'),
    ('000000000009', '000000000008', 'dev-firebase-worker-003', 'CONTRACTED', '-358', '-346'),
    -- J9 (COMPLETED PAINTING, -10days): 2 CONTRACTED
    ('000000000010', '000000000009', 'dev-firebase-worker-005', 'CONTRACTED', '-264', '-252'),
    ('000000000011', '000000000009', 'dev-firebase-worker-008', 'CONTRACTED', '-262', '-250'),
    -- J1 (OPEN CONCRETE, +3days): 2 PENDING
    ('000000000012', '000000000001', 'dev-firebase-worker-006', 'PENDING',    '-5',   NULL),
    ('000000000013', '000000000001', 'dev-firebase-worker-008', 'PENDING',    '-3',   NULL),
    -- J5 (OPEN GENERAL, +2days): 1 ACCEPTED + 1 PENDING
    ('000000000014', '000000000005', 'dev-firebase-worker-004', 'ACCEPTED',   '-12',  '-8'),
    ('000000000015', '000000000005', 'dev-firebase-worker-002', 'PENDING',    '-6',   NULL)
) AS t(seq, job_suffix, firebase_uid, app_status, applied_offset, reviewed_offset)
JOIN auth.users u ON u.firebase_uid = t.firebase_uid
JOIN app.worker_profiles wp ON wp.user_id = u.id
ON CONFLICT (job_id, worker_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. APP.CONTRACTS
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.contracts (
    id, application_id, worker_id, manager_id, job_id,
    contract_html, status,
    worker_signed_at, manager_signed_at
)
SELECT
    ('00000000-0000-0000-000b-' || seq)::uuid,
    appl.id,
    appl.worker_id,
    j.manager_id,
    appl.job_id,
    '<html><body>'
        || '<h1>근로계약서 (GADA VN)</h1>'
        || '<p><b>작업명:</b> ' || j.title || '</p>'
        || '<p><b>작업일:</b> ' || j.work_date::text || '</p>'
        || '<p><b>일당:</b> ' || j.daily_wage::text || ' VND</p>'
        || '<p><b>근무시간:</b> ' || j.start_time::text || ' ~ ' || j.end_time::text || '</p>'
        || '</body></html>',
    contract_status::text,
    CASE WHEN contract_status IN ('PENDING_MANAGER_SIGN', 'FULLY_SIGNED')
         THEN NOW() - INTERVAL '3 days' ELSE NULL END,
    CASE WHEN contract_status = 'FULLY_SIGNED'
         THEN NOW() - INTERVAL '2 days' ELSE NULL END
FROM (VALUES
    -- J3 workers — both fully signed
    ('000000000001', '00000000-0000-0000-000a-000000000001', 'FULLY_SIGNED'),
    ('000000000002', '00000000-0000-0000-000a-000000000002', 'FULLY_SIGNED'),
    -- J4 workers — 1 fully signed, 1 waiting manager
    ('000000000003', '00000000-0000-0000-000a-000000000003', 'FULLY_SIGNED'),
    ('000000000004', '00000000-0000-0000-000a-000000000004', 'PENDING_MANAGER_SIGN'),
    -- J7 workers — 1 fully signed, 1 waiting worker
    ('000000000005', '00000000-0000-0000-000a-000000000006', 'FULLY_SIGNED'),
    ('000000000006', '00000000-0000-0000-000a-000000000007', 'PENDING_WORKER_SIGN'),
    -- J8 worker — fully signed
    ('000000000007', '00000000-0000-0000-000a-000000000008', 'FULLY_SIGNED'),
    -- J9 worker — fully signed
    ('000000000008', '00000000-0000-0000-000a-000000000010', 'FULLY_SIGNED')
) AS t(seq, app_id, contract_status)
JOIN app.job_applications appl ON appl.id = t.app_id::uuid
JOIN app.jobs j ON j.id = appl.job_id
ON CONFLICT (application_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. APP.ATTENDANCE_RECORDS
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.attendance_records (
    job_id, worker_id, work_date, status,
    check_in_time, check_out_time, hours_worked, marked_by, marked_at
)
SELECT
    ('00000000-0000-0000-0009-' || job_suffix)::uuid,
    wp.id,
    CURRENT_DATE + days_offset,
    att_status::text,
    check_in_t::time,
    check_out_t::time,
    hours::numeric,
    '00000000-0000-0000-0000-000000000010'::uuid,
    NOW() - INTERVAL '1 hour'
FROM (VALUES
    -- J3 (FILLED STEEL, -2 days)
    ('000000000003', 'dev-firebase-worker-001', -2, 'ATTENDED', '07:35', '17:40', '10.1'),
    ('000000000003', 'dev-firebase-worker-003', -2, 'ATTENDED', '07:28', '17:33', '10.1'),
    -- J4 (COMPLETED MASONRY, -7 days)
    ('000000000004', 'dev-firebase-worker-002', -7, 'ATTENDED', '08:05', '17:10', '9.1'),
    ('000000000004', 'dev-firebase-worker-004', -7, 'HALF_DAY', '08:00', '12:00', '4.0'),
    -- J7 (FILLED CONCRETE, -1 day)
    ('000000000007', 'dev-firebase-worker-005', -1, 'ATTENDED', '06:35', '16:40', '10.1'),
    ('000000000007', 'dev-firebase-worker-007', -1, 'ATTENDED', '06:30', '16:35', '10.1'),
    -- J8 (COMPLETED TILING, -14 days)
    ('000000000008', 'dev-firebase-worker-001', -14, 'ATTENDED', '07:30', '17:35', '10.1'),
    ('000000000008', 'dev-firebase-worker-003', -14, 'ATTENDED', '07:32', '17:38', '10.1'),
    -- J9 (COMPLETED PAINTING, -10 days)
    ('000000000009', 'dev-firebase-worker-005', -10, 'ATTENDED', '07:05', '16:15', '9.2'),
    ('000000000009', 'dev-firebase-worker-008', -10, 'ATTENDED', '07:10', '16:20', '9.2')
) AS t(job_suffix, firebase_uid, days_offset, att_status, check_in_t, check_out_t, hours)
JOIN auth.users u ON u.firebase_uid = t.firebase_uid
JOIN app.worker_profiles wp ON wp.user_id = u.id
ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

COMMIT;

-- ================================================================
-- SUMMARY
-- After running this seed, manager@gada.local will have:
--
-- 현장 (Sites):
--   총 5개 (기존 3 + 신규 3)
--   - 광명역 복합쇼핑몰 신축  (ACTIVE)
--   - 인천 송도 물류센터      (ACTIVE)
--   - 수원 주상복합 D단지     (COMPLETED)
--
-- 공고 (Jobs):
--   신규 10개 (OPEN 4, FILLED 2, COMPLETED 3, CANCELLED 1)
--
-- 채용 (Applications):
--   신규 15건 (CONTRACTED 10, ACCEPTED 1, PENDING 3, REJECTED 1)
--
-- 계약서 (Contracts):
--   신규 8건 (FULLY_SIGNED 5, PENDING_MANAGER_SIGN 1, PENDING_WORKER_SIGN 1, VOID 0)
--
-- 출근부 (Attendance):
--   신규 10건 (ATTENDED 9, HALF_DAY 1)
-- ================================================================
