'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import { siteStore } from '@/lib/demo/siteStore'
import type { Job, Site } from '@/types/manager-site-job'
import JobCard from './JobCard'
import StatusBadge from '@/components/manager/StatusBadge'
import type { JobStatus } from '@/types/manager-site-job'

interface AllJobsClientProps {
  locale: string
}

const STATUS_TABS: { key: JobStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'OPEN', label: '모집중' },
  { key: 'FILLED', label: '마감' },
  { key: 'COMPLETED', label: '완료' },
  { key: 'CANCELLED', label: '취소' },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse space-y-2">
      <div className="flex justify-between">
        <div className="h-4 bg-[#DDDDDD] rounded w-1/2" />
        <div className="h-5 bg-[#DDDDDD] rounded-full w-14" />
      </div>
      <div className="h-3 bg-[#DDDDDD] rounded w-1/3" />
      <div className="h-4 bg-[#DDDDDD] rounded w-1/4" />
      <div className="h-2 bg-[#DDDDDD] rounded w-full" />
    </div>
  )
}

// ── Site-grouped job list ──────────────────────────────────────────────────
function SiteGroupedJobList({
  jobs,
  sites,
  locale,
}: {
  jobs: Job[]
  sites: Site[]
  locale: string
}) {
  // Build siteId → Site map for enriching groups
  const siteMap = React.useMemo(() => {
    const m = new Map<string, Site>()
    for (const s of sites) m.set(s.id, s)
    return m
  }, [sites])

  // Group jobs by siteId preserving insertion order
  const groups = React.useMemo(() => {
    const map = new Map<string, Job[]>()
    for (const job of jobs) {
      if (!map.has(job.siteId)) map.set(job.siteId, [])
      map.get(job.siteId)!.push(job)
    }
    return Array.from(map.entries())
  }, [jobs])

  return (
    <div className="mt-3 space-y-6">
      {groups.map(([siteId, siteJobs]) => {
        const site = siteMap.get(siteId)
        const province = site?.province ?? ''
        const coverUrl = site?.coverImageUrl
        const siteStatus = site?.status

        return (
          <div key={siteId}>
            {/* ── Site header ─────────────────────────── */}
            <div className="flex items-center gap-3 mb-3 px-0.5">
              {/* Thumbnail */}
              <div
                className="w-10 h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-base"
                style={
                  coverUrl
                    ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: '#0669F7' }
                }
              >
                {!coverUrl && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>

              {/* Site info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#25282A] truncate">{siteJobs[0].siteName}</span>
                  {siteStatus === 'ACTIVE' && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8FBE8] text-[#1A6B1A] border border-[#86D98A]">
                      운영중
                    </span>
                  )}
                  {siteStatus === 'PAUSED' && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF3CD] text-[#856404]">
                      중단
                    </span>
                  )}
                  {siteStatus === 'COMPLETED' && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF1F5] text-[#98A2B2]">
                      완료
                    </span>
                  )}
                </div>
                {province && (
                  <p className="text-xs text-[#98A2B2] mt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {province}
                  </p>
                )}
              </div>

              {/* Job count badge */}
              <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F0FE] border border-[#C8D8FF]">
                <svg className="w-3.5 h-3.5 text-[#0669F7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-bold text-[#0669F7]">{siteJobs.length}</span>
              </div>
            </div>

            {/* ── Job cards under this site ─────────────── */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 border-l-2 border-[#E6F0FE]"
            >
              {siteJobs.map((job) => (
                <JobCard key={job.id} job={job} locale={locale} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Site picker modal
function SitePickerModal({
  sites,
  onSelect,
  onClose,
}: {
  sites: Site[]
  onSelect: (siteId: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#EFF1F5]">
          <h3 className="text-base font-semibold text-[#25282A]">현장 선택</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#98A2B2] hover:text-[#25282A]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="px-5 pt-3 pb-2 text-xs text-[#98A2B2]">공고를 등록할 현장을 선택하세요</p>
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {sites.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#98A2B2]">
              등록된 현장이 없습니다
            </div>
          ) : (
            <div className="space-y-2 mt-1">
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSelect(site.id)}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-[#EFF1F5] hover:border-[#0669F7] hover:bg-[#E6F0FE] transition-colors"
                >
                  <p className="text-sm font-medium text-[#25282A]">{site.name}</p>
                  <p className="text-xs text-[#98A2B2] mt-0.5">{site.province}{site.district ? ` · ${site.district}` : ''}</p>
                  <div className="mt-1">
                    <StatusBadge status={site.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AllJobsClient({ locale }: AllJobsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const idToken = getSessionCookie()
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [sites, setSites] = React.useState<Site[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<JobStatus | 'ALL'>('ALL')
  const [showSitePicker, setShowSitePicker] = React.useState(false)

  // URL search params
  const qParam = searchParams.get('q') ?? ''
  const siteParam = searchParams.get('site') ?? ''
  const statusParam = searchParams.get('status') ?? ''
  const newJobParam = searchParams.get('new') === '1'

  // Sync status tab from URL param
  React.useEffect(() => {
    if (statusParam && STATUS_TABS.some(t => t.key === statusParam)) {
      setActiveTab(statusParam as JobStatus | 'ALL')
    }
  }, [statusParam])

  // Auto-open site picker when ?new=1
  React.useEffect(() => {
    if (newJobParam && !isLoading) {
      setShowSitePicker(true)
    }
  }, [newJobParam, isLoading])

  React.useEffect(() => {
    if (!idToken) {
      setJobs(siteStore.listJobs())
      setSites(siteStore.list())
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    Promise.all([
      apiClient<Job[]>('/manager/jobs', { token: idToken }),
      apiClient<Site[]>('/manager/sites', { token: idToken }),
    ])
      .then(([jobsRes, sitesRes]) => {
        setJobs(jobsRes.data)
        setSites(sitesRes.data)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setIsLoading(false))
  }, [idToken])

  const isDemo = !idToken
  const displayJobs = jobs

  // Build siteId→province map for province filtering
  const siteProvinceMap = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sites) m.set(s.id, s.province ?? '')
    return m
  }, [sites])

  const filtered = React.useMemo(() => {
    let result = activeTab === 'ALL' ? displayJobs : displayJobs.filter((j) => j.status === activeTab)
    if (qParam) {
      const q = qParam.toLowerCase()
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) || j.siteName.toLowerCase().includes(q)
      )
    }
    if (siteParam) {
      result = result.filter(j => j.siteId === siteParam)
    }
    return result
  }, [displayJobs, activeTab, qParam, siteParam, siteProvinceMap])

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: displayJobs.length }
    for (const j of displayJobs) {
      counts[j.status] = (counts[j.status] ?? 0) + 1
    }
    return counts
  }, [displayJobs])

  // Active search filters for the chip bar
  const activeFilters = React.useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (qParam) chips.push({ key: 'q', label: `"${qParam}"` })
    if (siteParam) {
      const name = sites.find(s => s.id === siteParam)?.name
      chips.push({ key: 'site', label: `현장: ${name ?? siteParam}` })
    }
    return chips
  }, [qParam, siteParam, sites])

  function clearFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    router.push(`/manager/jobs${params.toString() ? `?${params}` : ''}` as never)
  }

  function handleSiteSelect(siteId: string) {
    setShowSitePicker(false)
    router.push(`/manager/sites/${siteId}/jobs/new`)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-[#FDE8EE] border border-[#F4A8B8] text-sm text-[#ED1C24] text-center">
        {error}
      </div>
    )
  }

  return (
    <>
      {/* Demo badge */}
      {isDemo && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFE9B0] text-[#856404] border border-[#F5D87D]">
            데모 데이터
          </span>
          <span className="text-xs text-[#98A2B2]">실제 공고를 등록하면 여기에 표시됩니다</span>
        </div>
      )}

      {/* Active search filter chips */}
      {activeFilters.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#98A2B2] font-medium">검색 조건:</span>
          {activeFilters.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#E6F0FE] text-[#0669F7] border border-[#C8D8FF]"
            >
              {chip.label}
              <button
                type="button"
                aria-label="필터 제거"
                onClick={() => clearFilter(chip.key)}
                className="hover:text-[#0554D6]"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => router.push('/manager/jobs' as never)}
            className="text-xs text-[#98A2B2] hover:text-[#25282A] underline"
          >
            전체 초기화
          </button>
        </div>
      )}

      {/* Tab filter */}
      <div className="sticky top-0 z-10 bg-[#F2F4F5] -mx-4 px-4 pb-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#0669F7] text-white border-[#0669F7]'
                  : 'bg-white text-[#98A2B2] border-[#EFF1F5]'
              }`}
            >
              {tab.label}
              {(tabCounts[tab.key] ?? 0) > 0 && (
                <span className="ml-1">{tabCounts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Job list — grouped by site */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-14 h-14 text-[#EFF1F5] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-[#98A2B2] text-sm mb-4">
            {activeTab === 'ALL' ? '등록된 공고가 없습니다' : '해당 상태의 공고가 없습니다'}
          </p>
          {activeTab === 'ALL' && (
            <button
              type="button"
              onClick={() => setShowSitePicker(true)}
              className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm"
            >
              첫 공고 등록하기
            </button>
          )}
        </div>
      ) : (
        <SiteGroupedJobList jobs={filtered} sites={sites} locale={locale} />
      )}

      {/* FAB — new job */}
      <button
        type="button"
        onClick={() => setShowSitePicker(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#0669F7] shadow-lg flex items-center justify-center text-white z-40"
        aria-label="새 공고 등록"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Site picker modal */}
      {showSitePicker && (
        <SitePickerModal
          sites={sites.filter((s) => s.status === 'ACTIVE')}
          onSelect={handleSiteSelect}
          onClose={() => setShowSitePicker(false)}
        />
      )}
    </>
  )
}
