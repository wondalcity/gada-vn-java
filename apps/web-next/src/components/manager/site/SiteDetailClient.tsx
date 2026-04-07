'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import { siteStore } from '@/lib/demo/siteStore'
import type { Site, SiteStatus, Job } from '@/types/manager-site-job'
import StatusBadge from '@/components/manager/StatusBadge'
import ConfirmModal from '@/components/manager/ConfirmModal'
import JobCard from '@/components/manager/job/JobCard'

interface SiteDetailClientProps {
  siteId: string
  locale: string
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-48 bg-gray-200 rounded-2xl" />
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function SiteDetailClient({ siteId, locale }: SiteDetailClientProps) {
  const t = useTranslations('common')
  const router = useRouter()
  const idToken = getSessionCookie()
  const [site, setSite] = React.useState<Site | null>(null)
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDemo, setIsDemo] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    // Demo mode (no token) — load from localStorage store
    if (!idToken) {
      const stored = siteStore.get(siteId)
      if (stored) {
        setSite(stored)
        setJobs(stored.demoJobs)
        setIsDemo(true)
      }
      setIsLoading(false)
      return
    }
    Promise.all([
      apiClient<Site>(`/manager/sites/${siteId}`, { token: idToken }),
      apiClient<Job[]>(`/manager/sites/${siteId}/jobs`, { token: idToken }),
    ])
      .then(([siteRes, jobsRes]) => {
        setSite(siteRes.data)
        setJobs(jobsRes.data)
      })
      .catch((e) => setError(e instanceof Error ? e.message : t('manager_site_detail.load_error')))
      .finally(() => setIsLoading(false))
  }, [siteId, idToken])

  async function handleStatusChange(newStatus: SiteStatus) {
    if (!site) return
    if (!idToken) {
      // Demo mode
      siteStore.updateStatus(siteId, newStatus)
      setSite((prev) => prev ? { ...prev, status: newStatus } : prev)
      return
    }
    try {
      await apiClient<Site>(`/manager/sites/${siteId}/status`, {
        method: 'PATCH',
        token: idToken,
        body: JSON.stringify({ status: newStatus }),
      })
      setSite((prev) => prev ? { ...prev, status: newStatus } : prev)
    } catch (e) {
      alert(e instanceof Error ? e.message : t('manager_site_detail.status_change_error'))
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      if (!idToken) {
        // Demo mode
        siteStore.delete(siteId)
        router.push('/manager/sites')
        return
      }
      await apiClient(`/manager/sites/${siteId}/status`, {
        method: 'PATCH',
        token: idToken,
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      router.push('/manager/sites')
    } catch (e) {
      alert(e instanceof Error ? e.message : t('manager_site_detail.delete_error'))
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (isLoading) return <SkeletonDetail />

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#ED1C24] text-center">
        {error}
      </div>
    )
  }

  if (!site) return null

  const allImages = site.imageUrls ?? []

  return (
    <>
      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">{t('manager_site_detail.demo_notice')}</span>
          <span className="text-amber-600">{t('manager_site_detail.demo_notice_sub')}</span>
        </div>
      )}
      {/* Image Gallery */}
      {allImages.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {allImages.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setLightboxIdx(idx)}
              className="flex-none w-28 h-28 rounded-2xl overflow-hidden border border-[#EFF1F5]"
            >
              <img src={url} alt={t('manager_site_detail.image_alt', { n: idx + 1 })} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <div className="h-40 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-[#EFF1F5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      )}

      {/* Site Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 mb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold text-[#25282A]">{site.name}</h2>
          <StatusBadge status={site.status} />
        </div>
        <div className="space-y-1.5 text-sm text-[#25282A]">
          <p><span className="text-[#98A2B2]">{t('manager_site_detail.address')}:</span> {site.address}</p>
          <p><span className="text-[#98A2B2]">{t('manager_site_detail.province')}:</span> {site.province}</p>
          {site.district && <p><span className="text-[#98A2B2]">{t('manager_site_detail.district')}:</span> {site.district}</p>}
          {site.siteType && <p><span className="text-[#98A2B2]">{t('manager_site_detail.site_type')}:</span> {site.siteType}</p>}
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/manager/sites/${siteId}/edit`}
            className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
          >
            {t('manager_site_detail.edit')}
          </Link>

          {/* Status change dropdown */}
          <div className="relative">
            <select
              value={site.status}
              onChange={(e) => handleStatusChange(e.target.value as SiteStatus)}
              className="px-5 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm bg-white appearance-none pr-8 cursor-pointer"
            >
              <option value="ACTIVE">{t('manager_site_detail.status_active')}</option>
              <option value="PAUSED">{t('manager_site_detail.status_paused')}</option>
              <option value="COMPLETED">{t('manager_site_detail.status_completed')}</option>
            </select>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-full border border-[#ED1C24] text-[#ED1C24] font-medium text-sm"
          >
            {t('manager_site_detail.delete')}
          </button>
        </div>
      </div>

      {/* Jobs Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[#25282A]">{t('manager_site_detail.jobs_section_title')}</h3>
          <Link
            href={`/manager/sites/${siteId}/jobs/new`}
            className="px-4 py-2 rounded-full bg-[#0669F7] text-white font-medium text-sm"
          >
            {t('manager_site_detail.add_job')}
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-8 text-center">
            <p className="text-[#98A2B2] text-sm mb-3">{t('manager_site_detail.no_jobs')}</p>
            <Link
              href={`/manager/sites/${siteId}/jobs/new`}
              className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
            >
              {t('manager_site_detail.add_first_job')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} locale={locale} />
            ))}
          </div>
        )}
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
            alt={t('manager_site_detail.fullscreen_alt')}
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(idx) }}
                  className={`w-2 h-2 rounded-full ${idx === lightboxIdx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t('manager_site_detail.delete_modal_title')}
        message={t('manager_site_detail.delete_modal_message')}
        confirmLabel={t('manager_site_detail.delete_modal_confirm')}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
      />
    </>
  )
}
