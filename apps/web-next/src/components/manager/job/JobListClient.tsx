'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Job } from '@/types/manager-site-job'
import JobCard from './JobCard'

interface JobListClientProps {
  siteId: string
  locale: string
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse space-y-2">
      <div className="flex justify-between">
        <div className="h-4 bg-[#DDDDDD] rounded w-1/2" />
        <div className="h-5 bg-[#DDDDDD] rounded-full w-14" />
      </div>
      <div className="h-3 bg-[#DDDDDD] rounded w-1/3" />
      <div className="h-4 bg-[#DDDDDD] rounded w-1/4" />
      <div className="h-2 bg-[#DDDDDD] rounded w-full" />
    </div>
  )
}

export default function JobListClient({ siteId, locale }: JobListClientProps) {
  const idToken = getSessionCookie()
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) {
      setIsLoading(false)
      return
    }
    apiClient<Job[]>(`/manager/sites/${siteId}/jobs`, { token: idToken })
      .then((res) => setJobs(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setIsLoading(false))
  }, [siteId, idToken])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-[#FDE8EE] border border-[#F4A8B8] text-sm text-[#ED1C24] text-center">
        {error}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Link
          href={`/manager/sites/${siteId}/jobs/new`}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm"
        >
          일자리 추가
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="w-14 h-14 text-[#EFF1F5] mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="text-[#98A2B2] text-sm mb-4">등록된 일자리가 없습니다</p>
          <Link
            href={`/manager/sites/${siteId}/jobs/new`}
            className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm"
          >
            첫 일자리 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} locale={locale} />
          ))}
        </div>
      )}
    </>
  )
}
