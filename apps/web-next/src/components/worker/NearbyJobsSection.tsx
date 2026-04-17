'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { fetchPublicJobs, type PublicJob } from '@/lib/api/public'
import { getSessionCookie } from '@/lib/auth/session'
import { formatDate } from '@/lib/utils/date'

const API_BASE = '/api/v1'

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

export default function NearbyJobsSection({ locale }: Props) {
  const t = useTranslations('worker')
  const [geoState, setGeoState] = React.useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null)
  const [radiusKm, setRadiusKm] = React.useState(50)
  const [jobs, setJobs] = React.useState<PublicJob[]>([])
  const [loading, setLoading] = React.useState(false)
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([])
  const [activeLocationId, setActiveLocationId] = React.useState<string | 'gps' | null>(null)

  // Save location form state (replaces browser prompt)
  const [showSaveForm, setShowSaveForm] = React.useState(false)
  const [saveLabel, setSaveLabel] = React.useState('')

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
    if (!saveLabel.trim()) return
    const token = getSessionCookie()
    if (!token || !coords) return
    try {
      const res = await fetch(`${API_BASE}/workers/saved-locations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: saveLabel.trim(), lat: coords.lat, lng: coords.lng }),
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
    setSaveLabel('')
    setShowSaveForm(false)
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
        <h2 className="text-base font-semibold text-[#25282A] mb-3">{t('nearby_jobs.heading')}</h2>
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#E6F0FE] flex items-center justify-center mx-auto mb-3"><svg className="w-6 h-6 text-[#0669F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
          <p className="text-sm text-[#25282A] font-medium mb-1">{t('nearby_jobs.idle_title')}</p>
          <p className="text-xs text-[#98A2B2] mb-4">{t('nearby_jobs.idle_desc')}</p>
          <button
            type="button"
            onClick={requestGPS}
            className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white hover:bg-[#0557D4] transition-colors text-sm font-medium"
          >
            {t('nearby_jobs.use_gps')}
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
                  {loc.label}
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
        <h2 className="text-base font-semibold text-[#25282A]">{t('nearby_jobs.heading')}</h2>
        <Link href={'/jobs'} className="text-sm text-[#0669F7] font-medium">
          {t('nearby_jobs.view_all')}
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
          {t('nearby_jobs.current_location')}
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
              {loc.label}
            </button>
            <button
              type="button"
              onClick={() => deleteLocation(loc.id)}
              className="ml-1 text-[#98A2B2] hover:text-[#ED1C24] text-xs"
              aria-label={t('nearby_jobs.delete_aria')}
            >
              ×
            </button>
          </div>
        ))}
        {coords && activeLocationId === 'gps' && (
          <button
            type="button"
            onClick={() => setShowSaveForm(true)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-[#EFF1F5] text-[#98A2B2] hover:bg-[#F2F4F5] transition-colors"
          >
            {t('nearby_jobs.save_location')}
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
          <p className="text-[#98A2B2] text-sm">{t('nearby_jobs.empty', { radius: radiusKm })}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {jobs.slice(0, 5).map(job => (
            <Link
              key={job.id}
              href={`/jobs/${job.slug}`}
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
                  <svg className="w-7 h-7 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#25282A] text-sm truncate">{job.titleKo}</p>
                <p className="text-xs text-[#98A2B2] mt-0.5 truncate">{job.siteNameKo} · {formatDate(job.workDate, locale)}</p>
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
              href={'/jobs'}
              className="block w-full py-3 text-center text-sm text-[#0669F7] font-medium border border-[#0669F7]/30 rounded-xl bg-white hover:bg-[#E6F0FE] transition-colors"
            >
              {t('nearby_jobs.more', { count: jobs.length - 5 })}
            </Link>
          )}
        </div>
      )}

      {geoState === 'denied' && (
        <p className="text-xs text-[#98A2B2] mt-2 text-center">
          {t('nearby_jobs.denied')}
        </p>
      )}

      {/* Save location modal (replaces browser prompt) */}
      {showSaveForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-semibold text-[#25282A] mb-3">{t('nearby_jobs.save_location_prompt')}</h3>
            <input
              type="text"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder={t('nearby_jobs.save_location_placeholder')}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveCurrentLocation() }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowSaveForm(false); setSaveLabel('') }}
                className="flex-1 py-2.5 rounded-full border border-[#EFF1F5] text-sm font-medium text-[#25282A] hover:bg-[#F2F4F5] transition-colors"
              >
                {t('nearby_jobs.save_location_cancel')}
              </button>
              <button
                type="button"
                onClick={saveCurrentLocation}
                disabled={!saveLabel.trim()}
                className="flex-1 py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
              >
                {t('nearby_jobs.save_location_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
