'use client'

import * as React from 'react'
import type { Applicant } from '@/types/application'
import ConfirmModal from '@/components/manager/ConfirmModal'

interface Props {
  applicant: Applicant | null
  onClose: () => void
  onAccept: (id: string) => Promise<void>
  onReject: (id: string, notes?: string) => Promise<void>
  onCancelHire: (id: string) => Promise<void>
  isActing: boolean
  jobStatus: string
  slotsFilled: number
  slotsTotal: number
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(d))
}

function formatExperience(months: number): string {
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem}개월`
  if (rem === 0) return `${years}년`
  return `${years}년 ${rem}개월`
}

function getInitials(name: string): string {
  return name.charAt(0)
}

export default function WorkerDetailModal({
  applicant,
  onClose,
  onAccept,
  onReject,
  onCancelHire,
  isActing,
  jobStatus,
  slotsFilled,
  slotsTotal,
}: Props) {
  const [showRejectForm, setShowRejectForm] = React.useState(false)
  const [rejectNotes, setRejectNotes] = React.useState('')
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // Reset state when applicant changes
  React.useEffect(() => {
    setShowRejectForm(false)
    setRejectNotes('')
    setShowCancelConfirm(false)
  }, [applicant?.id])

  if (!applicant) return null

  const { worker, status, appliedAt, notes } = applicant

  async function handleAccept() {
    await onAccept(applicant!.id)
  }

  async function handleRejectConfirm() {
    await onReject(applicant!.id, rejectNotes.trim() || undefined)
    setShowRejectForm(false)
    setRejectNotes('')
  }

  async function handleCancelHire() {
    await onCancelHire(applicant!.id)
    setShowCancelConfirm(false)
  }

  async function copyPhone() {
    if (!worker.phone) return
    await navigator.clipboard.writeText(worker.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Bottom sheet (mobile) / Centered modal (desktop) */}
      <div className="fixed inset-0 z-[60] flex flex-col justify-end md:items-center md:justify-center pointer-events-none">
        <div className="bg-white rounded-t-[32px] md:rounded-2xl p-5 max-h-[85vh] overflow-y-auto w-full md:max-w-md pointer-events-auto" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
          {/* Handle bar (mobile) */}
          <div className="flex justify-center mb-3 md:hidden">
            <div className="w-10 h-1.5 rounded-full bg-[#DBDFE9]" />
          </div>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {worker.profilePictureUrl ? (
                <img
                  src={worker.profilePictureUrl}
                  alt={worker.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#0669F7] text-white flex items-center justify-center text-xl font-bold">
                  {getInitials(worker.name)}
                </div>
              )}
              <h2 className="text-lg font-bold text-[#25282A]">{worker.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#98A2B2] hover:bg-[#EFF1F5]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Phone */}
          {worker.phone && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-[#25282A]">{worker.phone}</span>
              <button
                type="button"
                onClick={copyPhone}
                className="text-xs text-[#0669F7] px-2 py-0.5 rounded border border-[#0669F7]"
              >
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          )}

          {/* Trade & Experience */}
          <div className="flex items-center gap-2 text-sm text-[#25282A] mb-3">
            {worker.tradeNameKo && <span className="font-medium">{worker.tradeNameKo}</span>}
            {worker.tradeNameKo && <span className="text-[#98A2B2]">·</span>}
            <span>경력 {formatExperience(worker.experienceMonths)}</span>
          </div>

          {/* Badges */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              worker.idVerified
                ? 'bg-[#E8FBE8] text-[#1A6B1A]'
                : 'bg-[#EFF1F5] text-[#98A2B2]'
            }`}>
              {worker.idVerified ? '✓ ' : ''}신분증 인증완료
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              worker.hasSignature
                ? 'bg-[#E8FBE8] text-[#1A6B1A]'
                : 'bg-[#EFF1F5] text-[#98A2B2]'
            }`}>
              {worker.hasSignature ? '✓ ' : ''}서명 완료
            </span>
          </div>

          {/* Applied date */}
          <p className="text-xs text-[#98A2B2] mb-4">지원일: {formatDate(appliedAt)}</p>

          {/* Notes (for rejected) */}
          {status === 'REJECTED' && notes && (
            <div className="bg-[#FDE8EE] rounded-2xl p-3 mb-4">
              <p className="text-xs text-[#D81A48] mb-1 font-bold">불합격 사유</p>
              <p className="text-sm text-[#25282A]">{notes}</p>
            </div>
          )}

          {/* Slot info */}
          <div className="text-xs text-[#98A2B2] mb-4">
            {slotsFilled}/{slotsTotal}명 선발됨
          </div>

          {/* Action buttons */}
          {status === 'PENDING' && (
            <div className="space-y-3">
              {!showRejectForm ? (
                <>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={isActing}
                    className="w-full h-14 rounded-2xl bg-[#0669F7] text-white font-bold text-sm disabled:opacity-40"
                  >
                    {isActing ? '처리 중...' : '합격 처리'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isActing}
                    className="w-full h-14 rounded-2xl bg-[#FDE8EE] text-[#D81A48] font-bold text-sm disabled:opacity-40"
                  >
                    불합격 처리
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-[#25282A]">불합격 사유 (선택)</p>
                  <textarea
                    className="w-full border border-[#EFF1F5] rounded-2xl p-3 text-sm text-[#25282A] placeholder-[#98A2B2] resize-none focus:outline-none focus:border-[#0669F7]"
                    rows={3}
                    placeholder="불합격 사유를 입력하세요..."
                    value={rejectNotes}
                    onChange={e => setRejectNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 h-12 rounded-2xl bg-[#EFF1F5] text-[#98A2B2] font-bold text-sm"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectConfirm}
                      disabled={isActing}
                      className="flex-1 h-12 rounded-2xl bg-[#FDE8EE] text-[#D81A48] font-bold text-sm disabled:opacity-40"
                    >
                      {isActing ? '처리 중...' : '확인'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'ACCEPTED' && (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isActing}
              className="w-full h-14 rounded-2xl bg-[#FDE8EE] text-[#D81A48] font-bold text-sm disabled:opacity-40"
            >
              합격 취소
            </button>
          )}
        </div>
      </div>

      {/* Cancel hire confirm modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        title="합격 취소"
        message="이 지원자의 합격을 취소하시겠습니까?"
        confirmLabel="취소하기"
        confirmVariant="danger"
        onConfirm={handleCancelHire}
        onCancel={() => setShowCancelConfirm(false)}
        isLoading={isActing}
      />
    </>
  )
}
