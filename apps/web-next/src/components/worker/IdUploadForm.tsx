'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'

// ─── Types ───────────────────────────────────────────────────────────────────

interface IdDocumentStatus {
  idNumber: string | null
  idFrontUrl: string | null
  idBackUrl: string | null
  idVerified: boolean | null
  hasDocuments: boolean
}

type VerifiedStatus = 'verified' | 'pending' | 'none'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVerifiedStatus(status: IdDocumentStatus): VerifiedStatus {
  if (status.idVerified === true) return 'verified'
  if (status.hasDocuments) return 'pending'
  return 'none'
}

// ─── Upload zone component ────────────────────────────────────────────────────

interface UploadZoneProps {
  label: string
  tapLabel: string
  currentUrl: string | null
  preview: string | null
  onFileChange: (file: File) => void
}

function UploadZone({ label, tapLabel, currentUrl, preview, onFileChange }: UploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const displayUrl = preview ?? currentUrl

  return (
    <div className="flex-1">
      <p className="block text-sm font-medium text-[#25282A] mb-2">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative w-full h-40 rounded-2xl border-2 border-dashed ${
          displayUrl ? 'border-[#0669F7]' : 'border-[#EFF1F5]'
        } flex items-center justify-center overflow-hidden hover:border-[#0669F7] transition-colors bg-gray-50`}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-4">
            <svg
              className="w-8 h-8 text-[#98A2B2] mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs text-[#98A2B2]">{tapLabel}</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileChange(file)
        }}
      />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function VerifiedBadge({ status, labels }: { status: VerifiedStatus; labels: { verified: string; review: string; unregistered: string } }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {labels.verified}
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {labels.review}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-[#98A2B2] border border-[#EFF1F5]">
      {labels.unregistered}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IdUploadForm({ locale }: { locale: string }) {
  const idToken = getSessionCookie()
  const t = useTranslations('common')

  const [status, setStatus] = React.useState<IdDocumentStatus>({
    idNumber: null,
    idFrontUrl: null,
    idBackUrl: null,
    idVerified: null,
    hasDocuments: false,
  })
  const [idNumber, setIdNumber] = React.useState('')
  const [frontFile, setFrontFile] = React.useState<File | null>(null)
  const [backFile, setBackFile] = React.useState<File | null>(null)
  const [frontPreview, setFrontPreview] = React.useState<string | null>(null)
  const [backPreview, setBackPreview] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // ── Fetch current status ──────────────────────────────────────────────────

  React.useEffect(() => {
    if (!idToken) return
    // 신분증 업로드 API는 현재 준비 중입니다. 로딩만 해제합니다.
    setIsLoading(false)
  }, [idToken])

  // ── File selection → preview ──────────────────────────────────────────────

  function handleFrontFile(file: File) {
    setFrontFile(file)
    const url = URL.createObjectURL(file)
    setFrontPreview(url)
  }

  function handleBackFile(file: File) {
    setBackFile(file)
    const url = URL.createObjectURL(file)
    setBackPreview(url)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idToken) return

    setIsUploading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // ID upload API is currently under development.
      setErrorMessage(t('worker_id_upload.not_available'))
    } finally {
      setIsUploading(false)
    }
  }

  const verifiedStatus = getVerifiedStatus(status)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href={`/${locale}/worker/profile`}
        className="inline-flex items-center gap-1 text-sm text-[#98A2B2] hover:text-[#0669F7] mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('worker_id_upload.back_to_profile')}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#25282A]">{t('worker_id_upload.title')}</h1>
        {!isLoading && <VerifiedBadge status={verifiedStatus} labels={{ verified: t('worker_id_upload.verified'), review: t('worker_id_upload.review'), unregistered: t('worker_id_upload.unregistered') }} />}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Upload zones */}
            <div className="flex gap-3">
              <UploadZone
                label={t('worker_id_upload.front')}
                tapLabel={t('worker_id_upload.tap_to_select')}
                currentUrl={status.idFrontUrl}
                preview={frontPreview}
                onFileChange={handleFrontFile}
              />
              <UploadZone
                label={t('worker_id_upload.back_side')}
                tapLabel={t('worker_id_upload.tap_to_select')}
                currentUrl={status.idBackUrl}
                preview={backPreview}
                onFileChange={handleBackFile}
              />
            </div>

            {/* ID number */}
            <div>
              <label htmlFor="idNumber" className="block text-sm font-medium text-[#25282A] mb-1">
                {t('worker_id_upload.id_number_label')}
                <span className="ml-1 text-xs text-[#98A2B2] font-normal">{t('worker_id_upload.id_number_hint')}</span>
              </label>
              <input
                id="idNumber"
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={t('worker_id_upload.id_number_placeholder')}
                className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
              />
            </div>

            {/* Success / error messages */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-[#D81A48]">
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isUploading || (!frontFile && !backFile && !idNumber)}
              className="w-full py-3 rounded-full bg-[#0669F7] text-white font-medium disabled:opacity-50 text-sm hover:bg-blue-700 transition-colors"
            >
              {isUploading ? t('worker_id_upload.uploading') : t('worker_id_upload.submit')}
            </button>
          </form>
        </div>
      )}

      {/* Loading overlay during upload */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg">
            <svg
              className="w-8 h-8 text-[#0669F7] animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-[#25282A] font-medium">{t('worker_id_upload.uploading')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
