'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { PublicJobDetail } from '@/lib/api/public'
import ApplyButton from './ApplyButton'
import { formatDate as fmtDate, formatDateShort as fmtDateShort } from '@/lib/utils/date'

interface Props {
  job: PublicJobDetail & {
    wagePerDay?: number
    startDate?: string
    endDate?: string
    headcount?: number
    descriptionEn?: string
    expiresAt?: string
    benefitsObj?: { meals?: boolean; transport?: boolean; accommodation?: boolean; insurance?: boolean }
    requirementsObj?: { minExperienceMonths?: number; notes?: string }
  }
  locale: string
  isLoggedIn?: boolean
  initialApplicationId?: string
  initialApplicationStatus?: string
  initialNotes?: string
}

// ── Formatters ───────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + ' ₫'
}

function parseJsonField<T>(raw: unknown): T | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as T
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return null } }
  return null
}

function parseBenefits(raw: unknown) {
  if (!raw) return null
  if (Array.isArray(raw)) {
    const arr = raw as string[]
    return {
      meals: arr.some(s => /meal|식사/i.test(s)),
      transport: arr.some(s => /transport|교통/i.test(s)),
      accommodation: arr.some(s => /accommodation|숙박/i.test(s)),
      insurance: arr.some(s => /insurance|산재/i.test(s)),
    }
  }
  return parseJsonField<{ meals: boolean; transport: boolean; accommodation: boolean; insurance: boolean }>(raw)
}

function parseRequirements(raw: unknown) {
  if (!raw) return null
  if (Array.isArray(raw)) return { notes: (raw as string[]).join('\n') }
  return parseJsonField<{ minExperienceMonths?: number; notes?: string }>(raw)
}

// ── Status badge ─────────────────────────────────────────────────────────────

const JOB_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  OPEN:      { bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  FILLED:    { bg: '#FDE8EE', text: '#ED1C24', dot: '#ED1C24' },
  CANCELLED: { bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
  COMPLETED: { bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const cfg = JOB_STATUS_COLORS[status] ?? JOB_STATUS_COLORS.OPEN
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {label}
    </span>
  )
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  images, initialIdx, title, onClose, onIndexChange,
}: {
  images: string[]; initialIdx: number; title: string
  onClose: () => void; onIndexChange: (i: number) => void
}) {
  const [idx, setIdx] = React.useState(initialIdx)
  const thumbsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go((idx - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') go((idx + 1) % images.length)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  })

  function go(next: number) {
    setIdx(next); onIndexChange(next)
    const el = thumbsRef.current?.children[next] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center" onClick={onClose}>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-10" onClick={e => e.stopPropagation()}>
        <p className="text-white/80 text-sm font-medium truncate max-w-xs">{title}</p>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">{idx + 1} / {images.length}</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </div>
      <div className="relative flex items-center justify-center w-full px-12 md:px-20" onClick={e => e.stopPropagation()}>
        <img src={images[idx]} alt={`${title} ${idx + 1}`} className="max-h-[75vh] max-w-full object-contain rounded-lg select-none" draggable={false} />
        {images.length > 1 && (
          <>
            <button onClick={() => go((idx - 1 + images.length) % images.length)} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white text-2xl flex items-center justify-center transition-colors" aria-label="이전">‹</button>
            <button onClick={() => go((idx + 1) % images.length)} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white text-2xl flex items-center justify-center transition-colors" aria-label="다음">›</button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div ref={thumbsRef} className="absolute bottom-0 inset-x-0 flex gap-1.5 px-4 pb-4 pt-8 overflow-x-auto bg-gradient-to-t from-black/70 to-transparent justify-center" onClick={e => e.stopPropagation()} style={{ scrollbarWidth: 'none' }}>
          {images.map((url, i) => (
            <button key={i} onClick={() => go(i)} className={`shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${i === idx ? 'border-white opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-80'}`}>
              <img src={url} alt={`${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Gallery ───────────────────────────────────────────────────────────────────

function SiteImageGallery({ images, title, viewAllPhotos }: { images: string[]; title: string; viewAllPhotos: string }) {
  const [activeIdx, setActiveIdx] = React.useState(0)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  if (images.length === 0) return (
    <div className="w-full h-56 md:h-72 md:rounded-2xl overflow-hidden bg-[#0669F7] flex items-center justify-center mb-0 md:mb-6">
      <span className="text-6xl font-black text-white/20">{title.charAt(0)}</span>
    </div>
  )

  return (
    <>
      {/* Mobile: swipe carousel */}
      <div className="md:hidden relative">
        <div className="relative w-full overflow-hidden bg-[#25282A]" style={{ aspectRatio: '4/3' }}>
          <img src={images[activeIdx]} alt={title} className="w-full h-full object-cover" onClick={() => setLightboxOpen(true)} />
          {images.length > 1 && (
            <>
              <button onClick={() => setActiveIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white text-xl flex items-center justify-center" aria-label="이전">‹</button>
              <button onClick={() => setActiveIdx(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white text-xl flex items-center justify-center" aria-label="다음">›</button>
            </>
          )}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {activeIdx + 1} / {images.length}
          </div>
        </div>
        {/* Dot indicators */}
        {images.length > 1 && images.length <= 8 && (
          <div className="flex justify-center gap-1.5 pt-2 pb-1">
            {images.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} className={`rounded-full transition-all ${i === activeIdx ? 'w-4 h-1.5 bg-[#0669F7]' : 'w-1.5 h-1.5 bg-[#DBDFE9]'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Airbnb-style grid */}
      <div className="hidden md:block relative mb-8 rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.10)' }}>
        <div className={`grid gap-1 ${images.length >= 3 ? 'grid-cols-2' : 'grid-cols-1'}`} style={{ maxHeight: 480 }}>
          {/* Main image */}
          <div
            className="relative overflow-hidden cursor-zoom-in bg-[#25282A]"
            style={{ aspectRatio: images.length >= 3 ? '4/3' : '16/7' }}
            onClick={() => { setLightboxOpen(true); setActiveIdx(0) }}
          >
            <img src={images[0]} alt={title} className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500" />
          </div>

          {/* Right grid (up to 4 images in 2x2) */}
          {images.length >= 2 && (
            <div className={`grid gap-1 ${images.length >= 4 ? 'grid-rows-2' : 'grid-rows-1'}`}>
              {images.slice(1, 5).map((url, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden cursor-zoom-in bg-[#25282A]"
                  style={{ aspectRatio: images.length >= 4 ? '16/9' : '4/3' }}
                  onClick={() => { setLightboxOpen(true); setActiveIdx(i + 1) }}
                >
                  <img src={url} alt={`${title} ${i + 2}`} loading="lazy" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500" />
                  {/* Dim last tile if more images */}
                  {i === 3 && images.length > 5 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{images.length - 5}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* "View all photos" button */}
        <button
          onClick={() => { setLightboxOpen(true); setActiveIdx(0) }}
          className="absolute bottom-4 right-4 flex items-center gap-2 bg-white text-[#25282A] text-sm font-bold px-4 py-2 rounded-xl border border-[#EFF1F5] hover:bg-[#F2F4F5] transition-colors"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {viewAllPhotos}
        </button>
      </div>

      {lightboxOpen && (
        <Lightbox images={images} initialIdx={activeIdx} title={title} onClose={() => setLightboxOpen(false)} onIndexChange={setActiveIdx} />
      )}
    </>
  )
}

// ── Mobile apply bar (wage + apply button combined) ───────────────────────────

function MobileApplyBar({
  dailyWage,
  workDate,
  dailyWageLabel,
  locale,
  applyProps,
}: {
  dailyWage: number
  workDate: string
  dailyWageLabel: string
  locale: string
  applyProps: React.ComponentProps<typeof ApplyButton>
}) {
  return (
    <div
      className="fixed left-0 right-0 z-40 bg-white border-t border-[#EFF1F5]"
      style={{
        bottom: 'calc(var(--tab-bar-height, 0px) + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Wage summary */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#98A2B2] font-medium leading-none mb-0.5">{dailyWageLabel}</p>
          <p className="text-[20px] font-bold text-[#0669F7] leading-tight truncate">
            {formatVND(dailyWage)}
          </p>
          {workDate && (
            <p className="text-[11px] text-[#98A2B2] mt-0.5 truncate">{fmtDateShort(workDate, locale)}</p>
          )}
        </div>

        {/* Apply button */}
        <div className="shrink-0">
          <ApplyButton {...applyProps} mobileInline />
        </div>
      </div>
    </div>
  )
}

// ── Expandable text ───────────────────────────────────────────────────────────

function ExpandableText({ text, showMore, showLess }: { text: string; showMore: string; showLess: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const LIMIT = 200
  const isLong = text.length > LIMIT

  return (
    <div>
      <p className="text-[15px] text-[#222222] leading-7 whitespace-pre-wrap">
        {isLong && !expanded ? text.slice(0, LIMIT) + '...' : text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-sm font-semibold text-[#222222] underline underline-offset-2 hover:text-[#0669F7] transition-colors"
        >
          {expanded ? showLess : showMore}
        </button>
      )}
    </div>
  )
}

// ── Stat row (icon + label + value) ──────────────────────────────────────────

function StatRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 text-[#717171] mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#222222]">{label}</p>
        <div className="text-[15px] text-[#717171] mt-0.5">{value}</div>
        {sub && <p className="text-sm text-[#717171] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Benefit row ───────────────────────────────────────────────────────────────

function BenefitRow({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] flex items-center justify-center shrink-0 mt-0.5 text-[#0669F7]">{icon}</div>
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-[#222222]">{label}</p>
        <p className="text-sm text-[#717171] mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JobDetailView({
  job, locale, isLoggedIn = false,
  initialApplicationId, initialApplicationStatus, initialNotes,
}: Props) {
  const t = useTranslations('jobs')
  const benefits = parseBenefits(job.benefits)
  const requirements = parseRequirements(job.requirements)

  const dailyWage = job.dailyWage ?? job.wagePerDay ?? 0
  const workDate = job.workDate ?? job.startDate ?? ''
  const slotsTotal = job.slotsTotal ?? job.headcount ?? 0
  const slotsFilled = job.slotsFilled
  const slotsProgress = slotsTotal > 0 ? Math.min((slotsFilled / slotsTotal) * 100, 100) : 0
  const slotsLeft = slotsTotal - slotsFilled

  const description = locale === 'vi' ? job.descriptionVi : job.descriptionKo ?? job.descriptionVi
  const siteName = locale === 'vi' ? job.site.nameVi : job.site.nameKo

  const rawImages = (job.site as { imageUrls?: string[] })?.imageUrls ?? []
  const coverUrl = job.coverImageUrl ?? job.site.coverImageUrl
  const siteImages = React.useMemo(() => {
    const all = rawImages.slice(0, 10)
    if (!coverUrl || all[0] === coverUrl) return all
    const idx = all.indexOf(coverUrl)
    if (idx > 0) { const r = [...all]; r.splice(idx, 1); r.unshift(coverUrl); return r }
    return [coverUrl, ...all].slice(0, 10)
  }, [rawImages, coverUrl])

  const activeBenefits = benefits ? [
    benefits.meals        && { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: t('detail.benefit_meal'),          desc: t('detail.benefit_meal_desc') },
    benefits.transport    && { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>, label: t('detail.benefit_transport'),      desc: t('detail.benefit_transport_desc') },
    benefits.accommodation && { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, label: t('detail.benefit_accommodation'), desc: t('detail.benefit_accommodation_desc') },
    benefits.insurance    && { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, label: t('detail.benefit_insurance'),     desc: t('detail.benefit_insurance_desc') },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; desc: string }[] : []

  const applyProps = {
    jobId: job.id, slug: job.slug, locale, jobStatus: job.status,
    expiresAt: job.expiresAt, isLoggedIn,
    initialApplicationId, initialApplicationStatus, initialNotes,
  }

  // ── Shared left-column content ──────────────────────────────────────────────

  function renderContent() {
    return (
      <>
        {/* Title section */}
        <div className="pt-5 md:pt-0 pb-8 border-b border-[#DDDDDD]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-[26px] md:text-[30px] font-semibold text-[#222222] leading-tight">{job.titleKo}</h1>
            <StatusPill status={job.status} label={t(`detail.status.${job.status.toLowerCase()}` as any) ?? job.status} />
          </div>
          <p className="text-[15px] text-[#717171] mt-1">
            {siteName} · {job.provinceNameVi}
          </p>
          {job.tradeNameKo && (
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[#F7F7F7] text-[#717171] text-xs font-semibold border border-[#DDDDDD]">
              {job.tradeNameKo}
            </span>
          )}
        </div>

        {/* Key stats */}
        <div className="py-8 border-b border-[#DDDDDD] space-y-6">
          <StatRow
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            label={t('detail.work_date')}
            value={workDate ? fmtDate(workDate, locale) : '-'}
          />
          {job.startTime && job.endTime && (
            <StatRow
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label={t('detail.work_hours')}
              value={`${job.startTime} – ${job.endTime}`}
            />
          )}
          {slotsTotal > 0 && (
            <div className="flex items-start gap-4">
              <div className="shrink-0 text-[#717171] mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[15px] font-semibold text-[#222222]">{t('detail.slots_section')}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${slotsProgress >= 80 ? 'bg-[#FDE8EE] text-[#ED1C24]' : 'bg-[#E6F0FE] text-[#0669F7]'}`}>
                    {slotsLeft > 0 ? t('detail.slots_left_n', { n: slotsLeft }) : t('card.deadline')}
                  </span>
                </div>
                <div className="w-full bg-[#EBEBEB] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${slotsProgress}%`, background: slotsProgress >= 80 ? '#ED1C24' : '#0669F7' }} />
                </div>
                <p className="text-sm text-[#717171] mt-1.5">{t('detail.slots_filled_of', { filled: slotsFilled, total: slotsTotal })}</p>
              </div>
            </div>
          )}
          {job.endDate && (
            <StatRow
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label={t('detail.apply_deadline')}
              value={fmtDate(job.endDate, locale)}
              sub={t('detail.deadline_sub')}
            />
          )}
        </div>

        {/* Benefits */}
        {activeBenefits.length > 0 && (
          <div className="py-8 border-b border-[#DDDDDD]">
            <h2 className="text-[20px] font-semibold text-[#222222] mb-6">{t('detail.benefits_section')}</h2>
            <div className="space-y-5">
              {activeBenefits.map(b => <BenefitRow key={b.label} {...b} />)}
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="py-8 border-b border-[#DDDDDD]">
            <h2 className="text-[20px] font-semibold text-[#222222] mb-4">{t('detail.description_section')}</h2>
            <ExpandableText text={description} showMore={t('detail.show_more')} showLess={t('detail.show_less')} />
          </div>
        )}

        {/* Requirements */}
        {requirements && (requirements.minExperienceMonths || requirements.notes) && (
          <div className="py-8 border-b border-[#DDDDDD]">
            <h2 className="text-[20px] font-semibold text-[#222222] mb-4">{t('detail.requirements_section')}</h2>
            <div className="space-y-3">
              {requirements.minExperienceMonths != null && requirements.minExperienceMonths > 0 && (
                <div className="flex items-center gap-3 p-4 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
                  <div className="shrink-0 text-[#0669F7]">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-[#717171] font-semibold">{t('detail.min_experience')}</p>
                    <p className="text-[15px] font-semibold text-[#222222] mt-0.5">
                      {(() => {
                        const m = requirements.minExperienceMonths!
                        if (m < 12) return t('detail.experience_months' as any, { months: m })
                        const years = Math.floor(m / 12)
                        const rem = m % 12
                        if (rem === 0) return t('detail.experience_years' as any, { years })
                        return t('detail.experience_years_months' as any, { years, months: rem })
                      })()}
                    </p>
                  </div>
                </div>
              )}
              {requirements.notes && (
                <p className="text-[15px] text-[#222222] leading-7 whitespace-pre-wrap">{requirements.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Site card */}
        <div className="py-8 border-b border-[#DDDDDD]">
          <h2 className="text-[20px] font-semibold text-[#222222] mb-4">{t('detail.site_section')}</h2>
          <div className="flex items-start gap-4 p-5 rounded-xl border border-[#DDDDDD] hover:border-[#222222] transition-colors">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F7F7F7] shrink-0">
              {job.site.coverImageUrl ? (
                <img src={job.site.coverImageUrl} alt={siteName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#0669F7] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white/60">{siteName.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#222222] text-[15px]">{siteName}</p>
              {job.site.nameVi && job.site.nameVi !== siteName && (
                <p className="text-sm text-[#717171] mt-0.5">{job.site.nameVi}</p>
              )}
              {job.site.address && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <svg className="w-3.5 h-3.5 text-[#717171] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <p className="text-sm text-[#717171] truncate">{job.site.address}</p>
                </div>
              )}
              {job.site.lat && job.site.lng && (
                <a
                  href={`https://maps.google.com/?q=${job.site.lat},${job.site.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-[#222222] underline underline-offset-2 hover:text-[#0669F7] transition-colors"
                >
                  {t('detail.view_map')}
                </a>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Desktop booking card ────────────────────────────────────────────────────

  function renderBookingCard() {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#DDDDDD]" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
        {/* Wage */}
        <div className="flex items-baseline gap-1.5 mb-5">
          <span className="text-[28px] font-bold text-[#222222]">{formatVND(dailyWage)}</span>
          <span className="text-sm text-[#717171]">{t('detail.per_day_label')}</span>
        </div>

        {/* Key info grid */}
        <div className="border border-[#DDDDDD] rounded-xl divide-y divide-[#DDDDDD] mb-4">
          {workDate && (
            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold text-[#717171] uppercase tracking-wider mb-1">{t('detail.booking_work_date')}</p>
              <p className="text-sm font-semibold text-[#222222]">{fmtDateShort(workDate, locale)}</p>
            </div>
          )}
          {job.startTime && job.endTime && (
            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold text-[#717171] uppercase tracking-wider mb-1">{t('detail.booking_work_hours')}</p>
              <p className="text-sm font-semibold text-[#222222]">{job.startTime} – {job.endTime}</p>
            </div>
          )}
          {slotsTotal > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-[#717171] uppercase tracking-wider">{t('detail.booking_headcount')}</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${slotsProgress >= 80 ? 'bg-[#FDE8EE] text-[#ED1C24]' : 'bg-[#E6F0FE] text-[#0669F7]'}`}>
                  {slotsLeft > 0 ? t('detail.slots_left_booking', { n: slotsLeft }) : t('card.deadline')}
                </span>
              </div>
              <div className="w-full bg-[#EBEBEB] rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${slotsProgress}%`, background: slotsProgress >= 80 ? '#ED1C24' : '#0669F7' }} />
              </div>
              <p className="text-xs text-[#717171] mt-1.5">{t('detail.slots_filled_of', { filled: slotsFilled, total: slotsTotal })}</p>
            </div>
          )}
        </div>

        {/* Apply button */}
        <ApplyButton {...applyProps} />

        {/* Trust signal */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <svg className="w-3.5 h-3.5 text-[#717171]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <p className="text-xs text-[#717171]">{t('detail.trust_signal')}</p>
        </div>

        {/* Benefits summary */}
        {activeBenefits.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#DDDDDD]">
            <p className="text-xs font-semibold text-[#717171] mb-2.5">{t('detail.benefits_section')}</p>
            <div className="flex flex-wrap gap-1.5">
              {activeBenefits.map(b => (
                <span key={b.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F7F7] text-[#222222] text-xs font-semibold border border-[#EBEBEB]">
                  <span className="text-[#0669F7] w-3.5 h-3.5 [&>svg]:w-full [&>svg]:h-full">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className="pb-36 md:pb-16">
      {/* Gallery — bounded to content width */}
      <div className="md:max-w-[1120px] md:mx-auto md:px-6 md:pt-6">
        <SiteImageGallery images={siteImages} title={job.titleKo} viewAllPhotos={t('detail.view_all_photos')} />
      </div>

      {/* Content — narrowed for readability, Airbnb-style */}
      <div className="max-w-[1120px] mx-auto px-4 md:px-6">
        <div className="md:grid md:grid-cols-[1fr_336px] md:gap-16 md:items-start">

          {/* Left: main content */}
          <div>
            {renderContent()}
          </div>

          {/* Right: sticky booking card (desktop only) */}
          <div className="hidden md:block pt-8">
            <div className="sticky" style={{ top: 'calc(var(--app-bar-height, 56px) + 24px)' }}>
              {renderBookingCard()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: sticky CTA bar */}
      <div className="md:hidden">
        <MobileApplyBar
          dailyWage={dailyWage}
          workDate={workDate}
          dailyWageLabel={t('detail.daily_wage_label')}
          locale={locale}
          applyProps={applyProps}
        />
      </div>
    </div>
  )
}
