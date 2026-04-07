import { Link } from '@/i18n/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getAuthUser } from '../../../../lib/auth/server'
import { apiClient } from '../../../../lib/api/client'
import { ManagerActionButton } from '../../../../components/worker/ManagerActionButton'
import WorkerAccountShell from '../../../../components/worker/WorkerAccountShell'
import type { ApplicationStatus } from '../../../../types/application'
import { formatDateShort } from '../../../../lib/utils/date'

interface Props { params: Promise<{ locale: string }> }

type ApiStatus = 'APPLIED' | 'HIRED' | 'COMPLETED' | 'REJECTED'

interface RawApplication {
  id: string
  jobId: string
  jobTitle: string
  siteName: string
  workDate: string
  dailyWage: number
  status: ApiStatus | string
  jobStatus: string
  appliedAt: string
  contractId?: string
}

const DEMO_APPLICATIONS: RawApplication[] = [
  {
    id: 'demo-app-1',
    jobId: 'djob-1',
    jobTitle: '전기 배선 작업',
    siteName: '롯데몰 하노이 지하 1층 공사',
    workDate: '2026-03-28',
    dailyWage: 700000,
    status: 'CONTRACTED',
    jobStatus: 'FILLED',
    appliedAt: '2026-03-20T08:30:00Z',
  },
  {
    id: 'demo-app-2',
    jobId: 'djob-3',
    jobTitle: '잡부 — 자재 운반',
    siteName: '인천 송도 물류센터',
    workDate: '2026-03-30',
    dailyWage: 410000,
    status: 'ACCEPTED',
    jobStatus: 'OPEN',
    appliedAt: '2026-03-22T09:15:00Z',
  },
  {
    id: 'demo-app-3',
    jobId: 'djob-5',
    jobTitle: '타일 시공 — 로비 바닥',
    siteName: '광명역 복합쇼핑몰 신축',
    workDate: '2026-04-01',
    dailyWage: 580000,
    status: 'PENDING',
    jobStatus: 'OPEN',
    appliedAt: '2026-03-25T10:00:00Z',
  },
  {
    id: 'demo-app-4',
    jobId: 'djob-6',
    jobTitle: '도장 작업 — 외벽 마감',
    siteName: '호치민 스카이라인 빌딩',
    workDate: '2026-03-20',
    dailyWage: 490000,
    status: 'REJECTED',
    jobStatus: 'CANCELLED',
    appliedAt: '2026-03-12T14:00:00Z',
  },
]

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  APPLIED:    { color: '#856404', bg: '#FFF3CD' },
  HIRED:      { color: '#1A6B1A', bg: '#E8FBE8' },
  COMPLETED:  { color: '#0669F7', bg: '#E6F0FE' },
  REJECTED:   { color: '#D81A48', bg: '#FDE8EE' },
  PENDING:    { color: '#856404', bg: '#FFF3CD' },
  ACCEPTED:   { color: '#1A6B1A', bg: '#E8FBE8' },
  CONTRACTED: { color: '#0669F7', bg: '#E6F0FE' },
  WITHDRAWN:  { color: '#98A2B2', bg: '#EFF1F5' },
}


function formatWage(n: number | null | undefined) {
  if (n == null) return '-'
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  const p = phone.trim()
  if (p.startsWith('+84')) {
    const d = p.slice(3)
    if (d.length === 9) return `+84 ${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
  }
  if (p.startsWith('+82')) {
    const d = p.slice(3)
    if (d.length >= 9) return `+82 ${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`
  }
  return p
}

export default async function WorkerHomePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'worker' })
  const cookieStore = await cookies()
  const token = cookieStore.get('gada_session')?.value

  const [user, appsRes] = await Promise.all([
    getAuthUser(),
    token
      ? apiClient<RawApplication[]>('/applications/mine?limit=10', { token, cache: 'no-store' }).catch(() => null)
      : Promise.resolve(null),
  ])

  const rawApplications: RawApplication[] = appsRes?.data ?? []
  const isDemo = !token || (user?.isTestAccount ?? false)
  const applications: RawApplication[] = isDemo ? DEMO_APPLICATIONS : rawApplications

  const counts = {
    pending:  applications.filter(a => a.status === 'APPLIED' || a.status === 'PENDING').length,
    accepted: applications.filter(a => a.status === 'HIRED' || a.status === 'COMPLETED' || a.status === 'ACCEPTED' || a.status === 'CONTRACTED').length,
    rejected: applications.filter(a => a.status === 'REJECTED' || a.status === 'WITHDRAWN').length,
  }

  const displayName = user?.name ?? user?.phone ?? t('dashboard.role_worker')
  const initial = displayName.charAt(0).toUpperCase()
  const isManager = (user?.isManager ?? false) || user?.managerStatus === 'active'
  const recent = applications.slice(0, 5)

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={isManager}
      managerStatus={user?.managerStatus}
    >
      {/* ────────────────────────────────────────────────────
          MOBILE ONLY: profile hero card (replaces LNB info)
          ──────────────────────────────────────────────────── */}
      <div className="md:hidden mb-5">
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0669F7 0%, #1A4FD6 100%)' }}
        >
          {/* background decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
          <div className="absolute right-8 bottom-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/2" />

          <div className="relative flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-base leading-tight">{displayName}</p>
                <Link href={'/worker/settings' as never} className="opacity-70 hover:opacity-100 transition-opacity">
                  <span className="text-lg leading-none">⚙️</span>
                </Link>
              </div>
              {user?.phone && (
                <p className="text-blue-100 text-xs mt-0.5">{formatPhone(user.phone)}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white leading-none">
                  {t('dashboard.role_worker')}
                </span>
                {isManager && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/80 text-amber-900 leading-none">
                    {t('dashboard.role_manager')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inline stats */}
          <div className="relative grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
            {[
              { label: t('dashboard.stat.pending'),  value: counts.pending },
              { label: t('dashboard.stat.accepted'), value: counts.accepted },
              { label: t('dashboard.stat.rejected'), value: counts.rejected },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-extrabold leading-none">{value}</p>
                <p className="text-blue-100 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Manager action button — always shown */}
          <ManagerActionButton
            locale={locale}
            isManager={isManager}
            managerStatus={user?.managerStatus}
            variant="hero"
          />
        </div>

        {/* Mobile quick actions */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { href: '/worker/applications', icon: '📋', label: t('dashboard.quick_actions.applications') },
            { href: '/worker/contracts',    icon: '📄', label: t('dashboard.quick_actions.contracts') },
            { href: '/worker/profile',      icon: '👤', label: t('dashboard.quick_actions.profile') },
            { href: '/jobs',                icon: '🔍', label: t('dashboard.quick_actions.find_jobs') },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href as never}
              className="flex flex-col items-center gap-1.5 bg-white rounded-xl py-3 shadow-sm border border-[#EFF1F5] active:bg-[#E6F0FE] transition-colors"
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[11px] font-medium text-[#4B5563]">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────
          DESKTOP ONLY: compact page header (no profile dup)
          ──────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#25282A]">{t('dashboard.activity_title')}</h1>
          <p className="text-sm text-[#98A2B2] mt-0.5">{t('dashboard.activity_subtitle')}</p>
        </div>
        <Link
          href={'/jobs' as never}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0669F7] text-white text-sm font-semibold hover:bg-[#0554D6] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          {t('dashboard.find_jobs')}
        </Link>
      </div>

      {/* ────────────────────────────────────────────────────
          DESKTOP ONLY: stat cards row
          ──────────────────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-3 gap-3 mb-6">
        {[
          { label: t('dashboard.stat.pending'),  count: counts.pending,  color: '#856404', bg: '#FFF3CD', border: '#F5D87D' },
          { label: t('dashboard.stat.accepted'), count: counts.accepted, color: '#1A6B1A', bg: '#E8FBE8', border: '#86D98A' },
          { label: t('dashboard.stat.rejected'), count: counts.rejected, color: '#D81A48', bg: '#FDE8EE', border: '#F4B0C0' },
        ].map(({ label, count, color, bg, border }) => (
          <div
            key={label}
            className="rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{ backgroundColor: bg, border: `1px solid ${border}` }}
          >
            <div>
              <p className="text-xs font-medium" style={{ color }}>{label}</p>
              <p className="text-3xl font-extrabold mt-0.5" style={{ color }}>{count}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-20" style={{ backgroundColor: color }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────
          Recent applications — full width
          ──────────────────────────────────────────────────── */}
      <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#25282A]">{t('dashboard.recent_section')}</h2>
              {isDemo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  {t('dashboard.demo_badge')}
                </span>
              )}
            </div>
            <Link href={'/worker/applications' as never} className="text-sm text-[#0669F7] font-medium hover:underline">
              {t('dashboard.view_all')}
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-[#EFF1F5]">
              <div className="w-14 h-14 rounded-full bg-[#E6F0FE] flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-[#0669F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-[#25282A] font-semibold text-sm mb-1">{t('dashboard.empty_title')}</p>
              <p className="text-[#98A2B2] text-xs mb-4">{t('dashboard.empty_subtitle')}</p>
              <Link
                href={'/jobs' as never}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0669F7] text-white text-sm font-bold hover:bg-[#0554D6] transition-colors"
              >
                {t('dashboard.browse_jobs')}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(app => {
                const colors = STATUS_COLORS[app.status] ?? { color: '#6B7280', bg: '#F3F4F6' }
                const statusLabel = t(`dashboard.status_config.${app.status.toLowerCase()}` as any) ?? app.status
                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm border border-[#EFF1F5] hover:border-[#C8D8FF] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#25282A] text-sm truncate">{app.jobTitle}</p>
                      <p className="text-xs text-[#98A2B2] mt-0.5">
                        {app.siteName} · {app.workDate ? formatDateShort(app.workDate, locale) : '-'}
                      </p>
                      <p className="text-sm font-bold text-[#0669F7] mt-1">{formatWage(app.dailyWage)}</p>
                    </div>
                    <span
                      className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ color: colors.color, backgroundColor: colors.bg }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                )
              })}

              {applications.length > 5 && (
                <Link
                  href={'/worker/applications' as never}
                  className="flex items-center justify-center gap-1.5 w-full py-3 text-sm text-[#0669F7] font-semibold border border-[#C8D8FF] rounded-2xl bg-white hover:bg-[#E6F0FE] transition-colors"
                >
                  {t('dashboard.view_more', { n: applications.length - 5 })}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
              )}
            </div>
          )}

      </div>
    </WorkerAccountShell>
  )
}
