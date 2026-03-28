'use client'

import * as React from 'react'
import { cn } from '../../utils/cn'

export interface DateSliderProps {
  /** Selected date (ISO string YYYY-MM-DD) */
  value?: string
  onChange?: (date: string) => void
  /** Number of days to show centered around today. Default: 14 */
  windowDays?: number
  /** ISO string YYYY-MM-DD — earliest selectable date. Default: today */
  minDate?: string
  /** ISO string YYYY-MM-DD — latest selectable date */
  maxDate?: string
  locale?: 'ko' | 'vi' | 'en'
  className?: string
}

const DAY_LABELS: Record<'ko' | 'vi' | 'en', string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

export const DateSlider: React.FC<DateSliderProps> = ({
  value,
  onChange,
  windowDays = 14,
  minDate,
  maxDate,
  locale = 'vi',
  className,
}) => {
  const today = React.useMemo(() => new Date(new Date().toDateString()), [])
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Generate date range: windowDays before today + windowDays after
  const dates = React.useMemo(() => {
    return Array.from({ length: windowDays * 2 + 1 }, (_, i) =>
      addDays(today, i - windowDays),
    )
  }, [today, windowDays])

  // Scroll selected date into view
  React.useEffect(() => {
    if (!scrollRef.current || !value) return
    const idx = dates.findIndex((d) => toIso(d) === value)
    if (idx >= 0) {
      const el = scrollRef.current.children[idx] as HTMLElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [value, dates])

  const dayLabels = DAY_LABELS[locale]

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 px-4 -mx-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        role="group"
        aria-label="Date selector"
      >
        {dates.map((date) => {
          const iso = toIso(date)
          const isSelected = iso === value
          const isToday = iso === toIso(today)
          const isPast = date < today
          const minD = minDate ? iso < minDate : false
          const maxD = maxDate ? iso > maxDate : false
          const isDisabled = minD || maxD

          return (
            <button
              key={iso}
              onClick={() => !isDisabled && onChange?.(iso)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={`${iso}${isToday ? ' (today)' : ''}`}
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center',
                'w-11 h-14 rounded-sm',
                'transition-colors duration-150',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                isSelected
                  ? 'bg-primary text-primary-on'
                  : isDisabled
                  ? 'text-disabled cursor-not-allowed'
                  : isPast
                  ? 'text-on-surface-variant hover:bg-surface-container'
                  : 'text-on-surface hover:bg-primary-8',
              )}
            >
              <span className="text-[11px] leading-[16px] font-normal">
                {dayLabels[date.getDay()]}
              </span>
              <span
                className={cn(
                  'text-[16px] font-bold leading-[20px] mt-0.5',
                  isToday && !isSelected && 'text-primary',
                )}
              >
                {date.getDate()}
              </span>
              {isToday && (
                <span
                  className={cn(
                    'w-1 h-1 rounded-full mt-0.5',
                    isSelected ? 'bg-primary-on' : 'bg-primary',
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
