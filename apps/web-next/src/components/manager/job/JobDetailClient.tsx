'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/lib/utils/date'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Job, JobStatus } from '@/types/manager-site-job'
import StatusBadge from '@/components/manager/StatusBadge'
import ConfirmModal from '@/components/manager/ConfirmModal'

interface JobDetailClientProps {
  jobId: string
  locale: string
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + ' ₫'
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 bg-[#DDDDDD] rounded w-2/3" />
      <div className="h-48 bg-[#DDDDDD] rounded-2xl" />
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-[#DDDDDD] rounded" />
        ))}
      </div>
    </div>
  )
}

export default function JobDetailClient({ jobId, locale }: JobDetailClientProps) {
  const t = useTranslations('common')
  const router = useRouter()
  const idToken = getSessionCookie()
  const [job, setJob] = React.useState<Job | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null)
  const [showCancelModal, setShowCancelModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [isActioning, setIsActioning] = React.useState(false)
  const [isCopying, setIsCopying] = React.useState(false)

  React.useEffect(() => {
    if (!idToken) {
      setIsLoading(false)
      return
    }
    apiClient<Job>(`/manager/jobs/${jobId}`, { token: idToken })
      .then((res) => setJob(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : t('manager_job_detail.load_error')))
      .finally(() => setIsLoading(false))
  }, [jobId, idToken])

  async function changeStatus(newStatus: JobStatus) {
    if (!job || !idToken) return
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

  async function handleCopy() {
    if (!job) return
    setIsCopying(true)
    try {
      router.push((`/manager/sites/${job.siteId}/jobs/new?copyFrom=${jobId}`) as any)
    } catch {
      alert(t('manager_job_detail.copy_error'))
      setIsCopying(false)
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
      router.push(`/manager/sites/${job?.siteId}`)
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
      <div className="p-4 rounded-2xl bg-[#FDE8EE] border border-[#F4A8B8] text-sm text-[#ED1C24] text-center">
        {error}
      </div>
    )
  }

  if (!job) return null

  const allImages = job.imageUrls ?? []
  const fillPercent = job.slotsTotal > 0 ? Math.round((job.slotsFilled / job.slotsTotal) * 100) : 0
  const benefits = [
    { key: 'meals' as const, label: t('manager_job_detail.benefit_meals') },
    { key: 'transport' as const, label: t('manager_job_detail.benefit_transport') },
    { key: 'accommodation' as const, label: t('manager_job_detail.benefit_accommodation') },
    { key: 'insurance' as const, label: t('manager_job_detail.benefit_insurance') },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#25282A] mb-1">{job.title}</h2>
          <Link
            href={`/manager/sites/${job.siteId}`}
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
            <p className="text-[#25282A] font-medium">{formatDate(job.workDate, locale)}</p>
          </div>
          {job.expiresAt && (
            <div>
              <p className="text-[#98A2B2] text-xs mb-0.5">{t('manager_job_detail.deadline')}</p>
              <p className="text-[#25282A] font-medium">{formatDate(job.expiresAt, locale)}</p>
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
              <div className="w-full h-1.5 bg-[#EFF1F5] rounded-full overflow-hidden">
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F0FE] border border-[#B3D9FF] text-xs text-[#0669F7]"
                >
                  {b.label}
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
            href={`/manager/jobs/${jobId}/edit`}
            className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm"
          >
            {t('manager_job_detail.edit')}
          </Link>

          <button
            onClick={handleCopy}
            disabled={isCopying}
            className="px-5 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm disabled:opacity-40 hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
          >
            {t('manager_job_detail.copy_job')}
          </button>

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
                className="px-5 py-2.5 rounded-full border border-[#ED1C24] text-[#ED1C24] font-medium text-sm disabled:opacity-40"
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
            className="px-5 py-2.5 rounded-full border border-[#ED1C24] text-[#ED1C24] font-medium text-sm"
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
            href={`/manager/jobs/${jobId}/applicants`}
            className="text-xs text-[#0669F7] font-medium"
          >
            {t('manager_job_detail.view_all')}
          </Link>
        </div>
        <div className="flex gap-4 text-center">
          <div className="flex-1">
            <p className="text-2xl font-bold text-[#856404]">{job.applicationCount.pending}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">{t('manager_job_detail.pending_count')}</p>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-[#1A6B1A]">{job.applicationCount.accepted}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">{t('manager_job_detail.accepted_count')}</p>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-[#ED1C24]">{job.applicationCount.rejected}</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">{t('manager_job_detail.rejected_count')}</p>
          </div>
        </div>
      </div>

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
