export type ContractStatus = 'PENDING_WORKER_SIGN' | 'PENDING_MANAGER_SIGN' | 'FULLY_SIGNED' | 'VOID'

export interface Contract {
  id: string
  status: ContractStatus
  jobTitle: string
  siteName: string
  siteAddress?: string | null
  workDate: string        // ISO date
  startTime?: string | null
  endTime?: string | null
  slotsTotal?: number | null
  dailyWage: number
  workerName?: string | null
  workerPhone?: string | null
  managerName?: string | null
  managerPhone?: string | null
  downloadUrl: string | null
  workerSigUrl: string | null
  managerSigUrl: string | null
  workerSignedAt: string | null
  managerSignedAt: string | null
  createdAt: string
}

export interface HireWithContract {
  id: string              // application id
  jobId: string
  jobTitle: string
  siteName: string
  workDate: string
  dailyWage: number
  workerName: string      // for manager view
  workerPhone: string
  status: 'ACCEPTED' | 'CONTRACTED'
  reviewedAt: string | null
  contract: {
    id: string
    status: ContractStatus
    workerSignedAt: string | null
    managerSignedAt: string | null
    downloadUrl: string | null
  } | null
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING_WORKER_SIGN:   '근로자 서명 대기',
  PENDING_MANAGER_SIGN:  '사업주 서명 대기',
  FULLY_SIGNED:          '계약 완료',
  VOID:                  '계약 무효',
}

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  PENDING_WORKER_SIGN:   'bg-amber-100 text-amber-700',
  PENDING_MANAGER_SIGN:  'bg-blue-100 text-blue-700',
  FULLY_SIGNED:          'bg-green-100 text-green-700',
  VOID:                  'bg-gray-100 text-gray-500',
}
