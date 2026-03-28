'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
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

const DEMO_SITES: Record<string, Site & { demoJobs?: Job[] }> = {
  'demo-1': { id: 'demo-1', name: '롯데몰 하노이 지하 1층 공사', address: '54 Liễu Giai, Ba Đình, Hà Nội', province: 'Hà Nội', district: 'Ba Đình', status: 'ACTIVE', imageUrls: [], jobCount: 2, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z', demoJobs: [
    { id: 'djob-1', siteId: 'demo-1', siteName: '롯데몰 하노이 지하 1층 공사', title: '전기 배선 작업', tradeName: '전기', workDate: '2026-03-28', dailyWage: 700000, currency: 'VND', benefits: { meals: true, transport: false, accommodation: false, insurance: true }, requirements: {}, slotsTotal: 5, slotsFilled: 3, status: 'OPEN', imageUrls: [], shiftCount: 0, applicationCount: { pending: 2, accepted: 3, rejected: 0 }, createdAt: '2026-03-20T00:00:00Z', updatedAt: '2026-03-20T00:00:00Z' },
    { id: 'djob-2', siteId: 'demo-1', siteName: '롯데몰 하노이 지하 1층 공사', title: '콘크리트 타설 — 기초 슬라브', tradeName: '콘크리트', workDate: '2026-03-29', dailyWage: 560000, currency: 'VND', benefits: { meals: true, transport: true, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 8, slotsFilled: 8, status: 'FILLED', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 8, rejected: 2 }, createdAt: '2026-03-18T00:00:00Z', updatedAt: '2026-03-18T00:00:00Z' },
  ] },
  'demo-2': { id: 'demo-2', name: '인천 송도 물류센터 자재 운반', address: '1 Lê Duẩn, Bến Nghé, Quận 1, Hồ Chí Minh', province: 'Hồ Chí Minh', district: 'Quận 1', status: 'ACTIVE', imageUrls: [], jobCount: 1, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-03-15T00:00:00Z', demoJobs: [
    { id: 'djob-3', siteId: 'demo-2', siteName: '인천 송도 물류센터', title: '잡부 — 자재 운반', tradeName: '일반', workDate: '2026-03-30', dailyWage: 410000, currency: 'VND', benefits: { meals: false, transport: false, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 10, slotsFilled: 4, status: 'OPEN', imageUrls: [], shiftCount: 0, applicationCount: { pending: 6, accepted: 4, rejected: 0 }, createdAt: '2026-03-22T00:00:00Z', updatedAt: '2026-03-22T00:00:00Z' },
  ] },
  'demo-3': { id: 'demo-3', name: '광명역 복합쇼핑몰 신축', address: '2 Phạm Văn Bạch, Yên Hòa, Cầu Giấy, Hà Nội', province: 'Hà Nội', district: 'Cầu Giấy', status: 'ACTIVE', imageUrls: [], jobCount: 2, createdAt: '2026-01-20T00:00:00Z', updatedAt: '2026-03-20T00:00:00Z', demoJobs: [
    { id: 'djob-4', siteId: 'demo-3', siteName: '광명역 복합쇼핑몰 신축', title: '철근 조립 — 3층 골조', tradeName: '철근', workDate: '2026-03-25', dailyWage: 620000, currency: 'VND', benefits: { meals: true, transport: false, accommodation: false, insurance: true }, requirements: {}, slotsTotal: 6, slotsFilled: 6, status: 'COMPLETED', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 6, rejected: 1 }, createdAt: '2026-03-15T00:00:00Z', updatedAt: '2026-03-15T00:00:00Z' },
    { id: 'djob-5', siteId: 'demo-3', siteName: '광명역 복합쇼핑몰 신축', title: '타일 시공 — 로비 바닥', tradeName: '타일', workDate: '2026-04-01', dailyWage: 580000, currency: 'VND', benefits: { meals: false, transport: false, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 4, slotsFilled: 0, status: 'OPEN', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 0, rejected: 0 }, createdAt: '2026-03-24T00:00:00Z', updatedAt: '2026-03-24T00:00:00Z' },
  ] },
  'demo-4': { id: 'demo-4', name: '다낭 해양 리조트 기초 슬라브', address: '78 Võ Nguyên Giáp, Mỹ An, Đà Nẵng', province: 'Đà Nẵng', district: 'Sơn Trà', status: 'PAUSED', imageUrls: [], jobCount: 0, createdAt: '2025-12-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z', demoJobs: [] },
  'demo-5': { id: 'demo-5', name: '호치민 스카이라인 빌딩', address: '128 Võ Văn Tần, Quận 3, Hồ Chí Minh', province: 'Hồ Chí Minh', district: 'Quận 3', status: 'ACTIVE', imageUrls: [], jobCount: 1, createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-03-25T00:00:00Z', demoJobs: [
    { id: 'djob-6', siteId: 'demo-5', siteName: '호치민 스카이라인 빌딩', title: '도장 작업 — 외벽 마감', tradeName: '도장', workDate: '2026-03-20', dailyWage: 490000, currency: 'VND', benefits: { meals: false, transport: false, accommodation: false, insurance: false }, requirements: {}, slotsTotal: 3, slotsFilled: 3, status: 'COMPLETED', imageUrls: [], shiftCount: 0, applicationCount: { pending: 0, accepted: 3, rejected: 0 }, createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  ] },
}

export default function SiteDetailClient({ siteId, locale }: SiteDetailClientProps) {
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
    // Demo fallback for demo IDs
    if (DEMO_SITES[siteId]) {
      const demoSite = DEMO_SITES[siteId]
      setSite(demoSite)
      setJobs(demoSite.demoJobs ?? [])
      setIsDemo(true)
      setIsLoading(false)
      return
    }
    if (!idToken) { setIsLoading(false); return }
    Promise.all([
      apiClient<Site>(`/manager/sites/${siteId}`, { token: idToken }),
      apiClient<Job[]>(`/manager/sites/${siteId}/jobs`, { token: idToken }),
    ])
      .then(([siteRes, jobsRes]) => {
        setSite(siteRes.data)
        setJobs(jobsRes.data)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setIsLoading(false))
  }, [siteId, idToken])

  async function handleStatusChange(newStatus: SiteStatus) {
    if (!site || !idToken) return
    try {
      await apiClient<Site>(`/manager/sites/${siteId}/status`, {
        method: 'PATCH',
        token: idToken,
        body: JSON.stringify({ status: newStatus }),
      })
      setSite((prev) => prev ? { ...prev, status: newStatus } : prev)
    } catch (e) {
      alert(e instanceof Error ? e.message : '상태 변경 실패')
    }
  }

  async function handleDelete() {
    if (!idToken) return
    setIsDeleting(true)
    try {
      await apiClient(`/manager/sites/${siteId}/status`, {
        method: 'PATCH',
        token: idToken,
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      router.push(`/${locale}/manager/sites`)
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setIsDeleting(false)
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

  if (!site) return null

  const allImages = site.imageUrls ?? []

  return (
    <>
      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="font-semibold">데모 데이터</span>
          <span className="text-amber-600">— API 연결 후 실제 데이터가 표시됩니다</span>
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
              <img src={url} alt={`현장 이미지 ${idx + 1}`} className="w-full h-full object-cover" />
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
          <p><span className="text-[#98A2B2]">주소:</span> {site.address}</p>
          <p><span className="text-[#98A2B2]">성/시:</span> {site.province}</p>
          {site.district && <p><span className="text-[#98A2B2]">구/현:</span> {site.district}</p>}
          {site.siteType && <p><span className="text-[#98A2B2]">유형:</span> {site.siteType}</p>}
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/manager/sites/${siteId}/edit`}
            className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
          >
            수정
          </Link>

          {/* Status change dropdown */}
          <div className="relative">
            <select
              value={site.status}
              onChange={(e) => handleStatusChange(e.target.value as SiteStatus)}
              className="px-5 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm bg-white appearance-none pr-8 cursor-pointer"
            >
              <option value="ACTIVE">운영중으로 변경</option>
              <option value="PAUSED">일시중지로 변경</option>
              <option value="COMPLETED">완료로 변경</option>
            </select>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-full border border-[#D81A48] text-[#D81A48] font-medium text-sm"
          >
            삭제
          </button>
        </div>
      </div>

      {/* Jobs Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[#25282A]">이 현장의 일자리</h3>
          <Link
            href={`/${locale}/manager/sites/${siteId}/jobs/new`}
            className="px-4 py-2 rounded-full bg-[#0669F7] text-white font-medium text-sm"
          >
            일자리 추가
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-8 text-center">
            <p className="text-[#98A2B2] text-sm mb-3">등록된 일자리가 없습니다</p>
            <Link
              href={`/${locale}/manager/sites/${siteId}/jobs/new`}
              className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
            >
              첫 일자리 등록하기
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
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
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
            alt="전체 화면 이미지"
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
        title="현장 삭제"
        message="현장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
      />
    </>
  )
}
