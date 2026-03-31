'use client'

import * as React from 'react'
import Link from 'next/link'
import type { PublicJobDetail } from '@/lib/api/public'
import ApplyButton from './ApplyButton'

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

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date(d))
}

function formatDateShort(d: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date(d))
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

const JOB_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  OPEN:      { label: '모집중',  bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  FILLED:    { label: '마감',    bg: '#FDE8EE', text: '#D81A48', dot: '#D81A48' },
  CANCELLED: { label: '취소',    bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
  COMPLETED: { label: '완료',    bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
}

function StatusPill({ status }: { status: string }) {
  const cfg = JOB_STATUS[status] ?? JOB_STATUS.OPEN
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
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
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors">✕</button>
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

function SiteImageGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIdx, setActiveIdx] = React.useState(0)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  if (images.length === 0) return (
    <div className="w-full h-56 md:h-72 md:rounded-2xl overflow-hidden bg-gradient-to-br from-[#0669F7] to-[#0550C4] flex items-center justify-center mb-0 md:mb-6">
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

        {/* "사진 모두 보기" button */}
        <button
          onClick={() => { setLightboxOpen(true); setActiveIdx(0) }}
          className="absolute bottom-4 right-4 flex items-center gap-2 bg-white text-[#25282A] text-sm font-bold px-4 py-2 rounded-xl border border-[#EFF1F5] hover:bg-[#F2F4F5] transition-colors"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          사진 모두 보기
        </button>
      </div>

      {lightboxOpen && (
        <Lightbox images={images} initialIdx={activeIdx} title={title} onClose={() => setLightboxOpen(false)} onIndexChange={setActiveIdx} />
      )}
    </>
  )
}

// ── Section divider ───────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[#EFF1F5] my-8" />
}

// ── Mobile apply bar (wage + apply button combined) ───────────────────────────

function MobileApplyBar({
  dailyWage,
  workDate,
  applyProps,
}: {
  dailyWage: number
  workDate: string
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
          <p className="text-[11px] text-[#98A2B2] font-medium leading-none mb-0.5">일급</p>
          <p className="text-[20px] font-bold text-[#0669F7] leading-tight truncate">
            {formatVND(dailyWage)}
          </p>
          {workDate && (
            <p className="text-[11px] text-[#98A2B2] mt-0.5 truncate">{formatDateShort(workDate)}</p>
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

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const LIMIT = 200
  const isLong = text.length > LIMIT

  return (
    <div>
      <p className="text-sm text-[#25282A] leading-7 whitespace-pre-wrap">
        {isLong && !expanded ? text.slice(0, LIMIT) + '...' : text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-sm font-bold text-[#25282A] underline underline-offset-2 hover:text-[#0669F7] transition-colors"
        >
          {expanded ? '접기' : '더 보기 →'}
        </button>
      )}
    </div>
  )
}

// ── Stat row (icon + label + value) ──────────────────────────────────────────

function StatRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-2xl bg-[#F2F4F5] flex items-center justify-center shrink-0 text-[#25282A]">
        {icon}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-bold text-[#25282A]">{label}</p>
        <div className="text-sm text-[#98A2B2] mt-0.5">{value}</div>
        {sub && <p className="text-xs text-[#98A2B2] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Benefit row ───────────────────────────────────────────────────────────────

function BenefitRow({ emoji, label, desc }: { emoji: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-2xl bg-[#E8FBE8] flex items-center justify-center shrink-0 text-lg">
        {emoji}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-bold text-[#25282A]">{label}</p>
        <p className="text-xs text-[#98A2B2] mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JobDetailView({
  job, locale, isLoggedIn = false,
  initialApplicationId, initialApplicationStatus, initialNotes,
}: Props) {
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
    benefits.meals        && { emoji: '🍱', label: '식사 제공',  desc: '현장에서 식사를 제공합니다' },
    benefits.transport    && { emoji: '🚌', label: '교통비 지원', desc: '출퇴근 교통비를 지원합니다' },
    benefits.accommodation && { emoji: '🏠', label: '숙박 제공',  desc: '현장 인근 숙박을 제공합니다' },
    benefits.insurance    && { emoji: '🛡️', label: '산재보험',   desc: '산업재해 보험에 가입되어 있습니다' },
  ].filter(Boolean) as { emoji: string; label: string; desc: string }[] : []

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
        <div className="pt-5 md:pt-0 pb-6 border-b border-[#EFF1F5]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl md:text-[28px] font-bold text-[#25282A] leading-tight">{job.titleKo}</h1>
            <StatusPill status={job.status} />
          </div>
          <p className="text-sm text-[#98A2B2] mt-1">
            {siteName} · {job.provinceNameVi}
          </p>
          {job.tradeNameKo && (
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-[#EFF1F5] text-[#98A2B2] text-xs font-bold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {job.tradeNameKo}
            </span>
          )}
        </div>

        {/* Key stats */}
        <div className="py-6 border-b border-[#EFF1F5] space-y-5">
          <StatRow
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            label="근무일"
            value={workDate ? formatDate(workDate) : '-'}
          />
          {job.startTime && job.endTime && (
            <StatRow
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label="근무 시간"
              value={`${job.startTime} – ${job.endTime}`}
            />
          )}
          {slotsTotal > 0 && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#F2F4F5] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#25282A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-bold text-[#25282A]">모집 인원</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${slotsProgress >= 80 ? 'bg-[#FDE8EE] text-[#D81A48]' : 'bg-[#E6F0FE] text-[#0669F7]'}`}>
                    {slotsLeft > 0 ? `${slotsLeft}명 남음` : '마감'}
                  </span>
                </div>
                <div className="w-full bg-[#EFF1F5] rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${slotsProgress}%`, background: slotsProgress >= 80 ? '#D81A48' : '#0669F7' }} />
                </div>
                <p className="text-xs text-[#98A2B2] mt-1">{slotsFilled}명 지원 완료 / 총 {slotsTotal}명 모집</p>
              </div>
            </div>
          )}
          {job.endDate && (
            <StatRow
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label="지원 마감"
              value={formatDate(job.endDate)}
              sub="마감 이후에는 지원이 불가합니다"
            />
          )}
        </div>

        {/* Benefits */}
        {activeBenefits.length > 0 && (
          <>
            <div className="py-6 border-b border-[#EFF1F5]">
              <h2 className="text-lg font-bold text-[#25282A] mb-5">제공 혜택</h2>
              <div className="space-y-5">
                {activeBenefits.map(b => <BenefitRow key={b.label} {...b} />)}
              </div>
            </div>
          </>
        )}

        {/* Description */}
        {description && (
          <div className="py-6 border-b border-[#EFF1F5]">
            <h2 className="text-lg font-bold text-[#25282A] mb-4">상세 내용</h2>
            <ExpandableText text={description} />
          </div>
        )}

        {/* Requirements */}
        {requirements && (requirements.minExperienceMonths || requirements.notes) && (
          <div className="py-6 border-b border-[#EFF1F5]">
            <h2 className="text-lg font-bold text-[#25282A] mb-4">지원 조건</h2>
            <div className="space-y-3">
              {requirements.minExperienceMonths != null && requirements.minExperienceMonths > 0 && (
                <div className="flex items-center gap-3 p-4 bg-[#F2F4F5] rounded-2xl">
                  <div className="w-9 h-9 rounded-xl bg-[#E6F0FE] flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-[#0669F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-[#98A2B2] font-bold">최소 경력</p>
                    <p className="text-sm font-bold text-[#25282A] mt-0.5">
                      {requirements.minExperienceMonths >= 12
                        ? `${Math.floor(requirements.minExperienceMonths / 12)}년${requirements.minExperienceMonths % 12 > 0 ? ` ${requirements.minExperienceMonths % 12}개월` : ''} 이상`
                        : `${requirements.minExperienceMonths}개월 이상`}
                    </p>
                  </div>
                </div>
              )}
              {requirements.notes && (
                <p className="text-sm text-[#25282A] leading-7 whitespace-pre-wrap">{requirements.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Site card */}
        <div className="py-6">
          <h2 className="text-lg font-bold text-[#25282A] mb-4">근무 현장</h2>
          <div className="flex items-start gap-4 p-4 bg-white rounded-2xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#F2F4F5] shrink-0">
              {job.site.coverImageUrl ? (
                <img src={job.site.coverImageUrl} alt={siteName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0669F7] to-[#0550C4] flex items-center justify-center">
                  <span className="text-xl font-black text-white/60">{siteName.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#25282A] text-sm">{siteName}</p>
              {job.site.nameVi && job.site.nameVi !== siteName && (
                <p className="text-xs text-[#98A2B2] mt-0.5">{job.site.nameVi}</p>
              )}
              <div className="flex items-center gap-1 mt-1.5">
                <svg className="w-3.5 h-3.5 text-[#98A2B2] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-xs text-[#98A2B2] truncate">{job.site.address}</p>
              </div>
              {job.site.lat && job.site.lng && (
                <a
                  href={`https://maps.google.com/?q=${job.site.lat},${job.site.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#0669F7] hover:underline"
                >
                  지도에서 보기 →
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
      <div className="bg-white rounded-2xl p-6 border border-[#EFF1F5]" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        {/* Wage */}
        <div className="flex items-baseline gap-1.5 mb-5">
          <span className="text-3xl font-bold text-[#0669F7]">{formatVND(dailyWage)}</span>
          <span className="text-sm text-[#98A2B2] font-medium">/ 1일</span>
        </div>

        {/* Key info */}
        <div className="border border-[#EFF1F5] rounded-2xl divide-y divide-[#EFF1F5] mb-5">
          {workDate && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-[#98A2B2] uppercase tracking-wider mb-1">근무일</p>
              <p className="text-sm font-bold text-[#25282A]">{formatDateShort(workDate)}</p>
            </div>
          )}
          {job.startTime && job.endTime && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-[#98A2B2] uppercase tracking-wider mb-1">근무 시간</p>
              <p className="text-sm font-bold text-[#25282A]">{job.startTime} – {job.endTime}</p>
            </div>
          )}
          {slotsTotal > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-[#98A2B2] uppercase tracking-wider">모집 현황</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${slotsProgress >= 80 ? 'bg-[#FDE8EE] text-[#D81A48]' : 'bg-[#E6F0FE] text-[#0669F7]'}`}>
                  {slotsLeft > 0 ? `${slotsLeft}자리 남음` : '마감'}
                </span>
              </div>
              <div className="w-full bg-[#EFF1F5] rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${slotsProgress}%`, background: slotsProgress >= 80 ? '#D81A48' : '#0669F7' }} />
              </div>
              <p className="text-xs text-[#98A2B2] mt-1">{slotsFilled} / {slotsTotal}명</p>
            </div>
          )}
        </div>

        {/* Apply button */}
        <ApplyButton {...applyProps} />

        {/* Trust signal */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <svg className="w-4 h-4 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <p className="text-xs text-[#98A2B2]">지원 후 관리자가 검토합니다</p>
        </div>

        {/* Benefits summary */}
        {activeBenefits.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#EFF1F5]">
            <p className="text-xs font-bold text-[#98A2B2] mb-2.5">제공 혜택</p>
            <div className="flex flex-wrap gap-1.5">
              {activeBenefits.map(b => (
                <span key={b.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8FBE8] text-[#1A6B1A] text-xs font-bold">
                  {b.emoji} {b.label}
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
    <div className="pb-36 md:pb-10">
      {/* Gallery */}
      <div className="md:max-w-[1760px] md:mx-auto md:px-6 md:pt-6">
        <SiteImageGallery images={siteImages} title={job.titleKo} />
      </div>

      {/* Content */}
      <div className="max-w-[1760px] mx-auto px-4 md:px-6">
        <div className="md:grid md:grid-cols-[1fr_380px] md:gap-14 md:items-start">

          {/* Left: main content */}
          <div>
            {renderContent()}
          </div>

          {/* Right: sticky booking card (desktop only) */}
          <div className="hidden md:block">
            <div className="sticky" style={{ top: 'calc(var(--app-bar-height, 56px) + 24px)' }}>
              {renderBookingCard()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: sticky CTA bar (wage info + apply button combined) */}
      <div className="md:hidden">
        <MobileApplyBar
          dailyWage={dailyWage}
          workDate={workDate}
          applyProps={applyProps}
        />
      </div>
    </div>
  )
}
