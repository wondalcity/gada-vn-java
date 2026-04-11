const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

/**
 * Full date with year.
 * ko  → "4월 15일" (n월 n일)
 * others → "15.MAR.2025"
 */
export function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  if (locale === 'ko') {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`
  }
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}.${MONTHS[d.getMonth()]}.${d.getFullYear()}`
}

/**
 * Short date (same format, without year for non-ko already compact).
 * ko  → "4월 15일"
 * others → "15.MAR.2025"
 */
export function formatDateShort(dateStr: string, locale: string): string {
  return formatDate(dateStr, locale)
}
