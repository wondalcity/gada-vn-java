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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  APPLIED:    { label: '검토 대기', className: 'status-pending border' },
  PENDING:    { label: '검토 대기', className: 'status-pending border' },
  HIRED:      { label: '합격', className: 'status-accepted border' },
  ACCEPTED:   { label: '합격', className: 'status-accepted border' },
  COMPLETED:  { label: '계약 완료', className: 'status-contracted border' },
  CONTRACTED: { label: '계약 완료', className: 'status-contracted border' },
  REJECTED:   { label: '불합격', className: 'status-rejected border' },
  WITHDRAWN:  { label: '취소', className: 'status-withdrawn border' },
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

// Quick action SVG icons
function IconApplications() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}
// Stat card icons
function IconPending() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconAccepted() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconRejected() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconContracts() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function IconProfile() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
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

  const applications: RawApplication[] = appsRes?.data ?? []

  const counts = {
    pending:  applications.filter(a => a.status === 'APPLIED' || a.status === 'PENDING').length,
    accepted: applications.filter(a => a.status === 'HIRED' || a.status === 'COMPLETED' || a.status === 'ACCEPTED' || a.status === 'CONTRACTED').length,
    rejected: applications.filter(a => a.status === 'REJECTED' || a.status === 'WITHDRAWN').length,
  }

  const displayName = user?.name ?? user?.phone ?? t('dashboard.role_worker')
  const initial = displayName.charAt(0).toUpperCase()
  const isManager = (user?.isManager ?? false) || user?.managerStatus === 'active'
  const recent = applications.slice(0, 5)

  const quickActions = [
    { href: '/worker/applications', Icon: IconApplications, label: t('dashboard.quick_actions.applications') },
    { href: '/worker/contracts',    Icon: IconContracts,    label: t('dashboard.quick_actions.contracts') },
    { href: '/worker/profile',      Icon: IconProfile,      label: t('dashboard.quick_actions.profile') },
    { href: '/jobs',                Icon: IconSearch,       label: t('dashboard.quick_actions.find_jobs') },
  ]

  const statItems = [
    { label: t('dashboard.stat.pending'),  value: counts.pending,  className: 'text-[#92620A]',  bgClass: 'bg-[#FFF8E6] border border-[#F5D87D]',  iconColor: '#92620A',  Icon: IconPending  },
    { label: t('dashboard.stat.accepted'), value: counts.accepted, className: 'text-[#1A6B1A]',  bgClass: 'bg-[#E6F9E6] border border-[#86D98A]',  iconColor: '#1A6B1A',  Icon: IconAccepted },
    { label: t('dashboard.stat.rejected'), value: counts.rejected, className: 'text-[#ED1C24]',  bgClass: 'bg-[#FDE8EE] border border-[#F4B0C0]',  iconColor: '#ED1C24',  Icon: IconRejected },
  ]

  return (
    <WorkerAccountShell
      locale={locale}
      userName={user?.name ?? null}
      userPhone={user?.phone}
      isManager={isManager}
      managerStatus={user?.managerStatus}
    >
      {/* ── MOBILE: profile card ──────────────────────────── */}
      <div className="md:hidden mb-5">
        <div className="rounded-3xl p-5 bg-[#0669F7] relative overflow-hidden">
          {/* Subtle geometric decoration — no gradients */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/[0.06] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="absolute right-8 bottom-0 w-20 h-20 rounded-full bg-white/[0.06] translate-y-1/2 pointer-events-none" />

          {/* Profile row */}
          <div className="relative flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base text-white leading-tight truncate">{displayName}</p>
                <Link href={'/worker/settings' as never} className="text-white/60 hover:text-white/90 transition-colors flex-shrink-0" aria-label="설정">
                  <IconSettings />
                </Link>
              </div>
              {user?.phone && (
                <p className="text-white/70 text-xs mt-0.5">{formatPhone(user.phone)}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white leading-none">
                  {t('dashboard.role_worker')}
                </span>
                {isManager && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFC72C] text-[#3C2C02] leading-none">
                    {t('dashboard.role_manager')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inline stats */}
          <div className="relative grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
            {statItems.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
                <p className="text-white/70 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Manager action */}
          <ManagerActionButton
            locale={locale}
            isManager={isManager}
            managerStatus={user?.managerStatus}
            variant="hero"
          />
        </div>

        {/* Quick actions — SVG icons, no emoji */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {quickActions.map(({ href, Icon, label }) => (
            <Link
              key={href}
              href={href as never}
              className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3.5 border border-[#EFF1F5] shadow-sm active:bg-[#E6F0FE] transition-colors press-effect"
            >
              <span className="text-[#0669F7]"><Icon /></span>
              <span className="text-[11px] font-medium text-[#4B5563] leading-tight text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── DESKTOP: page header ──────────────────────────── */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#25282A]">{t('dashboard.activity_title')}</h1>
          <p className="text-sm text-[#98A2B2] mt-0.5">{t('dashboard.activity_subtitle')}</p>
        </div>
        <Link
          href={'/jobs' as never}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-bold hover:bg-[#0557D4] transition-colors min-h-[44px] focus-ring"
        >
          <IconSearch />
          {t('dashboard.find_jobs')}
        </Link>
      </div>

      {/* ── DESKTOP: stat cards ───────────────────────────── */}
      <div className="hidden md:grid grid-cols-3 gap-3 mb-6">
        {statItems.map(({ label, value, className, bgClass, iconColor, Icon }) => (
          <div
            key={label}
            className={`rounded-3xl px-5 py-4 flex items-center justify-between ${bgClass}`}
          >
            <div>
              <p className={`text-xs font-medium ${className}`}>{label}</p>
              <p className={`text-3xl font-extrabold mt-0.5 ${className}`}>{value}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-30"
              style={{ backgroundColor: iconColor, color: '#fff' }}>
              <Icon />
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent applications ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#25282A]">{t('dashboard.recent_section')}</h2>
          </div>
          <Link href={'/worker/applications' as never} className="text-sm text-[#0669F7] font-medium hover:underline">
            {t('dashboard.view_all')}
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#EFF1F5]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="w-14 h-14 rounded-full bg-[#E6F0FE] flex items-center justify-center mx-auto mb-3">
              <IconApplications />
            </div>
            <p className="text-[#25282A] font-semibold text-sm mb-1">{t('dashboard.empty_title')}</p>
            <p className="text-[#98A2B2] text-xs mb-4">{t('dashboard.empty_subtitle')}</p>
            <Link
              href={'/jobs' as never}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-bold hover:bg-[#0557D4] transition-colors focus-ring"
            >
              {t('dashboard.browse_jobs')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(app => {
              const cfg = STATUS_CONFIG[app.status] ?? { label: app.status, className: 'status-withdrawn border' }
              return (
                <Link
                  key={app.id}
                  href={`/worker/applications/${app.id}` as never}
                  className="block bg-white rounded-2xl px-4 py-3.5 border border-[#EFF1F5] hover:border-[#A8C7FD] transition-colors press-effect"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#25282A] text-sm truncate">{app.jobTitle}</p>
                      <p className="text-xs text-[#98A2B2] mt-0.5">
                        {app.siteName} · {app.workDate ? formatDateShort(app.workDate, locale) : '-'}
                      </p>
                      <p className="text-sm font-bold text-[#0669F7] mt-1">{formatWage(app.dailyWage)}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                </Link>
              )
            })}

            {applications.length > 5 && (
              <Link
                href={'/worker/applications' as never}
                className="flex items-center justify-center gap-1.5 w-full py-3 text-sm text-[#0669F7] font-semibold border border-[#A8C7FD] rounded-2xl bg-white hover:bg-[#E6F0FE] transition-colors"
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
