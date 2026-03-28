// ===================================================================
// GADA VN — Interconnected Admin Demo Data
// Mirrors the same entities shown in web-next (SiteListClient,
// AllJobsClient) and mobile views so the whole app tells one story.
// ===================================================================

export const DEMO_MANAGERS = [
  {
    id: 'demo-manager-001',
    representative_name: '김매니저',
    company_name: '가다 건설',
    business_type: 'CORPORATE',
    phone: '+82100000002',
    approval_status: 'APPROVED' as const,
    created_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'demo-manager-002',
    representative_name: '이현장',
    company_name: '롯데 건설 (주)',
    business_type: 'CORPORATE',
    phone: '+82100000003',
    approval_status: 'APPROVED' as const,
    created_at: '2026-01-15T10:30:00Z',
  },
  {
    id: 'demo-manager-003',
    representative_name: '박부장',
    company_name: '다낭 리조트 건설',
    business_type: 'INDIVIDUAL',
    phone: '+82100000004',
    approval_status: 'PENDING' as const,
    created_at: '2026-03-01T14:20:00Z',
  },
]

export const DEMO_WORKERS = [
  {
    id: 'demo-worker-001',
    full_name: 'Nguyễn Văn An',
    phone: '+84900000001',
    current_province: 'Hà Nội',
    id_verified: true,
    created_at: '2026-01-20T08:00:00Z',
  },
  {
    id: 'demo-worker-002',
    full_name: 'Trần Thị Bình',
    phone: '+84900000002',
    current_province: 'Hồ Chí Minh',
    id_verified: false,
    created_at: '2026-01-25T11:00:00Z',
  },
  {
    id: 'demo-worker-003',
    full_name: 'Lê Văn Cường',
    phone: '+84900000003',
    current_province: 'Đà Nẵng',
    id_verified: true,
    created_at: '2026-02-05T09:30:00Z',
  },
  {
    id: 'demo-worker-004',
    full_name: 'Phạm Quốc Dũng',
    phone: '+84900000004',
    current_province: 'Hà Nội',
    id_verified: true,
    created_at: '2026-02-12T13:00:00Z',
  },
  {
    id: 'demo-worker-005',
    full_name: 'Hoàng Thị Mai',
    phone: '+84900000005',
    current_province: 'Hồ Chí Minh',
    id_verified: false,
    created_at: '2026-02-20T10:15:00Z',
  },
]

// Site IDs match web-next SiteListClient DEMO_SITES
export const DEMO_SITES = [
  {
    id: 'demo-1',
    name: '롯데몰 하노이 지하 1층 공사',
    address: '54 Liễu Giai, Ba Đình, Hà Nội',
    province: 'Hà Nội',
    district: 'Ba Đình',
    status: 'ACTIVE',
    site_type: 'COMMERCIAL',
    manager_name: '이현장',
    manager_phone: '+82100000003',
    job_count: 2,
    open_job_count: 1,
    created_at: '2026-01-15T00:00:00Z',
    jobs: [
      {
        id: 'djob-1',
        title: '전기 배선 작업',
        status: 'OPEN',
        work_date: '2026-03-28',
        daily_wage: 700000,
        slots_total: 5,
        slots_filled: 3,
        application_count: 5,
        hired_count: 3,
      },
      {
        id: 'djob-2',
        title: '콘크리트 타설 — 기초 슬라브',
        status: 'FILLED',
        work_date: '2026-03-29',
        daily_wage: 560000,
        slots_total: 8,
        slots_filled: 8,
        application_count: 10,
        hired_count: 8,
      },
    ],
  },
  {
    id: 'demo-2',
    name: '인천 송도 물류센터 자재 운반',
    address: '45 Phạm Hùng, Bình Chánh, Hồ Chí Minh',
    province: 'Hồ Chí Minh',
    district: 'Bình Chánh',
    status: 'ACTIVE',
    site_type: 'INDUSTRIAL',
    manager_name: '이현장',
    manager_phone: '+82100000003',
    job_count: 1,
    open_job_count: 1,
    created_at: '2026-02-01T00:00:00Z',
    jobs: [
      {
        id: 'djob-3',
        title: '잡부 — 자재 운반',
        status: 'OPEN',
        work_date: '2026-03-30',
        daily_wage: 410000,
        slots_total: 10,
        slots_filled: 4,
        application_count: 10,
        hired_count: 4,
      },
    ],
  },
  {
    id: 'demo-3',
    name: '광명역 복합쇼핑몰 신축',
    address: '178 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    status: 'ACTIVE',
    site_type: 'COMMERCIAL',
    manager_name: '김매니저',
    manager_phone: '+82100000002',
    job_count: 2,
    open_job_count: 1,
    created_at: '2026-01-20T00:00:00Z',
    jobs: [
      {
        id: 'djob-4',
        title: '철근 조립 — 3층 골조',
        status: 'COMPLETED',
        work_date: '2026-03-25',
        daily_wage: 620000,
        slots_total: 6,
        slots_filled: 6,
        application_count: 7,
        hired_count: 6,
      },
      {
        id: 'djob-5',
        title: '타일 시공 — 로비 바닥',
        status: 'OPEN',
        work_date: '2026-04-01',
        daily_wage: 580000,
        slots_total: 4,
        slots_filled: 0,
        application_count: 0,
        hired_count: 0,
      },
    ],
  },
  {
    id: 'demo-4',
    name: '다낭 해양 리조트 기초 슬라브',
    address: '78 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng',
    province: 'Đà Nẵng',
    district: 'Ngũ Hành Sơn',
    status: 'PAUSED',
    site_type: 'RESORT',
    manager_name: '박부장',
    manager_phone: '+82100000004',
    job_count: 0,
    open_job_count: 0,
    created_at: '2025-12-01T00:00:00Z',
    jobs: [],
  },
  {
    id: 'demo-5',
    name: '호치민 스카이라인 빌딩 마감',
    address: '15 Nguyễn Thị Thập, Quận 7, Hồ Chí Minh',
    province: 'Hồ Chí Minh',
    district: 'Quận 7',
    status: 'COMPLETED',
    site_type: 'COMMERCIAL',
    manager_name: '김매니저',
    manager_phone: '+82100000002',
    job_count: 1,
    open_job_count: 0,
    created_at: '2025-11-15T00:00:00Z',
    jobs: [
      {
        id: 'djob-6',
        title: '도장 작업 — 외벽 마감',
        status: 'CANCELLED',
        work_date: '2026-03-20',
        daily_wage: 490000,
        slots_total: 3,
        slots_filled: 3,
        application_count: 3,
        hired_count: 3,
      },
    ],
  },
]

// Flat job list for Jobs page
export const DEMO_JOBS = DEMO_SITES.flatMap((s) =>
  s.jobs.map((j) => ({ ...j, site_name: s.name })),
)

// Pending manager for Dashboard
export const DEMO_PENDING_MANAGERS = DEMO_MANAGERS.filter(
  (m) => m.approval_status === 'PENDING',
)

// Demo roster for job detail page
export const DEMO_ROSTERS: Record<string, Array<{
  application_id: string
  application_status: string
  worker_name: string
  worker_phone: string
  id_verified: boolean
  contract_id: string | null
  contract_status: string | null
  worker_signed_at: string | null
  manager_signed_at: string | null
  attendance_id: string | null
  attendance_status: string | null
  check_in_time: string | null
  check_out_time: string | null
  hours_worked: number | null
  attendance_notes: string | null
}>> = {
  'djob-1': [
    { application_id: 'dapp-1-1', application_status: 'CONTRACTED', worker_name: 'Nguyễn Văn An', worker_phone: '0901234567', id_verified: true, contract_id: 'dctr-1-1', contract_status: 'FULLY_SIGNED', worker_signed_at: '2026-03-23T14:00:00Z', manager_signed_at: '2026-03-22T10:00:00Z', attendance_id: 'datt-1-1', attendance_status: 'ATTENDED', check_in_time: '07:55', check_out_time: '17:05', hours_worked: 9.1, attendance_notes: null },
    { application_id: 'dapp-1-2', application_status: 'CONTRACTED', worker_name: 'Trần Thị Bích', worker_phone: '0912345678', id_verified: true, contract_id: 'dctr-1-2', contract_status: 'PENDING_WORKER_SIGN', worker_signed_at: null, manager_signed_at: '2026-03-22T10:00:00Z', attendance_id: null, attendance_status: null, check_in_time: null, check_out_time: null, hours_worked: null, attendance_notes: null },
    { application_id: 'dapp-1-3', application_status: 'ACCEPTED', worker_name: 'Lê Minh Tuấn', worker_phone: '0923456789', id_verified: false, contract_id: null, contract_status: null, worker_signed_at: null, manager_signed_at: null, attendance_id: null, attendance_status: null, check_in_time: null, check_out_time: null, hours_worked: null, attendance_notes: null },
    { application_id: 'dapp-1-4', application_status: 'PENDING', worker_name: 'Phạm Thị Hoa', worker_phone: '0934567890', id_verified: true, contract_id: null, contract_status: null, worker_signed_at: null, manager_signed_at: null, attendance_id: null, attendance_status: null, check_in_time: null, check_out_time: null, hours_worked: null, attendance_notes: null },
    { application_id: 'dapp-1-5', application_status: 'REJECTED', worker_name: 'Võ Văn Hùng', worker_phone: '0945678901', id_verified: false, contract_id: null, contract_status: null, worker_signed_at: null, manager_signed_at: null, attendance_id: null, attendance_status: null, check_in_time: null, check_out_time: null, hours_worked: null, attendance_notes: null },
  ],
  'djob-3': [
    { application_id: 'dapp-3-1', application_status: 'CONTRACTED', worker_name: 'Đặng Thị Mai', worker_phone: '0956789012', id_verified: true, contract_id: 'dctr-3-1', contract_status: 'FULLY_SIGNED', worker_signed_at: '2026-03-26T10:00:00Z', manager_signed_at: '2026-03-25T09:00:00Z', attendance_id: 'datt-3-1', attendance_status: 'ABSENT', check_in_time: null, check_out_time: null, hours_worked: null, attendance_notes: '개인 사정으로 결근' },
    { application_id: 'dapp-3-2', application_status: 'ACCEPTED', worker_name: 'Hoàng Văn Long', worker_phone: '0967890123', id_verified: true, contract_id: null, contract_status: null, worker_signed_at: null, manager_signed_at: null, attendance_id: null, attendance_status: null, check_in_time: null, check_out_time: null, hours_worked: null, attendance_notes: null },
  ],
}
