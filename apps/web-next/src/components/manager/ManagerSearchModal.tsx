'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import type { Site, SiteStatus } from '@/types/manager-site-job'

function IconSearch({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
function IconX({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Province {
  code: string
  nameVi: string
  nameEn: string
  slug: string
}

interface SiteSummary {
  id: string
  name: string
  province: string
  status: SiteStatus
}

type JobStatusFilter = 'ALL' | 'OPEN' | 'FILLED' | 'COMPLETED' | 'CANCELLED'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = '/api/v1'

const HISTORY_KEY = 'gada_manager_search_history'
const HISTORY_MAX = 5

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHistory(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(keyword: string): void {
  if (!keyword.trim()) return
  const prev = getHistory().filter((k) => k !== keyword.trim())
  const next = [keyword.trim(), ...prev].slice(0, HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

function removeHistoryItem(keyword: string): void {
  const next = getHistory().filter((k) => k !== keyword)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ManagerSearchModalProps {
  locale: string
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ManagerSearchModal({
  locale,
  open,
  onClose,
}: ManagerSearchModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('manager.search_modal')
  const tJobs = useTranslations('manager.jobs_page')

  // --- form state ---
  const [keyword, setKeyword] = useState('')
  const [province, setProvince] = useState('')
  const [siteId, setSiteId] = useState('')
  const [jobStatus, setJobStatus] = useState<JobStatusFilter>('ALL')

  // --- data ---
  const [provinces, setProvinces] = useState<Province[]>([])
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [history, setHistory] = useState<string[]>([])

  // --- refs ---
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const STATUS_PILLS: { label: string; value: JobStatusFilter }[] = [
    { label: tJobs('tab_all'),       value: 'ALL' },
    { label: tJobs('tab_open'),      value: 'OPEN' },
    { label: tJobs('tab_filled'),    value: 'FILLED' },
    { label: tJobs('tab_completed'), value: 'COMPLETED' },
    { label: tJobs('tab_cancelled'), value: 'CANCELLED' },
  ]

  // Pre-fill from URL params when modal opens
  useEffect(() => {
    if (!open) return
    setKeyword(searchParams.get('q') ?? '')
    setProvince(searchParams.get('province') ?? '')
    setSiteId(searchParams.get('site') ?? '')
    const status = searchParams.get('status') as JobStatusFilter | null
    setJobStatus(status ?? 'ALL')
    setHistory(getHistory())
  }, [open, searchParams])

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(id)
    }
  }, [open])

  // Escape key to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Fetch provinces once on mount
  useEffect(() => {
    fetch(`${API_BASE}/public/provinces?locale=ko`)
      .then((r) => r.json())
      .then((body) => {
        const data: Province[] = body?.data ?? body ?? []
        setProvinces(data)
      })
      .catch(() => {
        // silently ignore — province filter is optional
      })
  }, [])

  // Fetch manager sites on mount (requires auth)
  useEffect(() => {
    const token = getSessionCookie()
    if (!token) return

    fetch(`${API_BASE}/manager/sites`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((body) => {
        const raw: Site[] = body?.data ?? body ?? []
        const mapped: SiteSummary[] = raw.map((s) => ({
          id: s.id,
          name: s.name,
          province: s.province,
          status: s.status,
        }))
        setSites(mapped)
      })
      .catch(() => {
        // silently ignore — site filter is optional
      })
  }, [])

  // --- handlers ---

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  const handleReset = useCallback(() => {
    setKeyword('')
    setProvince('')
    setSiteId('')
    setJobStatus('ALL')
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    saveHistory(keyword)

    const params = new URLSearchParams()
    if (keyword.trim()) params.set('q', keyword.trim())
    if (province) params.set('province', province)
    if (siteId) params.set('site', siteId)
    if (jobStatus !== 'ALL') params.set('status', jobStatus)

    const query = params.toString()
    const href = `/manager/jobs${query ? `?${query}` : ''}`
    router.push(href as never)
    onClose()
  }, [keyword, province, siteId, jobStatus, locale, router, onClose])

  const handleHistoryChipClick = useCallback((kw: string) => {
    setKeyword(kw)
    inputRef.current?.focus()
  }, [])

  const handleHistoryChipRemove = useCallback(
    (e: React.MouseEvent, kw: string) => {
      e.stopPropagation()
      removeHistoryItem(kw)
      setHistory(getHistory())
    },
    [],
  )

  // --- render nothing when closed ---
  if (!open) return null

  const showHistory = keyword === '' && history.length > 0

  return (
    /* Full-screen overlay */
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      aria-modal="true"
      role="dialog"
      aria-label={t('title')}
    >
      {/* Modal panel */}
      <div
        className={[
          'relative w-full bg-white flex flex-col',
          // Mobile: bottom sheet
          'max-h-[85vh] rounded-t-2xl',
          // Desktop: centered card
          'sm:max-w-lg sm:rounded-2xl sm:max-h-[90vh]',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid #EFF1F5' }}
        >
          {/* Mobile drag handle */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#EFF1F5] sm:hidden" />

          <h2 className="text-[17px] font-semibold" style={{ color: '#25282A' }}>
            {t('title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F2F4F5] transition-colors"
          >
            <IconX size={20} color="#25282A" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
          {/* Search input */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: '#F2F4F5', border: '1.5px solid #EFF1F5' }}
          >
            <IconSearch size={20} color="#98A2B2" />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={t('placeholder')}
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[#98A2B2]"
              style={{ color: '#25282A' }}
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                aria-label={t('clear_input')}
                className="shrink-0"
              >
                <IconX size={16} color="#98A2B2" />
              </button>
            )}
          </div>

          {/* Search history chips */}
          {showHistory && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-2" style={{ color: '#98A2B2' }}>
                {t('recent')}
              </p>
              <div className="flex flex-wrap gap-2">
                {history.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => handleHistoryChipClick(kw)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[#EFF1F5]"
                    style={{
                      background: '#F2F4F5',
                      color: '#25282A',
                      border: '1px solid #EFF1F5',
                    }}
                  >
                    <IconSearch size={12} color="#98A2B2" />
                    {kw}
                    <span
                      role="button"
                      aria-label={`${kw} 삭제`}
                      onClick={(e) => handleHistoryChipRemove(e, kw)}
                      className="ml-0.5"
                    >
                      <IconX size={12} color="#98A2B2" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <div className="mt-5">
            <p className="text-[13px] font-semibold mb-3" style={{ color: '#98A2B2' }}>
              {t('filters_title')}
            </p>

            <div className="flex flex-col gap-3">
              {/* 1. Province */}
              <div>
                <label
                  className="block text-[13px] font-medium mb-1.5"
                  style={{ color: '#25282A' }}
                >
                  {t('province_label')}
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-[14px] appearance-none outline-none"
                  style={{
                    background: '#F2F4F5',
                    border: '1.5px solid #EFF1F5',
                    color: province ? '#25282A' : '#98A2B2',
                  }}
                >
                  <option value="">{t('all_provinces')}</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.nameVi}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Site — only show when sites loaded */}
              {sites.length > 0 && (
                <div>
                  <label
                    className="block text-[13px] font-medium mb-1.5"
                    style={{ color: '#25282A' }}
                  >
                    {t('site_label')}
                  </label>
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-[14px] appearance-none outline-none"
                    style={{
                      background: '#F2F4F5',
                      border: '1.5px solid #EFF1F5',
                      color: siteId ? '#25282A' : '#98A2B2',
                    }}
                  >
                    <option value="">{t('all_sites')}</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Job status pills */}
              <div>
                <label
                  className="block text-[13px] font-medium mb-1.5"
                  style={{ color: '#25282A' }}
                >
                  {t('status_label')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_PILLS.map((pill) => {
                    const active = jobStatus === pill.value
                    return (
                      <button
                        key={pill.value}
                        onClick={() => setJobStatus(pill.value)}
                        className="rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
                        style={
                          active
                            ? {
                                background: '#0669F7',
                                color: '#ffffff',
                                border: '1.5px solid #0669F7',
                              }
                            : {
                                background: '#F2F4F5',
                                color: '#25282A',
                                border: '1.5px solid #EFF1F5',
                              }
                        }
                      >
                        {pill.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div
          className="shrink-0 flex items-center gap-3 px-5 py-4"
          style={{ borderTop: '1px solid #EFF1F5' }}
        >
          <button
            onClick={handleReset}
            className="shrink-0 text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors hover:bg-[#F2F4F5]"
            style={{ color: '#98A2B2' }}
          >
            {t('reset')}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-full py-3 text-[15px] font-semibold text-white transition-opacity active:opacity-80"
            style={{ background: '#0669F7' }}
          >
            {t('search')}
          </button>
        </div>
      </div>
    </div>
  )
}
