'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import {
  ManagerDraft,
  ManagerRegistrationStatus,
  ApprovalStatus,
  EMPTY_DRAFT,
} from '@/types/manager-application'
import Step1BasicInfo from './steps/Step1BasicInfo'
import Step2SiteSignature from './steps/Step2SiteSignature'
import ManagerAgreementStep from './steps/ManagerAgreementStep'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['기본 정보', '현장 및 서명', '동의 및 제출']
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ManagerProgressBar({ currentStep }: { currentStep: number }) {
  const total = STEP_LABELS.length

  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-[#0669F7] text-white'
                    : isCurrent
                    ? 'bg-[#0669F7] text-white ring-2 ring-[#0669F7] ring-offset-2'
                    : 'bg-[#EFF1F5] text-[#98A2B2]'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${isCurrent ? 'text-[#0669F7]' : isCompleted ? 'text-[#0669F7]' : 'text-[#98A2B2]'}`}>
                {label}
              </span>
            </div>
            {index < total - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 mx-1 transition-all ${
                  index < currentStep ? 'bg-[#0669F7]' : 'bg-[#EFF1F5]'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Status States ────────────────────────────────────────────────────────────

function ApprovedState({ locale }: { locale: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[#25282A] mb-2">매니저 승인 완료</h2>
      <p className="text-sm text-[#98A2B2] mb-6">현장 관리 기능을 모두 사용할 수 있습니다.</p>
      <a
        href={`/${locale}/manager/sites`}
        className="px-6 py-3 rounded-full bg-[#0669F7] text-white font-semibold text-sm inline-block"
      >
        현장 관리 시작하기
      </a>
    </div>
  )
}

function PendingState({
  submittedAt,
  onEdit,
  onCancel,
}: {
  submittedAt: string | null
  onEdit: () => void
  onCancel: () => void
}) {
  const formattedDate = submittedAt
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(submittedAt))
    : null

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[#25282A] mb-2">신청서 검토 중</h2>
      {formattedDate && (
        <p className="text-sm text-[#98A2B2] mb-1">제출일: {formattedDate}</p>
      )}
      <p className="text-sm text-[#98A2B2] mb-5">
        영업일 기준 2-3일 이내에 결과를 알려드립니다
      </p>

      {/* Animated shimmer progress bar */}
      <div className="w-full max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 rounded-full animate-pulse" />
      </div>

      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={onEdit}
          className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold text-sm"
        >
          신청 내용 수정
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
        >
          신청 취소
        </button>
      </div>
    </div>
  )
}

function RejectedState({
  rejectionReason,
  onReApply,
}: {
  rejectionReason: string | null
  onReApply: () => void
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#D81A48]" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[#25282A] mb-2">신청이 반려되었습니다</h2>
      {rejectionReason && (
        <div className="w-full p-3 border border-red-200 bg-red-50 rounded-2xl text-sm text-[#25282A] text-left mb-5">
          {rejectionReason}
        </div>
      )}
      <button
        type="button"
        onClick={onReApply}
        className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold text-sm"
      >
        다시 신청하기
      </button>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WizardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 bg-gray-100 rounded w-1/3" />
      <div className="h-10 bg-gray-100 rounded-2xl" />
      <div className="h-10 bg-gray-100 rounded-2xl" />
      <div className="h-20 bg-gray-100 rounded-2xl" />
      <div className="h-12 bg-gray-100 rounded-full mt-6" />
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

interface ManagerApplicationWizardProps {
  locale: string
}

export default function ManagerApplicationWizard({ locale }: ManagerApplicationWizardProps) {
  const [idToken, setIdToken] = React.useState<string | null>(null)

  const [currentStep, setCurrentStep] = React.useState(0)
  const [draft, setDraft] = React.useState<ManagerDraft>(EMPTY_DRAFT)
  const [status, setStatus] = React.useState<ManagerRegistrationStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [showWizard, setShowWizard] = React.useState(false)

  React.useEffect(() => {
    setIdToken(getSessionCookie())
  }, [])

  // ── Fetch status on mount ─────────────────────────────────────────────────

  React.useEffect(() => {
    if (!idToken) return
    setIsLoading(true)

    fetch(`${API_BASE}/managers/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(async (res) => {
        if (res.status === 404) {
          // No profile yet — show wizard from the start
          setStatus({ hasApplied: false, approvalStatus: null, submittedAt: null, rejectionReason: null, profile: null })
          setShowWizard(true)
          return
        }
        const body = await res.json()
        if (!res.ok) throw new Error(body.message ?? 'API error')

        // Backend returns raw DB row (snake_case) wrapped in { data: ... }
        const p = body.data ?? body
        const approvalStatus = (p.approval_status ?? p.approvalStatus) as ApprovalStatus | null
        const hasApplied = !!approvalStatus

        const profile: ManagerRegistrationStatus['profile'] = {
          businessType: (p.business_type ?? p.businessType) ?? null,
          companyName: (p.company_name ?? p.companyName) ?? null,
          representativeName: (p.representative_name ?? p.representativeName) ?? null,
          representativeDob: (p.representative_dob ?? p.representativeDob) ?? null,
          representativeGender: (p.representative_gender ?? p.representativeGender) ?? null,
          businessRegNumber: (p.business_reg_number ?? p.businessRegNumber) ?? null,
          businessRegDocUrl: (p.business_reg_doc_url ?? p.businessRegDocUrl) ?? null,
          contactPhone: (p.contact_phone ?? p.contactPhone) ?? null,
          contactAddress: (p.contact_address ?? p.contactAddress) ?? null,
          province: p.province ?? null,
          firstSiteName: (p.first_site_name ?? p.firstSiteName) ?? null,
          firstSiteAddress: (p.first_site_address ?? p.firstSiteAddress) ?? null,
          signatureUrl: (p.signature_url ?? p.signatureUrl) ?? null,
          termsAccepted: !!(p.terms_accepted ?? p.termsAccepted),
          privacyAccepted: !!(p.privacy_accepted ?? p.privacyAccepted),
        }

        const data: ManagerRegistrationStatus = {
          hasApplied,
          approvalStatus,
          submittedAt: p.submitted_at ?? p.submittedAt ?? p.created_at ?? null,
          rejectionReason: (p.rejection_reason ?? p.rejectionReason) ?? null,
          profile,
        }

        // Pre-fill draft from existing profile
        setDraft({
          businessType: profile.businessType ?? '',
          companyName: profile.companyName ?? '',
          businessRegNumber: profile.businessRegNumber ?? '',
          businessRegDoc: null,
          businessRegDocUrl: profile.businessRegDocUrl ?? null,
          representativeName: profile.representativeName ?? '',
          representativeDob: profile.representativeDob ?? '',
          representativeGender: profile.representativeGender ?? '',
          contactPhone: profile.contactPhone ?? '',
          firstSiteName: profile.firstSiteName ?? '',
          firstSiteAddress: profile.firstSiteAddress ?? '',
          contactAddress: profile.contactAddress ?? '',
          province: profile.province ?? '',
          signatureDataUrl: null,
          signatureUrl: profile.signatureUrl ?? null,
          termsAccepted: profile.termsAccepted,
          privacyAccepted: profile.privacyAccepted,
        })

        setStatus(data)
        setShowWizard(!hasApplied || approvalStatus === 'REJECTED')
      })
      .catch(() => {
        // Fallback: show wizard
        setStatus({ hasApplied: false, approvalStatus: null, submittedAt: null, rejectionReason: null, profile: null })
        setShowWizard(true)
      })
      .finally(() => setIsLoading(false))
  }, [idToken])

  // ── Draft handler ─────────────────────────────────────────────────────────

  function handleChange(partial: Partial<ManagerDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleNext() {
    setCurrentStep((prev) => Math.min(prev + 1, STEP_LABELS.length - 1))
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  // Called after successful submission from step 6
  function handleSubmitSuccess() {
    setStatus({
      hasApplied: true,
      approvalStatus: 'PENDING',
      submittedAt: new Date().toISOString(),
      rejectionReason: null,
      profile: status?.profile ?? null,
    })
    setShowWizard(false)
    setCurrentStep(0)
  }

  // ── Render step content ───────────────────────────────────────────────────

  function renderStep() {
    if (!idToken) return null

    switch (currentStep) {
      case 0:
        return (
          <Step1BasicInfo
            draft={draft}
            onChange={handleChange}
            onNext={handleNext}
          />
        )
      case 1:
        return (
          <Step2SiteSignature
            draft={draft}
            onChange={handleChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 2:
        return (
          <ManagerAgreementStep
            draft={draft}
            onChange={handleChange}
            onNext={handleSubmitSuccess}
            onBack={handleBack}
            isSaving={false}
            idToken={idToken}
          />
        )
      default:
        return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-[#25282A] mb-4">매니저 등록</h1>

      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
          <WizardSkeleton />
        </div>
      ) : showWizard ? (
        <>
          {/* Progress bar */}
          <div className="mb-6">
            <ManagerProgressBar currentStep={currentStep} />
          </div>

          {/* Step content */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
            {renderStep()}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 mt-5">
          {status?.approvalStatus === 'APPROVED' && (
            <ApprovedState locale={locale} />
          )}
          {status?.approvalStatus === 'PENDING' && (
            <PendingState
              submittedAt={status.submittedAt}
              onEdit={() => {
                setShowWizard(true)
                setCurrentStep(0)
              }}
              onCancel={() => {
                setStatus((prev) =>
                  prev
                    ? { ...prev, hasApplied: false, approvalStatus: null, submittedAt: null }
                    : prev
                )
                setShowWizard(true)
                setCurrentStep(0)
              }}
            />
          )}
          {status?.approvalStatus === 'REJECTED' && (
            <RejectedState
              rejectionReason={status.rejectionReason}
              onReApply={() => {
                setShowWizard(true)
                setCurrentStep(0)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
