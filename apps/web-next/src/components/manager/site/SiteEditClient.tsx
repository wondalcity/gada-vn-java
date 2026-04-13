'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'
import type { Site } from '@/types/manager-site-job'
import SiteForm from './SiteForm'

interface SiteEditClientProps {
  siteId: string
  locale: string
}

export default function SiteEditClient({ siteId, locale }: SiteEditClientProps) {
  const idToken = getSessionCookie()
  const [site, setSite] = React.useState<Site | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) {
      setIsLoading(false)
      return
    }
    apiClient<Site>(`/manager/sites/${siteId}`, { token: idToken })
      .then((res) => setSite(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setIsLoading(false))
  }, [siteId, idToken])

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 bg-[#DDDDDD] rounded w-1/4" />
              <div className="h-10 bg-[#DDDDDD] rounded" />
            </div>
          ))}
        </div>
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

  if (!site) return null

  return (
    <SiteForm
      mode="edit"
      initialData={site}
      siteId={siteId}
      locale={locale}
      idToken={idToken ?? ''}
    />
  )
}
