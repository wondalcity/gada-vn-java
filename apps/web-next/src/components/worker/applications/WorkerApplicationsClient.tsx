'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api/client'
import type { WorkerApplication, ApplicationStatus } from '@/types/application'
import ConfirmModal from '@/components/manager/ConfirmModal'
import { Link } from '@/components/navigation'

const API_BASE = '/api/v1'

type TabKey = 'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn'

const STATUS_TAB_MAP: Record<TabKey, ApplicationStatus | null> = {
  all: null,
  pending: 'PENDING',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
  withdrawn: 'WITHDRAWN',
}

function formatVND(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(d))
}

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  PENDING: 'bg-[#FFF8E6] text-[#856404] border-[#F5D87D]',
  ACCEPTED: 'bg-[#E6F9E6] text-[#1A6B1A] border-[#86D98A]',
  REJECTED: 'bg-[#FDE8EE] text-[#ED1C24] border-[#F4A8B8]',
  WITHDRAWN: 'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
  CONTRACTED: 'bg-[#E6F0FE] text-[#0669F7] border-[#B3D9FF]',
}

const DEMO_APPLICATIONS: WorkerApplication[] = [
  {
    id: 'demo-app-1',
    jobId: 'djob-1',
    jobTitle: '전기 배선 작업',
    siteId: 'demo-1',
    siteName: '롯데몰 하노이 지하 1층 공사',
    workDate: '2026-03-28',
    dailyWage: 700000,
    status: 'CONTRACTED',
    appliedAt: '2026-03-20T08:30:00Z',
  },
  {
    id: 'demo-app-2',
    jobId: 'djob-3',
    jobTitle: '잡부 — 자재 운반',
    siteId: 'demo-2',
    siteName: '인천 송도 물류센터',
    workDate: '2026-03-30',
    dailyWage: 410000,
    status: 'ACCEPTED',
    appliedAt: '2026-03-22T09:15:00Z',
  },
  {
    id: 'demo-app-3',
    jobId: 'djob-5',
    jobTitle: '타일 시공 — 로비 바닥',
    siteId: 'demo-3',
    siteName: '광명역 복합쇼핑몰 신축',
    workDate: '2026-04-01',
    dailyWage: 580000,
    status: 'PENDING',
    appliedAt: '2026-03-25T10:00:00Z',
  },
  {
    id: 'demo-app-4',
    jobId: 'djob-6',
    jobTitle: '도장 작업 — 외벽 마감',
    siteId: 'demo-5',
    siteName: '호치민 스카이라인 빌딩',
    workDate: '2026-03-20',
    dailyWage: 490000,
    status: 'REJECTED',
    appliedAt: '2026-03-12T14:00:00Z',
  },
]

export default function WorkerApplicationsClient({ locale }: { locale?: string }) {
  const { idToken } = useAuth()
  const t = useTranslations('common')
  const [applications, setApplications] = React.useState<WorkerApplication[]>([])
  const [isDemo, setIsDemo] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<TabKey>('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null)
  const [confirmWithdrawId, setConfirmWithdrawId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const TAB_LABELS: Record<TabKey, string> = {
    all: t('worker_applications.tab_all'),
    pending: t('worker_applications.tab_pending'),
    accepted: t('worker_applications.tab_accepted'),
    rejected: t('worker_applications.tab_rejected'),
    withdrawn: t('worker_applications.tab_withdrawn'),
  }

  const STATUS_LABEL: Record<ApplicationStatus, string> = {
    PENDING: t('worker_applications.status_pending'),
    ACCEPTED: t('worker_applications.status_accepted'),
    REJECTED: t('worker_applications.status_rejected'),
    WITHDRAWN: t('worker_applications.status_withdrawn'),
    CONTRACTED: t('worker_applications.status_contracted'),
  }

  React.useEffect(() => {
    if (!idToken) {
      setApplications(DEMO_APPLICATIONS)
      setIsDemo(true)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    apiClient<WorkerApplication[]>('/applications/mine', { token: idToken })
      .then(({ data }) => {
        if (data.length === 0) {
          setApplications(DEMO_APPLICATIONS)
          setIsDemo(true)
        } else {
          setApplications(data)
          setIsDemo(false)
        }
      })
      .catch(() => setError(t('worker_applications.fetch_error')))
      .finally(() => setIsLoading(false))
  }, [idToken])

  const tabCounts = React.useMemo(() => {
    const counts: Record<TabKey, number> = { all: applications.length, pending: 0, accepted: 0, rejected: 0, withdrawn: 0 }
    for (const app of applications) {
      if (app.status === 'PENDING') counts.pending++
      else if (app.status === 'ACCEPTED' || app.status === 'CONTRACTED') counts.accepted++
      else if (app.status === 'REJECTED') counts.rejected++
      else if (app.status === 'WITHDRAWN') counts.withdrawn++
    }
    return counts
  }, [applications])

  const filtered = React.useMemo(() => {
    const statusFilter = STATUS_TAB_MAP[activeTab]
    if (!statusFilter) return applications
    if (activeTab === 'accepted') return applications.filter(a => a.status === 'ACCEPTED' || a.status === 'CONTRACTED')
    return applications.filter(a => a.status === statusFilter)
  }, [applications, activeTab])

  async function handleWithdraw(id: string) {
    if (!idToken) return
    setWithdrawingId(id)
    // Optimistic remove
    const prev = applications
    setApplications(apps => apps.filter(a => a.id !== id))
    try {
      const res = await fetch(`${API_BASE}/applications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message ?? t('error.generic'))
      }
    } catch {
      // Revert on error
      setApplications(prev)
    } finally {
      setWithdrawingId(null)
      setConfirmWithdrawId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('worker_applications.title')}</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#EFF1F5] p-4 animate-pulse shadow-sm">
              <div className="h-4 bg-[#DDDDDD] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[#DDDDDD] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[#DDDDDD] rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('worker_applications.title')}</h1>
        <p className="text-[#ED1C24] text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="py-6 flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#25282A]">{t('worker_applications.title')}</h1>
        {isDemo && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFE9B0] text-[#856404] border border-[#F5D87D]">
            {t('demo_data')}
          </span>
        )}
      </div>

      {/* Tab filter bar */}
      <div className="sticky z-10 bg-white border-b border-[#EFF1F5]" style={{ top: 'var(--app-bar-height, 56px)' }}>
        <div className="flex overflow-x-auto scrollbar-hide gap-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[#0669F7] text-[#0669F7]'
                  : 'border-transparent text-[#7A7B7A] hover:text-[#25282A]'
              }`}
            >
              {TAB_LABELS[tab]}
              {tabCounts[tab] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-[#0669F7] text-white' : 'bg-[#EFF1F5] text-[#7A7B7A]'
                }`}>
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Application list */}
      <div className="py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#EFF1F5]">
            <p className="text-[#7A7B7A] text-sm">{t('worker_applications.empty')}</p>
          </div>
        ) : (
          filtered.map(app => {
            return (
              <Link
                key={app.id}
                href={`/worker/applications/${app.id}`}
                className="block press-effect bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 relative"
              >
                {/* Status badge */}
                <span className={`absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASS[app.status]}`}>
                  {STATUS_LABEL[app.status]}
                </span>

                {/* Job title */}
                <p className="font-semibold text-[#25282A] text-sm pr-24">{app.jobTitle}</p>

                {/* Site & Date */}
                <p className="text-xs text-[#98A2B2] mt-1">{app.siteName} · {formatDate(app.workDate)}</p>

                {/* Wage */}
                <p className="text-sm font-semibold text-[#0669F7] mt-1">{formatVND(app.dailyWage)}</p>

                {/* Applied date */}
                <p className="text-xs text-[#98A2B2] mt-2">{t('worker_applications.applied_at', { date: formatDate(app.appliedAt) })}</p>

                {/* Actions */}
                <div className="mt-3">
                  {app.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmWithdrawId(app.id) }}
                      disabled={withdrawingId === app.id}
                      className="px-5 py-2 rounded-full border border-[#DDDDDD] text-[#25282A] font-medium text-sm disabled:opacity-40 hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
                    >
                      {withdrawingId === app.id ? t('worker_applications.withdrawing') : t('worker_applications.withdraw')}
                    </button>
                  )}
                  {app.status === 'ACCEPTED' && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#0669F7] font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('worker_applications.accepted_waiting')}
                    </span>
                  )}
                  {app.status === 'CONTRACTED' && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#1A6B1A] font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('worker_applications.contracted')}
                    </span>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Confirm withdraw modal */}
      <ConfirmModal
        isOpen={confirmWithdrawId !== null}
        title={t('worker_applications.withdraw_confirm_title')}
        message={t('worker_applications.withdraw_confirm_message')}
        confirmLabel={t('worker_applications.withdraw_confirm_btn')}
        confirmVariant="danger"
        onConfirm={() => confirmWithdrawId && handleWithdraw(confirmWithdrawId)}
        onCancel={() => setConfirmWithdrawId(null)}
        isLoading={withdrawingId !== null}
      />
    </div>
  )
}
