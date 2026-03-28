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
  PENDING:  'bg-gray-100 text-[#7A7B7A] border-[#DDDDDD]',
  ATTENDED: 'bg-green-50 text-green-700 border-green-200',
  HALF_DAY: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ABSENT:   'bg-red-50 text-[#ED1C24] border-red-200',
}
