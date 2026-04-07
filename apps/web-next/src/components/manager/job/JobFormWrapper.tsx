'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import JobForm from './JobForm'
import type { Job } from '@/types/manager-site-job'

interface JobFormWrapperProps {
  mode: 'create' | 'edit'
  siteId: string
  siteName?: string
  jobId?: string
  initialData?: Partial<Job>
  locale: string
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-3">
          <div className="h-4 bg-[#DDDDDD] rounded w-1/3" />
          <div className="h-10 bg-[#DDDDDD] rounded" />
        </div>
      ))}
    </div>
  )
}

export default function JobFormWrapper({
  mode,
  siteId,
  siteName,
  jobId,
  initialData,
  locale,
}: JobFormWrapperProps) {
  const [idToken, setIdToken] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setIdToken(getSessionCookie())
    setMounted(true)
  }, [])

  if (!mounted) return <Skeleton />

  if (!idToken) {
    return (
      <div className="p-4 rounded-2xl bg-[#FDE8EE] border border-[#F4A8B8] text-sm text-[#ED1C24] text-center">
        인증이 필요합니다.
      </div>
    )
  }

  return (
    <JobForm
      mode={mode}
      siteId={siteId}
      siteName={siteName}
      jobId={jobId}
      initialData={initialData}
      locale={locale}
      idToken={idToken}
    />
  )
}
