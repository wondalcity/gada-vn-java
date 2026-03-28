'use client'

import * as React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import type { Province, Trade } from '@/lib/api/public'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface SavedLocation {
  id: string
  label: string
  address: string | null
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
  locale: string
}

const STATUS_OPTIONS = [
  { value: '',           label: '모집중',   emoji: '🟢' },
  { value: 'ALMOST_FULL', label: '마감임박', emoji: '🟡' },
  { value: 'FILLED',      label: '모집마감', emoji: '⚫' },
] as const

const RADIUS_OPTIONS = [10, 30, 50, 100]

export function JobFilters({
  provinces,
  trades,
  selectedProvince,
  selectedTrade,
  selectedLat,
  selectedLng,
  selectedRadius = 30,
  selectedStatus,
  locale: _locale,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [geoLoading, setGeoLoading] = React.useState(false)
  const [geoError, setGeoError] = React.useState('')
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([])
  // Label for the currently active geo location (GPS or saved)
  const [activeLabel, setActiveLabel] = React.useState(() =>
    selectedLat != null ? '현재 위치' : ''
  )

  const geoActive = selectedLat != null && selectedLng != null

  // Load saved locations if the worker is logged in
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
    router.push(`${pathname}?${buildParams({ [key]: value }).toString()}`)
  }

  function activateGeo(lat: number, lng: number, label: string) {
    const params = buildParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(selectedRadius || 30),
    })
    setActiveLabel(label)
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearGeo() {
    const params = buildParams({ lat: undefined, lng: undefined, radius: undefined })
    setActiveLabel('')
    router.push(`${pathname}?${params.toString()}`)
  }

  function changeRadius(radius: number) {
    if (!geoActive) return
    router.push(`${pathname}?${buildParams({ radius: String(radius) }).toString()}`)
  }

  function clearFilters() {
    setActiveLabel('')
    router.push(pathname)
  }

  function useGPS() {
    if (!navigator.geolocation) {
      setGeoError('이 브라우저는 위치 기능을 지원하지 않습니다.')
      return
    }
    setGeoLoading(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        activateGeo(pos.coords.latitude, pos.coords.longitude, '현재 위치')
        setGeoLoading(false)
      },
      () => {
        setGeoError('위치 권한이 거부되었습니다.')
        setGeoLoading(false)
      },
      { timeout: 10000 },
    )
  }

  const hasFilters = !!selectedProvince || !!selectedTrade || geoActive || !!selectedStatus

  return (
    <div className="flex flex-col gap-4">
      {/* Province filter */}
      <div className="flex flex-col sm:flex-row md:flex-col gap-3">
        <div className="flex-1 md:flex-none">
          <label className="block text-xs font-medium text-[#98A2B2] mb-1">지역</label>
          <select
            value={selectedProvince ?? ''}
            onChange={e => updateParam('province', e.target.value || undefined)}
            className="w-full px-3 py-2 text-sm border border-[#EFF1F5] rounded-lg bg-white text-[#25282A] focus:outline-none focus:ring-2 focus:ring-[#0669F7] focus:border-transparent"
          >
            <option value="">전체 지역</option>
            {provinces.map(p => (
              <option key={p.slug} value={p.slug}>{p.nameVi}</option>
            ))}
          </select>
        </div>

        {/* Trade filter */}
        <div className="flex-1 md:flex-none">
          <label className="block text-xs font-medium text-[#98A2B2] mb-1">직종</label>
          <select
            value={selectedTrade ?? ''}
            onChange={e => updateParam('trade', e.target.value || undefined)}
            className="w-full px-3 py-2 text-sm border border-[#EFF1F5] rounded-lg bg-white text-[#25282A] focus:outline-none focus:ring-2 focus:ring-[#0669F7] focus:border-transparent"
          >
            <option value="">전체 직종</option>
            {trades.map(t => (
              <option key={t.id} value={String(t.id)}>{t.nameKo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter */}
      <div>
        <label className="block text-xs font-medium text-[#98A2B2] mb-2">모집 상태</label>
        <div className="flex flex-col gap-1">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParam('status', opt.value || undefined)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left border ${
                (selectedStatus ?? '') === opt.value
                  ? 'bg-[#E6F0FE] border-[#0669F7] text-[#0669F7]'
                  : 'bg-white border-[#EFF1F5] text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7]'
              }`}
            >
              <span className="text-xs">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Location filter */}
      <div>
        <label className="block text-xs font-medium text-[#98A2B2] mb-2">내 위치</label>

        {geoActive ? (
          /* Active location chip */
          <div className="flex items-center gap-2 px-3 py-2 bg-[#E6F0FE] border border-[#0669F7] rounded-lg">
            <span className="text-sm">📍</span>
            <span className="flex-1 text-xs font-medium text-[#0669F7] truncate">
              {activeLabel || '위치 필터 중'}
            </span>
            <button
              type="button"
              onClick={clearGeo}
              aria-label="위치 필터 제거"
              className="text-[#0669F7] hover:text-blue-800 font-bold text-sm leading-none"
            >
              ✕
            </button>
          </div>
        ) : (
          /* GPS button */
          <button
            type="button"
            onClick={useGPS}
            disabled={geoLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-[#EFF1F5] rounded-lg bg-white text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] disabled:opacity-50 transition-colors"
          >
            {geoLoading
              ? <span className="inline-block animate-spin text-base">⟳</span>
              : <span className="text-base">📍</span>
            }
            <span>{geoLoading ? '위치 찾는 중...' : '현재 위치 사용'}</span>
          </button>
        )}

        {geoError && (
          <p className="text-xs text-[#D81A48] mt-1">{geoError}</p>
        )}

        {/* Saved locations — only when no geo filter active and user is logged in */}
        {!geoActive && savedLocations.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {savedLocations.map(loc => (
              <button
                key={loc.id}
                type="button"
                onClick={() => { setActiveLabel(loc.label); activateGeo(loc.lat, loc.lng, loc.label) }}
                className="flex items-center gap-2 px-3 py-2 text-xs border border-[#EFF1F5] rounded-lg bg-white text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors text-left"
              >
                <span>{loc.is_default ? '⭐' : '📌'}</span>
                <span className="truncate">{loc.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Radius selector — only when geo is active */}
        {geoActive && (
          <div className="mt-2">
            <p className="text-xs text-[#98A2B2] mb-1.5">반경</p>
            <div className="flex gap-1">
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRadius(r)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedRadius === r
                      ? 'bg-[#0669F7] text-white'
                      : 'bg-[#F2F4F5] text-[#98A2B2] hover:bg-gray-200'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clear all filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-xs text-[#98A2B2] hover:text-[#25282A] underline text-left transition-colors"
        >
          필터 초기화
        </button>
      )}
    </div>
  )
}
