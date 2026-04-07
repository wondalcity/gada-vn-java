export function formatHoursWorked(hours?: number): string {
  if (hours == null) return '-'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

export function computeHours(checkIn?: string, checkOut?: string): number | null {
  if (!checkIn || !checkOut) return null
  const [ih, im] = checkIn.split(':').map(Number)
  const [oh, om] = checkOut.split(':').map(Number)
  const mins = (oh * 60 + om) - (ih * 60 + im)
  if (mins <= 0) return null
  return Math.round(mins / 60 * 100) / 100
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING:  '미확인',
  ATTENDED: '출근',
  HALF_DAY: '반차',
  ABSENT:   '결근',
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
  ATTENDED: 'bg-[#E6F9E6] text-[#1A6B1A] border-[#86D98A]',
  HALF_DAY: 'bg-[#FFF8E6] text-[#856404] border-[#F5D87D]',
  ABSENT:   'bg-[#FDE8EE] text-[#ED1C24] border-[#F4A8B8]',
}
