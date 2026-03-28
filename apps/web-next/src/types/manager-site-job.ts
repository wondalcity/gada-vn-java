export type SiteStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED'
export type JobStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'
export type ShiftStatus = 'OPEN' | 'CANCELLED'

export interface Site {
  id: string
  name: string
  nameVi?: string
  address: string
  province: string
  district?: string
  lat?: number
  lng?: number
  siteType?: string
  status: SiteStatus
  coverImageUrl?: string
  coverImageIdx?: number
  imageUrls: string[]
  jobCount: number
  createdAt: string
  updatedAt: string
}

export interface Job {
  id: string
  siteId: string
  siteName: string
  title: string
  titleVi?: string
  description?: string
  descriptionVi?: string
  tradeId?: number
  tradeName?: string
  workDate: string
  startTime?: string
  endTime?: string
  dailyWage: number
  currency: string
  benefits: { meals: boolean; transport: boolean; accommodation: boolean; insurance: boolean }
  requirements: { minExperienceMonths?: number; certifications?: string[]; notes?: string }
  slotsTotal: number
  slotsFilled: number
  status: JobStatus
  slug?: string
  expiresAt?: string
  publishedAt?: string
  coverImageUrl?: string
  imageUrls: string[]
  shiftCount: number
  applicationCount: { pending: number; accepted: number; rejected: number }
  shifts?: JobShift[]
  createdAt: string
  updatedAt: string
}

export interface JobShift {
  id: string
  jobId: string
  workDate: string
  status: ShiftStatus
  createdAt: string
}
