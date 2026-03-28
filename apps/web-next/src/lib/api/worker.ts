import { apiClient } from './client'

export interface WorkerProfile {
  id: string
  name: string
  phone: string
  email?: string
  idDocumentStatus?: 'pending' | 'verified' | 'rejected'
  hasSignature: boolean
  locale: string
}

export interface Application {
  id: string
  jobId: string
  jobTitleKo: string
  jobTitleVi: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'
  appliedAt: string
}

export interface Contract {
  id: string
  jobTitleKo: string
  pdfUrl?: string
  status: 'pending' | 'worker_signed' | 'voided'
  createdAt: string
}

export async function fetchWorkerProfile(token: string) {
  return apiClient<WorkerProfile>('/workers/me', { token })
}

export async function fetchWorkerApplications(token: string, status?: string) {
  const query = status ? `?status=${status}` : ''
  return apiClient<Application[]>(`/worker/applications${query}`, { token })
}

export async function fetchWorkerContracts(token: string) {
  return apiClient<Contract[]>('/worker/contracts', { token })
}
