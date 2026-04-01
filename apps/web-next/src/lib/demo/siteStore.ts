/**
 * localStorage-based demo site store.
 * Used when no auth token is available (demo / unauthenticated mode).
 * Provides full CRUD: list, get, create, update, updateStatus, delete.
 */

import type { Site, SiteStatus, Job } from '@/types/manager-site-job'

const STORAGE_KEY = 'gada_demo_sites'

// ── Rich seed data ────────────────────────────────────────────────────────────

const SEED_SITES: (Site & { demoJobs: Job[] })[] = [
  {
    id: 'demo-1',
    name: '하노이 스타레이크 시티 A동 신축',
    nameVi: 'Xây dựng tòa A Starlake City Hà Nội',
    address: '28 Xuân La, Tây Hồ, Hà Nội',
    province: 'Hà Nội',
    district: 'Tây Hồ',
    siteType: '아파트/주거',
    status: 'ACTIVE',
    imageUrls: [],
    jobCount: 3,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-03-28T00:00:00Z',
    demoJobs: [
      {
        id: 'djob-1-1', siteId: 'demo-1', siteName: '하노이 스타레이크 시티 A동 신축',
        title: '철근 조립 — 10~12층 골조', tradeName: '철근', workDate: '2026-04-03',
        dailyWage: 650000, currency: 'VND',
        benefits: { meals: true, transport: false, accommodation: false, insurance: true },
        requirements: { minExperienceMonths: 12 },
        slotsTotal: 8, slotsFilled: 5, status: 'OPEN',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 4, accepted: 5, rejected: 1 },
        createdAt: '2026-03-20T00:00:00Z', updatedAt: '2026-03-28T00:00:00Z',
      },
      {
        id: 'djob-1-2', siteId: 'demo-1', siteName: '하노이 스타레이크 시티 A동 신축',
        title: '콘크리트 타설 — 기초 슬라브', tradeName: '콘크리트', workDate: '2026-04-05',
        dailyWage: 580000, currency: 'VND',
        benefits: { meals: true, transport: true, accommodation: false, insurance: false },
        requirements: {},
        slotsTotal: 10, slotsFilled: 10, status: 'FILLED',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 0, accepted: 10, rejected: 3 },
        createdAt: '2026-03-18T00:00:00Z', updatedAt: '2026-03-25T00:00:00Z',
      },
      {
        id: 'djob-1-3', siteId: 'demo-1', siteName: '하노이 스타레이크 시티 A동 신축',
        title: '거푸집 설치 — 기둥 공사', tradeName: '거푸집', workDate: '2026-04-07',
        dailyWage: 520000, currency: 'VND',
        benefits: { meals: false, transport: false, accommodation: false, insurance: false },
        requirements: {},
        slotsTotal: 6, slotsFilled: 2, status: 'OPEN',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 2, accepted: 2, rejected: 0 },
        createdAt: '2026-03-26T00:00:00Z', updatedAt: '2026-03-26T00:00:00Z',
      },
    ],
  },
  {
    id: 'demo-2',
    name: '호치민 빈홈즈 그랜드파크 상업동',
    nameVi: 'Tòa thương mại Vinhomes Grand Park TP.HCM',
    address: '188 Nguyễn Xiển, Long Bình, Quận 9, Hồ Chí Minh',
    province: 'Hồ Chí Minh',
    district: 'Quận 9',
    siteType: '상업시설',
    status: 'ACTIVE',
    imageUrls: [],
    jobCount: 2,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-03-27T00:00:00Z',
    demoJobs: [
      {
        id: 'djob-2-1', siteId: 'demo-2', siteName: '호치민 빈홈즈 그랜드파크 상업동',
        title: '전기 배선 — 3~5층', tradeName: '전기', workDate: '2026-04-04',
        dailyWage: 720000, currency: 'VND',
        benefits: { meals: true, transport: false, accommodation: false, insurance: true },
        requirements: { minExperienceMonths: 24 },
        slotsTotal: 4, slotsFilled: 1, status: 'OPEN',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 3, accepted: 1, rejected: 0 },
        createdAt: '2026-03-22T00:00:00Z', updatedAt: '2026-03-22T00:00:00Z',
      },
      {
        id: 'djob-2-2', siteId: 'demo-2', siteName: '호치민 빈홈즈 그랜드파크 상업동',
        title: '배관 설치 — 위생 배관', tradeName: '배관', workDate: '2026-04-06',
        dailyWage: 680000, currency: 'VND',
        benefits: { meals: false, transport: true, accommodation: false, insurance: false },
        requirements: {},
        slotsTotal: 3, slotsFilled: 0, status: 'OPEN',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 1, accepted: 0, rejected: 0 },
        createdAt: '2026-03-25T00:00:00Z', updatedAt: '2026-03-25T00:00:00Z',
      },
    ],
  },
  {
    id: 'demo-3',
    name: '다낭 선월드 케이블카 지지대 기초',
    nameVi: 'Nền móng trụ cáp treo Sun World Đà Nẵng',
    address: 'Bãi Bụt, Sơn Trà, Đà Nẵng',
    province: 'Đà Nẵng',
    district: 'Sơn Trà',
    siteType: '공공시설',
    status: 'ACTIVE',
    imageUrls: [],
    jobCount: 2,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-03-26T00:00:00Z',
    demoJobs: [
      {
        id: 'djob-3-1', siteId: 'demo-3', siteName: '다낭 선월드 케이블카 지지대 기초',
        title: '굴착 작업 — 지지대 기초', tradeName: '토공', workDate: '2026-03-30',
        dailyWage: 490000, currency: 'VND',
        benefits: { meals: true, transport: true, accommodation: true, insurance: false },
        requirements: {},
        slotsTotal: 12, slotsFilled: 12, status: 'COMPLETED',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 0, accepted: 12, rejected: 2 },
        createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-30T00:00:00Z',
      },
      {
        id: 'djob-3-2', siteId: 'demo-3', siteName: '다낭 선월드 케이블카 지지대 기초',
        title: '콘크리트 타설 — 철탑 기초 2차', tradeName: '콘크리트', workDate: '2026-04-02',
        dailyWage: 560000, currency: 'VND',
        benefits: { meals: true, transport: true, accommodation: false, insurance: true },
        requirements: { minExperienceMonths: 6 },
        slotsTotal: 8, slotsFilled: 3, status: 'OPEN',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 5, accepted: 3, rejected: 0 },
        createdAt: '2026-03-28T00:00:00Z', updatedAt: '2026-03-28T00:00:00Z',
      },
    ],
  },
  {
    id: 'demo-4',
    name: '하이퐁 LG 전자 3공장 증설',
    nameVi: 'Mở rộng nhà máy LG Electronics Hải Phòng số 3',
    address: 'Khu công nghiệp Tràng Duệ, An Dương, Hải Phòng',
    province: 'Hải Phòng',
    district: 'An Dương',
    siteType: '산업시설',
    status: 'PAUSED',
    imageUrls: [],
    jobCount: 0,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
    demoJobs: [],
  },
  {
    id: 'demo-5',
    name: '호치민 메트로 2호선 역사 마감',
    nameVi: 'Hoàn thiện ga Metro số 2 TP.HCM',
    address: '149 Phạm Ngũ Lão, Phạm Ngũ Lão, Quận 1, Hồ Chí Minh',
    province: 'Hồ Chí Minh',
    district: 'Quận 1',
    siteType: '공공시설',
    status: 'COMPLETED',
    imageUrls: [],
    jobCount: 1,
    createdAt: '2025-10-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    demoJobs: [
      {
        id: 'djob-5-1', siteId: 'demo-5', siteName: '호치민 메트로 2호선 역사 마감',
        title: '타일 시공 — 역사 플랫폼', tradeName: '타일', workDate: '2026-02-20',
        dailyWage: 550000, currency: 'VND',
        benefits: { meals: false, transport: false, accommodation: false, insurance: false },
        requirements: {},
        slotsTotal: 6, slotsFilled: 6, status: 'COMPLETED',
        imageUrls: [], shiftCount: 0,
        applicationCount: { pending: 0, accepted: 6, rejected: 1 },
        createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-20T00:00:00Z',
      },
    ],
  },
]

// ── Internal store helpers ────────────────────────────────────────────────────

type StoredSite = Site & { demoJobs: Job[] }

function readStore(): StoredSite[] {
  if (typeof window === 'undefined') return SEED_SITES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // First visit → seed
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SITES))
      return SEED_SITES
    }
    return JSON.parse(raw) as StoredSite[]
  } catch {
    return SEED_SITES
  }
}

function writeStore(sites: StoredSite[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites))
  } catch { /* ignore */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const siteStore = {
  list(): Site[] {
    return readStore().map(({ demoJobs: _d, ...s }) => s)
  },

  get(id: string): (Site & { demoJobs: Job[] }) | null {
    return readStore().find((s) => s.id === id) ?? null
  },

  create(data: Omit<Site, 'id' | 'imageUrls' | 'jobCount' | 'createdAt' | 'updatedAt'>): Site {
    const sites = readStore()
    const now = new Date().toISOString()
    const newSite: StoredSite = {
      ...data,
      id: `local-${Date.now()}`,
      imageUrls: [],
      jobCount: 0,
      createdAt: now,
      updatedAt: now,
      demoJobs: [],
    }
    writeStore([...sites, newSite])
    return newSite
  },

  update(id: string, data: Partial<Site>): Site | null {
    const sites = readStore()
    const idx = sites.findIndex((s) => s.id === id)
    if (idx === -1) return null
    const updated: StoredSite = { ...sites[idx], ...data, updatedAt: new Date().toISOString() }
    sites[idx] = updated
    writeStore(sites)
    const { demoJobs: _d, ...site } = updated
    return site
  },

  updateStatus(id: string, status: SiteStatus): Site | null {
    return siteStore.update(id, { status })
  },

  delete(id: string): boolean {
    const sites = readStore()
    const next = sites.filter((s) => s.id !== id)
    if (next.length === sites.length) return false
    writeStore(next)
    return true
  },

  reset(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SITES))
  },

  listJobs(): Job[] {
    return readStore().flatMap((s) => s.demoJobs)
  },

  listJobsBySite(siteId: string): Job[] {
    return readStore().find((s) => s.id === siteId)?.demoJobs ?? []
  },

  getJob(jobId: string): Job | null {
    for (const site of readStore()) {
      const job = site.demoJobs.find((j) => j.id === jobId)
      if (job) return job
    }
    return null
  },

  createJob(siteId: string, data: Omit<Job, 'id' | 'imageUrls' | 'shiftCount' | 'applicationCount' | 'createdAt' | 'updatedAt'>): Job {
    const sites = readStore()
    const idx = sites.findIndex((s) => s.id === siteId)
    if (idx === -1) throw new Error('Site not found')
    const now = new Date().toISOString()
    const newJob: Job = {
      ...data,
      id: `local-job-${Date.now()}`,
      imageUrls: [],
      shiftCount: 0,
      applicationCount: { pending: 0, accepted: 0, rejected: 0 },
      createdAt: now,
      updatedAt: now,
    }
    sites[idx] = {
      ...sites[idx],
      demoJobs: [...sites[idx].demoJobs, newJob],
      jobCount: sites[idx].jobCount + 1,
      updatedAt: now,
    }
    writeStore(sites)
    return newJob
  },

  updateJob(jobId: string, data: Partial<Job>): Job | null {
    const sites = readStore()
    for (const site of sites) {
      const jIdx = site.demoJobs.findIndex((j) => j.id === jobId)
      if (jIdx !== -1) {
        const updated: Job = { ...site.demoJobs[jIdx], ...data, updatedAt: new Date().toISOString() }
        site.demoJobs[jIdx] = updated
        writeStore(sites)
        return updated
      }
    }
    return null
  },

  deleteJob(jobId: string): boolean {
    const sites = readStore()
    for (const site of sites) {
      const jIdx = site.demoJobs.findIndex((j) => j.id === jobId)
      if (jIdx !== -1) {
        site.demoJobs.splice(jIdx, 1)
        site.jobCount = Math.max(0, site.jobCount - 1)
        site.updatedAt = new Date().toISOString()
        writeStore(sites)
        return true
      }
    }
    return false
  },
}
