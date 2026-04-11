const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

/**
 * Format a date string for the admin panel based on the active locale.
 * ko     → "4월 15일"
 * vi/en  → "15.MAR.2025"
 */
export function fmtDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  if (locale === 'ko') {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`
  }
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}.${MONTHS[d.getMonth()]}.${d.getFullYear()}`
}

/**
 * Format a datetime string with full date and time including seconds.
 * Output: "YYYY-MM-DD HH:mm:ss"  (locale-independent, suitable for admin tables)
 */
export function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`
}

/**
 * Locale-aware trade name: prefer vi name for non-Korean locales.
 */
export function tradeName(nameKo: string | null | undefined, nameVi: string | null | undefined, locale: string): string {
  if (locale === 'ko') return nameKo ?? nameVi ?? '-'
  return nameVi ?? nameKo ?? '-'
}
