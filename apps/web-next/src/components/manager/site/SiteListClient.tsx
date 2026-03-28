'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Site } from '@/types/manager-site-job'
import SiteCard from './SiteCard'

interface SiteListClientProps {
  locale: string
}

const DEMO_SITES: Site[] = [
  {
    id: 'demo-1',
    name: '롯데몰 하노이 지하 1층 공사',
    address: '54 Liễu Giai, Ba Đình, Hà Nội',
    province: 'Hà Nội',
    district: 'Hoàn Kiếm',
    status: 'ACTIVE',
    imageUrls: [],
    jobCount: 3,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'demo-2',
    name: '인천 송도 물류센터 자재 운반',
    address: '1 Lê Duẩn, Bến Nghé, Quận 1, Hồ Chí Minh',
    province: 'Hồ Chí Minh',
    district: 'Quận 1',
    status: 'ACTIVE',
    imageUrls: [],
    jobCount: 2,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'demo-3',
    name: '광명역 복합쇼핑몰 신축',
    address: '2 Phạm Văn Bạch, Yên Hòa, Cầu Giấy, Hà Nội',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    status: 'ACTIVE',
    imageUrls: [],
    jobCount: 5,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
  },
  {
    id: 'demo-4',
    name: '다낭 해양 리조트 기초 슬라브',
    address: '78 Võ Nguyên Giáp, Mỹ An, Ngũ Hành Sơn, Đà Nẵng',
    province: 'Đà Nẵng',
    district: 'Sơn Trà',
    status: 'PAUSED',
    imageUrls: [],
    jobCount: 0,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z',
  },
  {
    id: 'demo-5',
    name: '호치민 스카이라인 빌딩 마감',
    address: '15 Nguyễn Thị Thập, Tân Phú, Quận 7, Hồ Chí Minh',
    province: 'Hồ Chí Minh',
    district: 'Quận 7',
    status: 'COMPLETED',
    imageUrls: [],
    jobCount: 1,
    createdAt: '2025-11-15T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  )
}

export default function SiteListClient({ locale }: SiteListClientProps) {
  const router = useRouter()
  const idToken = getSessionCookie()
  const [sites, setSites] = React.useState<Site[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true)
    apiClient<Site[]>('/manager/sites', { token: idToken })
      .then((res) => setSites(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setIsLoading(false))
  }, [idToken])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#D81A48] text-center">
        {error}
      </div>
    )
  }

  const displaySites = sites.length === 0 ? DEMO_SITES : sites
  const isDemo = sites.length === 0

  if (displaySites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          className="w-16 h-16 text-[#EFF1F5] mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <p className="text-[#98A2B2] text-sm mb-4">등록된 현장이 없습니다</p>
        <button
          onClick={() => router.push(`/${locale}/manager/sites/new`)}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm"
        >
          첫 현장 등록하기
        </button>
      </div>
    )
  }

  return (
    <>
      {isDemo && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            데모 데이터
          </span>
          <span className="text-xs text-[#98A2B2]">실제 현장을 등록하면 여기에 표시됩니다</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displaySites.map((site) => (
          <SiteCard key={site.id} site={site} locale={locale} />
        ))}
      </div>
      <button
        onClick={() => router.push(`/${locale}/manager/sites/new`)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#0669F7] shadow-lg flex items-center justify-center text-white z-40"
        aria-label="새 현장 등록"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  )
}
