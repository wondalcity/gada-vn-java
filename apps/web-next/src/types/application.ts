export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'CONTRACTED'

export interface WorkerApplication {
  id: string
  jobId: string
  jobTitle: string
  siteId: string
  siteName: string
  workDate: string
  dailyWage: number
  status: ApplicationStatus
  appliedAt: string
  notes?: string
  coverImageUrl?: string
  tradeNameKo?: string
}

export interface Hire extends WorkerApplication {
  startTime?: string
  endTime?: string
  managerName?: string
  reviewedAt?: string
}

export interface ApplicantWorker {
  id: string            // worker_profile id
  name: string
  phone?: string
  experienceMonths: number
  primaryTradeId?: number
  tradeNameKo?: string
  idVerified: boolean
  hasSignature: boolean
  profilePictureUrl?: string
}

export interface Applicant {
  id: string            // application id
  status: ApplicationStatus
  appliedAt: string
  notes?: string
  worker: ApplicantWorker
}

export interface JobSlotMeta {
  slotsTotal: number
  slotsFilled: number
  jobStatus: string
}
