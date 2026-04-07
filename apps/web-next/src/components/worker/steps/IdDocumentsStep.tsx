'use client'

import * as React from 'react'
import { ProfileDraft } from '@/types/worker-profile'

interface IdDocumentsStepProps {
  draft: ProfileDraft
  onChange: (partial: Partial<ProfileDraft>) => void
  onNext: () => void
  idToken: string
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

interface UploadZoneProps {
  label: string
  currentUrl: string | null
  preview: string | null
  onFileChange: (file: File) => void
}

function UploadZone({ label, currentUrl, preview, onFileChange }: UploadZoneProps) {
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
            <span className="text-xs text-[#98A2B2]">탭하여 사진 선택</span>
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

// ─── Verified Badge ───────────────────────────────────────────────────────────

function VerificationBadge({ idVerified, hasDocuments }: { idVerified: boolean; hasDocuments: boolean }) {
  if (idVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        인증 완료
      </span>
    )
  }
  if (hasDocuments) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
        검토 중
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-[#98A2B2] border border-[#EFF1F5]">
      미등록
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IdDocumentsStep({ draft, onChange, onNext, idToken }: IdDocumentsStepProps) {
  const [localIdNumber, setLocalIdNumber] = React.useState(draft.idNumber)
  const [frontFile, setFrontFile] = React.useState<File | null>(null)
  const [backFile, setBackFile] = React.useState<File | null>(null)
  const [frontPreview, setFrontPreview] = React.useState<string | null>(null)
  const [backPreview, setBackPreview] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function handleFrontFile(file: File) {
    setFrontFile(file)
    setFrontPreview(URL.createObjectURL(file))
  }

  function handleBackFile(file: File) {
    setBackFile(file)
    setBackPreview(URL.createObjectURL(file))
  }

  const hasDocuments = Boolean(draft.idFrontUrl || draft.idBackUrl || frontFile || backFile)

  async function handleUpload() {
    if (!idToken) return
    setIsUploading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // 신분증 업로드 API는 현재 준비 중입니다.
      setErrorMessage('신분증 업로드 기능은 현재 준비 중입니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#25282A]">신분증 등록</h2>
          <p className="text-sm text-[#98A2B2] mt-1">베트남 신분증 또는 여권을 업로드해주세요.</p>
        </div>
        <VerificationBadge idVerified={draft.idVerified} hasDocuments={hasDocuments} />
      </div>

      {/* Upload zones */}
      <div className="flex gap-3">
        <UploadZone
          label="신분증 앞면"
          currentUrl={draft.idFrontUrl}
          preview={frontPreview}
          onFileChange={handleFrontFile}
        />
        <UploadZone
          label="신분증 뒷면"
          currentUrl={draft.idBackUrl}
          preview={backPreview}
          onFileChange={handleBackFile}
        />
      </div>

      {/* ID number */}
      <div>
        <label htmlFor="idNumber" className="block text-sm font-medium text-[#25282A] mb-1">
          신분증 번호
          <span className="ml-1 text-xs text-[#98A2B2] font-normal">(베트남 ID 또는 여권번호)</span>
        </label>
        <input
          id="idNumber"
          type="text"
          value={localIdNumber}
          onChange={(e) => setLocalIdNumber(e.target.value)}
          placeholder="신분증 번호를 입력하세요"
          className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
        />
      </div>

      {/* Upload button */}
      {(frontFile || backFile || localIdNumber) && !successMessage && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full py-3 rounded-full border border-[#0669F7] text-[#0669F7] font-medium text-sm disabled:opacity-40 hover:bg-blue-50 transition-colors"
        >
          {isUploading ? '업로드 중...' : '서류 제출하기'}
        </button>
      )}

      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-[#ED1C24]">
          {errorMessage}
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onNext}
          className="text-sm text-[#98A2B2] hover:text-[#0669F7] underline-offset-2 hover:underline transition-colors"
        >
          건너뛰기
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          다음
        </button>
      </div>

      {/* Upload overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg">
            <svg className="w-8 h-8 text-[#0669F7] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-[#25282A] font-medium">업로드 중...</p>
          </div>
        </div>
      )}
    </div>
  )
}
