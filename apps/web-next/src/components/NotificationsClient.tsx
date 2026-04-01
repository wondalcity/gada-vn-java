'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

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

const TYPE_ICONS: Record<string, string> = {
  NEW_APPLICATION:    '📋',
  APPLICATION_ACCEPTED: '✅',
  APPLICATION_REJECTED: '❌',
  CONTRACT_CREATED:   '📝',
  CONTRACT_SIGNED:    '✍️',
  ATTENDANCE_MARKED:  '📍',
  ADMIN:              '📣',
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'APPLICATION_ACCEPTED',
    title: '합격 축하드립니다! 🎉',
    body: '전기 배선 작업 (롯데몰 하노이 지하 1층 공사) 공고에 합격하셨습니다. 계약서를 확인해 주세요.',
    read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'CONTRACT_CREATED',
    title: '계약서가 발행되었습니다',
    body: '전기 배선 작업 계약서가 발행되었습니다. 서명이 필요합니다.',
    read: false,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'CONTRACT_SIGNED',
    title: '계약이 완료되었습니다',
    body: '철근 조립 — 3층 골조 계약서에 사업주가 서명하여 계약이 완료되었습니다.',
    read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-4',
    type: 'ATTENDANCE_MARKED',
    title: '출근이 확인되었습니다',
    body: '2026년 3월 25일 철근 조립 현장 출근이 기록되었습니다. 수고하셨습니다!',
    read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-5',
    type: 'ADMIN',
    title: 'GADA VN 공지사항',
    body: '3월 28일 설 연휴로 인해 일부 현장 운영이 변경될 수 있습니다. 담당 현장 사업주에게 문의해 주세요.',
    read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

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
      setNotifications(DEMO_NOTIFICATIONS)
      setUnreadCount(DEMO_NOTIFICATIONS.filter(n => !n.read).length)
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
        setNotifications(items.length === 0 ? DEMO_NOTIFICATIONS : items)
        setUnreadCount(items.length === 0
          ? DEMO_NOTIFICATIONS.filter(n => !n.read).length
          : (payload.unreadCount ?? 0))
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
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <p className="text-[#D81A48] text-sm text-center">{error}</p>
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
                n.read ? 'bg-white' : 'bg-blue-50'
              }`}
              onClick={() => !n.read && markRead(n.id)}
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                {TYPE_ICONS[n.type] ?? '🔔'}
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
