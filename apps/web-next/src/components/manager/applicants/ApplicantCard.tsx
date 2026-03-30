'use client'

import * as React from 'react'
import type { Applicant, ApplicationStatus } from '@/types/application'

interface Props {
  applicant: Applicant
  onOpenDetail: (a: Applicant) => void
  onQuickAccept: (id: string) => Promise<void>
  onQuickReject: (id: string) => Promise<void>
  isActing: boolean
}

function formatExperience(months: number): string {
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem}개월`
  if (rem === 0) return `${years}년`
  return `${years}년 ${rem}개월`
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:    { label: '검토중',   bg: '#FFF3CD', text: '#856404', dot: '#FDBC08' },
  ACCEPTED:   { label: '합격',    bg: '#E8FBE8', text: '#1A6B1A', dot: '#00C800' },
  REJECTED:   { label: '불합격',  bg: '#FDE8EE', text: '#D81A48', dot: '#D81A48' },
  WITHDRAWN:  { label: '취소',    bg: '#EFF1F5', text: '#98A2B2', dot: '#DBDFE9' },
  CONTRACTED: { label: '계약완료', bg: '#E6F0FE', text: '#0669F7', dot: '#0669F7' },
}

function getAvatarBg(status: ApplicationStatus): string {
  if (status === 'PENDING') return 'bg-[#0669F7] text-white'
  if (status === 'ACCEPTED') return 'bg-green-600 text-white'
  return 'bg-gray-400 text-white'
}

export default function ApplicantCard({ applicant, onOpenDetail, onQuickAccept, onQuickReject, isActing }: Props) {
  const { worker, status } = applicant
  const statusConfig = STATUS_CONFIG[status]
  const avatarBg = getAvatarBg(status)

  function handleCardClick(e: React.MouseEvent) {
    // Don't open modal if clicking action buttons
    if ((e.target as HTMLElement).closest('button')) return
    onOpenDetail(applicant)
  }

  async function handleAccept(e: React.MouseEvent) {
    e.stopPropagation()
    await onQuickAccept(applicant.id)
  }

  async function handleReject(e: React.MouseEvent) {
    e.stopPropagation()
    await onQuickReject(applicant.id)
  }

  return (
    <div
      className="bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      onClick={handleCardClick}
    >
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold ${worker.profilePictureUrl ? '' : avatarBg}`}>
        {worker.profilePictureUrl ? (
          <img src={worker.profilePictureUrl} alt={worker.name} className="w-full h-full object-cover" />
        ) : (
          worker.name.charAt(0)
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#25282A] truncate">{worker.name}</p>
        <p className="text-xs text-[#98A2B2] font-medium mt-0.5">
          {worker.tradeNameKo ?? '직종 미지정'} · {formatExperience(worker.experienceMonths)}
        </p>
        {/* Badges */}
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {worker.idVerified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8FBE8] text-[#1A6B1A]">
              신분증 ✓
            </span>
          )}
          {worker.hasSignature && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8FBE8] text-[#1A6B1A]">
              서명 ✓
            </span>
          )}
        </div>
      </div>

      {/* Right: status badge + actions */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: statusConfig.bg, color: statusConfig.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusConfig.dot }} />
          {statusConfig.label}
        </span>

        {status === 'PENDING' && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isActing}
              className="px-3 py-1.5 rounded-xl bg-[#0669F7] text-white font-bold text-xs disabled:opacity-40"
            >
              합격
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={isActing}
              className="px-3 py-1.5 rounded-xl bg-[#FDE8EE] text-[#D81A48] font-bold text-xs disabled:opacity-40"
            >
              불합격
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
