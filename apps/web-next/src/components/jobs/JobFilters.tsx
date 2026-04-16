'use client'

import * as React from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import type { Province, Trade, WageStats } from '@/lib/api/public'
import { FilterSelect } from './FilterSelect'

const API_BASE = '/api/v1'

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
  selectedMinWage?: number
  selectedMaxWage?: number
  wageStats?: WageStats
  locale: string
}

function formatVndShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function WageRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
}: {
  min: number
  max: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
}) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const draggingRef = React.useRef<'min' | 'max' | null>(null)
  // Keep latest state accessible inside window event handlers without re-registering
  const latestRef = React.useRef({ valueMin, valueMax, onChange })
  latestRef.current = { valueMin, valueMax, onChange }

  const step = 10_000
  const gap = Math.max(step, Math.round((max - min) / 20))
  const pct = (v: number) => max === min ? 0 : ((v - min) / (max - min)) * 100

  function posToValue(clientX: number): number {
    const rect = trackRef.current!.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round((min + ratio * (max - min)) / step) * step
  }

  function applyDragAt(clientX: number) {
    const v = posToValue(clientX)
    const { valueMin: vMin, valueMax: vMax, onChange: cb } = latestRef.current
    if (draggingRef.current === 'min') {
      cb(Math.min(Math.max(v, min), vMax - gap), vMax)
    } else if (draggingRef.current === 'max') {
      cb(vMin, Math.max(Math.min(v, max), vMin + gap))
    }
  }

  function startDrag(clientX: number) {
    const v = posToValue(clientX)
    const { valueMin: vMin, valueMax: vMax } = latestRef.current
    draggingRef.current = Math.abs(v - vMin) <= Math.abs(v - vMax) ? 'min' : 'max'
    applyDragAt(clientX)
  }

  React.useEffect(() => {
    function onMouseMove(e: MouseEvent) { if (draggingRef.current) applyDragAt(e.clientX) }
    function onMouseUp() { draggingRef.current = null }
    function onTouchMove(e: TouchEvent) { if (draggingRef.current && e.touches[0]) applyDragAt(e.touches[0].clientX) }
    function onTouchEnd() { draggingRef.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [min, max, gap]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-1">
      <div className="flex justify-between text-xs font-semibold text-[#25282A] mb-3">
        <span>{formatVndShort(valueMin)} ₫</span>
        <span>{formatVndShort(valueMax)} ₫</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-5 flex items-center cursor-pointer select-none"
        onMouseDown={e => startDrag(e.clientX)}
        onTouchStart={e => { if (e.touches[0]) startDrag(e.touches[0].clientX) }}
      >
        <div className="absolute left-0 right-0 h-1.5 bg-[#EFF1F5] rounded-full" />
        <div
          className="absolute h-1.5 bg-[#0669F7] rounded-full"
          style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#0669F7] shadow-sm"
          style={{ left: `calc(${pct(valueMin)}% - 8px)` }}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#0669F7] shadow-sm"
          style={{ left: `calc(${pct(valueMax)}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#98A2B2] mt-2">
        <span>{formatVndShort(min)} ₫</span>
        <span>{formatVndShort(max)} ₫</span>
      </div>
    </div>
  )
}

const STATUS_VALUES = [
  { value: '',              dotColor: 'bg-[#00C800]', key: 'listing.filter.status_open' },
  { value: 'CLOSING_SOON',  dotColor: 'bg-[#FFC72C]', key: 'listing.filter.status_closing_soon' },
  { value: 'CLOSED',        dotColor: 'bg-[#7A7B7A]', key: 'listing.filter.status_closed' },
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
  selectedMinWage,
  selectedMaxWage,
  wageStats,
  locale: _locale,
}: Props) {
  const t = useTranslations('jobs')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [geoLoading, setGeoLoading] = React.useState(false)
  const [geoError, setGeoError] = React.useState('')
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([])
  // Label for the currently active geo location (GPS or saved)
  const [activeLabel, setActiveLabel] = React.useState(() =>
    selectedLat != null ? t('listing.filter.use_location') : ''
  )

  // Wage slider local state (tracks before committing to URL)
  const wageMin = wageStats?.minWage ?? 0
  const wageMax = wageStats?.maxWage ?? 0
  const hasWageRange = wageMax > wageMin
  const [localMinWage, setLocalMinWage] = React.useState(selectedMinWage ?? wageMin)
  const [localMaxWage, setLocalMaxWage] = React.useState(selectedMaxWage ?? wageMax)
  // Keep local state in sync when URL params change (e.g. filters reset)
  React.useEffect(() => {
    setLocalMinWage(selectedMinWage ?? wageMin)
    setLocalMaxWage(selectedMaxWage ?? wageMax)
  }, [selectedMinWage, selectedMaxWage, wageMin, wageMax])

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
    router.push((`${pathname}?${buildParams({ [key]: value }).toString()}`) as any)
  }

  function activateGeo(lat: number, lng: number, label: string) {
    const params = buildParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(selectedRadius || 30),
    })
    setActiveLabel(label)
    router.push((`${pathname}?${params.toString()}`) as any)
  }

  function clearGeo() {
    const params = buildParams({ lat: undefined, lng: undefined, radius: undefined })
    setActiveLabel('')
    router.push((`${pathname}?${params.toString()}`) as any)
  }

  function changeRadius(radius: number) {
    if (!geoActive) return
    router.push((`${pathname}?${buildParams({ radius: String(radius) }).toString()}`) as any)
  }

  function clearFilters() {
    setActiveLabel('')
    setLocalMinWage(wageMin)
    setLocalMaxWage(wageMax)
    router.push(pathname as any)
  }

  function useGPS() {
    if (!navigator.geolocation) {
      setGeoError(t('listing.filter.geo_error_unsupported'))
      return
    }
    if (!window.isSecureContext) {
      setGeoError(t('listing.filter.geo_error_https'))
      return
    }
    setGeoLoading(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        activateGeo(pos.coords.latitude, pos.coords.longitude, t('listing.filter.use_location'))
        setGeoLoading(false)
      },
      (err) => {
        if (err.code === 2) {
          setGeoError(t('listing.filter.geo_error_unavailable'))
        } else {
          setGeoError(t('listing.filter.geo_error_denied'))
        }
        setGeoLoading(false)
      },
      { timeout: 10000 },
    )
  }

  const wageFilterActive = selectedMinWage != null || selectedMaxWage != null
  const hasFilters = !!selectedProvince || !!selectedTrade || geoActive || !!selectedStatus || wageFilterActive

  function applyWageFilter(minV: number, maxV: number) {
    const atMin = minV <= wageMin
    const atMax = maxV >= wageMax
    const params = buildParams({
      minWage: atMin ? undefined : String(minV),
      maxWage: atMax ? undefined : String(maxV),
    })
    router.push((`${pathname}?${params.toString()}`) as any)
  }

  const provinceOptions = React.useMemo(() => [
    { value: '', label: t('listing.filter.all_provinces') },
    ...provinces.map(p => ({ value: p.slug, label: p.nameVi })),
  ], [provinces, t])

  const tradeOptions = React.useMemo(() => [
    { value: '', label: t('listing.filter.all_trades') },
    ...trades.map(tr => ({
      value: String(tr.id),
      label: _locale === 'vi' ? tr.nameVi : _locale === 'en' ? (tr.nameEn || tr.nameKo) : tr.nameKo,
    })),
  ], [trades, _locale, t])

  return (
    <div className="flex flex-col gap-4">
      {/* Province filter */}
      <div className="flex flex-col sm:flex-row md:flex-col gap-3">
        <div className="flex-1 md:flex-none">
          <label className="block text-xs font-medium text-[#98A2B2] mb-1">{t('listing.filter.province')}</label>
          <FilterSelect
            value={selectedProvince ?? ''}
            options={provinceOptions}
            placeholder={t('listing.filter.all_provinces')}
            onChange={v => updateParam('province', v || undefined)}
            searchable
            searchPlaceholder="지역 검색..."
          />
        </div>

        {/* Trade filter */}
        <div className="flex-1 md:flex-none">
          <label className="block text-xs font-medium text-[#98A2B2] mb-1">{t('listing.filter.trade')}</label>
          <FilterSelect
            value={String(selectedTrade ?? '')}
            options={tradeOptions}
            placeholder={t('listing.filter.all_trades')}
            onChange={v => updateParam('trade', v || undefined)}
          />
        </div>
      </div>

      {/* Status filter */}
      <div>
        <label className="block text-xs font-medium text-[#98A2B2] mb-2">{t('listing.filter.status')}</label>
        <div className="flex flex-col gap-1">
          {STATUS_VALUES.map(opt => (
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
              <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
              <span>{t(opt.key as any)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wage range filter */}
      {hasWageRange && (
        <div>
          <label className="block text-xs font-medium text-[#98A2B2] mb-3">{t('listing.filter.wage_range')}</label>
          <WageRangeSlider
            min={wageMin}
            max={wageMax}
            valueMin={localMinWage}
            valueMax={localMaxWage}
            onChange={(minV, maxV) => {
              setLocalMinWage(minV)
              setLocalMaxWage(maxV)
            }}
          />
          {/* Apply button */}
          <button
            type="button"
            onClick={() => applyWageFilter(localMinWage, localMaxWage)}
            className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold bg-[#0669F7] text-white hover:bg-[#0557D4] transition-colors"
          >
            {t('listing.filter.apply_wage')}
          </button>
          {wageFilterActive && (
            <button
              type="button"
              onClick={() => {
                setLocalMinWage(wageMin)
                setLocalMaxWage(wageMax)
                applyWageFilter(wageMin, wageMax)
              }}
              className="mt-1.5 w-full text-xs text-[#98A2B2] hover:text-[#25282A] underline"
            >
              {t('listing.filter.reset_wage')}
            </button>
          )}
        </div>
      )}

      {/* Location filter */}
      <div>
        <label className="block text-xs font-medium text-[#98A2B2] mb-2">{t('listing.filter.my_location')}</label>

        {geoActive ? (
          /* Active location chip */
          <div className="flex items-center gap-2 px-3 py-2 bg-[#E6F0FE] border border-[#0669F7] rounded-lg">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="flex-1 text-xs font-medium text-[#0669F7] truncate">
              {activeLabel || t('listing.filter.active_location')}
            </span>
            <button
              type="button"
              onClick={clearGeo}
              aria-label={t('listing.filter.clear_location_aria')}
              className="text-[#0669F7] hover:text-[#0448B0] font-bold text-sm leading-none"
            >
              ×
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
              ? <svg className="w-4 h-4 animate-spin text-[#0669F7]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            }
            <span>{geoLoading ? t('listing.filter.finding_location') : t('listing.filter.use_location')}</span>
          </button>
        )}

        {geoError && (
          <p className="text-xs text-[#ED1C24] mt-1">{geoError}</p>
        )}

        {/* Saved locations — only when no geo filter active and user is logged in */}
        {!geoActive && savedLocations.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {savedLocations.map(loc => (
              <button
                key={loc.id}
                type="button"
                onClick={() => { setActiveLabel(loc.label); activateGeo(Number(loc.lat), Number(loc.lng), loc.label) }}
                className="flex items-center gap-2 px-3 py-2 text-xs border border-[#EFF1F5] rounded-lg bg-white text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors text-left"
              >
                <span>{'•'}</span>
                <span className="truncate">{loc.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Radius selector — only when geo is active */}
        {geoActive && (
          <div className="mt-2">
            <p className="text-xs text-[#98A2B2] mb-1.5">{t('listing.filter.radius')}</p>
            <div className="flex gap-1">
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRadius(r)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedRadius === r
                      ? 'bg-[#0669F7] text-white'
                      : 'bg-[#F2F4F5] text-[#98A2B2] hover:bg-[#DDDDDD]'
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
          {t('listing.filter.reset')}
        </button>
      )}
    </div>
  )
}
