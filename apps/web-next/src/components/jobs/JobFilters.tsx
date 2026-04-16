'use client'

import * as React from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import type { Province, Trade } from '@/lib/api/public'
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
  locale: string
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

  const hasFilters = !!selectedProvince || !!selectedTrade || geoActive || !!selectedStatus

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
