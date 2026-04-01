const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * Full date: ko → "2026년 4월 1일 (수)", others → "01-Apr-2026"
 */
export function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  if (locale === 'ko') {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    }).format(d)
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT[d.getMonth()]
  return `${day}-${month}-${d.getFullYear()}`
}

/**
 * Short date (no year): ko → "4월 1일 (수)", others → "01-Apr-2026"
 */
export function formatDateShort(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  if (locale === 'ko') {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
    }).format(d)
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT[d.getMonth()]
  return `${day}-${month}-${d.getFullYear()}`
}
