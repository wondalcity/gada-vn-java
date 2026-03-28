import * as React from 'react'
import { cn } from '../../utils/cn'
import { Badge, type BadgeStatus } from '../Badge/Badge'
import { formatVND, formatDate, formatDistance } from '../../utils/format'

export interface JobCardProps {
  title: string
  siteName: string
  province: string
  tradeName: string
  wagePerDay: number
  startDate: string
  endDate: string
  headcount: number
  status: 'open' | 'closed' | 'draft'
  applicationStatus?: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'
  distanceKm?: number
  locale?: 'ko' | 'vi' | 'en'
  onClick?: () => void
  onApply?: (e: React.MouseEvent) => void
  className?: string
  /** Apply button label */
  applyLabel?: string
  /** Applied state label (button disabled) */
  appliedLabel?: string
}

const statusLabel: Record<string, Record<'ko' | 'vi' | 'en', string>> = {
  open:   { ko: '모집중',   vi: 'Đang tuyển', en: 'Open' },
  closed: { ko: '마감',     vi: 'Đã đóng',    en: 'Closed' },
  draft:  { ko: '임시저장', vi: 'Bản nháp',   en: 'Draft' },
}

export const JobCard: React.FC<JobCardProps> = ({
  title,
  siteName,
  province,
  tradeName,
  wagePerDay,
  startDate,
  endDate,
  headcount,
  status,
  applicationStatus,
  distanceKm,
  locale = 'vi',
  onClick,
  onApply,
  className,
  applyLabel,
  appliedLabel,
}) => {
  const isApplied = Boolean(applicationStatus)
  const isOpen = status === 'open'

  const defaultApplyLabel = { ko: '지원하기', vi: 'Ứng tuyển', en: 'Apply' }[locale]
  const defaultAppliedLabel = { ko: '지원 완료', vi: 'Đã ứng tuyển', en: 'Applied' }[locale]

  const headcountLabel = {
    ko: `모집 ${headcount}명`,
    vi: `${headcount} người`,
    en: `${headcount} workers`,
  }[locale]

  const periodLabel = `${formatDate(startDate, locale)} – ${formatDate(endDate, locale)}`

  return (
    <article
      className={cn(
        'bg-surface rounded-sm border border-outline',
        'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        onClick && 'cursor-pointer active:shadow-none transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
        className,
      )}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Top row: status badge + distance */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Badge
              status={status as BadgeStatus}
              label={statusLabel[status][locale]}
              size="sm"
              variant="filled"
              pill
            />
            {applicationStatus && (
              <Badge
                status={applicationStatus as BadgeStatus}
                label={applicationStatus}
                size="sm"
                variant="subtle"
                pill
              />
            )}
          </div>
          {distanceKm !== undefined && (
            <span className="text-[12px] leading-[12px] text-on-surface-variant">
              📍 {formatDistance(distanceKm)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-bold leading-[20px] text-on-surface line-clamp-2 mb-1">
          {title}
        </h3>

        {/* Site + Province */}
        <p className="text-[14px] leading-[18px] text-on-surface-variant truncate mb-3">
          {siteName} · {province}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
          {/* Trade */}
          <MetaChip icon="⚒️" label={tradeName} />
          {/* Headcount */}
          <MetaChip icon="👥" label={headcountLabel} />
          {/* Period */}
          <MetaChip icon="📅" label={periodLabel} />
        </div>

        {/* Wage + Apply row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] leading-[16px] text-on-surface-variant">
              {locale === 'ko' ? '일당' : locale === 'vi' ? 'Lương/ngày' : 'Daily wage'}
            </p>
            <p className="text-[18px] font-bold leading-[23px] text-primary">
              {formatVND(wagePerDay, locale)}
            </p>
          </div>

          {isOpen && onApply && (
            <button
              onClick={(e) => { e.stopPropagation(); onApply(e) }}
              disabled={isApplied}
              className={cn(
                'min-h-[44px] px-5 rounded-full',
                'text-[14px] font-bold',
                'transition-colors duration-150',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isApplied
                  ? 'bg-surface-container text-disabled cursor-default'
                  : 'bg-primary text-primary-on hover:bg-primary-hover active:bg-primary-active',
              )}
            >
              {isApplied
                ? (appliedLabel ?? defaultAppliedLabel)
                : (applyLabel ?? defaultApplyLabel)}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[13px] leading-[18px] text-on-surface-variant">
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  )
}
