'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from '@/components/navigation'
import ConfirmModal from '@/components/manager/ConfirmModal'

const API_BASE = '/api/v1'

type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'CONTRACTED'

interface ApplicationDetail {
  id: string
  jobId: string
  jobTitle: string
  siteId: string
  siteName: string
  siteAddress: string | null
  workDate: string
  startTime: string | null
  endTime: string | null
  dailyWage: number
  status: ApplicationStatus
  appliedAt: string
  reviewedAt: string | null
  notes: string | null
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  PENDING:    { label: '검토 중',  bg: '#FFF8E1', text: '#B47A00' },
  ACCEPTED:   { label: '수락됨',   bg: '#E8F5E9', text: '#1B5E20' },
  REJECTED:   { label: '거절됨',   bg: '#FFEBEE', text: '#B71C1C' },
  WITHDRAWN:  { label: '취소함',   bg: '#F5F5F5', text: '#616161' },
  CONTRACTED: { label: '계약 완료', bg: '#E3F2FD', text: '#0D47A1' },
}

const DEMO_DETAILS: Record<string, ApplicationDetail> = {
  'demo-app-1': {
    id: 'demo-app-1', jobId: 'djob-1', jobTitle: '전기 배선 작업',
    siteId: 'demo-1', siteName: '롯데몰 하노이 지하 1층 공사', siteAddress: '하노이시 Tay Ho구 롯데몰',
    workDate: '2026-03-28', startTime: '07:00', endTime: '17:00', dailyWage: 700000,
    status: 'CONTRACTED', appliedAt: '2026-03-20T08:30:00Z', reviewedAt: '2026-03-21T10:00:00Z', notes: null,
  },
  'demo-app-2': {
    id: 'demo-app-2', jobId: 'djob-3', jobTitle: '잡부 — 자재 운반',
    siteId: 'demo-2', siteName: '인천 송도 물류센터', siteAddress: '인천시 연수구 송도동',
    workDate: '2026-03-30', startTime: '08:00', endTime: '18:00', dailyWage: 410000,
    status: 'ACCEPTED', appliedAt: '2026-03-22T09:15:00Z', reviewedAt: '2026-03-23T11:00:00Z', notes: null,
  },
  'demo-app-3': {
    id: 'demo-app-3', jobId: 'djob-5', jobTitle: '타일 시공 — 로비 바닥',
    siteId: 'demo-3', siteName: '광명역 복합쇼핑몰 신축', siteAddress: '경기도 광명시 일직동',
    workDate: '2026-04-01', startTime: '07:30', endTime: '17:30', dailyWage: 580000,
    status: 'PENDING', appliedAt: '2026-03-25T10:00:00Z', reviewedAt: null, notes: '타일 시공 5년 경력 있습니다.',
  },
  'demo-app-4': {
    id: 'demo-app-4', jobId: 'djob-6', jobTitle: '도장 작업 — 외벽 마감',
    siteId: 'demo-5', siteName: '호치민 스카이라인 빌딩', siteAddress: '호치민시 Binh Thanh구',
    workDate: '2026-03-20', startTime: '07:00', endTime: '17:00', dailyWage: 490000,
    status: 'REJECTED', appliedAt: '2026-03-12T14:00:00Z', reviewedAt: '2026-03-14T09:00:00Z', notes: null,
  },
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(d))
}

function formatVND(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function formatTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-[#EFF1F5] last:border-0">
      <span className="text-sm text-[#7A7B7A] shrink-0">{label}</span>
      <span className="text-sm font-medium text-[#25282A] text-right">{value}</span>
    </div>
  )
}

export default function WorkerApplicationDetailClient({ id, locale }: { id: string; locale: string }) {
  const { idToken } = useAuth()
  const t = useTranslations('common')
  const router = useRouter()

  const [application, setApplication] = React.useState<ApplicationDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false)
  const [isWithdrawing, setIsWithdrawing] = React.useState(false)

  React.useEffect(() => {
    if (id.startsWith('demo-')) {
      const demo = DEMO_DETAILS[id]
      if (demo) setApplication(demo)
      else setError(t('worker_applications.fetch_error'))
      setIsLoading(false)
      return
    }
    if (!idToken) { setIsLoading(false); return }
    fetch(`${API_BASE}/applications/${id}/detail`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(json => setApplication(json.data))
      .catch(() => setError(t('worker_applications.fetch_error')))
      .finally(() => setIsLoading(false))
  }, [id, idToken, t])

  async function handleWithdraw() {
    if (!idToken || id.startsWith('demo-')) return
    setIsWithdrawing(true)
    try {
      const res = await fetch(`${API_BASE}/applications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error()
      router.back()
    } catch {
      setConfirmWithdraw(false)
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-6 animate-pulse space-y-4">
        <div className="h-6 bg-[#DDDDDD] rounded w-1/2" />
        <div className="h-40 bg-[#EFF1F5] rounded-2xl" />
        <div className="h-20 bg-[#EFF1F5] rounded-2xl" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[#ED1C24]">{error ?? t('worker_applications.fetch_error')}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 px-5 py-2 rounded-full border border-[#DDDDDD] text-sm text-[#25282A]"
        >
          {t('worker_applications.back')}
        </button>
      </div>
    )
  }

  const status = STATUS_CONFIG[application.status]

  return (
    <div className="pb-8">
      {/* Header — desktop only; mobile uses WorkerAppBar back button */}
      <div className="hidden md:flex items-center gap-3 py-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 text-[#25282A] hover:text-[#0669F7]"
        >
          <ChevronLeftIcon />
        </button>
        <h1 className="text-xl font-bold text-[#25282A] flex-1">{t('worker_applications.detail_title')}</h1>
        <span
          className="inline-flex px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: status.bg, color: status.text }}
        >
          {status.label}
        </span>
      </div>
      {/* Status badge — mobile only */}
      <div className="md:hidden flex justify-end pt-3 pb-1">
        <span
          className="inline-flex px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: status.bg, color: status.text }}
        >
          {status.label}
        </span>
      </div>

      {/* Job info card */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm p-4 mb-3">
        <p className="text-base font-bold text-[#25282A] mb-1">{application.jobTitle}</p>
        <p className="text-sm text-[#7A7B7A]">{application.siteName}</p>
        {application.siteAddress && (
          <p className="text-xs text-[#98A2B2] mt-0.5">{application.siteAddress}</p>
        )}
      </div>

      {/* Detail rows */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm px-4 mb-3">
        <Row label={t('worker_applications.work_date')} value={formatDate(application.workDate)} />
        {(application.startTime || application.endTime) && (
          <Row
            label={t('worker_applications.work_time')}
            value={`${formatTime(application.startTime) ?? '-'} ~ ${formatTime(application.endTime) ?? '-'}`}
          />
        )}
        <Row label={t('worker_applications.daily_wage')} value={
          <span className="text-[#0669F7] font-bold">{formatVND(application.dailyWage)}</span>
        } />
        <Row label={t('worker_applications.applied_at_label')} value={formatDate(application.appliedAt)} />
        {application.reviewedAt && (
          <Row label={t('worker_applications.reviewed_at')} value={formatDate(application.reviewedAt)} />
        )}
      </div>

      {/* Notes */}
      {application.notes && (
        <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm p-4 mb-3">
          <p className="text-xs text-[#98A2B2] mb-1">{t('worker_applications.notes')}</p>
          <p className="text-sm text-[#25282A]">{application.notes}</p>
        </div>
      )}

      {/* Status messages */}
      {application.status === 'ACCEPTED' && (
        <div className="bg-[#E8F5E9] rounded-2xl p-4 mb-3 text-sm text-[#1B5E20]">
          {t('worker_applications.accepted_message')}
        </div>
      )}
      {application.status === 'CONTRACTED' && (
        <div className="bg-[#E3F2FD] rounded-2xl p-4 mb-3 text-sm text-[#0D47A1]">
          {t('worker_applications.contracted_message')}
        </div>
      )}
      {application.status === 'REJECTED' && (
        <div className="bg-[#FFEBEE] rounded-2xl p-4 mb-3 text-sm text-[#B71C1C]">
          {t('worker_applications.rejected_message')}
        </div>
      )}

      {/* Withdraw action */}
      {application.status === 'PENDING' && (
        <button
          type="button"
          onClick={() => setConfirmWithdraw(true)}
          className="w-full py-3 rounded-full border border-[#DDDDDD] text-[#25282A] font-medium text-sm hover:border-[#ED1C24] hover:text-[#ED1C24] transition-colors mt-2"
        >
          {t('worker_applications.withdraw')}
        </button>
      )}

      <ConfirmModal
        isOpen={confirmWithdraw}
        title={t('worker_applications.withdraw_confirm_title')}
        message={t('worker_applications.withdraw_confirm_message')}
        confirmLabel={t('worker_applications.withdraw_confirm_btn')}
        confirmVariant="danger"
        onConfirm={handleWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
        isLoading={isWithdrawing}
      />
    </div>
  )
}
