'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import SiteForm from './SiteForm'

interface SiteFormWrapperProps {
  locale: string
}

function Skeleton() {
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

export default function SiteFormWrapper({ locale }: SiteFormWrapperProps) {
  const [idToken, setIdToken] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setIdToken(getSessionCookie())
    setMounted(true)
  }, [])

  if (!mounted) return <Skeleton />

  if (!idToken) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#D81A48] text-center">
        인증이 필요합니다.
      </div>
    )
  }

  return <SiteForm mode="create" locale={locale} idToken={idToken} />
}
