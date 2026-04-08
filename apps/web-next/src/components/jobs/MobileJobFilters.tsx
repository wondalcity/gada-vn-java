'use client'

import * as React from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import type { Province, Trade } from '@/lib/api/public'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface SavedLocation {
  id: string
  label: string
  lat: number
  lng: number
  is_default: boolean
}

interface Props {
  provinces: Province[]
  trades: Trade[]
  selectedProvince?: string
  selectedTrade?: number
  selectedLat?: number
  selectedLng?: number
  selectedRadius?: number
  selectedStatus?: string
  totalJobs: number
  viewToggle?: React.ReactNode
}

const STATUS_OPTIONS = [
  { value: '',             label: '모집중',   dotColor: 'bg-[#00C800]' },
  { value: 'ALMOST_FULL',  label: '마감임박',  dotColor: 'bg-[#FFC72C]' },
  { value: 'FILLED',       label: '마감',     dotColor: 'bg-[#7A7B7A]' },
] as const

const RADIUS_OPTIONS = [10, 30, 50, 100]

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF4FF] border border-[#0669F7] text-xs font-medium text-[#0669F7] shrink-0 whitespace-nowrap">
      {label}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        aria-label="필터 제거"
        className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-[#B3D9FF] transition-colors"
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}

export function MobileJobFilters({
  provinces,
  trades,
  selectedProvince,
  selectedTrade,
  selectedLat,
  selectedLng,
  selectedRadius = 30,
  selectedStatus,
  totalJobs,
  viewToggle,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [geoLoading, setGeoLoading] = React.useState(false)
  const [geoError, setGeoError] = React.useState('')
  const [activeLabel, setActiveLabel] = React.useState(() =>
    selectedLat != null ? '현재 위치' : ''
  )
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([])

  const geoActive = selectedLat != null && selectedLng != null

  const activeFilterCount = [
    selectedProvince,
    selectedTrade,
    geoActive ? 'geo' : null,
    selectedStatus,
  ].filter(Boolean).length

  React.useEffect(() => {
    const token = getSessionCookie()
    if (!token) return
    fetch(`${API_BASE}/workers/saved-locations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(res => { if (res?.data) setSavedLocations(res.data) })
      .catch(() => undefined)
  }, [])

  // Close drawer on back navigation
  React.useEffect(() => {
    if (!drawerOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [drawerOpen])

  function buildParams(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v != null) params.set(k, v)
      else params.delete(k)
    }
    params.delete('page')
    return params
  }

  function updateParam(key: string, value: string | undefined) {
    router.push(`${pathname}?${buildParams({ [key]: value }).toString()}` as never)
  }

  function activateGeo(lat: number, lng: number, label: string) {
    const params = buildParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(selectedRadius || 30),
    })
    setActiveLabel(label)
    router.push(`${pathname}?${params.toString()}` as never)
  }

  function clearGeo() {
    const params = buildParams({ lat: undefined, lng: undefined, radius: undefined })
    setActiveLabel('')
    router.push(`${pathname}?${params.toString()}` as never)
  }

  function changeRadius(radius: number) {
    if (!geoActive) return
    router.push(`${pathname}?${buildParams({ radius: String(radius) }).toString()}` as never)
  }

  function clearAll() {
    setActiveLabel('')
    router.push(pathname as never)
  }

  function useGPS() {
    if (!navigator.geolocation) { setGeoError('위치 기능을 지원하지 않습니다.'); return }
    setGeoLoading(true); setGeoError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        activateGeo(pos.coords.latitude, pos.coords.longitude, '현재 위치')
        setGeoLoading(false)
      },
      () => { setGeoError('위치 권한이 거부되었습니다.'); setGeoLoading(false) },
      { timeout: 10000 },
    )
  }

  const selectedProvinceName = provinces.find(p => p.slug === selectedProvince)?.nameVi
  const selectedTradeName = trades.find(t => t.id === selectedTrade)?.nameKo

  return (
    <>
      {/* ── Sticky filter bar ─────────────────────────────────────────── */}
      <div
        className="sticky z-30 bg-white border-b border-[#DDDDDD] px-3 py-2.5"
        style={{ top: 'calc(var(--app-bar-height) + env(safe-area-inset-top, 0px))' }}
      >
        {/* Main row: 총 n개 공고 + 필터 (left) | 리스트/지도 (right) */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: job count + filter button */}
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-[#25282A] whitespace-nowrap shrink-0">
              총 <span className="font-bold">{totalJobs.toLocaleString()}</span>개 공고
              {geoActive && (
                <span className="ml-1.5 text-xs text-[#0669F7] font-medium">· {selectedRadius}km</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#DDDDDD] bg-white text-xs font-medium text-[#25282A] shrink-0"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              필터
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#0669F7] text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: view toggle (리스트/지도) */}
          {viewToggle && (
            <div className="shrink-0">{viewToggle}</div>
          )}
        </div>

        {/* Active filter chips row — only shown when filters are active */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {selectedProvince && (
              <FilterChip
                label={selectedProvinceName ?? selectedProvince}
                onRemove={() => updateParam('province', undefined)}
              />
            )}
            {selectedTrade && (
              <FilterChip
                label={selectedTradeName ?? String(selectedTrade)}
                onRemove={() => updateParam('trade', undefined)}
              />
            )}
            {geoActive && (
              <FilterChip
                label={activeLabel || '내 위치'}
                onRemove={clearGeo}
              />
            )}
            {selectedStatus && (
              <FilterChip
                label={STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label ?? selectedStatus}
                onRemove={() => updateParam('status', undefined)}
              />
            )}
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-[#7A7B7A] whitespace-nowrap shrink-0 px-1"
            >
              초기화
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom drawer ──────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col z-10"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Handle bar + header */}
            <div className="shrink-0 pt-3 pb-3 px-5 border-b border-[#F5F7FA]">
              <div className="w-8 h-1 rounded-full bg-[#DDDDDD] mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-[#25282A]">필터</p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#EFF1F5]"
                >
                  <svg className="w-5 h-5 text-[#7A7B7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

              {/* Province */}
              <div>
                <label className="block text-sm font-semibold text-[#25282A] mb-2">지역</label>
                <select
                  value={selectedProvince ?? ''}
                  onChange={e => updateParam('province', e.target.value || undefined)}
                  className="w-full px-3 py-2.5 text-sm border border-[#DDDDDD] rounded-xl bg-white focus:outline-none focus:border-[#0669F7] appearance-none"
                >
                  <option value="">전체 지역</option>
                  {provinces.map(p => (
                    <option key={p.slug} value={p.slug}>{p.nameVi}</option>
                  ))}
                </select>
              </div>

              {/* Trade */}
              <div>
                <label className="block text-sm font-semibold text-[#25282A] mb-2">직종</label>
                <select
                  value={selectedTrade ?? ''}
                  onChange={e => updateParam('trade', e.target.value || undefined)}
                  className="w-full px-3 py-2.5 text-sm border border-[#DDDDDD] rounded-xl bg-white focus:outline-none focus:border-[#0669F7] appearance-none"
                >
                  <option value="">전체 직종</option>
                  {trades.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.nameKo}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-[#25282A] mb-2">모집 상태</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateParam('status', opt.value || undefined)}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        (selectedStatus ?? '') === opt.value
                          ? 'bg-[#EEF4FF] border-[#0669F7] text-[#0669F7]'
                          : 'border-[#DDDDDD] text-[#25282A]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-[#25282A] mb-2">내 위치</label>

                {geoActive ? (
                  <div className="flex items-center gap-2 px-3 py-3 bg-[#EEF4FF] border border-[#0669F7] rounded-xl">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="flex-1 text-sm font-medium text-[#0669F7] truncate">
                      {activeLabel || '위치 필터 적용됨'}
                    </span>
                    <button
                      type="button"
                      onClick={clearGeo}
                      className="text-[#0669F7] font-bold p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={useGPS}
                    disabled={geoLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm border border-[#DDDDDD] rounded-xl bg-white text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] disabled:opacity-50 transition-colors"
                  >
                    {geoLoading
                      ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    }
                    <span>{geoLoading ? '위치 찾는 중...' : '현재 위치 사용'}</span>
                  </button>
                )}

                {geoError && <p className="text-xs text-[#ED1C24] mt-1.5">{geoError}</p>}

                {!geoActive && savedLocations.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {savedLocations.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => { setActiveLabel(loc.label); activateGeo(Number(loc.lat), Number(loc.lng), loc.label) }}
                        className="w-full flex items-center gap-2 px-3 py-3 text-sm border border-[#DDDDDD] rounded-xl bg-white hover:border-[#0669F7] hover:text-[#0669F7] text-left transition-colors"
                      >
                        <span className="shrink-0 text-base">{'•'}</span>
                        <span className="truncate">{loc.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {geoActive && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-[#7A7B7A] mb-2">검색 반경</p>
                    <div className="flex gap-2">
                      {RADIUS_OPTIONS.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => changeRadius(r)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            selectedRadius === r
                              ? 'bg-[#0669F7] text-white'
                              : 'bg-[#F5F7FA] text-[#7A7B7A] hover:bg-[#DDDDDD]'
                          }`}
                        >
                          {r}km
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Apply button */}
            <div className="shrink-0 px-5 pt-3 pb-4 border-t border-[#DDDDDD] bg-white">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold hover:bg-[#0557D4] transition-colors text-sm"
              >
                {activeFilterCount > 0 ? `필터 적용 (${activeFilterCount})` : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
