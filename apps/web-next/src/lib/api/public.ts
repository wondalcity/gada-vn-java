const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

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
  provinceNameVi: string
  provinceSlug: string
  siteSlug: string
  siteNameKo: string
  workDate: string
  startTime?: string
  endTime?: string
  dailyWage: number
  slotsTotal: number
  slotsFilled: number
  status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'
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
  requirements?: string[]
  site: {
    slug: string
    nameKo: string
    nameVi: string
    address: string
    province: string
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
}): Promise<PublicJobsResponse> {
  const qs = new URLSearchParams()
  if (params.provinceSlug)   qs.set('province', params.provinceSlug)
  if (params.tradeId)        qs.set('tradeId', String(params.tradeId))
  if (params.siteSlug)       qs.set('site', params.siteSlug)
  if (params.page)           qs.set('page', String(params.page))
  if (params.locale)         qs.set('locale', params.locale)
  if (params.lat != null)    qs.set('lat', String(params.lat))
  if (params.lng != null)    qs.set('lng', String(params.lng))
  if (params.radiusKm)       qs.set('radiusKm', String(params.radiusKm))
  if (params.statusFilter)   qs.set('statusFilter', params.statusFilter)
  const cacheOptions = params.lat != null
    ? { cache: 'no-store' as const }  // geo results are personalized, skip CDN cache
    : { next: { revalidate: 60, tags: ['JOBS_LISTING'] } as const }
  const res = await fetch(`${BASE}/public/jobs?${qs}`, cacheOptions)
  if (!res.ok) return { jobs: [], total: 0, page: 1, totalPages: 0 }
  const json = await res.json()
  return json.data
}

export async function fetchPublicJobBySlug(slug: string, locale = 'ko'): Promise<PublicJobDetail | null> {
  const res = await fetch(`${BASE}/public/jobs/${slug}?locale=${locale}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data
}

export async function fetchPublicSiteBySlug(slug: string, locale = 'ko'): Promise<PublicSite | null> {
  const res = await fetch(`${BASE}/public/sites/${slug}?locale=${locale}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data
}

export async function fetchProvinces(locale = 'ko'): Promise<Province[]> {
  const res = await fetch(`${BASE}/public/provinces?locale=${locale}`, {
    next: { revalidate: 86400, tags: ['PROVINCES'] },
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function fetchTrades(locale = 'ko'): Promise<Trade[]> {
  const res = await fetch(`${BASE}/public/trades?locale=${locale}`, {
    next: { revalidate: 86400, tags: ['TRADES'] },
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function fetchProvinceBySlug(slug: string, locale = 'ko'): Promise<Province | null> {
  const provinces = await fetchProvinces(locale)
  return provinces.find(p => p.slug === slug) ?? null
}
