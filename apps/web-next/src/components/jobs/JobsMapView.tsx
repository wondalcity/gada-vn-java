'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { GoogleMap, useJsApiLoader, OverlayView, Circle, type Libraries } from '@react-google-maps/api'
import type { PublicJob } from '@/lib/api/public'
import { Link } from '@/components/navigation'
import { formatDate as fmtDate, formatDateShort as fmtDateShort } from '@/lib/utils/date'
import { pickTradeImage } from '@/lib/utils/dummyImages'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const GOOGLE_MAPS_LIBRARIES: Libraries = []

const VN_CENTER = { lat: 14.0583, lng: 108.2772 }
const VN_ZOOM = 6

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f5e0' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f4' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
]

function formatVnd(n: number) {
  if (n >= 1_000_000) return `₫${(n / 1_000_000).toFixed(1)}M`
  return `₫${(n / 1000).toFixed(0)}K`
}

const STATUS_CONFIG = {
  OPEN:      { labelKey: 'card.status.open',      bg: '#D1F3D3', text: '#024209', dot: '#00C800' },
  FILLED:    { labelKey: 'card.status.filled',    bg: '#F2F2F2', text: '#595959', dot: '#B2B2B2' },
  CANCELLED: { labelKey: 'card.status.cancelled', bg: '#FFDCE0', text: '#540C0E', dot: '#ED1C24' },
  COMPLETED: { labelKey: 'card.status.completed', bg: '#F2F2F2', text: '#595959', dot: '#B2B2B2' },
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
  focusJobId?: string | null
  onFocused?: () => void
}

// ── Wage marker pill ──────────────────────────────────────────────────────────

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
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Pulsing halo ring — visible only when selected */}
      {isSelected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            background: '#25282A',
            animation: 'markerPulse 1.4s ease-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick() }}
        style={{
          position: 'relative',
          zIndex: isSelected ? 100 : isHovered ? 50 : 1,
          transform: active ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), background 0.16s, color 0.16s, box-shadow 0.16s',
          boxShadow: isSelected
            ? '0 6px 20px rgba(0,0,0,0.28)'
            : isHovered
              ? '0 4px 14px rgba(0,0,0,0.18)'
              : '0 2px 8px rgba(0,0,0,0.14)',
          animation: isSelected ? 'markerBounce 0.32s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
        }}
        className={`
          inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap
          border cursor-pointer select-none
          ${active
            ? 'bg-[#25282A] text-white border-[#25282A]'
            : 'bg-white text-[#25282A] border-white hover:border-[#E0E0E0]'}
        `}
      >
        {formatVnd(job.dailyWage)}
      </button>
    </div>
  )
}

// ── Left panel job card ───────────────────────────────────────────────────────

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
  const t = useTranslations('jobs')
  const remaining = job.slotsTotal - job.slotsFilled

  return (
    <button
      type="button"
      data-job-id={job.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className="w-full text-left flex gap-3 px-4 py-3.5 transition-colors relative"
      style={{
        background: isSelected ? '#F7F7F7' : isHovered ? '#FAFAFA' : '#fff',
        // Left accent bar when selected
        boxShadow: isSelected ? 'inset 3px 0 0 #25282A' : undefined,
      }}
    >
      {/* Cover image */}
      <div className={`w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-[#EFF1F5] transition-all ${
        isSelected ? 'ring-2 ring-[#25282A] ring-offset-1' : ''
      }`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.coverImageUrl ?? pickTradeImage(job.tradeNameKo, String(job.id))}
          alt={job.titleKo}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#7A7B7A] truncate">{locale === 'ko' ? job.siteNameKo : job.siteNameKo} · {job.provinceNameVi}</p>
        <p className={`text-sm line-clamp-2 leading-snug mt-0.5 ${isSelected ? 'font-bold text-[#1A1A1A]' : 'font-semibold text-[#25282A]'}`}>
          {locale === 'ko' ? job.titleKo : (job.titleVi || job.titleKo)}
        </p>
        <p className="text-xs text-[#7A7B7A] mt-0.5">{fmtDateShort(job.workDate, locale)}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm font-bold text-[#25282A]">
            {new Intl.NumberFormat('ko-KR').format(job.dailyWage)}{' '}
            <span className="font-normal text-[#7A7B7A] text-xs">₫ {t('card.per_day')}</span>
          </p>
          {remaining > 0 && job.status === 'OPEN' && (
            <span className="text-[10px] text-[#7A7B7A] bg-[#F2F2F2] px-2 py-0.5 rounded-full">
              {t('card.slots_left', { n: remaining })}
            </span>
          )}
        </div>
      </div>

      {/* Map focus icon when selected */}
      {isSelected && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[#25282A]">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      )}
    </button>
  )
}

// ── Desktop popup card (floating over map) ───────────────────────────────────

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
  const t = useTranslations('jobs')
  const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.OPEN
  const remaining = job.slotsTotal - job.slotsFilled

  return (
    <div
      className="absolute bottom-6 left-1/2 z-[1000] w-[340px] bg-white rounded-2xl shadow-2xl border border-[#E0E0E0] overflow-hidden pointer-events-auto"
      style={{
        animation: 'slideUpPopup 0.24s cubic-bezier(0.34,1.2,0.64,1) both',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Cover */}
      <div className="relative h-40 overflow-hidden bg-[#EFF1F5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.coverImageUrl ?? pickTradeImage(job.tradeNameKo, String(job.id))}
          alt={job.titleKo}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow text-[#25282A] hover:bg-white transition-colors"
          aria-label={t('listing.close')}
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
          {t(status.labelKey as any)}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-[#25282A] line-clamp-2 leading-snug mb-1">
          {locale === 'ko' ? job.titleKo : (job.titleVi || job.titleKo)}
        </h3>
        <p className="text-xs text-[#7A7B7A] truncate mb-0.5">{locale === 'ko' ? job.siteNameKo : job.siteNameKo} · {job.provinceNameVi}</p>
        <p className="text-xs text-[#7A7B7A] mb-3">{fmtDate(job.workDate, locale)}</p>

        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-[#25282A]">
            {new Intl.NumberFormat('ko-KR').format(job.dailyWage)}{' '}
            <span className="text-xs font-normal text-[#7A7B7A]">₫ {t('card.per_day')}</span>
          </p>
          {remaining > 0 && job.status === 'OPEN' && (
            <span className="text-xs font-medium text-[#024209] bg-[#D1F3D3] px-2.5 py-0.5 rounded-full">
              {t('card.slots_left', { n: remaining })}
            </span>
          )}
        </div>

        <Link
          href={`${basePath}/${job.slug ?? job.id}`}
          className="block w-full text-center py-2.5 bg-[#0669F7] hover:bg-[#0454C5] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {t('listing.view_details')}
        </Link>
      </div>
    </div>
  )
}

// ── Mobile selected job card ──────────────────────────────────────────────────

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
  const t = useTranslations('jobs')
  const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.OPEN
  const remaining = job.slotsTotal - job.slotsFilled

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        animation: 'slideInCard 0.28s cubic-bezier(0.34,1.15,0.64,1) both',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex gap-3 p-3.5">
        {/* Image */}
        <div className="w-[92px] h-[92px] rounded-xl overflow-hidden shrink-0 bg-[#EFF1F5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.coverImageUrl ?? pickTradeImage(job.tradeNameKo, String(job.id))}
            alt={job.titleKo}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-[11px] text-[#7A7B7A] truncate">{locale === 'ko' ? job.siteNameKo : job.siteNameKo} · {job.provinceNameVi}</p>
              <p className="text-sm font-bold text-[#25282A] line-clamp-2 leading-snug mt-0.5">{locale === 'ko' ? job.titleKo : (job.titleVi || job.titleKo)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#F2F2F2] text-[#7A7B7A] mt-0.5 hover:bg-[#E8E8E8] transition-colors"
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
              {t(status.labelKey as any)}
            </span>
            <span className="text-[11px] text-[#7A7B7A]">{fmtDateShort(job.workDate, locale)}</span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-base font-bold text-[#25282A]">
              {new Intl.NumberFormat('ko-KR').format(job.dailyWage)}{' '}
              <span className="text-xs font-normal text-[#7A7B7A]">₫ {t('card.per_day')}</span>
            </p>
            {remaining > 0 && job.status === 'OPEN' && (
              <span className="text-[10px] text-[#024209] bg-[#D1F3D3] px-2 py-0.5 rounded-full font-medium">
                {t('card.slots_left', { n: remaining })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3.5 pb-3.5">
        <Link
          href={`${basePath}/${job.slug ?? job.id}`}
          className="block w-full text-center py-3 bg-[#0669F7] hover:bg-[#0454C5] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {t('listing.view_details')}
        </Link>
      </div>
    </div>
  )
}

// ── Filter toggle button ─────────────────────────────────────────────────────

function FilterToggleButton({
  open,
  count,
  label,
  onClick,
  dark = false,
}: {
  open: boolean
  count: number
  label: string
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
      {label}
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

// ── Reset zoom button ─────────────────────────────────────────────────────────

function ResetZoomButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-white border border-[#DDDDDD] shadow-md text-[#25282A] hover:bg-[#F7F7F7] transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
      {label}
    </button>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function JobsMapView({
  jobs,
  locale,
  centerLat,
  centerLng,
  onBoundsChange,
  filterPanel,
  viewToggle,
  totalJobs,
  geoActive,
  selectedRadius,
  activeFilterCount = 0,
  basePath = '/worker/jobs',
  focusJobId,
  onFocused,
}: Props) {
  const t = useTranslations('jobs')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [isZoomedIn, setIsZoomedIn] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  // cardKey forces re-mount → re-animation when switching jobs
  const [cardKey, setCardKey] = useState(0)
  // Suppress bounds_changed callbacks during programmatic fly-to
  const animatingRef = useRef(false)
  // Job to focus once map finishes loading (set by focusJobId effect when map not ready)
  const pendingFocusRef = useRef<string | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: locale === 'vi' ? 'vi' : locale === 'en' ? 'en' : 'ko',
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
    // Apply pending focus from list view first; fall back to fitBounds all jobs
    const pending = pendingFocusRef.current
    if (pending) {
      pendingFocusRef.current = null
      const job = jobs.find(j => j.id === pending)
      if (job && job.siteLat != null && job.siteLng != null) {
        setSelectedJobId(pending)
        setCardKey(k => k + 1)
        setSheetExpanded(false)
        setIsZoomedIn(true)
        const lat = job.siteLat as number
        const lng = job.siteLng as number
        const D = 0.0014
        const bounds = new window.google.maps.LatLngBounds(
          { lat: lat - D, lng: lng - D },
          { lat: lat + D, lng: lng + D },
        )
        setTimeout(() => map.fitBounds(bounds, { top: 40, right: 40, bottom: 200, left: 40 }), 50)
        return
      }
    }
    if (centerLat == null && jobsWithCoords.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      jobsWithCoords.forEach(j => bounds.extend({ lat: j.siteLat as number, lng: j.siteLng as number }))
      map.fitBounds(bounds, 40)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, jobsWithCoords, jobs, onFocused])

  const handleBoundsChanged = useCallback(() => {
    if (animatingRef.current || !onBoundsChange || !mapRef.current) return
    const b = mapRef.current.getBounds()
    if (!b) return
    onBoundsChange({
      north: b.getNorthEast().lat(),
      south: b.getSouthWest().lat(),
      east: b.getNorthEast().lng(),
      west: b.getSouthWest().lng(),
    })
  }, [onBoundsChange])

  // Fly-to: single fitBounds call — atomically sets both center and zoom.
  // Using setCenter+setZoom in sequence is unreliable because setZoom fires
  // against the old center before the map finishes moving.
  // D = 0.0014° ≈ 155m radius → fitBounds lands at zoom ~16 on typical screens.
  const flyToJob = useCallback((job: PublicJob, fromMobile = false) => {
    if (job.siteLat == null || job.siteLng == null || !mapRef.current) return

    animatingRef.current = true
    setTimeout(() => { animatingRef.current = false }, 900)

    const lat = job.siteLat
    const lng = job.siteLng
    const D = 0.0014 // ~155m — forces zoom ≈16 on typical viewport sizes

    const bounds = new window.google.maps.LatLngBounds(
      { lat: lat - D, lng: lng - D },
      { lat: lat + D, lng: lng + D },
    )

    // Bottom padding leaves room for the popup card without hiding the marker.
    const padding = fromMobile
      ? { top: 40, right: 40, bottom: 200, left: 40 }
      : { top: 60, right: 60, bottom: 300, left: 60 }

    mapRef.current.fitBounds(bounds, padding)
    setIsZoomedIn(true)
  }, [])

  const resetZoom = useCallback(() => {
    if (!mapRef.current) return
    setSelectedJobId(null)
    setIsZoomedIn(false)
    if (jobsWithCoords.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      jobsWithCoords.forEach(j => bounds.extend({ lat: j.siteLat as number, lng: j.siteLng as number }))
      mapRef.current.fitBounds(bounds, 48)
    } else {
      mapRef.current.setCenter(center)
      mapRef.current.setZoom(zoom)
    }
  }, [jobsWithCoords, center, zoom])

  const handleCardClick = useCallback((job: PublicJob) => {
    if (job.id === selectedJobId) {
      setSelectedJobId(null)
      setIsZoomedIn(false)
      return
    }
    setSelectedJobId(job.id)
    setCardKey(k => k + 1)
    flyToJob(job)
  }, [selectedJobId, flyToJob])

  const handleMarkerSelect = useCallback((id: string | null) => {
    if (!id) { setSelectedJobId(null); return }
    const job = jobs.find(j => j.id === id)
    if (!job) return

    if (id === selectedJobId) {
      setSelectedJobId(null)
      setIsZoomedIn(false)
      return
    }

    setSelectedJobId(id)
    setCardKey(k => k + 1)
    setSheetExpanded(false)
    flyToJob(job, true)
  }, [jobs, selectedJobId, flyToJob])

  const handleDeselect = useCallback(() => {
    setSelectedJobId(null)
    setIsZoomedIn(false)
  }, [])

  // Scroll selected card into view in left panel
  useEffect(() => {
    if (!selectedJobId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-job-id="${selectedJobId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedJobId])

  // Auto-focus job coming from list view
  useEffect(() => {
    if (!focusJobId) return
    const job = jobs.find(j => j.id === focusJobId)
    if (job) {
      setSelectedJobId(focusJobId)
      setCardKey(k => k + 1)
      setSheetExpanded(false)
      if (mapRef.current) {
        // Map already loaded — fly immediately
        flyToJob(job, true)
        pendingFocusRef.current = null
      } else {
        // Map still loading — handleMapLoad will pick this up
        pendingFocusRef.current = focusJobId
      }
    }
    onFocused?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusJobId])

  // Loading spinner
  const mapSpinner = (
    <div className="w-full h-full flex items-center justify-center bg-[#F5F7FA]">
      <svg className="w-8 h-8 animate-spin text-[#0669F7]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

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
        zoomControlOptions: { position: 9 /* RIGHT_CENTER */ },
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
            strokeColor: '#0669F7', strokeOpacity: 0.4, strokeWeight: 1.5,
            fillColor: '#0669F7', fillOpacity: 0.05,
          }}
        />
      )}

      {/* Wage markers — render selected last so it's on top */}
      {jobsWithCoords
        .slice()
        .sort((a, b) => (a.id === selectedJobId ? 1 : b.id === selectedJobId ? -1 : 0))
        .map(job => (
          <OverlayView
            key={job.id}
            position={{ lat: job.siteLat as number, lng: job.siteLng as number }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
          >
            <WageMarker
              job={job}
              isSelected={selectedJobId === job.id}
              isHovered={hoveredJobId === job.id}
              onClick={() => handleMarkerSelect(job.id)}
            />
          </OverlayView>
        ))}
    </GoogleMap>
  ) : mapSpinner

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
          <p className="text-xs font-medium text-[#B2B2B2] px-4 pt-4 pb-2">{t('listing.no_location')}</p>
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
          <p className="text-sm text-[#7A7B7A]">{t('listing.empty')}</p>
        </div>
      )}
      <div className="h-4" />
    </div>
  )

  const mobileFilterModal = filterOpen && filterPanel && (
    <>
      <div className="absolute inset-0 bg-black/40 z-[600]" onClick={() => setFilterOpen(false)} />
      <div
        className="absolute bottom-0 left-0 right-0 z-[700] bg-white rounded-t-2xl max-h-[85dvh] flex flex-col"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', animation: 'slideUpSheet 0.25s ease-out both' }}
      >
        <div className="shrink-0 pt-3 pb-3 px-5 border-b border-[#F2F2F2]">
          <div className="w-8 h-1 rounded-full bg-[#DDDDDD] mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-[#25282A]">{t('listing.filter_title')}</p>
            <button type="button" onClick={() => setFilterOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F2] text-[#25282A]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{filterPanel}</div>
        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-[#F2F2F2]">
          <button type="button" onClick={() => setFilterOpen(false)}
            className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold hover:bg-[#0557D4] transition-colors text-sm">
            {activeFilterCount > 0 ? t('listing.filter_applied', { n: activeFilterCount }) : t('listing.close')}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP — Airbnb split layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-[calc(100dvh-var(--app-bar-height))] p-4 gap-4 bg-[#F2F2F2] overflow-hidden">

        {/* Left panel */}
        <div className="w-[420px] xl:w-[480px] flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-[#EBEBEB]">
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[#EBEBEB]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#25282A]">
                {t('listing.total_count', { n: displayTotal.toLocaleString() })}
              </p>
              {geoActive && selectedRadius && (
                <p className="text-xs text-[#0669F7] font-medium mt-0.5">{t('listing.within_radius', { n: selectedRadius })}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {filterPanel && (
                <FilterToggleButton open={filterOpen} count={activeFilterCount} label={t('listing.filter_title')}
                  onClick={() => setFilterOpen(v => !v)} dark />
              )}
              {viewToggle}
            </div>
          </div>

          {filterOpen && filterPanel && (
            <div className="shrink-0 border-b border-[#EBEBEB] px-4 py-4 bg-[#FAFAFA] overflow-y-auto max-h-[55vh]">
              {filterPanel}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {cardList}
          </div>
        </div>

        {/* Right: map */}
        <div className="flex-1 relative h-full rounded-2xl overflow-hidden shadow-sm">
          {mapContent}

          {/* Reset zoom — appears when zoomed in to a job */}
          {isZoomedIn && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto"
              style={{ animation: 'slideUpSheet 0.2s ease-out both' }}>
              <ResetZoomButton onClick={resetZoom} label={t('listing.view_all')} />
            </div>
          )}

          {/* Popup card */}
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
          MOBILE — Full-screen map + bottom sheet
      ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden relative h-[calc(100dvh-var(--app-bar-height)-var(--tab-bar-height))]">

        <div className="absolute inset-0">{mapContent}</div>

        {/* Top controls */}
        <div className="absolute top-3 left-0 right-0 z-[500] flex items-center justify-between px-3 pointer-events-none">
          <div className="pointer-events-auto">
            {filterPanel && (
              <FilterToggleButton open={filterOpen} count={activeFilterCount} label={t('listing.filter_title')}
                onClick={() => setFilterOpen(v => !v)} />
            )}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {isZoomedIn && <ResetZoomButton onClick={resetZoom} label={t('listing.view_all')} />}
            {viewToggle}
          </div>
        </div>

        {mobileFilterModal}

        {/* Selected job card */}
        {selectedJob && !sheetExpanded && (
          <div
            key={cardKey}
            className="absolute left-3 right-3 z-[520] pointer-events-auto"
            style={{ bottom: 'calc(72px + max(16px, env(safe-area-inset-bottom, 16px)))' }}
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
          <button
            type="button"
            onClick={() => { setSheetExpanded(v => !v); if (!sheetExpanded) setSelectedJobId(null) }}
            className="shrink-0 flex flex-col items-center pt-2.5 pb-3 px-4 w-full"
          >
            <div className="w-9 h-1 bg-[#D4D4D4] rounded-full mb-2.5" />
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-semibold text-[#25282A]">
                {t('listing.total_count', { n: displayTotal.toLocaleString() })}
                {geoActive && selectedRadius && (
                  <span className="ml-2 text-xs font-normal text-[#0669F7]">{t('listing.within_radius', { n: selectedRadius })}</span>
                )}
              </p>
              <svg className={`w-4 h-4 text-[#7A7B7A] transition-transform duration-300 ${sheetExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </button>
          <div className="flex-1 overflow-y-auto">{cardList}</div>
        </div>
      </div>
    </>
  )
}
