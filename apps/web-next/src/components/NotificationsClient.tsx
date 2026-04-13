'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'

const API_BASE = '/api/v1'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  data?: Record<string, unknown>
}

function timeAgo(dateStr: string, t: ReturnType<typeof useTranslations<'notifications'>>): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('time.just_now')
  if (m < 60) return t('time.minutes_ago', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('time.hours_ago', { n: h })
  const d = Math.floor(h / 24)
  return t('time.days_ago', { n: d })
}

function NotifIcon({ type }: { type: string }) {
  const cls = 'w-5 h-5'
  if (type === 'APPLICATION_ACCEPTED')
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  if (type === 'APPLICATION_REJECTED')
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  if (type === 'NEW_APPLICATION')
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  if (type === 'CONTRACT_CREATED' || type === 'CONTRACT_SIGNED')
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  if (type === 'ATTENDANCE_MARKED')
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  // Default bell
  return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
}

function notifIconBg(type: string): string {
  if (type === 'APPLICATION_ACCEPTED') return 'bg-[#E6F9E6] text-[#1A6B1A]'
  if (type === 'APPLICATION_REJECTED') return 'bg-[#FDE8EE] text-[#ED1C24]'
  if (type === 'NEW_APPLICATION') return 'bg-[#E6F0FE] text-[#0669F7]'
  if (type === 'CONTRACT_CREATED' || type === 'CONTRACT_SIGNED') return 'bg-[#E6F0FE] text-[#0669F7]'
  if (type === 'ATTENDANCE_MARKED') return 'bg-[#E6F9E6] text-[#1A6B1A]'
  return 'bg-[#F2F4F5] text-[#7A7B7A]'
}

export default function NotificationsClient() {
  const t = useTranslations('notifications')
  const idToken = getSessionCookie()
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [markingAll, setMarkingAll] = React.useState(false)

  React.useEffect(() => {
    if (!idToken) {
      setIsLoading(false)
      return
    }
    fetch(`${API_BASE}/notifications?limit=50`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(async res => {
        if (!res.ok) throw new Error(t('error_load'))
        return res.json()
      })
      .then(body => {
        const payload = body.data ?? body
        const items: Notification[] = payload.data ?? []
        setNotifications(items)
        setUnreadCount(payload.unreadCount ?? 0)
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [idToken])

  async function markRead(id: string) {
    if (!idToken) return
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n),
    )
    setUnreadCount(c => Math.max(0, c - 1))
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${idToken}` },
    }).catch(() => {})
  }

  async function markAllRead() {
    if (!idToken) return
    setMarkingAll(true)
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse flex gap-3">
            <div className="w-10 h-10 bg-[#DDDDDD] rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#DDDDDD] rounded w-3/4" />
              <div className="h-3 bg-[#DDDDDD] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <p className="text-[#ED1C24] text-sm text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1760px] mx-auto">
      {/* Header */}
      <div className="px-4 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#25282A]">{t('title')}</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-[#98A2B2] mt-0.5">{t('unread_count', { n: unreadCount })}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAll}
            className="text-xs text-[#0669F7] font-medium disabled:opacity-50"
          >
            {markingAll ? t('marking_all') : t('mark_all_read')}
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="py-20 text-center">
          <svg className="w-14 h-14 text-[#EFF1F5] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-[#25282A] text-sm font-semibold mb-1">{t('empty')}</p>
          <p className="text-[#98A2B2] text-xs">{t('empty_subtitle')}</p>
        </div>
      ) : (
        <div className="divide-y divide-[#EFF1F5]">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`px-4 py-4 flex gap-3 cursor-pointer transition-colors ${
                n.read ? 'bg-white' : 'bg-[#E6F0FE]'
              }`}
              onClick={() => !n.read && markRead(n.id)}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notifIconBg(n.type)}`}>
                <NotifIcon type={n.type} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${n.read ? 'text-[#25282A]' : 'font-semibold text-[#25282A]'}`}>
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-[#0669F7] flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-[#98A2B2] mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-[#98A2B2] mt-1">{timeAgo(n.created_at, t)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
