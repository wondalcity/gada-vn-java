'use client'

import * as React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api/client'
import type { WorkerApplication, ApplicationStatus } from '@/types/application'
import ConfirmModal from '@/components/manager/ConfirmModal'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

type TabKey = 'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn'

const TAB_LABELS: Record<TabKey, string> = {
  all: '전체',
  pending: '검토중',
  accepted: '합격',
  rejected: '불합격',
  withdrawn: '취소',
}

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

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  PENDING: { label: '검토중', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  ACCEPTED: { label: '합격', className: 'bg-green-50 text-green-700 border-green-200' },
  REJECTED: { label: '불합격', className: 'bg-red-50 text-[#ED1C24] border-red-200' },
  WITHDRAWN: { label: '취소', className: 'bg-gray-100 text-[#7A7B7A] border-[#DDDDDD]' },
  CONTRACTED: { label: '계약완료', className: 'bg-blue-50 text-[#0669F7] border-blue-200' },
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

export default function WorkerApplicationsClient() {
  const { idToken } = useAuth()
  const [applications, setApplications] = React.useState<WorkerApplication[]>([])
  const [isDemo, setIsDemo] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<TabKey>('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null)
  const [confirmWithdrawId, setConfirmWithdrawId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

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
      .catch(() => setError('지원 내역을 불러올 수 없습니다'))
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
        throw new Error(body.message ?? '취소 실패')
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
        <h1 className="text-xl font-bold text-[#25282A] mb-6">지원 현황</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#EFF1F5] p-4 animate-pulse shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">지원 현황</h1>
        <p className="text-[#ED1C24] text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="py-6 flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#25282A]">지원 현황</h1>
        {isDemo && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            데모 데이터
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
                  activeTab === tab ? 'bg-[#0669F7] text-white' : 'bg-gray-100 text-[#7A7B7A]'
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
            <p className="text-[#7A7B7A] text-sm">해당 상태의 지원 내역이 없습니다</p>
          </div>
        ) : (
          filtered.map(app => {
            const statusConfig = STATUS_CONFIG[app.status]
            return (
              <div key={app.id} className="press-effect bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 relative">
                {/* Status badge */}
                <span className={`absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>

                {/* Job title */}
                <p className="font-semibold text-[#25282A] text-sm pr-24">{app.jobTitle}</p>

                {/* Site & Date */}
                <p className="text-xs text-[#98A2B2] mt-1">{app.siteName} · {formatDate(app.workDate)}</p>

                {/* Wage */}
                <p className="text-sm font-semibold text-[#0669F7] mt-1">{formatVND(app.dailyWage)}</p>

                {/* Applied date */}
                <p className="text-xs text-[#98A2B2] mt-2">지원일: {formatDate(app.appliedAt)}</p>

                {/* Actions */}
                <div className="mt-3">
                  {app.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => setConfirmWithdrawId(app.id)}
                      disabled={withdrawingId === app.id}
                      className="px-5 py-2 rounded-full border border-[#DDDDDD] text-[#25282A] font-medium text-sm disabled:opacity-40 hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
                    >
                      {withdrawingId === app.id ? '취소 중...' : '지원 취소'}
                    </button>
                  )}
                  {app.status === 'ACCEPTED' && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#0669F7] font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      합격! 계약 대기 중
                    </span>
                  )}
                  {app.status === 'CONTRACTED' && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      계약 완료
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Confirm withdraw modal */}
      <ConfirmModal
        isOpen={confirmWithdrawId !== null}
        title="지원 취소"
        message="지원을 취소하시겠습니까?"
        confirmLabel="취소하기"
        confirmVariant="danger"
        onConfirm={() => confirmWithdrawId && handleWithdraw(confirmWithdrawId)}
        onCancel={() => setConfirmWithdrawId(null)}
        isLoading={withdrawingId !== null}
      />
    </div>
  )
}
