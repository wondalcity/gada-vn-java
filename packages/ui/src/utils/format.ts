/**
 * Format VND amount for display.
 * Vietnamese convention: "450.000 ₫"
 * Korean/English convention: "450,000 VNĐ"
 */
export function formatVND(amount: number, locale: 'ko' | 'vi' | 'en' = 'vi'): string {
  if (locale === 'vi') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return (
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount) + ' VNĐ'
  )
}

/**
 * Format date as "MM/DD" or "YYYY.MM.DD" depending on locale.
 */
export function formatDate(dateStr: string, locale: 'ko' | 'vi' | 'en' = 'vi'): string {
  const d = new Date(dateStr)
  if (locale === 'ko') {
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Format distance in km. Short form: "2.4km" (both locales).
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}
