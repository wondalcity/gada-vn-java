'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { getSessionCookie } from '@/lib/auth/session'
import type { Applicant, JobSlotMeta, ApplicationStatus } from '@/types/application'
import SlotProgressBar from './SlotProgressBar'
import ApplicantCard from './ApplicantCard'
import WorkerDetailModal from './WorkerDetailModal'
import HireConfirmationPanel from './HireConfirmationPanel'

const API_BASE = '/api/v1'

type TabKey = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'

const TAB_LABELS: Record<TabKey, string> = {
  ALL: '전체',
  PENDING: '검토중',
  ACCEPTED: '합격',
  REJECTED: '불합격',
}

interface Props {
  jobId: string
  locale: string
}

interface ApplicantsResponse {
  applicants: Applicant[]
  meta: JobSlotMeta & { jobTitle?: string }
}

export default function ApplicantListClient({ jobId, locale }: Props) {
  const idToken = getSessionCookie()
  const [applicants, setApplicants] = React.useState<Applicant[]>([])
  const [slotMeta, setSlotMeta] = React.useState<JobSlotMeta>({ slotsTotal: 0, slotsFilled: 0, jobStatus: 'OPEN' })
  const [jobTitle, setJobTitle] = React.useState<string>('')
  const [activeTab, setActiveTab] = React.useState<TabKey>('ALL')
  const [selectedApplicant, setSelectedApplicant] = React.useState<Applicant | null>(null)
  const [actingId, setActingId] = React.useState<string | null>(null)
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [contractGenToast, setContractGenToast] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!idToken) {
      setIsLoading(false)
      setError('로그인이 필요합니다')
      return
    }
    setIsLoading(true)
    fetch(`${API_BASE}/manager/jobs/${jobId}/applications`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(res => res.json())
      .then(body => {
        const data = body.data as ApplicantsResponse | undefined
        setApplicants(data?.applicants ?? [])
        setSlotMeta(data?.meta ?? { slotsTotal: 0, slotsFilled: 0, jobStatus: 'OPEN' })
        setJobTitle(data?.meta?.jobTitle ?? '')
      })
      .catch(() => setError('지원자 목록을 불러올 수 없습니다'))
      .finally(() => setIsLoading(false))
  }, [idToken, jobId])

  const tabCounts = React.useMemo(() => {
    const counts: Record<TabKey, number> = { ALL: applicants.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 }
    for (const a of applicants) {
      if (a.status === 'PENDING') counts.PENDING++
      else if (a.status === 'ACCEPTED' || a.status === 'CONTRACTED') counts.ACCEPTED++
      else if (a.status === 'REJECTED') counts.REJECTED++
    }
    return counts
  }, [applicants])

  const filtered = React.useMemo(() => {
    if (activeTab === 'ALL') return applicants
    if (activeTab === 'ACCEPTED') return applicants.filter(a => a.status === 'ACCEPTED' || a.status === 'CONTRACTED')
    return applicants.filter(a => a.status === (activeTab as ApplicationStatus))
  }, [applicants, activeTab])

  const acceptedCount = tabCounts.ACCEPTED

  async function handleAccept(applicationId: string) {
    if (!idToken) return
    setActingId(applicationId)
    const prev = applicants
    const prevMeta = slotMeta
    // Optimistic
    setApplicants(p => p.map(a => a.id === applicationId ? { ...a, status: 'ACCEPTED' } : a))
    try {
      const res = await fetch(`${API_BASE}/manager/applications/${applicationId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message)
      setSlotMeta({ slotsTotal: body.data.slotsTotal, slotsFilled: body.data.slotsFilled, jobStatus: body.data.jobStatus })
      // Sync updated applicant in modal
      setSelectedApplicant(p => p?.id === applicationId ? { ...p, status: 'ACCEPTED' } : p)
    } catch {
      // Revert
      setApplicants(prev)
      setSlotMeta(prevMeta)
    } finally {
      setActingId(null)
    }
  }

  async function handleReject(applicationId: string, notes?: string) {
    if (!idToken) return
    setActingId(applicationId)
    const prev = applicants
    const prevMeta = slotMeta
    // Optimistic
    setApplicants(p => p.map(a => a.id === applicationId ? { ...a, status: 'REJECTED', notes } : a))
    try {
      const res = await fetch(`${API_BASE}/manager/applications/${applicationId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message)
      setSlotMeta({ slotsTotal: body.data.slotsTotal, slotsFilled: body.data.slotsFilled, jobStatus: body.data.jobStatus })
      setSelectedApplicant(p => p?.id === applicationId ? { ...p, status: 'REJECTED', notes } : p)
    } catch {
      setApplicants(prev)
      setSlotMeta(prevMeta)
    } finally {
      setActingId(null)
    }
  }

  async function handleCancelHire(applicationId: string) {
    if (!idToken) return
    setActingId(applicationId)
    const prev = applicants
    const prevMeta = slotMeta
    // Optimistic
    setApplicants(p => p.map(a => a.id === applicationId ? { ...a, status: 'REJECTED' } : a))
    try {
      const res = await fetch(`${API_BASE}/manager/hires/${applicationId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message)
      setSlotMeta(p => ({ ...p, slotsFilled: body.data.slotsFilled, jobStatus: body.data.jobStatus }))
      setSelectedApplicant(p => p?.id === applicationId ? { ...p, status: 'REJECTED' } : p)
    } catch {
      setApplicants(prev)
      setSlotMeta(prevMeta)
    } finally {
      setActingId(null)
    }
  }

  async function handleFinalConfirm() {
    if (!idToken) return
    setIsConfirming(true)
    try {
      // 1. Mark job as FILLED
      const res = await fetch(`${API_BASE}/manager/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FILLED' }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message)
      setSlotMeta(p => ({ ...p, jobStatus: 'FILLED' }))
      setSelectedApplicant(null)

      // 2. Generate contracts for all ACCEPTED applicants (skip those already CONTRACTED)
      const acceptedApplicants = applicants.filter(a => a.status === 'ACCEPTED')
      if (acceptedApplicants.length > 0) {
        setContractGenToast(`계약서 생성 중... (0 / ${acceptedApplicants.length})`)
        let done = 0
        await Promise.allSettled(
          acceptedApplicants.map(async (a) => {
            try {
              await fetch(`${API_BASE}/contracts/generate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: a.id }),
              })
            } finally {
              done++
              setContractGenToast(`계약서 생성 중... (${done} / ${acceptedApplicants.length})`)
            }
          }),
        )
        // Re-fetch applicants to reflect CONTRACTED status
        const updated = await fetch(`${API_BASE}/manager/jobs/${jobId}/applications`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }).then(r => r.json())
        const updatedData = updated.data as ApplicantsResponse
        setApplicants(updatedData.applicants ?? [])
        setContractGenToast(`계약서 ${acceptedApplicants.length}건 생성 완료`)
        setTimeout(() => setContractGenToast(null), 3000)
      }
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-6">
        <div className="h-5 bg-[#DDDDDD] rounded w-1/3 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-4 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[#DDDDDD]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#DDDDDD] rounded w-1/3" />
                <div className="h-3 bg-[#DDDDDD] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-6">
        <p className="text-[#ED1C24] text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1760px] mx-auto pb-24">
      <div className="px-4 pt-6 pb-4">
        {/* Back link */}
        <Link
          href={`/manager/jobs/${jobId}`}
          className="inline-flex items-center gap-1 text-sm text-[#98A2B2] mb-4 hover:text-[#25282A]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          일자리 상세로
        </Link>

        {/* Job title */}
        {jobTitle && (
          <h1 className="text-xl font-bold text-[#25282A] mb-4">{jobTitle}</h1>
        )}

        {/* Slot progress bar */}
        <SlotProgressBar
          slotsFilled={slotMeta.slotsFilled}
          slotsTotal={slotMeta.slotsTotal}
          jobStatus={slotMeta.jobStatus}
        />
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#EFF1F5]">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[#0669F7] text-[#0669F7]'
                  : 'border-transparent text-[#98A2B2]'
              }`}
            >
              {TAB_LABELS[tab]}
              {tabCounts[tab] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-[#0669F7] text-white' : 'bg-[#EFF1F5] text-[#98A2B2]'
                }`}>
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Applicant list */}
      <div className="px-4 py-4 space-y-3">
        {applicants.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#25282A] font-medium text-sm">아직 지원자가 없습니다</p>
            <p className="text-[#98A2B2] text-xs mt-1">공고가 공개되면 지원자가 여기 표시됩니다</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#98A2B2] text-sm">해당 상태의 지원자가 없습니다</p>
          </div>
        ) : (
          filtered.map(applicant => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              onOpenDetail={setSelectedApplicant}
              onQuickAccept={handleAccept}
              onQuickReject={(id) => handleReject(id)}
              isActing={actingId === applicant.id}
            />
          ))
        )}
      </div>

      {/* Worker detail modal */}
      <WorkerDetailModal
        applicant={selectedApplicant}
        onClose={() => setSelectedApplicant(null)}
        onAccept={handleAccept}
        onReject={handleReject}
        onCancelHire={handleCancelHire}
        isActing={actingId === selectedApplicant?.id}
        jobStatus={slotMeta.jobStatus}
        slotsFilled={slotMeta.slotsFilled}
        slotsTotal={slotMeta.slotsTotal}
      />

      {/* Hire confirmation panel */}
      <HireConfirmationPanel
        acceptedCount={acceptedCount}
        slotsTotal={slotMeta.slotsTotal}
        slotsFilled={slotMeta.slotsFilled}
        jobId={jobId}
        onConfirm={handleFinalConfirm}
        isConfirming={isConfirming}
        jobStatus={slotMeta.jobStatus}
      />

      {/* Contract generation toast */}
      {contractGenToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#25282A] text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {contractGenToast}
        </div>
      )}
    </div>
  )
}
