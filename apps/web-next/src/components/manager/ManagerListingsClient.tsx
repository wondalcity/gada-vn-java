'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { getSessionCookie } from '@/lib/auth/session'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ManagerSite {
  id: string
  name: string
  address: string
  province: string
  district?: string
  siteType?: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  coverImageUrl?: string
  imageUrls: string[]
  jobCount: number
}

interface ManagerJob {
  id: string
  slug: string
  siteId: string
  siteName: string
  title: string
  workDate: string
  startTime?: string
  endTime?: string
  dailyWage: number
  currency: string
  slotsTotal: number
  slotsFilled: number
  status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'
  coverImageUrl?: string
  applicationCount: { pending: number; accepted: number }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatVnd(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
}

const SITE_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE:    { label: '운영중',   bg: '#D1F3D3', text: '#024209' },
  PAUSED:    { label: '일시중지', bg: '#FFF7DC', text: '#6B4C00' },
  COMPLETED: { label: '완료',    bg: '#EFF1F5', text: '#595959' },
}
const JOB_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  OPEN:      { label: '모집중',  bg: '#D1F3D3', text: '#024209', dot: '#00C800' },
  FILLED:    { label: '마감',    bg: '#EFF1F5', text: '#595959', dot: '#B2B2B2' },
  CANCELLED: { label: '취소',    bg: '#FFDCE0', text: '#540C0E', dot: '#D81A48' },
  COMPLETED: { label: '완료',    bg: '#EFF1F5', text: '#595959', dot: '#B2B2B2' },
}

// ── Site Card ──────────────────────────────────────────────────────────────────

function SitePreviewCard({ site, locale }: { site: ManagerSite; locale: string }) {
  const s = SITE_STATUS[site.status] ?? SITE_STATUS.ACTIVE
  return (
    <div className="bg-white rounded border border-[#EFF1F5] overflow-hidden">
      {/* Cover image */}
      <div className="relative w-full h-32 bg-gradient-to-br from-[#0454C5] via-[#0669F7] to-[#3186FF]">
        {site.coverImageUrl ? (
          <img src={site.coverImageUrl} alt={site.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <span
          className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: s.bg, color: s.text }}
        >
          {s.label}
        </span>
        {/* Job count */}
        {site.jobCount > 0 && (
          <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            공고 {site.jobCount}개
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-[#25282A] truncate">{site.name}</p>
        <p className="text-xs text-[#98A2B2] mt-0.5 truncate">{site.address}</p>
        {site.siteType && (
          <p className="text-xs text-[#98A2B2] mt-0.5">{site.siteType}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-[#EFF1F5]">
        <Link
          href={`/${locale}/manager/sites/${site.id}`}
          className="flex-1 py-2.5 text-xs font-medium text-[#98A2B2] text-center hover:bg-gray-50 transition-colors"
        >
          상세보기
        </Link>
        <div className="w-px bg-[#EFF1F5]" />
        <Link
          href={`/${locale}/manager/sites/${site.id}/jobs/new`}
          className="flex-1 py-2.5 text-xs font-medium text-[#0669F7] text-center hover:bg-[#E6F0FE] transition-colors"
        >
          + 공고 추가
        </Link>
        <div className="w-px bg-[#EFF1F5]" />
        <Link
          href={`/${locale}/manager/sites/${site.id}/edit`}
          className="flex-1 py-2.5 text-xs font-medium text-[#98A2B2] text-center hover:bg-gray-50 transition-colors"
        >
          수정
        </Link>
      </div>
    </div>
  )
}

// ── Job Preview Card (근로자와 동일한 형식) ───────────────────────────────────

function JobPreviewCard({ job, locale }: { job: ManagerJob; locale: string }) {
  const s = JOB_STATUS[job.status] ?? JOB_STATUS.OPEN
  const slotsProgress = job.slotsTotal > 0
    ? Math.min((job.slotsFilled / job.slotsTotal) * 100, 100)
    : 0
  const remaining = job.slotsTotal - job.slotsFilled
  const isAlmostFull = remaining <= 2 && remaining > 0 && job.status === 'OPEN'
  const hasPending = job.applicationCount.pending > 0

  return (
    <Link
      href={`/${locale}/manager/jobs/${job.id}`}
      className="group block bg-white rounded border border-[#EFF1F5] hover:border-[#0669F7] hover:shadow-md transition-all overflow-hidden"
    >
      {/* Cover image */}
      <div className="relative w-full h-36 overflow-hidden bg-gradient-to-br from-[#0454C5] via-[#0669F7] to-[#3186FF]">
        {job.coverImageUrl ? (
          <img
            src={job.coverImageUrl}
            alt={job.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: s.bg, color: s.text }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.dot }} />
            {s.label}
          </span>
        </div>

        {/* Pending applications badge */}
        {hasPending && (
          <div className="absolute top-2 right-2 bg-[#D81A48] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            대기 {job.applicationCount.pending}명
          </div>
        )}

        {/* Almost full warning */}
        {isAlmostFull && !hasPending && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            잔여 {remaining}자리
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Site name */}
        <p className="text-[11px] text-[#98A2B2] mb-0.5 truncate">{job.siteName}</p>

        {/* Title */}
        <p className="text-sm font-semibold text-[#25282A] leading-snug line-clamp-2 mb-2">
          {job.title}
        </p>

        {/* Date & wage */}
        <div className="flex items-center justify-between text-xs text-[#98A2B2] mb-2">
          <span>{formatDate(job.workDate)}</span>
          <span className="font-bold text-[#25282A]">{formatVnd(job.dailyWage)}</span>
        </div>

        {/* Slots progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-[#EFF1F5] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${slotsProgress}%`,
                background: slotsProgress >= 100 ? '#B2B2B2' : '#0669F7',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#98A2B2]">
            <span>채용 {job.slotsFilled}/{job.slotsTotal}명</span>
            {job.applicationCount.accepted > 0 && (
              <span className="text-green-600">확정 {job.applicationCount.accepted}명</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({
  title, desc, ctaLabel, ctaHref,
}: { title: string; desc: string; ctaLabel: string; ctaHref: string }) {
  return (
    <div className="bg-white rounded border border-dashed border-[#EFF1F5] p-10 text-center">
      <svg className="w-12 h-12 text-[#EFF1F5] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 4v16m8-8H4" />
      </svg>
      <p className="text-sm font-medium text-[#25282A] mb-1">{title}</p>
      <p className="text-xs text-[#98A2B2] mb-4">{desc}</p>
      <Link
        href={ctaHref as never}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-medium"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

type Tab = 'sites' | 'jobs'

export default function ManagerListingsClient({ locale }: { locale: string }) {
  const [tab, setTab] = React.useState<Tab>('jobs')
  const [sites, setSites] = React.useState<ManagerSite[]>([])
  const [jobs, setJobs] = React.useState<ManagerJob[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const idToken = getSessionCookie()

  React.useEffect(() => {
    if (!idToken) return
    setIsLoading(true)
    Promise.all([
      fetch(`${API_BASE}/manager/sites`, {
        headers: { Authorization: `Bearer ${idToken}` },
      }).then((r) => r.json()),
      fetch(`${API_BASE}/manager/jobs`, {
        headers: { Authorization: `Bearer ${idToken}` },
      }).then((r) => r.json()),
    ])
      .then(([sitesRes, jobsRes]) => {
        setSites(sitesRes.data ?? sitesRes ?? [])
        setJobs(jobsRes.data ?? jobsRes ?? [])
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setIsLoading(false))
  }, [idToken])

  // Filter stats
  const openJobs = jobs.filter((j) => j.status === 'OPEN').length
  const pendingTotal = jobs.reduce((acc, j) => acc + j.applicationCount.pending, 0)
  const activeSites = sites.filter((s) => s.status === 'ACTIVE').length

  return (
    <div className="max-w-[1760px] mx-auto px-4 pt-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#25282A]">내 현장·공고</h1>
          <p className="text-xs text-[#98A2B2] mt-0.5">근로자에게 보이는 화면으로 미리볼 수 있습니다</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: '운영중 현장', value: activeSites, color: 'text-[#0669F7]' },
          { label: '모집중 공고', value: openJobs, color: 'text-green-600' },
          { label: '대기 지원자', value: pendingTotal, color: 'text-orange-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded border border-[#EFF1F5] p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#98A2B2] mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + CTA */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-1 bg-white rounded border border-[#EFF1F5] p-0.5">
          {(['jobs', 'sites'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
                tab === t
                  ? 'bg-[#0669F7] text-white shadow-sm'
                  : 'text-[#98A2B2] hover:text-[#25282A]'
              }`}
            >
              {t === 'jobs' ? `공고 (${jobs.length})` : `현장 (${sites.length})`}
            </button>
          ))}
        </div>

        {/* Context-aware add button */}
        {tab === 'sites' ? (
          <Link
            href={`/${locale}/manager/sites/new`}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0669F7] text-white text-sm font-medium whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            현장 추가
          </Link>
        ) : (
          <Link
            href={`/${locale}/manager/sites`}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0669F7] text-white text-sm font-medium whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            공고 추가
          </Link>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded border border-[#EFF1F5] animate-pulse">
              <div className="h-36 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-sm text-[#D81A48] text-center">
          {error}
        </div>
      ) : tab === 'jobs' ? (
        jobs.length === 0 ? (
          <EmptyState
            title="등록된 공고가 없습니다"
            desc="현장을 등록한 후 공고를 올려보세요"
            ctaLabel="첫 현장 등록하기"
            ctaHref={`/${locale}/manager/sites/new`}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {jobs.map((job) => (
              <JobPreviewCard key={job.id} job={job} locale={locale} />
            ))}
          </div>
        )
      ) : (
        sites.length === 0 ? (
          <EmptyState
            title="등록된 현장이 없습니다"
            desc="첫 번째 건설 현장을 등록해보세요"
            ctaLabel="현장 등록하기"
            ctaHref={`/${locale}/manager/sites/new`}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sites.map((site) => (
              <SitePreviewCard key={site.id} site={site} locale={locale} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
