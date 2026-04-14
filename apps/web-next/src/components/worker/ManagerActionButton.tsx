'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'

const API_BASE = '/api/v1'

interface Props {
  locale: string
  isManager: boolean
  managerStatus: 'active' | 'pending' | null | undefined
  variant: 'hero' | 'sidebar'
}

export function ManagerActionButton({ locale, isManager, managerStatus, variant }: Props) {
  const router = useRouter()
  const t = useTranslations('common')
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'pending'>(
    managerStatus === 'pending' ? 'pending' : 'idle',
  )

  // Sync state when server re-renders with updated managerStatus
  React.useEffect(() => {
    if (managerStatus === 'pending') setStatus('pending')
  }, [managerStatus])

  // On mount: verify registration status directly from API to handle cases
  // where the server component doesn't reflect the latest DB state
  React.useEffect(() => {
    if (isManager || managerStatus === 'pending') return
    const token = getSessionCookie()
    if (!token) return

    fetch(`${API_BASE}/managers/registration-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(body => {
        if (body?.data?.hasApplied && body?.data?.approvalStatus === 'PENDING') {
          setStatus('pending')
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApply() {
    const token = getSessionCookie()
    if (!token) return
    setStatus('loading')
    try {
      const res = await fetch(`${API_BASE}/managers/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setStatus('pending')
        // Invalidate the Router Cache so navigating back shows the updated state
        router.refresh()
      } else {
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    }
  }

  if (isManager) {
    if (variant === 'hero') {
      return (
        <Link
          href={'/manager' as never}
          className="relative mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold hover:bg-white/25 transition-colors active:bg-white/30"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {t('worker_profile.switch_to_manager')}
        </Link>
      )
    }
    return (
      <Link
        href={'/manager' as never}
        className="flex items-center justify-between px-4 py-3 bg-[#0669F7] text-white rounded-2xl text-sm font-semibold hover:bg-[#0557D4] transition-colors border border-[#0448B0]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          {t('worker_profile.switch_to_manager')}
        </div>
        <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    )
  }

  if (status === 'pending') {
    if (variant === 'hero') {
      return (
        <div className="relative mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#FFC72C]/20 border border-[#F5D87D]/40 text-[#FFC72C] text-sm font-semibold">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('worker_profile.manager_pending')}
        </div>
      )
    }
    return (
      <div className="px-4 py-3 bg-[#FFFBEB] border border-[#F5D87D] rounded-2xl">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] border border-[#F5D87D] flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-3.5 h-3.5 text-[#856404]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#856404] leading-snug">{t('worker_profile.manager_pending')}</p>
            <p className="text-xs text-[#856404]/70 mt-0.5 leading-snug">{t('worker_profile.manager_pending_desc')}</p>
          </div>
        </div>
        <div className="mt-2.5 flex justify-end">
          <span className="px-2.5 py-1 rounded-lg bg-[#FFC72C] text-[#3C2C02] text-xs font-bold">{t('worker_profile.manager_pending_badge')}</span>
        </div>
      </div>
    )
  }

  // idle / apply state
  if (variant === 'hero') {
    return (
      <button
        type="button"
        onClick={handleApply}
        disabled={status === 'loading'}
        className="relative mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold hover:bg-white/25 transition-colors active:bg-white/30 disabled:opacity-50"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        {status === 'loading' ? t('worker_profile.applying') : t('worker_profile.apply_manager')}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={handleApply}
      disabled={status === 'loading'}
      className="flex items-center justify-between w-full px-4 py-3 bg-white border border-[#EFF1F5] rounded-2xl text-sm font-semibold text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] hover:bg-[#E6F0FE] transition-all shadow-sm disabled:opacity-50"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#F2F4F5] flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        {status === 'loading' ? t('worker_profile.applying') : t('worker_profile.apply_manager')}
      </div>
      <svg className="w-4 h-4 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
