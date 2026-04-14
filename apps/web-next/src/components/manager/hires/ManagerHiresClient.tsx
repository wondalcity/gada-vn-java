'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'

const API_BASE = '/api/v1'

interface Application {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONTRACTED' | 'WITHDRAWN'
  jobId: string
  jobTitle: string
  workDate: string
  workerId: string
  workerName: string
  workerPhone: string
  workerTrades: string[]
  experienceYears?: number
}

type TabKey = 'all' | 'pending' | 'accepted' | 'contracted'

function formatDate(d: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(d))
}

function PeopleIllustration() {
  return (
    <svg
      className="w-16 h-16 text-[#DDDDDD] mx-auto mb-4"
      fill="none"
      viewBox="0 0 64 64"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="22" cy="20" r="8" />
      <path d="M6 52c0-8.837 7.163-16 16-16s16 7.163 16 16" />
      <circle cx="44" cy="22" r="6" />
      <path d="M32 52c0-6.627 5.373-12 12-12" />
    </svg>
  )
}

export default function ManagerHiresClient() {
  const t = useTranslations('common')
  const idToken = getSessionCookie()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'

  const [applications, setApplications] = React.useState<Application[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<TabKey>('all')
  const [actionLoading, setActionLoading] = React.useState<Record<string, 'accept' | 'reject' | null>>({})
  const [creatingContractFor, setCreatingContractFor] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!idToken) { setIsLoading(false); return }
    setIsLoading(true)
    setError(null)
    apiClient<Application[]>('/manager/applications', { token: idToken })
      .then(({ data }) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => {
        // API 실패(등록된 일자리 없음 등)는 빈 목록으로 처리
        setApplications([])
      })
      .finally(() => setIsLoading(false))
  }, [idToken, t])

  React.useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function handleAccept(appId: string) {
    if (!idToken) return
    setActionLoading((prev) => ({ ...prev, [appId]: 'accept' }))
    try {
      const token = getSessionCookie()
      const res = await fetch(`${API_BASE}/manager/applications/${appId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      showToast(t('manager_hires.accept_success'))
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: 'ACCEPTED' } : a)),
      )
    } catch {
      showToast(t('manager_hires.action_error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [appId]: null }))
    }
  }

  async function handleReject(appId: string) {
    if (!idToken) return
    setActionLoading((prev) => ({ ...prev, [appId]: 'reject' }))
    try {
      const token = getSessionCookie()
      const res = await fetch(`${API_BASE}/manager/applications/${appId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      showToast(t('manager_hires.reject_success'))
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: 'REJECTED' } : a)),
      )
    } catch {
      showToast(t('manager_hires.action_error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [appId]: null }))
    }
  }

  async function handleCreateContract(appId: string) {
    if (!idToken) return
    setCreatingContractFor(appId)
    try {
      await apiClient(`/contracts/generate`, {
        method: 'POST',
        token: idToken,
        body: JSON.stringify({ applicationId: appId }),
      })
      showToast(t('manager_hires.contract_created'))
      load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('manager_hires.contract_create_error'))
    } finally {
      setCreatingContractFor(null)
    }
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('manager_hires.tab_all') },
    { key: 'pending', label: t('manager_hires.tab_pending') },
    { key: 'accepted', label: t('manager_hires.tab_accepted') },
    { key: 'contracted', label: t('manager_hires.tab_contracted') },
  ]

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t('manager_hires.status_pending'),
    ACCEPTED: t('manager_hires.status_accepted'),
    CONTRACTED: t('manager_hires.status_contracted'),
    REJECTED: t('manager_hires.status_rejected'),
  }

  const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-[#FFFBEB] text-[#856404] border border-[#F5D87D]',
    ACCEPTED: 'bg-[#E6F0FE] text-[#0669F7] border border-[#B3D9FF]',
    CONTRACTED: 'bg-[#E6F9E6] text-[#1A6B1A] border border-[#86D98A]',
    REJECTED: 'bg-[#FDE8EE] text-[#ED1C24] border border-[#F4A8B8]',
  }

  // Tab count helpers
  const counts = React.useMemo(() => ({
    all: applications.length,
    pending: applications.filter((a) => a.status === 'PENDING').length,
    accepted: applications.filter((a) => a.status === 'ACCEPTED').length,
    contracted: applications.filter((a) => a.status === 'CONTRACTED').length,
  }), [applications])

  const filteredApplications = React.useMemo(() => {
    let list = applications

    // Tab filter
    if (activeTab === 'pending') list = list.filter((a) => a.status === 'PENDING')
    else if (activeTab === 'accepted') list = list.filter((a) => a.status === 'ACCEPTED')
    else if (activeTab === 'contracted') list = list.filter((a) => a.status === 'CONTRACTED')

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (a) =>
          a.workerName.toLowerCase().includes(q) ||
          a.workerPhone.includes(q) ||
          a.jobTitle.toLowerCase().includes(q),
      )
    }

    return list
  }, [applications, activeTab, searchQuery])

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('manager_hires.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 animate-pulse">
              <div className="h-4 bg-[#DDDDDD] rounded w-1/2 mb-3" />
              <div className="h-3 bg-[#DDDDDD] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#DDDDDD] rounded w-1/3 mb-2" />
              <div className="h-8 bg-[#DDDDDD] rounded w-28 mt-3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('manager_hires.title')}</h1>
        <p className="text-[#ED1C24] text-sm mb-4">{error}</p>
        <button
          type="button"
          onClick={load}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium hover:bg-[#0557D4] transition-colors text-sm"
        >
          {t('manager_hires.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1760px] mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#25282A] mb-4">{t('manager_hires.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const count = counts[tab.key]
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#0669F7] text-white'
                  : 'bg-white border border-[#EFF1F5] text-[#98A2B2] hover:border-[#0669F7] hover:text-[#0669F7]'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-bold px-1 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F2F4F5] text-[#98A2B2]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      {applications.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('manager_hires.search_placeholder')}
            className="w-full px-3 py-2.5 border border-[#EFF1F5] rounded-2xl text-sm text-[#25282A] placeholder-[#98A2B2] focus:outline-none focus:border-[#0669F7]"
          />
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 ? (
        <div className="py-16 text-center">
          <PeopleIllustration />
          <p className="text-[#98A2B2] text-sm font-medium">{t('manager_hires.empty_title')}</p>
          <p className="text-[#98A2B2] text-xs mt-1">{t('manager_hires.empty_subtitle')}</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <p className="text-center text-[#98A2B2] text-sm py-12">{t('manager_hires.no_search_results')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredApplications.map((app) => {
            const isActing = actionLoading[app.id]
            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4"
              >
                {/* Header: worker name + status badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-[#25282A] text-sm">{app.workerName}</p>
                    <p className="text-xs text-[#98A2B2] mt-0.5">{app.workerPhone}</p>
                    {app.workerTrades.length > 0 && (
                      <p className="text-xs text-[#98A2B2] mt-0.5">{app.workerTrades.join(', ')}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      STATUS_STYLES[app.status] ?? 'bg-[#F2F4F5] text-[#98A2B2]'
                    }`}
                  >
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>

                {/* Job info */}
                <div className="border-t border-[#EFF1F5] pt-2 space-y-0.5">
                  <Link
                    href={`/manager/jobs/${app.jobId}` as never}
                    className="text-sm font-medium text-[#25282A] hover:text-[#0669F7] transition-colors"
                  >
                    {app.jobTitle}
                  </Link>
                  {app.workDate && (
                    <p className="text-xs text-[#98A2B2]">{formatDate(app.workDate, locale)}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-[#EFF1F5]">
                  {app.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(app.id)}
                        disabled={!!isActing}
                        className="flex-1 py-1.5 rounded-full bg-[#0669F7] text-white font-medium text-xs hover:bg-[#0557D4] transition-colors disabled:opacity-40"
                      >
                        {isActing === 'accept' ? t('manager_hires.processing') : t('manager_hires.action_accept')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(app.id)}
                        disabled={!!isActing}
                        className="flex-1 py-1.5 rounded-full border border-[#ED1C24] text-[#ED1C24] font-medium text-xs hover:bg-[#ED1C24] hover:text-white transition-colors disabled:opacity-40"
                      >
                        {isActing === 'reject' ? t('manager_hires.processing') : t('manager_hires.action_reject')}
                      </button>
                    </div>
                  )}

                  {app.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      onClick={() => handleCreateContract(app.id)}
                      disabled={creatingContractFor === app.id}
                      className="w-full py-1.5 rounded-full border border-[#0669F7] text-[#0669F7] font-medium text-xs hover:bg-[#0669F7] hover:text-white transition-colors disabled:opacity-40"
                    >
                      {creatingContractFor === app.id
                        ? t('manager_hires.creating_contract')
                        : t('manager_hires.create_contract')}
                    </button>
                  )}

                  {app.status === 'CONTRACTED' && (
                    <Link
                      href={`/manager/hires/${app.id}` as never}
                      className="block w-full py-1.5 rounded-full bg-[#E6F9E6] border border-[#86D98A] text-[#1A6B1A] font-medium text-xs text-center hover:bg-[#1A6B1A] hover:text-white transition-colors"
                    >
                      {t('manager_hires.view_contract')}
                    </Link>
                  )}

                  {app.status === 'REJECTED' && (
                    <p className="text-xs text-[#98A2B2] text-center">{t('manager_hires.status_rejected')}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#25282A] text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
