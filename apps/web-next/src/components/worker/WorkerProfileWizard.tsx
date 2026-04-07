'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient, ApiError } from '@/lib/api/client'
import { ProfileDraft, EMPTY_DRAFT } from '@/types/worker-profile'
import WizardProgressBar from './WizardProgressBar'
import BasicInfoStep from './steps/BasicInfoStep'
import ExperienceStep from './steps/ExperienceStep'
import AddressStep from './steps/AddressStep'
import IdDocumentsStep from './steps/IdDocumentsStep'
import SignatureStep from './steps/SignatureStep'
import BankAccountStep from './steps/BankAccountStep'
import TermsStep from './steps/TermsStep'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardStep {
  label: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS: WizardStep[] = [
  { label: '기본정보' },
  { label: '경력' },
  { label: '주소' },
  { label: '신분증' },
  { label: '서명' },
  { label: '계좌' },
  { label: '약관' },
]

// ─── Helper: determine first incomplete step ──────────────────────────────────

function getFirstIncompleteStep(draft: ProfileDraft): number {
  if (!draft.fullName || !draft.dateOfBirth || !draft.gender) return 0
  if (!draft.primaryTradeId) return 1
  if (!draft.currentProvince) return 2
  if (!draft.idFrontUrl && !draft.idBackUrl) return 3
  if (!draft.signatureUrl) return 4
  if (!draft.bankName || !draft.bankAccountNumber) return 5
  if (!draft.termsAccepted || !draft.privacyAccepted) return 6
  return 0
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WizardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 bg-[#EFF1F5] rounded w-1/3" />
      <div className="h-10 bg-[#EFF1F5] rounded-2xl" />
      <div className="h-10 bg-[#EFF1F5] rounded-2xl" />
      <div className="h-20 bg-[#EFF1F5] rounded-2xl" />
      <div className="h-12 bg-[#EFF1F5] rounded-full mt-6" />
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-md text-sm font-medium text-white transition-all ${
        type === 'success' ? 'bg-[#00C800]' : 'bg-[#ED1C24]'
      }`}
    >
      {message}
    </div>
  )
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

interface WorkerProfileWizardProps {
  locale: string
}

export default function WorkerProfileWizard({ locale: _locale }: WorkerProfileWizardProps) {
  const idToken = getSessionCookie()

  const [draft, setDraft] = React.useState<ProfileDraft>(EMPTY_DRAFT)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ── Load existing profile on mount ────────────────────────────────────────

  React.useEffect(() => {
    if (!idToken) return
    setIsLoading(true)
    apiClient<Record<string, unknown>>('/workers/me', { token: idToken })
      .then(({ data }) => {
        const loaded: ProfileDraft = {
          fullName:           (data.fullName as string)           ?? '',
          dateOfBirth:        (data.dateOfBirth as string)        ?? '',
          gender:             (data.gender as ProfileDraft['gender']) ?? '',
          bio:                (data.bio as string)                ?? '',
          primaryTradeId:     (data.primaryTradeId as number)     ?? null,
          experienceMonths:   (data.experienceMonths as number)   ?? 0,
          tradeSkills:        (data.tradeSkills as ProfileDraft['tradeSkills']) ?? [],
          currentProvince:    (data.currentProvince as string)    ?? '',
          currentDistrict:    (data.currentDistrict as string)    ?? '',
          addressLabel:       (data.addressLabel as string)       ?? '',
          lat:                (data.lat as number)                ?? null,
          lng:                (data.lng as number)                ?? null,
          idNumber:           (data.idNumber as string)           ?? '',
          idFrontUrl:         (data.idFrontUrl as string)         ?? null,
          idBackUrl:          (data.idBackUrl as string)          ?? null,
          idVerified:         (data.idVerified as boolean)        ?? false,
          signatureUrl:       (data.signatureUrl as string)       ?? null,
          bankName:           (data.bankName as string)           ?? '',
          bankAccountNumber:  (data.bankAccountNumber as string)  ?? '',
          termsAccepted:      (data.termsAccepted as boolean)     ?? false,
          privacyAccepted:    (data.privacyAccepted as boolean)   ?? false,
          profileComplete:    (data.profileComplete as boolean)   ?? false,
        }
        setDraft(loaded)

        // Determine start step
        if (loaded.profileComplete) {
          // Edit mode: start at 0, all steps navigable
          setCompletedSteps(new Set([0, 1, 2, 3, 4, 5, 6]))
          setCurrentStep(0)
        } else {
          const firstIncomplete = getFirstIncompleteStep(loaded)
          setCurrentStep(firstIncomplete)
          // Mark all prior steps as completed
          const completed = new Set<number>()
          for (let i = 0; i < firstIncomplete; i++) completed.add(i)
          setCompletedSteps(completed)
        }
      })
      .catch(() => {
        // Profile not created yet — use empty defaults, start at 0
      })
      .finally(() => setIsLoading(false))
  }, [idToken])

  // ── Toast auto-hide ───────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  // ── onChange handler ──────────────────────────────────────────────────────

  function handleChange(partial: Partial<ProfileDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  // ── Save draft (partial PUT per step) ────────────────────────────────────

  async function saveDraft(step: number): Promise<void> {
    if (!idToken) return
    setSaveError(null)

    try {
      let payload: Record<string, unknown> = {}

      switch (step) {
        case 0:
          payload = {
            fullName:    draft.fullName,
            dateOfBirth: draft.dateOfBirth,
            gender:      draft.gender || null,
            bio:         draft.bio || null,
          }
          break
        case 1:
          payload = {
            primaryTradeId:   draft.primaryTradeId,
            experienceMonths: draft.experienceMonths,
          }
          // Save trade skills separately if any
          if (draft.tradeSkills.length > 0) {
            await apiClient('/workers/me/trade-skills', {
              method: 'PUT',
              token: idToken,
              body: JSON.stringify({ skills: draft.tradeSkills }),
            })
          }
          break
        case 2:
          payload = {
            currentProvince: draft.currentProvince || null,
            currentDistrict: draft.currentDistrict || null,
            addressLabel:    draft.addressLabel    || null,
            lat:             draft.lat,
            lng:             draft.lng,
          }
          break
        case 3:
          // ID documents handled inline via multipart — nothing to PUT here
          payload = {
            idNumber: draft.idNumber || null,
          }
          break
        case 4:
          // Signature handled inline via multipart — nothing to PUT here
          payload = {}
          break
        case 5:
          payload = {
            bankName:          draft.bankName          || null,
            bankAccountNumber: draft.bankAccountNumber || null,
          }
          break
        case 6:
          payload = {
            termsAccepted:   draft.termsAccepted,
            privacyAccepted: draft.privacyAccepted,
            profileComplete: true,
          }
          break
        default:
          break
      }

      await apiClient('/workers/me', {
        method: 'PUT',
        token: idToken,
        body: JSON.stringify(payload),
      })

      if (step === 6) {
        setDraft((prev) => ({ ...prev, profileComplete: true }))
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '저장 중 오류가 발생했습니다.'
      setSaveError(msg)
      throw err
    }
  }

  // ── Advance to next step ──────────────────────────────────────────────────

  async function handleNext() {
    setIsSaving(true)
    try {
      await saveDraft(currentStep)
      setCompletedSteps((prev) => new Set([...prev, currentStep]))
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    } catch {
      // error already set in saveDraft
    } finally {
      setIsSaving(false)
    }
  }

  // ── Final completion ──────────────────────────────────────────────────────

  async function handleComplete() {
    setIsSaving(true)
    try {
      await saveDraft(6)
      setCompletedSteps((prev) => new Set([...prev, 6]))
      setToast({ message: '프로필이 완성되었습니다!', type: 'success' })
    } catch {
      // error already set in saveDraft
    } finally {
      setIsSaving(false)
    }
  }

  // ── Go back ───────────────────────────────────────────────────────────────

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setSaveError(null)
    }
  }

  // ── Jump to step (edit mode) ──────────────────────────────────────────────

  function handleStepClick(index: number) {
    if (draft.profileComplete || completedSteps.has(index) || index === currentStep) {
      setCurrentStep(index)
      setSaveError(null)
    }
  }

  // ── Render step content ───────────────────────────────────────────────────

  function renderStep() {
    if (!idToken) return null

    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            draft={draft}
            onChange={handleChange}
            onNext={handleNext}
            isSaving={isSaving}
          />
        )
      case 1:
        return (
          <ExperienceStep
            draft={draft}
            onChange={handleChange}
            onNext={handleNext}
            isSaving={isSaving}
          />
        )
      case 2:
        return (
          <AddressStep
            draft={draft}
            onChange={handleChange}
            onNext={handleNext}
            isSaving={isSaving}
          />
        )
      case 3:
        return (
          <IdDocumentsStep
            draft={draft}
            onChange={handleChange}
            onNext={() => {
              setCompletedSteps((prev) => new Set([...prev, 3]))
              setCurrentStep(4)
            }}
            idToken={idToken}
          />
        )
      case 4:
        return (
          <SignatureStep
            draft={draft}
            onChange={handleChange}
            onNext={() => {
              setCompletedSteps((prev) => new Set([...prev, 4]))
              setCurrentStep(5)
            }}
            idToken={idToken}
          />
        )
      case 5:
        return (
          <BankAccountStep
            draft={draft}
            onChange={handleChange}
            onNext={handleNext}
            isSaving={isSaving}
          />
        )
      case 6:
        return (
          <TermsStep
            draft={draft}
            onChange={handleChange}
            onComplete={handleComplete}
            isSaving={isSaving}
          />
        )
      default:
        return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <h1 className="text-xl font-semibold text-[#25282A] mb-4">프로필 설정</h1>

        {/* Progress bar */}
        <div className="mb-6">
          <WizardProgressBar
            steps={STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
          {isLoading ? (
            <WizardSkeleton />
          ) : (
            renderStep()
          )}
        </div>

        {/* Save error */}
        {saveError && (
          <div className="mt-3 p-3 bg-[#FDE8EE] border border-[#F4A8B8] rounded-2xl text-sm text-[#ED1C24]">
            {saveError}
          </div>
        )}

        {/* Back button (not on step 0) */}
        {currentStep > 0 && !isLoading && currentStep < 6 && (
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 flex items-center gap-1 text-sm text-[#98A2B2] hover:text-[#25282A] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            이전 단계
          </button>
        )}

        {/* Step counter */}
        {!isLoading && (
          <p className="mt-3 text-xs text-[#98A2B2] text-center">
            {currentStep + 1} / {STEPS.length} 단계
          </p>
        )}
      </div>
    </>
  )
}
