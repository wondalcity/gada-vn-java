'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView, Circle, type Libraries } from '@react-google-maps/api'
import type { PublicJob } from '@/lib/api/public'
import { Link } from '@/components/navigation'
import { formatDate as fmtDate, formatDateShort as fmtDateShort } from '@/lib/utils/date'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
// Must be stable reference to prevent re-loading
const GOOGLE_MAPS_LIBRARIES: Libraries = []

// Vietnam center
const VN_CENTER = { lat: 14.0583, lng: 108.2772 }
const VN_ZOOM = 6
const SELECTED_ZOOM = 14

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
]

function formatVnd(n: number) {
  if (n >= 1_000_000) return `₫${(n / 1_000_000).toFixed(1)}M`
  return `₫${(n / 1000).toFixed(0)}K`
}

const STATUS_CONFIG = {
  OPEN:      { label: '모집중',  bg: '#D1F3D3', text: '#024209', dot: '#00C800' },
  FILLED:    { label: '마감',    bg: '#F2F2F2', text: '#595959', dot: '#B2B2B2' },
  CANCELLED: { label: '취소',    bg: '#FFDCE0', text: '#540C0E', dot: '#ED1C24' },
  COMPLETED: { label: '완료',    bg: '#F2F2F2', text: '#595959', dot: '#B2B2B2' },
} as const

interface Props {
  jobs: PublicJob[]
  locale: string
  centerLat?: number
  centerLng?: number
  radiusKm?: number
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  filterPanel?: React.ReactNode
  viewToggle?: React.ReactNode
  totalJobs?: number
  geoActive?: boolean
  selectedRadius?: number
  activeFilterCount?: number
  basePath?: string
}

// ── Wage marker pill (rendered as Google Maps OverlayView) ────────────────────

function WageMarker({
  job,
  isSelected,
  isHovered,
  onClick,
}: {
  job: PublicJob
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
}) {
  const active = isSelected || isHovered
  return (
    <div style={{ position: 'relative', zIndex: isSelected ? 100 : isHovered ? 50 : 1 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick() }}
        style={{
          transform: active ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.15s, color 0.15s, box-shadow 0.15s',
          boxShadow: active ? '0 4px 16px rgba(0,0,0,0.22)' : '0 2px 8px rgba(0,0,0,0.14)',
        }}
        className={`
          inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap
          border cursor-pointer select-none
          ${active
            ? 'bg-[#25282A] text-white border-[#25282A]'
            : 'bg-white text-[#25282A] border-white hover:scale-105'}
        `}
      >
        {formatVnd(job.dailyWage)}
      </button>
    </div>
  )
}

// ── Airbnb-style compact job card for left panel ─────────────────────────────

function AirbnbJobCard({
  job,
  locale,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  job: PublicJob
  locale: string
  isSelected: boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
}) {
  const remaining = job.slotsTotal - job.slotsFilled

  return (
    <button
      type="button"
      data-job-id={job.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`w-full text-left flex gap-3 px-4 py-3.5 transition-colors ${
        isSelected || isHovered ? 'bg-[#F7F7F7]' : 'bg-white hover:bg-[#F7F7F7]'
      }`}
    >
      {/* Cover image */}
      <div className={`w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#0454C5] to-[#3186FF] transition-all ${
        isSelected ? 'ring-2 ring-[#25282A] ring-offset-1' : ''
      }`}>
        {job.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.coverImageUrl} alt={job.titleKo} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#7A7B7A] truncate">{job.siteNameKo} · {job.provinceNameVi}</p>
        <p className="text-sm font-semibold text-[#25282A] line-clamp-2 leading-snug mt-0.5">{job.titleKo}</p>
        <p className="text-xs text-[#7A7B7A] mt-0.5">{fmtDateShort(job.workDate, locale)}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm font-bold text-[#25282A]">
            {new Intl.NumberFormat('ko-KR').format(job.dailyWage)}{' '}
            <span className="font-normal text-[#7A7B7A] text-xs">₫ / 일</span>
          </p>
          {remaining > 0 && job.status === 'OPEN' && (
            <span className="text-[10px] text-[#7A7B7A] bg-[#F2F2F2] px-2 py-0.5 rounded-full">
              잔여 {remaining}명
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Desktop popup card (floating over map, Airbnb-style) ─────────────────────

function MapPopupCard({
  job,
  locale,
  onClose,
  basePath = '/worker/jobs',
}: {
  job: PublicJob
  locale: string
  onClose: () => void
  basePath?: string
}) {
  const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.OPEN
  const remaining = job.slotsTotal - job.slotsFilled

  return (
    <div
      className="absolute bottom-6 left-1/2 z-[1000] w-80 bg-white rounded-2xl shadow-2xl border border-[#E0E0E0] overflow-hidden pointer-events-auto"
      style={{
        animation: 'slideUpPopup 0.22s cubic-bezier(0.34,1.2,0.64,1) both',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Cover */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#0454C5] to-[#3186FF]">
        {job.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.coverImageUrl} alt={job.titleKo} className="w-full h-full object-cover" />
        )}
        {!job.coverImageUrl && (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
        )}
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md text-[#25282A]"
          aria-label="닫기"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* Status badge */}
        <span
          className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: status.bg, color: status.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
          {status.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-[#25282A] line-clamp-2 leading-snug mb-1">{job.titleKo}</h3>
        <p className="text-xs text-[#7A7B7A] truncate mb-0.5">{job.siteNameKo} · {job.provinceNameVi}</p>
        <p className="text-xs text-[#7A7B7A] mb-3">{fmtDate(job.workDate, locale)}</p>

        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-[#25282A]">
            {new Intl.NumberFormat('ko-KR').format(job.dailyWage)}{' '}
            <span className="text-xs font-normal text-[#7A7B7A]">₫ / 일</span>
          </p>
          {remaining > 0 && job.status === 'OPEN' && (
            <span className="text-xs font-medium text-[#024209] bg-[#D1F3D3] px-2.5 py-0.5 rounded-full">
              잔여 {remaining}명
            </span>
          )}
        </div>

        <Link
          href={`${basePath}/${job.slug}`}
          className="block w-full text-center py-2.5 bg-[#0669F7] hover:bg-[#0454C5] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          자세히 보기
        </Link>
      </div>
    </div>
  )
}

// ── Mobile Airbnb-style job card (swipeable at the bottom) ───────────────────

function MobileJobCard({
  job,
  locale,
  onClose,
  basePath = '/worker/jobs',
}: {
  job: PublicJob
  locale: string
  onClose: () => void
  basePath?: string
}) {
  const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.OPEN
  const remaining = job.slotsTotal - job.slotsFilled

  return (
    <div
      className="bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] overflow-hidden"
      style={{ animation: 'slideInCard 0.28s cubic-bezier(0.34,1.15,0.64,1) both' }}
    >
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="w-[88px] h-[88px] rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#0454C5] to-[#3186FF]">
          {job.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.coverImageUrl} alt={job.titleKo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-[11px] text-[#7A7B7A] truncate">{job.siteNameKo} · {job.provinceNameVi}</p>
              <p className="text-sm font-bold text-[#25282A] line-clamp-2 leading-snug mt-0.5">{job.titleKo}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#F2F2F2] text-[#7A7B7A] mt-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: status.bg, color: status.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
              {status.label}
            </span>
            <span className="text-[11px] text-[#7A7B7A]">{fmtDateShort(job.workDate, locale)}</span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-base font-bold text-[#25282A]">
              {new Intl.NumberFormat('ko-KR').format(job.dailyWage)}{' '}
              <span className="text-xs font-normal text-[#7A7B7A]">₫/일</span>
            </p>
            {remaining > 0 && job.status === 'OPEN' && (
              <span className="text-[10px] text-[#024209] bg-[#D1F3D3] px-2 py-0.5 rounded-full font-medium">
                잔여 {remaining}명
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA button */}
      <div className="px-3 pb-3">
        <Link
          href={`${basePath}/${job.slug}`}
          className="block w-full text-center py-2.5 bg-[#0669F7] hover:bg-[#0454C5] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          자세히 보기
        </Link>
      </div>
    </div>
  )
}

// ── Filter toggle button ─────────────────────────────────────────────────────

function FilterToggleButton({
  open,
  count,
  onClick,
  dark = false,
}: {
  open: boolean
  count: number
  onClick: () => void
  dark?: boolean
}) {
  const active = open || count > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all shadow-sm ${
        dark
          ? active
            ? 'border-[#25282A] bg-[#25282A] text-white'
            : 'border-[#DDDDDD] bg-white text-[#25282A] hover:border-[#B2B2B2]'
          : 'border-[#DDDDDD] bg-white text-[#25282A] hover:border-[#B2B2B2]'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
      </svg>
      필터
      {count > 0 && (
        <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold ${
          active && dark ? 'bg-white text-[#25282A]' : 'bg-[#0669F7] text-white'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function JobsMapView({
  jobs,
  locale,
  centerLat,
  centerLng,
  radiusKm,
  onBoundsChange,
  filterPanel,
  viewToggle,
  totalJobs,
  geoActive,
  selectedRadius,
  activeFilterCount = 0,
  basePath = '/worker/jobs',
}: Props) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  // Track card key to retrigger animation when selecting different job
  const [cardKey, setCardKey] = useState(0)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const jobsWithCoords = jobs.filter(j => j.siteLat != null && j.siteLng != null)
  const jobsWithoutCoords = jobs.filter(j => j.siteLat == null || j.siteLng == null)
  const displayTotal = totalJobs ?? jobs.length

  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) ?? null : null

  const center = centerLat != null && centerLng != null
    ? { lat: centerLat, lng: centerLng }
    : VN_CENTER
  const zoom = centerLat != null ? 12 : VN_ZOOM

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    if (centerLat == null && jobsWithCoords.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      jobsWithCoords.forEach(j => bounds.extend({ lat: j.siteLat as number, lng: j.siteLng as number }))
      map.fitBounds(bounds, 40)
    }
  }, [centerLat, jobsWithCoords])

  const handleBoundsChanged = useCallback(() => {
    if (!onBoundsChange || !mapRef.current) return
    const b = mapRef.current.getBounds()
    if (!b) return
    onBoundsChange({
      north: b.getNorthEast().lat(),
      south: b.getSouthWest().lat(),
      east: b.getNorthEast().lng(),
      west: b.getSouthWest().lng(),
    })
  }, [onBoundsChange])

  // Airbnb-style smooth fly-to: pan + zoom animation
  const flyToJob = useCallback((job: PublicJob) => {
    if (job.siteLat == null || job.siteLng == null || !mapRef.current) return
    const map = mapRef.current
    const target = { lat: job.siteLat, lng: job.siteLng }
    const currentZoom = map.getZoom() ?? VN_ZOOM

    if (currentZoom < SELECTED_ZOOM - 2) {
      // Far out: zoom in first, then pan to center smoothly
      map.setZoom(SELECTED_ZOOM)
      setTimeout(() => { map.panTo(target) }, 150)
    } else {
      // Already close: just smooth pan + gentle zoom boost
      map.panTo(target)
      if (currentZoom < SELECTED_ZOOM) map.setZoom(SELECTED_ZOOM)
    }
  }, [])

  const handleCardClick = useCallback((job: PublicJob) => {
    const isAlreadySelected = job.id === selectedJobId
    setSelectedJobId(isAlreadySelected ? null : job.id)
    setCardKey(k => k + 1)
    if (!isAlreadySelected) flyToJob(job)
  }, [selectedJobId, flyToJob])

  const handleMarkerSelect = useCallback((id: string | null) => {
    setSelectedJobId(id)
    setCardKey(k => k + 1)
    if (id) {
      setSheetExpanded(false) // collapse sheet to show popup card
      const job = jobs.find(j => j.id === id)
      if (job) flyToJob(job)
    }
  }, [jobs, flyToJob])

  const handleDeselect = useCallback(() => {
    setSelectedJobId(null)
  }, [])

  // Scroll selected card into view in left panel
  useEffect(() => {
    if (!selectedJobId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-job-id="${selectedJobId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedJobId])

  // Loading spinner
  const mapSpinner = (
    <div className="w-full h-full flex items-center justify-center bg-[#F5F7FA]">
      <svg className="w-8 h-8 animate-spin text-[#0669F7]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  // Google Map content
  const mapContent = isLoaded ? (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={zoom}
      onLoad={handleMapLoad}
      onBoundsChanged={handleBoundsChanged}
      onClick={handleDeselect}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
      }}
    >
      {/* Radius circle */}
      {geoActive && centerLat != null && centerLng != null && selectedRadius && (
        <Circle
          center={{ lat: centerLat, lng: centerLng }}
          radius={selectedRadius * 1000}
          options={{
            strokeColor: '#0669F7',
            strokeOpacity: 0.4,
            strokeWeight: 1.5,
            fillColor: '#0669F7',
            fillOpacity: 0.05,
          }}
        />
      )}

      {/* Wage markers — selected on top via z-index wrapper */}
      {jobsWithCoords.map(job => (
        <OverlayView
          key={job.id}
          position={{ lat: job.siteLat as number, lng: job.siteLng as number }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <WageMarker
            job={job}
            isSelected={selectedJobId === job.id}
            isHovered={hoveredJobId === job.id}
            onClick={() => handleMarkerSelect(selectedJobId === job.id ? null : job.id)}
          />
        </OverlayView>
      ))}
    </GoogleMap>
  ) : mapSpinner

  // Shared card list
  const cardList = (
    <div ref={listRef}>
      {jobsWithCoords.map((job, i) => (
        <React.Fragment key={job.id}>
          <AirbnbJobCard
            job={job}
            locale={locale}
            isHovered={hoveredJobId === job.id}
            isSelected={selectedJobId === job.id}
            onMouseEnter={() => setHoveredJobId(job.id)}
            onMouseLeave={() => setHoveredJobId(null)}
            onClick={() => handleCardClick(job)}
          />
          {i < jobsWithCoords.length - 1 && <div className="mx-4 border-b border-[#F2F2F2]" />}
        </React.Fragment>
      ))}

      {jobsWithoutCoords.length > 0 && (
        <>
          <div className="mx-4 border-b border-[#F2F2F2]" />
          <p className="text-xs font-medium text-[#B2B2B2] px-4 pt-4 pb-2">위치 정보 없음</p>
          {jobsWithoutCoords.map((job, i) => (
            <React.Fragment key={job.id}>
              <AirbnbJobCard
                job={job}
                locale={locale}
                isHovered={hoveredJobId === job.id}
                isSelected={selectedJobId === job.id}
                onMouseEnter={() => setHoveredJobId(job.id)}
                onMouseLeave={() => setHoveredJobId(null)}
                onClick={() => handleCardClick(job)}
              />
              {i < jobsWithoutCoords.length - 1 && <div className="mx-4 border-b border-[#F2F2F2]" />}
            </React.Fragment>
          ))}
        </>
      )}

      {jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <svg className="w-10 h-10 text-[#DDDDDD] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-[#7A7B7A]">조건에 맞는 공고가 없습니다.</p>
        </div>
      )}
      <div className="h-4" />
    </div>
  )

  // Mobile filter modal
  const mobileFilterModal = filterOpen && filterPanel && (
    <>
      <div
        className="absolute inset-0 bg-black/40 z-[600]"
        onClick={() => setFilterOpen(false)}
      />
      <div
        className="absolute bottom-0 left-0 right-0 z-[700] bg-white rounded-t-2xl max-h-[85dvh] flex flex-col"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', animation: 'slideUpSheet 0.25s ease-out both' }}
      >
        <div className="shrink-0 pt-3 pb-3 px-5 border-b border-[#F2F2F2]">
          <div className="w-8 h-1 rounded-full bg-[#DDDDDD] mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-[#25282A]">필터</p>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F2] text-[#25282A]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filterPanel}
        </div>
        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-[#F2F2F2]">
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold text-sm"
          >
            {activeFilterCount > 0 ? `필터 적용 (${activeFilterCount})` : '닫기'}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP — Airbnb-style split layout (hidden on mobile)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-[calc(100dvh-var(--app-bar-height))] overflow-hidden">

        {/* ── Left panel: list + filter ── */}
        <div className="w-[420px] xl:w-[480px] flex flex-col h-full bg-white border-r border-[#EBEBEB]">

          {/* Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[#EBEBEB]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#25282A]">
                총 {displayTotal.toLocaleString()}개 공고
              </p>
              {geoActive && selectedRadius && (
                <p className="text-xs text-[#0669F7] font-medium mt-0.5">반경 {selectedRadius}km 내</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {filterPanel && (
                <FilterToggleButton
                  open={filterOpen}
                  count={activeFilterCount}
                  onClick={() => setFilterOpen(v => !v)}
                  dark
                />
              )}
              {viewToggle}
            </div>
          </div>

          {/* Collapsible filter panel */}
          {filterOpen && filterPanel && (
            <div className="shrink-0 border-b border-[#EBEBEB] px-4 py-4 bg-[#FAFAFA] overflow-y-auto max-h-[55vh]">
              {filterPanel}
            </div>
          )}

          {/* Scrollable job list */}
          <div className="flex-1 overflow-y-auto">
            {cardList}
          </div>
        </div>

        {/* ── Right panel: map + popup ── */}
        <div className="flex-1 relative h-full">
          {mapContent}

          {/* Desktop popup card — Airbnb-style slide-up */}
          {selectedJob && (
            <MapPopupCard
              key={cardKey}
              job={selectedJob}
              locale={locale}
              onClose={handleDeselect}
              basePath={basePath}
            />
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE — Full-screen map + bottom sheet (Airbnb-style)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden relative h-[calc(100dvh-var(--app-bar-height)-var(--tab-bar-height))]">

        {/* Full-screen map */}
        <div className="absolute inset-0">
          {mapContent}
        </div>

        {/* Top controls */}
        <div className="absolute top-3 left-0 right-0 z-[500] flex items-center justify-between px-3 pointer-events-none">
          <div className="pointer-events-auto">
            {filterPanel && (
              <FilterToggleButton
                open={filterOpen}
                count={activeFilterCount}
                onClick={() => setFilterOpen(v => !v)}
              />
            )}
          </div>
          <div className="pointer-events-auto">
            {viewToggle}
          </div>
        </div>

        {/* Mobile filter modal */}
        {mobileFilterModal}

        {/* Airbnb-style selected job card — slides up from bottom */}
        {selectedJob && !sheetExpanded && (
          <div
            key={cardKey}
            className="absolute left-3 right-3 z-[520] pointer-events-auto"
            style={{ bottom: '88px' }}
          >
            <MobileJobCard
              job={selectedJob}
              locale={locale}
              onClose={handleDeselect}
              basePath={basePath}
            />
          </div>
        )}

        {/* Bottom sheet */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[500] bg-white rounded-t-2xl flex flex-col overflow-hidden"
          style={{
            maxHeight: sheetExpanded ? '65dvh' : '72px',
            transition: 'max-height 0.32s cubic-bezier(0.32,0.72,0,1)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
          }}
        >
          {/* Drag handle + count */}
          <button
            type="button"
            onClick={() => { setSheetExpanded(v => !v); if (!sheetExpanded) setSelectedJobId(null) }}
            className="shrink-0 flex flex-col items-center pt-2.5 pb-3 px-4 w-full"
          >
            <div className="w-9 h-1 bg-[#D4D4D4] rounded-full mb-2.5" />
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-semibold text-[#25282A]">
                {displayTotal.toLocaleString()}개 공고
                {geoActive && selectedRadius && (
                  <span className="ml-2 text-xs font-normal text-[#0669F7]">· {selectedRadius}km 내</span>
                )}
              </p>
              <svg
                className={`w-4 h-4 text-[#7A7B7A] transition-transform duration-300 ${sheetExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </button>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto">
            {cardList}
          </div>
        </div>
      </div>
    </>
  )
}
