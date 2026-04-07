export type ContractStatus = 'PENDING_WORKER_SIGN' | 'PENDING_MANAGER_SIGN' | 'FULLY_SIGNED' | 'VOID'

export interface Contract {
  id: string
  contractHtml?: string | null
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
  companyName?: string | null
  companyContactName?: string | null
  companyContactPhone?: string | null
  companySigUrl?: string | null
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
  PENDING_WORKER_SIGN:   'bg-[#FFE9B0] text-[#856404]',
  PENDING_MANAGER_SIGN:  'bg-[#D6E8FE] text-[#0669F7]',
  FULLY_SIGNED:          'bg-[#D6F0D6] text-[#1A6B1A]',
  VOID:                  'bg-[#EFF1F5] text-[#7A7B7A]',
}
