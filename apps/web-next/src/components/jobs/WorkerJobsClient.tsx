'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import type { PublicJob, Province, Trade, WageStats } from '@/lib/api/public'
import { MobileJobFilters } from './MobileJobFilters'
import { JobFilters } from './JobFilters'
import { JobCard } from './JobCard'
import { Pagination } from './Pagination'
import { getSessionCookie } from '@/lib/auth/session'

const API_BASE = '/api/v1'

// Dynamic import for the map view — no SSR (Leaflet requires window)
const JobsMapView = dynamic(() => import('./JobsMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100dvh-var(--app-bar-height)-var(--tab-bar-height))] md:h-[calc(100dvh-var(--app-bar-height))] bg-[#F5F7FA]">
      <svg className="w-8 h-8 animate-spin text-[#0669F7]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  ),
})

interface SavedLocation {
  id: string
  label: string
  lat: number
  lng: number
  is_default: boolean
}

interface Props {
  jobs: PublicJob[]
  total: number
  totalPages: number
  page: number
  provinces: Province[]
  trades: Trade[]
  locale: string
  q?: string
  province?: string
  tradeId?: number
  selectedLat?: number
  selectedLng?: number
  selectedRadius?: number
  selectedStatus?: string
  selectedMinWage?: number
  selectedMaxWage?: number
  selectedMinExp?: string
  wageStats?: WageStats
  paginationParams: Record<string, string>
  geoActive: boolean
  emptyMessage: string
  activeFilterCount: number
  initialView?: 'list' | 'map'
  basePath?: string
  fetchSavedLocation?: boolean
}

type ViewMode = 'list' | 'map'

export function WorkerJobsClient({
  jobs,
  total,
  totalPages,
  page,
  provinces,
  trades,
  locale,
  q,
  province,
  tradeId,
  selectedLat,
  selectedLng,
  selectedRadius = 30,
  selectedStatus,
  selectedMinWage,
  selectedMaxWage,
  selectedMinExp,
  wageStats,
  paginationParams,
  geoActive,
  emptyMessage,
  activeFilterCount,
  initialView = 'list',
  basePath = '/worker/jobs',
  fetchSavedLocation = true,
}: Props) {
  const t = useTranslations('jobs')
  const [viewMode, setViewMode] = useState<ViewMode>(initialView as ViewMode)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const [focusJobId, setFocusJobId] = useState<string | null>(null)

  // Load worker's saved default location for map center (only when authenticated)
  useEffect(() => {
    if (!fetchSavedLocation) return
    const token = getSessionCookie()
    if (!token) return
    fetch(`${API_BASE}/workers/saved-locations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((res: { data?: SavedLocation[] } | null) => {
        if (!res?.data) return
        const defaultLoc = res.data.find(l => l.is_default) ?? res.data[0]
        if (defaultLoc) setMapCenter({ lat: Number(defaultLoc.lat), lng: Number(defaultLoc.lng) })
      })
      .catch(() => undefined)
  }, [])

  // If geo filter is active, use that as map center
  const effectiveCenter = selectedLat != null && selectedLng != null
    ? { lat: selectedLat, lng: selectedLng }
    : mapCenter

  // Shared view toggle (used in both list header and passed into map view)
  const viewToggle = (
    <div className="flex items-center bg-[#F5F7FA] rounded-lg p-0.5 shadow-sm border border-[#EBEBEB]">
      <button
        type="button"
        onClick={() => setViewMode('list')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
          viewMode === 'list'
            ? 'bg-white text-[#25282A] shadow-sm'
            : 'text-[#7A7B7A] hover:text-[#25282A]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        {t('listing.view_list')}
      </button>
      <button
        type="button"
        onClick={() => setViewMode('map')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
          viewMode === 'map'
            ? 'bg-white text-[#25282A] shadow-sm'
            : 'text-[#7A7B7A] hover:text-[#25282A]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        {t('listing.view_map')}
      </button>
    </div>
  )

  // Filter panel passed into the Airbnb-style map view
  const filterPanel = (
    <JobFilters
      provinces={provinces}
      trades={trades}
      selectedProvince={province}
      selectedTrade={tradeId}
      selectedLat={selectedLat}
      selectedLng={selectedLng}
      selectedRadius={selectedRadius}
      selectedStatus={selectedStatus}
      selectedMinWage={selectedMinWage}
      selectedMaxWage={selectedMaxWage}
      selectedMinExp={selectedMinExp}
      wageStats={wageStats}
      locale={locale}
    />
  )

  return (
    <div className="min-h-full">

      {/* ── MAP VIEW: Airbnb-style full-screen split (no container padding) ── */}
      {viewMode === 'map' && (
        <JobsMapView
          jobs={jobs}
          locale={locale}
          centerLat={effectiveCenter?.lat}
          centerLng={effectiveCenter?.lng}
          radiusKm={selectedRadius}
          filterPanel={filterPanel}
          viewToggle={viewToggle}
          totalJobs={total}
          geoActive={geoActive}
          selectedRadius={selectedRadius}
          activeFilterCount={activeFilterCount}
          basePath={basePath}
          focusJobId={focusJobId}
          onFocused={() => setFocusJobId(null)}
        />
      )}

      {/* ── LIST VIEW: sidebar + grid ── */}
      {viewMode === 'list' && (
        <>

          {/* Mobile filter bar — only in list view (map view has its own controls) */}
          <div className="md:hidden">
            <MobileJobFilters
              provinces={provinces}
              trades={trades}
              selectedProvince={province}
              selectedTrade={tradeId}
              selectedLat={selectedLat}
              selectedLng={selectedLng}
              selectedRadius={selectedRadius}
              selectedStatus={selectedStatus}
              selectedMinWage={selectedMinWage}
              selectedMaxWage={selectedMaxWage}
              selectedMinExp={selectedMinExp}
              wageStats={wageStats}
              totalJobs={total}
              viewToggle={viewToggle}
            />
          </div>

          <div className="md:flex md:gap-6 md:max-w-[1760px] md:mx-auto md:px-6 xl:px-20 md:py-6">

            {/* Desktop sidebar filter */}
            <aside className="hidden md:block w-64 xl:w-72 shrink-0">
              <div className="sticky" style={{ top: 'calc(var(--app-bar-height) + 1.5rem)' }}>
                <div className="bg-white rounded-2xl border border-[#DDDDDD] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F7FA]">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#25282A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                      </svg>
                      <span className="text-sm font-bold text-[#25282A]">{t('listing.filter_title')}</span>
                    </div>
                    {activeFilterCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0669F7] text-white text-[10px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <div className="p-5">{filterPanel}</div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">

              {/* Desktop header: count + view toggle */}
              <div className="hidden md:flex items-center justify-between gap-3 mb-4">
                <p className="text-sm text-[#7A7B7A]">
                  {q && (
                    <span className="font-semibold text-[#25282A]">"{q}" </span>
                  )}
                  {t('listing.total_count', { n: total.toLocaleString() })}
                  {geoActive && (
                    <span className="ml-2 text-[#0669F7] font-medium">{t('listing.within_radius', { n: selectedRadius })}</span>
                  )}
                </p>
                {viewToggle}
              </div>

              <div className="px-3 md:px-0 pt-4 md:pt-0 pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {jobs.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                      <svg className="w-12 h-12 text-[#DDDDDD] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-sm text-[#7A7B7A]">{emptyMessage}</p>
                    </div>
                  ) : (
                    jobs.map(job => (
                      <JobCard
                        key={job.id}
                        job={job}
                        locale={locale}
                        basePath={basePath}
                        onWagePress={() => {
                          setFocusJobId(job.id)
                          setViewMode('map')
                        }}
                      />
                    ))
                  )}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  basePath={basePath}
                  searchParams={paginationParams}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
