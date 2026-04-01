'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Job, JobStatus } from '@/types/manager-site-job'
import StatusBadge from '@/components/manager/StatusBadge'
import ConfirmModal from '@/components/manager/ConfirmModal'
import ShiftManager from './ShiftManager'

interface JobDetailClientProps {
  jobId: string
  locale: string
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(dateStr))
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + ' ₫'
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 bg-gray-200 rounded w-2/3" />
      <div className="h-48 bg-gray-200 rounded-2xl" />
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  )
}

const DEMO_JOBS: Record<string, Job> = {
  'djob-1': { id: 'djob-1', siteId: 'demo-1', siteName: '롯데몰 하노이 지하 1층 공사', title: '전기 배선 작업', tradeName: '전기', workDate: '2026-03-28', startTime: '07:00', endTime: '17:00', dailyWage: 700000, currency: 'VND', benefits: { meals: true, transport: false, accommodation: false, insurance: true }, requirements: {}, slotsTotal: 5, slotsFilled: 3, status: 'OPEN', imageUrls: [], shiftCount: 0, applicationCount: { pending: 2, accepted: 3, rejected: 0 }, createdAt: '2026-03-20T00:00:00Z', updatedAt: '2026-03-20T00:00:00Z' },
  'djob-2': { id: 'djob-2', siteId: 'demo-1', siteName: '롯데몰 하노이 지하 1층 공사', title: '콘크리트 타설 — 기초 슬라브', tradeName: '콘크리트', workDate: '2026-03-29', startTime: '06:00', endTime: '16:00', dailyWage: 560000, currency: 'VND', benefits: { meals: true, transport: true, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 8, slotsFilled: 8, status: 'FILLED', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 8, rejected: 2 }, createdAt: '2026-03-18T00:00:00Z', updatedAt: '2026-03-18T00:00:00Z' },
  'djob-3': { id: 'djob-3', siteId: 'demo-2', siteName: '인천 송도 물류센터', title: '잡부 — 자재 운반', tradeName: '일반', workDate: '2026-03-30', startTime: '08:00', endTime: '17:00', dailyWage: 410000, currency: 'VND', benefits: { meals: false, transport: false, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 10, slotsFilled: 4, status: 'OPEN', imageUrls: [], shiftCount: 0, applicationCount: { pending: 6, accepted: 4, rejected: 0 }, createdAt: '2026-03-22T00:00:00Z', updatedAt: '2026-03-22T00:00:00Z' },
  'djob-4': { id: 'djob-4', siteId: 'demo-3', siteName: '광명역 복합쇼핑몰 신축', title: '철근 조립 — 3층 골조', tradeName: '철근', workDate: '2026-03-25', startTime: '07:00', endTime: '17:00', dailyWage: 620000, currency: 'VND', benefits: { meals: true, transport: false, accommodation: false, insurance: true }, requirements: {}, slotsTotal: 6, slotsFilled: 6, status: 'COMPLETED', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 6, rejected: 1 }, createdAt: '2026-03-15T00:00:00Z', updatedAt: '2026-03-15T00:00:00Z' },
  'djob-5': { id: 'djob-5', siteId: 'demo-3', siteName: '광명역 복합쇼핑몰 신축', title: '타일 시공 — 로비 바닥', tradeName: '타일', workDate: '2026-04-01', startTime: '08:00', endTime: '17:00', dailyWage: 580000, currency: 'VND', benefits: { meals: false, transport: false, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 4, slotsFilled: 0, status: 'OPEN', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 0, rejected: 0 }, createdAt: '2026-03-24T00:00:00Z', updatedAt: '2026-03-24T00:00:00Z' },
  'djob-6': { id: 'djob-6', siteId: 'demo-5', siteName: '호치민 스카이라인 빌딩', title: '도장 작업 — 외벽 마감', tradeName: '도장', workDate: '2026-03-20', startTime: '08:00', endTime: '17:00', dailyWage: 490000, currency: 'VND', benefits: { meals: false, transport: false, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 3, slotsFilled: 3, status: 'COMPLETED', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 3, rejected: 0 }, createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
}

export default function JobDetailClient({ jobId, locale }: JobDetailClientProps) {
  const t = useTranslations('common')
  const router = useRouter()
  const idToken = getSessionCookie()
  const [job, setJob] = React.useState<Job | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDemo, setIsDemo] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null)
  const [showCancelModal, setShowCancelModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [isActioning, setIsActioning] = React.useState(false)

  React.useEffect(() => {
    // Demo fallback for demo IDs (no API call needed)
    if (DEMO_JOBS[jobId]) {
      setJob(DEMO_JOBS[jobId])
      setIsDemo(true)
      setIsLoading(false)
      return
    }
    if (!idToken) { setIsLoading(false); return }
    apiClient<Job>(`/manager/jobs/${jobId}`, { token: idToken })
      .then((res) => setJob(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : t('manager_job_detail.load_error')))
      .finally(() => setIsLoading(false))
  }, [jobId, idToken])

  async function changeStatus(newStatus: JobStatus) {
    if (!idToken || !job) return
    setIsActioning(true)
    try {
      await apiClient(`/manager/jobs/${jobId}/status`, {
        method: 'PATCH',
        token: idToken,
        body: JSON.stringify({ status: newStatus }),
      })
      setJob((prev) => prev ? { ...prev, status: newStatus } : prev)
    } catch (e) {
      alert(e instanceof Error ? e.message : t('manager_job_detail.status_change_error'))
    } finally {
      setIsActioning(false)
    }
  }

  async function handleDelete() {
    if (!idToken) return
    setIsActioning(true)
    try {
      await apiClient(`/manager/jobs/${jobId}/status`, {
        method: 'PATCH',
        token: idToken,
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      router.push(`/${locale}/manager/sites/${job?.siteId}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : t('manager_job_detail.delete_error'))
    } finally {
      setIsActioning(false)
      setShowDeleteModal(false)
    }
  }

  if (isLoading) return <SkeletonDetail />

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#D81A48] text-center">
        {error}
      </div>
    )
  }

  if (!job) return null

  const allImages = job.imageUrls ?? []
  const fillPercent = job.slotsTotal > 0 ? Math.round((job.slotsFilled / job.slotsTotal) * 100) : 0
  const benefits = [
    { key: 'meals' as const, label: t('manager_job_detail.benefit_meals'), emoji: '🍚' },
    { key: 'transport' as const, label: t('manager_job_detail.benefit_transport'), emoji: '🚌' },
    { key: 'accommodation' as const, label: t('manager_job_detail.benefit_accommodation'), emoji: '🏠' },
    { key: 'insurance' as const, label: t('manager_job_detail.benefit_insurance'), emoji: '🛡️' },
  ]

  return (
    <>
      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">{t('manager_job_detail.demo_notice')}</span>
          <span className="text-amber-600">{t('manager_job_detail.demo_notice_sub')}</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#25282A] mb-1">{job.title}</h2>
          <Link
            href={`/${locale}/manager/sites/${job.siteId}`}
            className="text-sm text-[#0669F7] hover:underline"
          >
            {job.siteName}
          </Link>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Image Gallery */}
      {allImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {allImages.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setLightboxIdx(idx)}
              className="flex-none w-28 h-28 rounded-2xl overflow-hidden border border-[#EFF1F5]"
            >
              <img src={url} alt={t('manager_job_detail.image_alt', { n: idx + 1 })} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Info Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#98A2B2] text-xs mb-0.5">{t('manager_job_detail.work_date')}</p>
            <p className="text-[#25282A] font-medium">{formatDate(job.workDate)}</p>
          </div>
          {job.expiresAt && (
            <div>
              <p className="text-[#98A2B2] text-xs mb-0.5">{t('manager_job_detail.deadline')}</p>
              <p className="text-[#25282A] font-medium">{formatDate(job.expiresAt)}</p>
            </div>
          )}
          {(job.startTime || job.endTime) && (
            <div>
              <p className="text-[#98A2B2] text-xs mb-0.5">{t('manager_job_detail.work_hours')}</p>
              <p className="text-[#25282A] font-medium">
                {job.startTime ?? '-'} ~ {job.endTime ?? '-'}
              </p>
            </div>
          )}
          <div>
            <p className="text-[#98A2B2] text-xs mb-0.5">{t('manager_job_detail.daily_wage')}</p>
            <p className="text-[#0669F7] font-semibold">{formatVND(job.dailyWage)}</p>
          </div>
          <div>
            <p className="text-[#98A2B2] text-xs mb-0.5">{t('manager_job_detail.hire_status')}</p>
            <div>
              <p className="text-[#25282A] font-medium mb-1">
                {t('manager_job_detail.slots_count', { filled: job.slotsFilled, total: job.slotsTotal })}
              </p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0669F7] rounded-full"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          </div>
          {job.tradeName && (
            <div>
              <p className="text-[#98A2B2] text-xs mb-0.5">{t('manager_job_detail.trade')}</p>
              <p className="text-[#25282A] font-medium">{job.tradeName}</p>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="mt-4 pt-4 border-t border-[#EFF1F5]">
          <p className="text-[#98A2B2] text-xs mb-2">{t('manager_job_detail.benefits')}</p>
          <div className="flex flex-wrap gap-2">
            {benefits.map((b) =>
              job.benefits[b.key] ? (
                <span
                  key={b.key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-[#0669F7]"
                >
                  {b.emoji} {b.label}
                </span>
              ) : null
            )}
            {!Object.values(job.benefits).some(Boolean) && (
              <span className="text-sm text-[#98A2B2]">{t('manager_job_detail.no_benefits')}</span>
            )}
          </div>
        </div>

        {/* Requirements */}
        {(job.requirements?.minExperienceMonths !== undefined || job.requirements?.notes) && (
          <div className="mt-4 pt-4 border-t border-[#EFF1F5]">
            <p className="text-[#98A2B2] text-xs mb-2">{t('manager_job_detail.requirements')}</p>
            {job.requirements?.minExperienceMonths !== undefined && (
              <p className="text-sm text-[#25282A]">
                {t('manager_job_detail.min_experience', {
                  value: job.requirements.minExperienceMonths === 0
                    ? t('manager_job_detail.entry_level')
                    : t('manager_job_detail.experience_months', { months: job.requirements.minExperienceMonths })
                })}
              </p>
            )}
            {job.requirements?.notes && (
              <p className="text-sm text-[#25282A] mt-1">{job.requirements.notes}</p>
            )}
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div className="mt-4 pt-4 border-t border-[#EFF1F5]">
            <p className="text-[#98A2B2] text-xs mb-2">{t('manager_job_detail.description')}</p>
            <p className="text-sm text-[#25282A] whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/manager/jobs/${jobId}/edit`}
            className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
          >
            {t('manager_job_detail.edit')}
          </Link>

          {/* Status-specific actions */}
          {job.status === 'OPEN' && (
            <>
              <button
                onClick={() => changeStatus('FILLED')}
                disabled={isActioning}
                className="px-5 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm disabled:opacity-40"
              >
                {t('manager_job_detail.close_job')}
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={isActioning}
                className="px-5 py-2.5 rounded-full border border-[#D81A48] text-[#D81A48] font-medium text-sm disabled:opacity-40"
              >
                {t('manager_job_detail.cancel_job')}
              </button>
            </>
          )}
          {job.status === 'FILLED' && (
            <button
              onClick={() => changeStatus('OPEN')}
              disabled={isActioning}
              className="px-5 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm disabled:opacity-40"
            >
              {t('manager_job_detail.reopen_job')}
            </button>
          )}
          {(job.status === 'CANCELLED' || job.status === 'COMPLETED') && (
            <span className="text-sm text-[#98A2B2]">{t('manager_job_detail.status_immutable')}</span>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-full border border-[#D81A48] text-[#D81A48] font-medium text-sm"
          >
            {t('manager_job_detail.delete')}
          </button>
        </div>
      </div>

      {/* Applicants Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#25282A]">{t('manager_job_detail.applicants_title')}</h3>
          <Link
            href={`/${locale}/manager/jobs/${jobId}/applicants`}
            className="text-xs text-[#0669F7] font-medium"
          >
            {t('manager_job_detail.view_all')}
          </Link>
        </div>
        <div className="flex gap-4 text-center">
          <div className="flex-1">
            <p className="text-2xl font-bold text-yellow-600">{job.applicationCount.pending}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">{t('manager_job_detail.pending_count')}</p>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-green-600">{job.applicationCount.accepted}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">{t('manager_job_detail.accepted_count')}</p>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-[#D81A48]">{job.applicationCount.rejected}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">{t('manager_job_detail.rejected_count')}</p>
          </div>
        </div>
      </div>

      {/* Shift Manager */}
      {idToken && (
        <ShiftManager
          jobId={jobId}
          initialShifts={job.shifts ?? []}
          idToken={idToken}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-xl font-bold w-10 h-10 flex items-center justify-center"
            onClick={() => setLightboxIdx(null)}
          >
            ×
          </button>
          <img
            src={allImages[lightboxIdx]}
            alt={t('manager_job_detail.fullscreen_alt')}
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Cancel confirm */}
      <ConfirmModal
        isOpen={showCancelModal}
        title={t('manager_job_detail.cancel_modal_title')}
        message={t('manager_job_detail.cancel_modal_message')}
        confirmLabel={t('manager_job_detail.cancel_modal_confirm')}
        confirmVariant="danger"
        onConfirm={async () => {
          setShowCancelModal(false)
          await changeStatus('CANCELLED')
        }}
        onCancel={() => setShowCancelModal(false)}
        isLoading={isActioning}
      />

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t('manager_job_detail.delete_modal_title')}
        message={t('manager_job_detail.delete_modal_message')}
        confirmLabel={t('manager_job_detail.delete_modal_confirm')}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isActioning}
      />
    </>
  )
}
