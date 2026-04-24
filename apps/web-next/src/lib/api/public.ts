// Server-side: use INTERNAL_API_URL (runtime env) so the staging URL is never baked-in at build time.
// Client-side: fall back to NEXT_PUBLIC_API_BASE_URL (baked at build time) or production URL.
const BASE =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.gada.vn/api/v1'

// Cache tags for ISR revalidation
export const CACHE_TAGS = {
  JOBS_LISTING: 'JOBS_LISTING',
  JOB_DETAIL: (slug: string) => `job-${slug}`,
  SITE_DETAIL: (slug: string) => `site-${slug}`,
  PROVINCES: 'PROVINCES',
  TRADES: 'TRADES',
} as const

export interface Trade {
  id: number
  code: string
  nameKo: string
  nameVi: string
  nameEn?: string
}

export interface Province {
  code: string
  nameVi: string
  nameEn: string
  slug: string
}

export interface PublicJob {
  id: string
  slug: string
  titleKo: string
  titleVi: string
  tradeNameKo: string
  tradeNameVi: string
  tradeNameEn?: string
  provinceNameVi: string
  provinceNameEn?: string
  provinceSlug: string
  siteSlug: string
  siteName?: string
  siteNameKo: string
  workDate: string
  startTime?: string
  endTime?: string
  dailyWage: number
  slotsTotal: number
  slotsFilled: number
  status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'
  expiresAt?: string
  coverImageUrl?: string
  publishedAt: string
  distanceKm?: number
  siteLat?: number
  siteLng?: number
  siteAddress?: string
}

export interface PublicJobDetail extends PublicJob {
  descriptionKo?: string
  descriptionVi?: string
  benefits?: string[]
  requirementsObj?: { minExperienceMonths?: number; notes?: string }
  site: {
    slug: string
    nameKo: string
    nameVi: string
    nameEn?: string
    address: string
    province: string
    provinceEn?: string
    provinceSlug: string
    lat?: number
    lng?: number
    imageUrls?: string[]
    coverImageUrl?: string
  }
  relatedJobs?: PublicJob[]
}

export interface PublicSite {
  id: string
  slug: string
  nameKo: string
  nameVi: string
  address: string
  province: string
  provinceSlug: string
  siteType?: string
  imageUrls?: string[]
  coverImageUrl?: string
  lat?: number
  lng?: number
  managerCompany?: string
  activeJobCount: number
}

export interface PublicJobsResponse {
  jobs: PublicJob[]
  total: number
  page: number
  totalPages: number
  provinces?: Province[]
  trades?: Trade[]
}

export interface WageStats {
  minWage: number
  maxWage: number
}

export async function fetchWageStats(): Promise<WageStats> {
  try {
    const res = await fetch(`${BASE}/public/wage-stats`, {
      next: { revalidate: 300, tags: ['WAGE_STATS'] },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { minWage: 0, maxWage: 0 }
    const json = await res.json()
    return json.data ?? { minWage: 0, maxWage: 0 }
  } catch {
    return { minWage: 0, maxWage: 0 }
  }
}

export async function fetchPublicJobs(params: {
  provinceSlug?: string
  tradeId?: number
  siteSlug?: string
  page?: number
  locale?: string
  lat?: number
  lng?: number
  radiusKm?: number
  statusFilter?: string
  q?: string
  minWage?: number
  maxWage?: number
}): Promise<PublicJobsResponse> {
  const qs = new URLSearchParams()
  if (params.q)              qs.set('q', params.q)
  if (params.provinceSlug)   qs.set('province', params.provinceSlug)
  if (params.tradeId)        qs.set('tradeId', String(params.tradeId))
  if (params.siteSlug)       qs.set('site', params.siteSlug)
  if (params.page)           qs.set('page', String(params.page))
  if (params.locale)         qs.set('locale', params.locale)
  if (params.lat != null)    qs.set('lat', String(params.lat))
  if (params.lng != null)    qs.set('lng', String(params.lng))
  if (params.radiusKm)       qs.set('radiusKm', String(params.radiusKm))
  if (params.statusFilter)   qs.set('statusFilter', params.statusFilter)
  if (params.minWage != null) qs.set('minWage', String(params.minWage))
  if (params.maxWage != null) qs.set('maxWage', String(params.maxWage))
  const cacheOptions = params.lat != null || params.q || params.minWage != null || params.maxWage != null
    ? { cache: 'no-store' as const }  // geo/search/wage filter results skip CDN cache
    : { next: { revalidate: 60, tags: ['JOBS_LISTING'] as string[] } }
  try {
    const res = await fetch(`${BASE}/public/jobs?${qs}`, {
      ...cacheOptions,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { jobs: [], total: 0, page: 1, totalPages: 0 }
    const json = await res.json()
    return json.data
  } catch {
    return { jobs: [], total: 0, page: 1, totalPages: 0 }
  }
}

export async function fetchPublicJobBySlug(slug: string, locale = 'ko'): Promise<PublicJobDetail | null> {
  try {
    const res = await fetch(`${BASE}/public/jobs/${slug}?locale=${locale}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export async function fetchPublicSiteBySlug(slug: string, locale = 'ko'): Promise<PublicSite | null> {
  try {
    const res = await fetch(`${BASE}/public/sites/${slug}?locale=${locale}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export async function fetchProvinces(locale = 'ko'): Promise<Province[]> {
  try {
    const res = await fetch(`${BASE}/public/provinces?locale=${locale}`, {
      next: { revalidate: 86400, tags: ['PROVINCES'] },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export async function fetchTrades(locale = 'ko'): Promise<Trade[]> {
  try {
    const res = await fetch(`${BASE}/public/trades?locale=${locale}`, {
      next: { revalidate: 86400, tags: ['TRADES'] },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export async function fetchProvinceBySlug(slug: string, locale = 'ko'): Promise<Province | null> {
  const provinces = await fetchProvinces(locale)
  return provinces.find(p => p.slug === slug) ?? null
}
