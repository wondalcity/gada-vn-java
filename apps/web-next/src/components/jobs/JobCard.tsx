'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/components/navigation'
import type { PublicJob } from '@/lib/api/public'
import { formatDateShort } from '@/lib/utils/date'
import { pickDummyImage } from '@/lib/utils/dummyImages'

interface Props {
  job: PublicJob
  locale: string
  basePath?: string
}

function formatVnd(n: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : locale === 'vi' ? 'vi-VN' : 'en-US').format(n) + ' ₫'
}

// Design token: Green=Active, Gray=Closed/Completed, Red=Cancelled
const STATUS_COLORS = {
  OPEN:      { bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  FILLED:    { bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
  CANCELLED: { bg: '#FDE8EE', text: '#ED1C24', dot: '#ED1C24' },
  COMPLETED: { bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
} as const

export function JobCard({ job, locale, basePath = '/jobs' }: Props) {
  const t = useTranslations('jobs')

  const statusColors = STATUS_COLORS[job.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.OPEN
  const statusLabel = (() => {
    switch (job.status) {
      case 'OPEN':      return t('card.status.open')
      case 'FILLED':    return t('card.status.filled')
      case 'CANCELLED': return t('card.status.cancelled')
      case 'COMPLETED': return t('card.status.completed')
      default:          return t('card.status.open')
    }
  })()

  const slotsProgress = job.slotsTotal > 0
    ? Math.min((job.slotsFilled / job.slotsTotal) * 100, 100)
    : 0

  const remaining = job.slotsTotal - job.slotsFilled
  const isAlmostFull = remaining <= 2 && remaining > 0 && job.status === 'OPEN'

  return (
    <Link
      href={`${basePath}/${job.slug ?? job.id}`}
      className="press-effect group flex flex-col h-full bg-white rounded-2xl overflow-hidden transition-all hover:shadow-lg"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Cover image — 1:1 */}
      <div className="relative w-full overflow-hidden bg-[#25282A] shrink-0" style={{ aspectRatio: '1/1' }}>
        <img
          src={job.coverImageUrl ?? pickDummyImage(String(job.id))}
          alt={job.titleKo}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Status badge — top right */}
        <span
          className="absolute top-2.5 right-2.5 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: statusColors.bg, color: statusColors.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColors.dot }} />
          {statusLabel}
        </span>

        {/* Almost full warning */}
        {isAlmostFull && (
          <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#FFF3CD', color: '#856404' }}
          >
            {t('card.closing_soon')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-0">
        {/* Trade chip */}
        <span
          className="inline-block self-start text-xs font-bold px-2.5 py-1 rounded-full mb-2.5"
          style={{ background: '#EFF1F5', color: '#98A2B2' }}
        >
          {(locale === 'vi' ? job.tradeNameVi : job.tradeNameKo) || t('card.other')}
        </span>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#25282A] line-clamp-2 leading-snug mb-3 group-hover:text-[#0669F7] transition-colors">
          {locale === 'vi' ? (job.titleVi || job.titleKo) : job.titleKo}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-[#98A2B2] mb-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate font-medium">{job.siteNameKo} · {job.provinceNameVi}</span>
          {job.distanceKm != null && (
            <span className="ml-auto shrink-0 px-2 py-0.5 bg-[#E6F0FE] text-[#0669F7] rounded-full font-bold">
              {job.distanceKm < 1 ? `${Math.round(job.distanceKm * 1000)}m` : `${job.distanceKm.toFixed(1)}km`}
            </span>
          )}
        </div>

        {/* Work date */}
        <div className="flex items-center gap-1.5 text-xs text-[#98A2B2] mb-4">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">{formatDateShort(job.workDate, locale)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#EFF1F5] mb-3" />

        {/* Daily wage + slots */}
        <div className="mt-auto">
          <p className="text-base font-bold text-[#0669F7] mb-3">
            {formatVnd(job.dailyWage, locale)}
            <span className="text-xs font-semibold text-[#98A2B2] ml-1">{t('card.per_day')}</span>
          </p>

          {/* Slots progress */}
          {job.slotsTotal > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#98A2B2] font-medium">{t('card.headcount')}</span>
                <span className={`font-bold ${remaining > 0 ? 'text-[#25282A]' : 'text-[#DBDFE9]'}`}>
                  {remaining > 0 ? t('card.slots_left', { n: remaining }) : t('card.deadline')}
                </span>
              </div>
              <div className="w-full bg-[#EFF1F5] rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${slotsProgress}%`,
                    background: slotsProgress >= 80 ? '#ED1C24' : '#0669F7',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
