'use client'

import * as React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiClient, ApiError } from '@/lib/api/client'

// ─── Types ───────────────────────────────────────────────────────────────────

type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | null

interface RegistrationStatus {
  hasApplied: boolean
  approvalStatus: ApprovalStatus
  rejectionReason: string | null
  appliedAt: string | null
}

interface FormValues {
  companyNameKo: string
  companyNameVi: string
  businessRegistrationNumber: string
  companyAddress: string
  registrationDoc: File | null
}

const EMPTY_FORM: FormValues = {
  companyNameKo: '',
  companyNameVi: '',
  businessRegistrationNumber: '',
  companyAddress: '',
  registrationDoc: null,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ApprovedState() {
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
      <h2 className="text-lg font-semibold text-[#25282A] mb-2">매니저로 승인되었습니다</h2>
      <p className="text-sm text-[#98A2B2]">현장 관리 기능을 모두 사용할 수 있습니다.</p>
    </div>
  )
}

function PendingState({
  appliedAt,
  onReApply,
}: {
  appliedAt: string | null
  onReApply: () => void
}) {
  const formattedDate = appliedAt
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(appliedAt))
    : null

  return (
    <div className="flex flex-col items-center py-12 text-center">
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
      <h2 className="text-lg font-semibold text-[#25282A] mb-2">검토 중입니다</h2>
      {formattedDate && (
        <p className="text-sm text-[#98A2B2] mb-1">신청일: {formattedDate}</p>
      )}
      <p className="text-sm text-[#98A2B2] mb-6">
        담당자가 서류를 검토하고 있습니다. 영업일 기준 2-3일 내에 결과를 알려드립니다.
      </p>
      <button
        type="button"
        onClick={onReApply}
        className="px-6 py-2 rounded-full border border-[#EFF1F5] text-sm text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
      >
        다시 신청하기
      </button>
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
    <div className="mb-6">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-4">
        <svg
          className="w-5 h-5 text-[#ED1C24] flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-[#ED1C24] mb-1">신청이 반려되었습니다</p>
          {rejectionReason && (
            <p className="text-sm text-[#25282A]">{rejectionReason}</p>
          )}
        </div>
      </div>
      <p className="text-sm text-[#98A2B2] mb-4">아래 양식을 수정하여 다시 신청해주세요.</p>
    </div>
  )
}

// ─── Registration form ────────────────────────────────────────────────────────

interface RegistrationFormProps {
  onSuccess: () => void
  idToken: string
}

function RegistrationForm({ onSuccess, idToken }: RegistrationFormProps) {
  const [values, setValues] = React.useState<FormValues>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setValues((prev) => ({ ...prev, registrationDoc: file }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('companyNameKo', values.companyNameKo)
      if (values.companyNameVi) formData.append('companyNameVi', values.companyNameVi)
      formData.append('businessRegistrationNumber', values.businessRegistrationNumber)
      formData.append('companyAddress', values.companyAddress)
      if (values.registrationDoc) {
        formData.append('registrationDoc', values.registrationDoc)
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'
      const res = await fetch(`${API_BASE}/manager/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.message ?? '신청 중 오류가 발생했습니다.')
      }

      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '신청 중 오류가 발생했습니다.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company name (Korean) */}
      <div>
        <label htmlFor="companyNameKo" className="block text-sm font-medium text-[#25282A] mb-1">
          회사명 (한국어) <span className="text-[#ED1C24]">*</span>
        </label>
        <input
          id="companyNameKo"
          name="companyNameKo"
          type="text"
          required
          value={values.companyNameKo}
          onChange={handleChange}
          placeholder="회사명을 입력하세요"
          className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Company name (Vietnamese) */}
      <div>
        <label htmlFor="companyNameVi" className="block text-sm font-medium text-[#25282A] mb-1">
          회사명 (베트남어)
        </label>
        <input
          id="companyNameVi"
          name="companyNameVi"
          type="text"
          value={values.companyNameVi}
          onChange={handleChange}
          placeholder="Tên công ty (không bắt buộc)"
          className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Business registration number */}
      <div>
        <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-[#25282A] mb-1">
          사업자등록번호 <span className="text-[#ED1C24]">*</span>
        </label>
        <input
          id="businessRegistrationNumber"
          name="businessRegistrationNumber"
          type="text"
          required
          value={values.businessRegistrationNumber}
          onChange={handleChange}
          placeholder="000-00-00000"
          className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Company address */}
      <div>
        <label htmlFor="companyAddress" className="block text-sm font-medium text-[#25282A] mb-1">
          회사 주소 <span className="text-[#ED1C24]">*</span>
        </label>
        <textarea
          id="companyAddress"
          name="companyAddress"
          required
          rows={3}
          value={values.companyAddress}
          onChange={handleChange}
          placeholder="회사 주소를 입력하세요"
          className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] resize-none"
        />
      </div>

      {/* Registration document */}
      <div>
        <label className="block text-sm font-medium text-[#25282A] mb-1">
          사업자 등록증
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-full px-3 py-3 rounded-2xl border-2 border-dashed text-sm transition-colors ${
            values.registrationDoc
              ? 'border-[#0669F7] text-[#0669F7] bg-blue-50'
              : 'border-[#EFF1F5] text-[#98A2B2] hover:border-[#0669F7]'
          }`}
        >
          {values.registrationDoc ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {values.registrationDoc.name}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              PDF 또는 이미지 파일을 선택하세요
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-xs text-[#98A2B2] mt-1">PDF, JPG, PNG 파일 허용</p>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-[#ED1C24]">
          {errorMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 rounded-full bg-[#0669F7] text-white font-medium disabled:opacity-50 text-sm hover:bg-blue-700 transition-colors"
      >
        {isSubmitting ? '신청 중...' : '매니저 등록 신청'}
      </button>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagerRegistrationForm() {
  const { idToken } = useAuth()

  const [status, setStatus] = React.useState<RegistrationStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)

  // ── Fetch registration status ─────────────────────────────────────────────

  React.useEffect(() => {
    if (!idToken) return
    apiClient<RegistrationStatus>('/manager/registration/status', { token: idToken })
      .then(({ data }) => {
        setStatus(data)
        // Show form immediately if rejected or not yet applied
        if (!data.hasApplied || data.approvalStatus === 'REJECTED') {
          setShowForm(true)
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 404) {
          // No registration found — show form
          setStatus({ hasApplied: false, approvalStatus: null, rejectionReason: null, appliedAt: null })
          setShowForm(true)
        }
      })
      .finally(() => setIsLoading(false))
  }, [idToken])

  // ── Handle successful submission ──────────────────────────────────────────

  function handleSuccess() {
    setStatus({
      hasApplied: true,
      approvalStatus: 'PENDING',
      rejectionReason: null,
      appliedAt: new Date().toISOString(),
    })
    setShowForm(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-[#25282A] mb-6">매니저 등록</h1>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-100 rounded w-24 mb-1 animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* APPROVED state */}
          {status?.approvalStatus === 'APPROVED' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
              <ApprovedState />
            </div>
          )}

          {/* PENDING state */}
          {status?.approvalStatus === 'PENDING' && !showForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
              <PendingState
                appliedAt={status.appliedAt}
                onReApply={() => setShowForm(true)}
              />
            </div>
          )}

          {/* REJECTED notice + form, or no-application form */}
          {(status?.approvalStatus === 'REJECTED' || !status?.hasApplied || showForm) &&
            status?.approvalStatus !== 'APPROVED' && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
                {status?.approvalStatus === 'REJECTED' && (
                  <RejectedState
                    rejectionReason={status.rejectionReason}
                    onReApply={() => setShowForm(true)}
                  />
                )}
                {idToken && (
                  <RegistrationForm onSuccess={handleSuccess} idToken={idToken} />
                )}
              </div>
            )}
        </>
      )}
    </div>
  )
}
