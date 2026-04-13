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
          <div className="h-4 bg-[#DDDDDD] rounded w-1/3" />
          <div className="h-10 bg-[#DDDDDD] rounded" />
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

  return <SiteForm mode="create" locale={locale} idToken={idToken ?? ''} />
}
