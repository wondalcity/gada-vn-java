'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Job } from '@/types/manager-site-job'
import JobForm from './JobForm'

interface JobEditClientProps {
  jobId: string
  locale: string
}

export default function JobEditClient({ jobId, locale }: JobEditClientProps) {
  const idToken = getSessionCookie()
  const [job, setJob] = React.useState<Job | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) return
    apiClient<Job>(`/manager/jobs/${jobId}`, { token: idToken })
      .then((res) => setJob(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setIsLoading(false))
  }, [jobId, idToken])

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        ))}
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

  if (!job || !idToken) return null

  return (
    <JobForm
      mode="edit"
      siteId={job.siteId}
      siteName={job.siteName}
      jobId={jobId}
      initialData={job}
      locale={locale}
      idToken={idToken}
    />
  )
}
