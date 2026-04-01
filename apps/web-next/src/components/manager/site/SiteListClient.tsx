'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import { siteStore } from '@/lib/demo/siteStore'
import type { Site } from '@/types/manager-site-job'
import SiteCard from './SiteCard'

interface SiteListClientProps {
  locale: string
}

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
  const [isDemo, setIsDemo] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) {
      // Demo mode — load from localStorage store
      setSites(siteStore.list())
      setIsDemo(true)
      setIsLoading(false)
      return
    }
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

  if (sites.length === 0) {
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
        {sites.map((site) => (
          <SiteCard key={site.id} site={site} locale={locale} />
        ))}
      </div>
    </>
  )
}
