export function formatHoursWorked(hours?: number | null, minutes?: number | null): string {
  if (hours == null && minutes == null) return '-'
  const h = hours ?? 0
  const m = minutes ?? 0
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
  PENDING:        '미확인',
  PRE_CONFIRMED:  '출근 예정',
  COMMUTING:      '출근 중',
  WORK_STARTED:   '작업 시작',
  WORK_COMPLETED: '작업 마감',
  ATTENDED:       '출근',
  HALF_DAY:       '반차',
  ABSENT:         '결근',
  EARLY_LEAVE:    '조퇴',
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING:        'bg-[#EFF1F5] text-[#7A7B7A] border-[#DDDDDD]',
  PRE_CONFIRMED:  'bg-[#E3F2FD] text-[#1565C0] border-[#90CAF9]',
  COMMUTING:      'bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]',
  WORK_STARTED:   'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]',
  WORK_COMPLETED: 'bg-[#F3E5F5] text-[#6A1B9A] border-[#CE93D8]',
  ATTENDED:       'bg-[#E6F9E6] text-[#1A6B1A] border-[#86D98A]',
  HALF_DAY:       'bg-[#FFF8E6] text-[#856404] border-[#F5D87D]',
  ABSENT:         'bg-[#FDE8EE] text-[#ED1C24] border-[#F4A8B8]',
  EARLY_LEAVE:    'bg-[#FFE0B2] text-[#BF360C] border-[#FFCC80]',
}
