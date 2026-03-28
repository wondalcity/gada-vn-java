'use client'

import * as React from 'react'
import Link from 'next/link'
import { fetchPublicJobs, type PublicJob } from '@/lib/api/public'
import { getSessionCookie } from '@/lib/auth/session'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface SavedLocation {
  id: string
  label: string
  address?: string
  lat: number
  lng: number
  isDefault: boolean
}

interface Props {
  locale: string
}

const RADIUS_OPTIONS = [
  { km: 10, label: '10km' },
  { km: 30, label: '30km' },
  { km: 50, label: '50km' },
  { km: 100, label: '100km' },
]

function formatWage(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(d))
}

export default function NearbyJobsSection({ locale }: Props) {
  const [geoState, setGeoState] = React.useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null)
  const [radiusKm, setRadiusKm] = React.useState(50)
  const [jobs, setJobs] = React.useState<PublicJob[]>([])
  const [loading, setLoading] = React.useState(false)
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([])
  const [activeLocationId, setActiveLocationId] = React.useState<string | 'gps' | null>(null)

  // Load saved locations on mount
  React.useEffect(() => {
    const token = getSessionCookie()
    if (!token) return
    fetch(`${API_BASE}/workers/saved-locations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        const locs: SavedLocation[] = (res?.data ?? []).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          label: l.label as string,
          address: l.address as string | undefined,
          lat: Number(l.lat),
          lng: Number(l.lng),
          isDefault: l.is_default as boolean,
        }))
        setSavedLocations(locs)
        // Auto-use default saved location if any
        const def = locs.find(l => l.isDefault)
        if (def) {
          setCoords({ lat: def.lat, lng: def.lng })
          setActiveLocationId(def.id)
        }
      })
      .catch(() => undefined)
  }, [])

  // Fetch jobs when coords or radius changes
  React.useEffect(() => {
    if (!coords) return
    setLoading(true)
    fetchPublicJobs({ lat: coords.lat, lng: coords.lng, radiusKm })
      .then(res => setJobs(res.jobs))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [coords, radiusKm])

  function requestGPS() {
    if (!navigator.geolocation) {
      setGeoState('denied')
      return
    }
    setGeoState('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState('granted')
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setActiveLocationId('gps')
      },
      () => setGeoState('denied'),
      { timeout: 10000 },
    )
  }

  async function saveCurrentLocation() {
    const token = getSessionCookie()
    if (!token || !coords) return
    const label = prompt('저장할 이름을 입력하세요 (예: 집, 현장)') ?? ''
    if (!label.trim()) return
    try {
      const res = await fetch(`${API_BASE}/workers/saved-locations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), lat: coords.lat, lng: coords.lng }),
      })
      if (res.ok) {
        const body = await res.json()
        const loc = body.data
        setSavedLocations(prev => [...prev, {
          id: loc.id,
          label: loc.label,
          address: loc.address,
          lat: Number(loc.lat),
          lng: Number(loc.lng),
          isDefault: loc.is_default,
        }])
      }
    } catch { /* ignore */ }
  }

  async function deleteLocation(id: string) {
    const token = getSessionCookie()
    if (!token) return
    try {
      await fetch(`${API_BASE}/workers/saved-locations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setSavedLocations(prev => prev.filter(l => l.id !== id))
      if (activeLocationId === id) {
        setCoords(null)
        setActiveLocationId(null)
        setJobs([])
      }
    } catch { /* ignore */ }
  }

  function selectSavedLocation(loc: SavedLocation) {
    setCoords({ lat: loc.lat, lng: loc.lng })
    setActiveLocationId(loc.id)
  }

  // ── Render ──────────────────────────────────────────────────────────

  if (geoState === 'idle' && !coords) {
    return (
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#25282A] mb-3">내 주변 일자리</h2>
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="text-3xl mb-3">📍</div>
          <p className="text-sm text-[#25282A] font-medium mb-1">현재 위치로 가까운 일자리를 찾아보세요</p>
          <p className="text-xs text-[#98A2B2] mb-4">위치 정보를 사용해 반경 내 공고를 보여드립니다</p>
          <button
            type="button"
            onClick={requestGPS}
            className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-medium"
          >
            현재 위치 사용
          </button>
          {savedLocations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {savedLocations.map(loc => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => selectSavedLocation(loc)}
                  className="px-3 py-1.5 rounded-full border border-[#0669F7]/40 text-[#0669F7] text-xs font-medium hover:bg-[#E6F0FE] transition-colors"
                >
                  📍 {loc.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-[#25282A]">내 주변 일자리</h2>
        <Link href={`/${locale}/jobs`} className="text-sm text-[#0669F7] font-medium">
          전체 보기 →
        </Link>
      </div>

      {/* Location selector */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={requestGPS}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeLocationId === 'gps'
              ? 'bg-[#0669F7] text-white border-[#0669F7]'
              : 'bg-white text-[#25282A] border-[#EFF1F5] hover:bg-[#F2F4F5]'
          }`}
        >
          📡 현재 위치
        </button>
        {savedLocations.map(loc => (
          <div key={loc.id} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => selectSavedLocation(loc)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeLocationId === loc.id
                  ? 'bg-[#0669F7] text-white border-[#0669F7]'
                  : 'bg-white text-[#25282A] border-[#EFF1F5] hover:bg-[#F2F4F5]'
              }`}
            >
              📍 {loc.label}
            </button>
            <button
              type="button"
              onClick={() => deleteLocation(loc.id)}
              className="ml-1 text-[#98A2B2] hover:text-[#D81A48] text-xs"
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
        {coords && activeLocationId === 'gps' && (
          <button
            type="button"
            onClick={saveCurrentLocation}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-[#EFF1F5] text-[#98A2B2] hover:bg-[#F2F4F5] transition-colors"
          >
            + 위치 저장
          </button>
        )}
      </div>

      {/* Radius selector */}
      <div className="flex gap-1.5 mb-3">
        {RADIUS_OPTIONS.map(opt => (
          <button
            key={opt.km}
            type="button"
            onClick={() => setRadiusKm(opt.km)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              radiusKm === opt.km
                ? 'bg-[#25282A] text-white'
                : 'bg-[#F2F4F5] text-[#98A2B2] hover:bg-[#EFF1F5]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin w-5 h-5 border-2 border-[#0669F7] border-t-transparent rounded-full mx-auto" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-[#98A2B2] text-sm">반경 {radiusKm}km 내 열린 공고가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {jobs.slice(0, 5).map(job => (
            <Link
              key={job.id}
              href={`/${locale}/jobs/${job.slug}`}
              className="flex items-start gap-3 bg-white rounded-2xl p-4 hover:bg-[#F2F4F5] transition-colors"
            >
              {job.coverImageUrl ? (
                <img
                  src={job.coverImageUrl}
                  alt=""
                  className="w-16 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-[#F2F4F5] shrink-0 flex items-center justify-center text-xl">
                  🏗️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#25282A] text-sm truncate">{job.titleKo}</p>
                <p className="text-xs text-[#98A2B2] mt-0.5 truncate">{job.siteNameKo} · {formatDate(job.workDate)}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-semibold text-[#0669F7]">{formatWage(job.dailyWage)}</p>
                  {job.distanceKm != null && (
                    <span className="text-xs text-[#98A2B2] bg-[#F2F4F5] px-2 py-0.5 rounded-full">
                      {job.distanceKm < 1 ? `${Math.round(job.distanceKm * 1000)}m` : `${job.distanceKm}km`}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {jobs.length > 5 && (
            <Link
              href={`/${locale}/jobs`}
              className="block w-full py-3 text-center text-sm text-[#0669F7] font-medium border border-[#0669F7]/30 rounded-xl bg-white hover:bg-[#E6F0FE] transition-colors"
            >
              {jobs.length - 5}개 더 보기
            </Link>
          )}
        </div>
      )}

      {geoState === 'denied' && (
        <p className="text-xs text-[#98A2B2] mt-2 text-center">
          위치 권한이 거부되었습니다. 저장된 주소를 사용하세요.
        </p>
      )}
    </div>
  )
}
