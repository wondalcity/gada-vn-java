-- ============================================================
-- GADA VN — Full Dummy Seed Data
-- 002_full_dummy.sql
-- ============================================================
-- Auth users    : +2 managers, +6 workers  (total 12)
-- Manager profiles : 3 total
-- Worker profiles  : 8 total
-- Sites            : 6
-- Jobs             : 18 (mixed dates/statuses)
-- Applications     : 14
-- Contracts        : 5
-- Attendance       : 30
-- Notifications    : 8
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. AUTH.USERS
-- ─────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, firebase_uid, phone, email, role, status) VALUES
  ('00000000-0000-0000-0000-000000000020', 'dev-firebase-manager-002', '+82100000003', 'manager2@gada.local', 'MANAGER', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000030', 'dev-firebase-manager-003', '+82100000004', 'manager3@gada.local', 'MANAGER', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000040', 'dev-firebase-worker-003',  '+84900000003', NULL, 'WORKER', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000050', 'dev-firebase-worker-004',  '+84900000004', NULL, 'WORKER', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000060', 'dev-firebase-worker-005',  '+84900000005', NULL, 'WORKER', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000070', 'dev-firebase-worker-006',  '+84900000006', NULL, 'WORKER', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000080', 'dev-firebase-worker-007',  '+84900000007', NULL, 'WORKER', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000090', 'dev-firebase-worker-008',  '+84900000008', NULL, 'WORKER', 'ACTIVE')
ON CONFLICT (firebase_uid) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. AUTH.USER_ROLES
-- ─────────────────────────────────────────────────────────────

INSERT INTO auth.user_roles (user_id, role, status)
SELECT id, 'manager', 'active' FROM auth.users
WHERE firebase_uid IN ('dev-firebase-manager-002', 'dev-firebase-manager-003')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO auth.user_roles (user_id, role, status)
SELECT id, 'worker', 'active' FROM auth.users
WHERE firebase_uid IN (
  'dev-firebase-worker-003','dev-firebase-worker-004','dev-firebase-worker-005',
  'dev-firebase-worker-006','dev-firebase-worker-007','dev-firebase-worker-008'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. APP.MANAGER_PROFILES
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.manager_profiles (
  id, user_id, business_type, company_name, representative_name,
  representative_dob, business_reg_number, contact_phone,
  province, approval_status,
  terms_accepted, privacy_accepted
) VALUES
(
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000020',
  'CORPORATE', '한국건설 주식회사', '이건설',
  '1975-08-20', '220-81-55555', '+82100000003',
  'HCM', 'APPROVED', TRUE, TRUE
),
(
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000030',
  'INDIVIDUAL', NULL, '박현장',
  '1982-03-12', '320-12-44444', '+82100000004',
  'DN', 'PENDING', TRUE, TRUE
)
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. APP.WORKER_PROFILES
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.worker_profiles (
  id, user_id, full_name, date_of_birth, gender,
  experience_months, primary_trade_id, current_province,
  bio, terms_accepted, privacy_accepted
) VALUES
(
  '00000000-0000-0000-0003-000000000040',
  '00000000-0000-0000-0000-000000000040',
  'Lê Văn Cường', '1993-01-15', 'MALE',
  60, (SELECT id FROM ref.construction_trades WHERE code='STEEL'), 'HN',
  '철근 전문 5년 경력. 고층 빌딩 시공 경험 다수.', TRUE, TRUE
),
(
  '00000000-0000-0000-0003-000000000050',
  '00000000-0000-0000-0000-000000000050',
  'Phạm Thị Dung', '1997-06-28', 'FEMALE',
  24, (SELECT id FROM ref.construction_trades WHERE code='PAINTING'), 'HCM',
  '도장 전문 2년 경력. 내외벽 페인트 및 방수 도장 가능.', TRUE, TRUE
),
(
  '00000000-0000-0000-0003-000000000060',
  '00000000-0000-0000-0000-000000000060',
  'Hoàng Văn Em', '1990-11-05', 'MALE',
  96, (SELECT id FROM ref.construction_trades WHERE code='PLUMBING'), 'DN',
  '배관 8년 경력. 급수·배수·소방 배관 전문.', TRUE, TRUE
),
(
  '00000000-0000-0000-0003-000000000070',
  '00000000-0000-0000-0000-000000000070',
  'Ngô Thị Phương', '2000-04-18', 'FEMALE',
  6, (SELECT id FROM ref.construction_trades WHERE code='GENERAL'), 'HP',
  '현장 일반 작업 6개월 경력. 자재 운반·정리 가능.', TRUE, TRUE
),
(
  '00000000-0000-0000-0003-000000000080',
  '00000000-0000-0000-0000-000000000080',
  'Vũ Đức Giang', '1988-09-22', 'MALE',
  120, (SELECT id FROM ref.construction_trades WHERE code='ELECTRICAL'), 'HCM',
  '전기 공사 10년 경력. 전기 기능사 1급. 대형 상업시설 경험.', TRUE, TRUE
),
(
  '00000000-0000-0000-0003-000000000090',
  '00000000-0000-0000-0000-000000000090',
  'Đặng Thị Hoa', '1995-12-01', 'FEMALE',
  36, (SELECT id FROM ref.construction_trades WHERE code='TILING'), 'CT',
  '타일 시공 3년. 욕실·바닥·외벽 타일 전문.', TRUE, TRUE
)
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. APP.CONSTRUCTION_SITES
-- manager_id references app.manager_profiles(id)
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.construction_sites (
  id, manager_id, name, address, province, district,
  lat, lng, site_type, status
) VALUES
-- mgr-profile-010 sites (manager@gada.local)
(
  '00000000-0000-0000-0004-000000000001',
  '00000000-0000-0000-0000-000000000010',
  '하노이 오피스텔 A동',
  '45 Đường Nguyễn Trãi, Quận Thanh Xuân',
  'HN', 'Thanh Xuân', 21.0020, 105.8230, 'COMMERCIAL', 'ACTIVE'
),
(
  '00000000-0000-0000-0004-000000000002',
  '00000000-0000-0000-0000-000000000010',
  '롯데몰 하노이 확장공사',
  '54 Đường Liễu Giai, Quận Ba Đình',
  'HN', 'Ba Đình', 21.0350, 105.8175, 'COMMERCIAL', 'ACTIVE'
),
-- mgr-profile-020 sites (manager2@gada.local)
(
  '00000000-0000-0000-0004-000000000003',
  '00000000-0000-0000-0000-000000000020',
  '호치민 빌라 B단지',
  '78 Đường Võ Thị Sáu, Quận 3',
  'HCM', 'Quận 3', 10.7870, 106.6800, 'RESIDENTIAL', 'ACTIVE'
),
(
  '00000000-0000-0000-0004-000000000004',
  '00000000-0000-0000-0000-000000000020',
  '빈홈 스마트시티 C동',
  '234 Đường Nguyễn Văn Linh, Bình Chánh',
  'HCM', 'Bình Chánh', 10.7230, 106.6230, 'RESIDENTIAL', 'ACTIVE'
),
(
  '00000000-0000-0000-0004-000000000005',
  '00000000-0000-0000-0000-000000000020',
  '다낭 해운대 리조트 공사',
  '99 Đường Võ Nguyên Giáp, Sơn Trà',
  'DN', 'Sơn Trà', 16.0678, 108.2270, 'COMMERCIAL', 'PAUSED'
),
-- mgr-profile-030 sites (manager3@gada.local, PENDING)
(
  '00000000-0000-0000-0004-000000000006',
  '00000000-0000-0000-0000-000000000030',
  '하이퐁 공업단지 D구역',
  '12 Đường An Dương Vương, Lê Chân',
  'HP', 'Lê Chân', 20.8649, 106.6830, 'INDUSTRIAL', 'PAUSED'
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. APP.JOBS
-- manager_id references app.manager_profiles(id)
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.jobs (
  id, site_id, manager_id, title, description, trade_id,
  work_date, start_time, end_time, daily_wage,
  benefits, requirements, slots_total, slots_filled, status, slug, published_at
)
SELECT
  ('00000000-0000-0000-0005-' || job_id)::uuid,
  ('00000000-0000-0000-0004-' || site_suffix)::uuid,
  ('00000000-0000-0000-0000-' || mgr_suffix)::uuid,
  title, description,
  (SELECT id FROM ref.construction_trades WHERE code = trade_code),
  CURRENT_DATE + days_offset,
  start_t::time, end_t::time, wage::numeric,
  benefits::jsonb, requirements::jsonb,
  slots_total, slots_filled, job_status::text,
  slug, NOW() + (pub_offset || ' days')::interval
FROM (VALUES
  -- site-001 (하노이 오피스텔 A동)
  ('000000000001','000000000001','000000000010', 'CONCRETE', '콘크리트 타설 — 오피스텔 A동 3층', '3층 슬라브 타설. 경험자 우대.',  1,'07:00','17:00','550000','{"meals":true,"transport":true,"accommodation":false,"insurance":true}','{"experience_months":12,"tools_provided":true}',  5,2,'OPEN',  'concrete-office-a-floor3','0'),
  ('000000000002','000000000001','000000000010', 'STEEL',    '철근 조립 — 오피스텔 A동 4층',    '4층 기둥 철근. 용접 자격증 우대.', 2,'07:30','17:30','620000','{"meals":true,"transport":false,"accommodation":false,"insurance":true}','{"experience_months":24,"tools_provided":false}', 3,1,'OPEN',  'steel-office-a-floor4','0'),
  ('000000000003','000000000001','000000000010', 'MASONRY',  '미장 작업 — 오피스텔 A동 2층',    '2층 내벽 미장.',                  -1,'08:00','17:00','480000','{"meals":true,"transport":false,"accommodation":false,"insurance":false}','{"experience_months":6,"tools_provided":false}',  4,4,'FILLED',  'masonry-office-a-floor2','-2'),
  ('000000000004','000000000001','000000000010', 'PAINTING', '도장 — 오피스텔 A동 외벽',         '외벽 페인트. 고소 작업 가능자.',   -3,'07:00','16:00','500000','{"meals":false,"transport":true,"accommodation":false,"insurance":true}','{"experience_months":12,"tools_provided":true}',  2,2,'FILLED',  'painting-office-a-exterior','-5'),
  ('000000000016','000000000001','000000000010', 'GENERAL',  '잡부 — 오피스텔 A동 자재 운반',    '층간 자재 운반. 체력 필수.',        1,'07:00','16:00','400000','{"meals":true,"transport":false,"accommodation":false,"insurance":false}','{"experience_months":0,"tools_provided":true}',   5,0,'OPEN',  'general-office-a-transport','0'),
  ('000000000017','000000000002','000000000010', 'CONCRETE', '콘크리트 — 롯데몰 옥상 방수층',    '옥상 타설 및 방수 처리.',          14,'07:00','17:00','580000','{"meals":true,"transport":true,"accommodation":false,"insurance":true}','{"experience_months":12,"tools_provided":true}',  4,0,'OPEN',  'concrete-lotte-rooftop','0'),
  -- site-002 (롯데몰)
  ('000000000005','000000000002','000000000010', 'ELECTRICAL','전기 배선 — 롯데몰 지하 1층',      '대형 쇼핑몰 배선. 전기 기능사 필수.',3,'08:00','18:00','700000','{"meals":true,"transport":true,"accommodation":false,"insurance":true}','{"experience_months":36,"tools_provided":false}', 4,0,'OPEN',  'electrical-lotte-b1','0'),
  ('000000000006','000000000002','000000000010', 'PLUMBING', '배관 설치 — 롯데몰 2층 화장실',    '화장실 배관 위생설비.',             5,'08:00','17:00','580000','{"meals":true,"transport":false,"accommodation":false,"insurance":true}','{"experience_months":24,"tools_provided":true}',  2,0,'OPEN',  'plumbing-lotte-floor2','0'),
  ('000000000007','000000000002','000000000010', 'TILING',   '타일 시공 — 롯데몰 3층 바닥',      '대형 타일 시공. 숙련공 우대.',     -5,'07:30','17:30','520000','{"meals":true,"transport":true,"accommodation":false,"insurance":false}','{"experience_months":18,"tools_provided":true}',  6,3,'COMPLETED','tiling-lotte-floor3','-10'),
  -- site-003 (호치민 빌라 B)
  ('000000000008','000000000003','000000000020', 'CONCRETE', '콘크리트 타설 — 빌라 B 기초',      '빌라 기초 슬라브. 초보 가능.',      1,'06:30','15:30','460000','{"meals":true,"transport":true,"accommodation":true,"insurance":false}','{"experience_months":0,"tools_provided":true}',   8,3,'OPEN',  'concrete-villa-b-foundation','0'),
  ('000000000009','000000000003','000000000020', 'MASONRY',  '미장 마감 — 빌라 B 내부',          '빌라 내부 전체 미장.',              4,'07:00','17:00','490000','{"meals":true,"transport":false,"accommodation":false,"insurance":true}','{"experience_months":12,"tools_provided":false}', 5,0,'OPEN',  'masonry-villa-b-interior','0'),
  ('000000000010','000000000003','000000000020', 'PAINTING', '도장 — 빌라 B 외벽 방수',          '외벽 방수 도장 마감.',             -2,'07:00','16:00','510000','{"meals":false,"transport":false,"accommodation":false,"insurance":false}','{"experience_months":6,"tools_provided":true}',  3,3,'FILLED',  'painting-villa-b-exterior','-4'),
  ('000000000015','000000000003','000000000020', 'GENERAL',  '잡부 — 빌라 B 현장 정리',          '자재 정리 및 청소. 초보 가능.',     0,'07:00','17:00','380000','{"meals":true,"transport":true,"accommodation":false,"insurance":false}','{"experience_months":0,"tools_provided":true}',  10,5,'OPEN',  'general-villa-b-cleanup','0'),
  -- site-004 (빈홈 스마트시티 C동)
  ('000000000011','000000000004','000000000020', 'STEEL',    '철근 — 빈홈 스마트시티 C동 5층',  '고층 아파트 철근. 경력 2년 이상.',  6,'07:00','17:00','650000','{"meals":true,"transport":true,"accommodation":false,"insurance":true}','{"experience_months":24,"tools_provided":false}', 6,0,'OPEN',  'steel-vinhome-c-floor5','0'),
  ('000000000012','000000000004','000000000020', 'ELECTRICAL','전기 배선 — 빈홈 스마트시티 세대','아파트 세대 내부 배선.',             2,'08:00','17:30','680000','{"meals":true,"transport":false,"accommodation":false,"insurance":true}','{"experience_months":36,"tools_provided":false}', 4,1,'OPEN',  'electrical-vinhome-units','0'),
  ('000000000013','000000000004','000000000020', 'PLUMBING', '배관 — 빈홈 스마트시티 공용부',    '공용부 급수·배수 배관.',           -4,'07:30','17:00','560000','{"meals":true,"transport":true,"accommodation":false,"insurance":false}','{"experience_months":18,"tools_provided":true}',  3,3,'COMPLETED','plumbing-vinhome-common','-7'),
  ('000000000014','000000000004','000000000020', 'TILING',   '타일 시공 — 빈홈 스마트시티 욕실','아파트 욕실 타일.',                 7,'08:00','17:00','530000','{"meals":false,"transport":false,"accommodation":false,"insurance":true}','{"experience_months":12,"tools_provided":true}', 10,0,'OPEN',  'tiling-vinhome-bathroom','0'),
  ('000000000018','000000000004','000000000020', 'MASONRY',  '미장 마감 — 빈홈 스마트시티 복도','아파트 복도 미장.',                10,'08:00','17:00','470000','{"meals":true,"transport":false,"accommodation":false,"insurance":true}','{"experience_months":6,"tools_provided":false}',  7,0,'OPEN',  'masonry-vinhome-corridor','0')
) AS t(job_id, site_suffix, mgr_suffix, trade_code, title, description,
       days_offset, start_t, end_t, wage, benefits, requirements,
       slots_total, slots_filled, job_status, slug, pub_offset)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. APP.JOB_APPLICATIONS
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.job_applications (id, job_id, worker_id, status, applied_at)
SELECT
  ('00000000-0000-0000-0006-' || seq)::uuid,
  ('00000000-0000-0000-0005-' || job_suffix)::uuid,
  wp.id,
  app_status::text,
  NOW() + (app_offset || ' hours')::interval
FROM (VALUES
  ('000000000001', '000000000004', 'dev-firebase-worker-002', 'CONTRACTED',    '-144'),
  ('000000000002', '000000000010', 'dev-firebase-worker-002', 'CONTRACTED',    '-72'),
  ('000000000003', '000000000002', 'dev-firebase-worker-003', 'ACCEPTED', '-24'),
  ('000000000004', '000000000011', 'dev-firebase-worker-003', 'PENDING',  '-12'),
  ('000000000005', '000000000004', 'dev-firebase-worker-004', 'CONTRACTED',    '-144'),
  ('000000000006', '000000000010', 'dev-firebase-worker-004', 'CONTRACTED',    '-72'),
  ('000000000007', '000000000006', 'dev-firebase-worker-005', 'PENDING',  '-6'),
  ('000000000008', '000000000013', 'dev-firebase-worker-005', 'CONTRACTED',    '-120'),
  ('000000000009', '000000000015', 'dev-firebase-worker-006', 'ACCEPTED', '-48'),
  ('000000000010', '000000000016', 'dev-firebase-worker-006', 'PENDING',  '-3'),
  ('000000000011', '000000000005', 'dev-firebase-worker-007', 'PENDING',  '-5'),
  ('000000000012', '000000000012', 'dev-firebase-worker-007', 'ACCEPTED', '-24'),
  ('000000000013', '000000000007', 'dev-firebase-worker-008', 'CONTRACTED',    '-216'),
  ('000000000014', '000000000014', 'dev-firebase-worker-008', 'PENDING',  '-4')
) AS t(seq, job_suffix, firebase_uid, app_status, app_offset)
JOIN auth.users u ON u.firebase_uid = t.firebase_uid
JOIN app.worker_profiles wp ON wp.user_id = u.id
ON CONFLICT (job_id, worker_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 8. APP.CONTRACTS  (manager_id = manager_profiles.id)
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.contracts (
  id, application_id, worker_id, manager_id, job_id,
  contract_html, status,
  worker_signed_at, manager_signed_at
)
SELECT
  ('00000000-0000-0000-0007-' || seq)::uuid,
  app.id,
  app.worker_id,
  j.manager_id,
  app.job_id,
  '<html><body><h1>근로계약서 (GADA VN)</h1>'
    || '<p><b>작업명:</b> ' || j.title || '</p>'
    || '<p><b>작업일:</b> ' || j.work_date::text || '</p>'
    || '<p><b>일당:</b> ' || j.daily_wage::text || ' VND</p>'
    || '<p><b>시간:</b> ' || j.start_time::text || ' ~ ' || j.end_time::text || '</p>'
    || '</body></html>',
  contract_status::text,
  CASE WHEN contract_status IN ('PENDING_MANAGER_SIGN','FULLY_SIGNED') THEN NOW() - INTERVAL '2 days' ELSE NULL END,
  CASE WHEN contract_status = 'FULLY_SIGNED' THEN NOW() - INTERVAL '1 day' ELSE NULL END
FROM (VALUES
  ('000000000001', '00000000-0000-0000-0006-000000000001', 'FULLY_SIGNED'),
  ('000000000002', '00000000-0000-0000-0006-000000000005', 'FULLY_SIGNED'),
  ('000000000003', '00000000-0000-0000-0006-000000000006', 'PENDING_MANAGER_SIGN'),
  ('000000000004', '00000000-0000-0000-0006-000000000008', 'FULLY_SIGNED'),
  ('000000000005', '00000000-0000-0000-0006-000000000013', 'PENDING_WORKER_SIGN')
) AS t(seq, app_id, contract_status)
JOIN app.job_applications app ON app.id = t.app_id::uuid
JOIN app.jobs j ON j.id = app.job_id
ON CONFLICT (application_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 9. APP.ATTENDANCE_RECORDS
-- marked_by references app.manager_profiles(id)
-- ─────────────────────────────────────────────────────────────

INSERT INTO app.attendance_records (
  job_id, worker_id, work_date, status,
  check_in_time, check_out_time, hours_worked, marked_by, marked_at
)
SELECT
  ('00000000-0000-0000-0005-' || job_suffix)::uuid,
  wp.id,
  CURRENT_DATE + days_offset,
  att_status::text,
  check_in::time,
  check_out::time,
  hours_worked::numeric,
  mgr.id,
  CASE WHEN att_status != 'PENDING' THEN NOW() - INTERVAL '2 hours' ELSE NULL END
FROM (VALUES
  -- job-003 미장 A동 (FULL, yesterday): worker 001,003,006,008
  ('000000000003', 'dev-firebase-worker-001', -1, 'ATTENDED', '08:05', '17:10', '9.1',  '000000000010'),
  ('000000000003', 'dev-firebase-worker-003', -1, 'ATTENDED', '07:58', '17:05', '9.1',  '000000000010'),
  ('000000000003', 'dev-firebase-worker-006', -1, 'ATTENDED', '08:10', '17:00', '8.8',  '000000000010'),
  ('000000000003', 'dev-firebase-worker-008', -1, 'ATTENDED', '08:00', '17:15', '9.3',  '000000000010'),
  -- job-004 도장 A동 외벽 (FULL, -3 days): worker 002,004
  ('000000000004', 'dev-firebase-worker-002', -3, 'ATTENDED', '07:02', '16:15', '9.2',  '000000000010'),
  ('000000000004', 'dev-firebase-worker-004', -3, 'ATTENDED', '07:00', '16:20', '9.3',  '000000000010'),
  -- job-007 타일 롯데 3층 (CLOSED, -5 days): worker 005,007,008
  ('000000000007', 'dev-firebase-worker-005', -5, 'ABSENT',   NULL,   NULL,    '0',    '000000000010'),
  ('000000000007', 'dev-firebase-worker-007', -5, 'ATTENDED', '07:35', '17:40', '10.1', '000000000010'),
  ('000000000007', 'dev-firebase-worker-008', -5, 'ATTENDED', '07:30', '17:35', '10.1', '000000000010'),
  -- job-010 도장 빌라 B 외벽 (FULL, -2 days): worker 002,004,006
  ('000000000010', 'dev-firebase-worker-002', -2, 'ATTENDED', '07:00', '16:05', '9.1',  '000000000020'),
  ('000000000010', 'dev-firebase-worker-004', -2, 'ATTENDED', '06:55', '16:00', '9.1',  '000000000020'),
  ('000000000010', 'dev-firebase-worker-006', -2, 'HALF_DAY', '07:00', '12:00', '5.0',  '000000000020'),
  -- job-013 배관 빈홈 공용부 (CLOSED, -4 days): worker 003,005,007
  ('000000000013', 'dev-firebase-worker-003', -4, 'HALF_DAY', '07:30', '12:00', '4.5',  '000000000020'),
  ('000000000013', 'dev-firebase-worker-005', -4, 'ATTENDED', '07:30', '17:00', '9.5',  '000000000020'),
  ('000000000013', 'dev-firebase-worker-007', -4, 'ATTENDED', '07:25', '16:55', '9.5',  '000000000020'),
  -- job-015 잡부 빌라 B 정리 (today, OPEN): worker 001,002,004,006,008
  ('000000000015', 'dev-firebase-worker-001',  0, 'PENDING',  NULL,   NULL,    '0',    NULL),
  ('000000000015', 'dev-firebase-worker-002',  0, 'PENDING',  NULL,   NULL,    '0',    NULL),
  ('000000000015', 'dev-firebase-worker-004',  0, 'PENDING',  NULL,   NULL,    '0',    NULL),
  ('000000000015', 'dev-firebase-worker-006',  0, 'PENDING',  NULL,   NULL,    '0',    NULL),
  ('000000000015', 'dev-firebase-worker-008',  0, 'PENDING',  NULL,   NULL,    '0',    NULL)
) AS t(job_suffix, firebase_uid, days_offset, att_status, check_in, check_out, hours_worked, mgr_profile_suffix)
JOIN auth.users u ON u.firebase_uid = t.firebase_uid
JOIN app.worker_profiles wp ON wp.user_id = u.id
LEFT JOIN app.manager_profiles mgr ON mgr.id = ('00000000-0000-0000-0000-' || t.mgr_profile_suffix)::uuid
ON CONFLICT (job_id, worker_id, work_date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. OPS.NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────

INSERT INTO ops.notifications (user_id, type, title, body, data, read)
SELECT u.id, notif_type::text, title, body, data::jsonb, read
FROM (VALUES
  ('dev-firebase-worker-001', 'APPLICATION_ACCEPTED', '지원 승인됨',    '콘크리트 타설 작업 지원이 승인되었습니다.',    '{"jobId":"00000000-0000-0000-0005-000000000001"}', false),
  ('dev-firebase-worker-003', 'APPLICATION_ACCEPTED', '지원 승인됨',    '철근 조립 작업 지원이 승인되었습니다.',        '{"jobId":"00000000-0000-0000-0005-000000000002"}', false),
  ('dev-firebase-worker-007', 'APPLICATION_ACCEPTED', '지원 승인됨',    '전기 배선 작업 지원이 승인되었습니다.',        '{"jobId":"00000000-0000-0000-0005-000000000012"}', true),
  ('dev-firebase-worker-002', 'CONTRACT_READY',       '계약서 서명 요청','근로계약서가 생성되었습니다. 서명해 주세요.', '{"contractId":"00000000-0000-0000-0007-000000000001"}', false),
  ('dev-firebase-worker-005', 'CONTRACT_READY',       '계약서 서명 요청','근로계약서가 생성되었습니다. 서명해 주세요.', '{"contractId":"00000000-0000-0000-0007-000000000004"}', true),
  ('dev-firebase-manager-001','CONTRACT_SIGNED',      '계약서 서명 완료','근로자가 계약서에 서명했습니다.',             '{"contractId":"00000000-0000-0000-0007-000000000001"}', false),
  ('dev-firebase-manager-002','NEW_APPLICATION',      '새 지원자',       '콘크리트 타설 작업에 새 지원자가 있습니다.',  '{"jobId":"00000000-0000-0000-0005-000000000008"}',  false),
  ('dev-firebase-manager-001','MANAGER_APPROVED',     '매니저 승인 완료','매니저 등록이 승인되었습니다.',               '{}', true)
) AS t(firebase_uid, notif_type, title, body, data, read)
JOIN auth.users u ON u.firebase_uid = t.firebase_uid;

COMMIT;
