const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * Format a date string according to locale.
 * ko  → "2025년 Jan 15일"
 * en/vi → "15/Jan/2025"
 */
export function formatDate(dateStr: string | Date | null | undefined, locale: string): string {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return String(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = MONTHS_SHORT[d.getMonth()]
  const year = d.getFullYear()
  if (locale === 'ko') {
    return `${year}년 ${mon} ${d.getDate()}일`
  }
  return `${day}/${mon}/${year}`
}

/**
 * Short date — same as formatDate (kept for API compatibility).
 */
export function formatDateShort(dateStr: string | Date | null | undefined, locale: string): string {
  return formatDate(dateStr, locale)
}
