'use client'

import * as React from 'react'
import Link from 'next/link'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient, ApiError } from '@/lib/api/client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkerProfile {
  fullName: string
  dateOfBirth: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | ''
  bio: string
  bankName: string
  bankAccountNumber: string
  primaryTradeId: string
  province: string
  profilePictureUrl: string | null
  idVerified: boolean
  signatureUrl: string | null
}

const EMPTY_PROFILE: WorkerProfile = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  bio: '',
  bankName: '',
  bankAccountNumber: '',
  primaryTradeId: '',
  province: '',
  profilePictureUrl: null,
  idVerified: false,
  signatureUrl: null,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonField() {
  return <div className="h-10 bg-gray-100 rounded-2xl animate-pulse w-full" />
}

function SkeletonForm() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-100 rounded w-24 mb-1 animate-pulse" />
          <SkeletonField />
        </div>
      ))}
      <div className="h-10 bg-gray-100 rounded-full animate-pulse mt-6" />
    </div>
  )
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-md text-sm font-medium text-white transition-all ${
        type === 'success' ? 'bg-green-600' : 'bg-[#D81A48]'
      }`}
    >
      {message}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkerProfileForm({ locale }: { locale: string }) {
  const idToken = getSessionCookie()
  const [profile, setProfile] = React.useState<WorkerProfile>(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ── Fetch profile on mount ────────────────────────────────────────────────

  React.useEffect(() => {
    if (!idToken) return
    setIsLoading(true)
    apiClient<WorkerProfile>('/workers/me', { token: idToken })
      .then(({ data }) => {
        setProfile({
          fullName: data.fullName ?? '',
          dateOfBirth: data.dateOfBirth ?? '',
          gender: data.gender ?? '',
          bio: data.bio ?? '',
          bankName: data.bankName ?? '',
          bankAccountNumber: data.bankAccountNumber ?? '',
          primaryTradeId: data.primaryTradeId ?? '',
          province: data.province ?? '',
          profilePictureUrl: data.profilePictureUrl ?? null,
          idVerified: data.idVerified ?? false,
          signatureUrl: data.signatureUrl ?? null,
        })
      })
      .catch(() => {
        // Profile not yet created — leave empty defaults
      })
      .finally(() => setIsLoading(false))
  }, [idToken])

  // ── Toast auto-hide ───────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idToken) return
    setIsSaving(true)
    try {
      await apiClient('/workers/me', {
        method: 'PUT',
        token: idToken,
        body: JSON.stringify({
          fullName: profile.fullName,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender || null,
          bio: profile.bio || null,
          bankName: profile.bankName || null,
          bankAccountNumber: profile.bankAccountNumber || null,
          primaryTradeId: profile.primaryTradeId || null,
          province: profile.province || null,
        }),
      })
      setToast({ message: '프로필이 저장되었습니다.', type: 'success' })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '저장 중 오류가 발생했습니다.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <h1 className="text-xl font-semibold text-[#25282A] mb-6">프로필</h1>

        {/* Profile picture */}
        {profile.profilePictureUrl && (
          <div className="flex justify-center mb-6">
            <img
              src={profile.profilePictureUrl}
              alt="프로필 사진"
              className="w-24 h-24 rounded-full object-cover border border-[#EFF1F5]"
            />
          </div>
        )}

        {/* Status badges */}
        <div className="flex gap-3 mb-6">
          {/* ID verified badge */}
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              profile.idVerified
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-100 text-[#98A2B2] border border-[#EFF1F5]'
            }`}
          >
            {profile.idVerified ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                신분증 인증 완료
              </>
            ) : (
              '신분증 미인증'
            )}
          </span>

          {/* Signature status */}
          {profile.signatureUrl ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              서명 완료
            </span>
          ) : (
            <Link
              href={`/${locale}/worker/profile/signature`}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-[#98A2B2] border border-[#EFF1F5] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
            >
              서명 등록하기
            </Link>
          )}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
          {isLoading ? (
            <SkeletonForm />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[#25282A] mb-1">
                  이름 <span className="text-[#D81A48]">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={profile.fullName}
                  onChange={handleChange}
                  placeholder="성명을 입력하세요"
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
                />
              </div>

              {/* Date of birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[#25282A] mb-1">
                  생년월일 <span className="text-[#D81A48]">*</span>
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={profile.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-[#25282A] mb-1">
                  성별 <span className="text-[#D81A48]">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  value={profile.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white"
                >
                  <option value="" disabled>
                    성별을 선택하세요
                  </option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-[#25282A] mb-1">
                  자기소개
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  maxLength={500}
                  value={profile.bio}
                  onChange={handleChange}
                  placeholder="간단한 자기소개를 입력하세요 (최대 500자)"
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] resize-none"
                />
                <p className="text-xs text-[#98A2B2] mt-1 text-right">{profile.bio.length}/500</p>
              </div>

              {/* Bank name */}
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-[#25282A] mb-1">
                  은행명
                </label>
                <input
                  id="bankName"
                  name="bankName"
                  type="text"
                  value={profile.bankName}
                  onChange={handleChange}
                  placeholder="예: Vietcombank"
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
                />
              </div>

              {/* Bank account number */}
              <div>
                <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-[#25282A] mb-1">
                  계좌번호
                </label>
                <input
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  type="text"
                  value={profile.bankAccountNumber}
                  onChange={handleChange}
                  placeholder="계좌번호를 입력하세요"
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
                />
              </div>

              {/* Primary trade — TODO: replace with trade selector */}
              <div>
                <label htmlFor="primaryTradeId" className="block text-sm font-medium text-[#25282A] mb-1">
                  주요 직종
                  <span className="ml-1 text-xs text-[#98A2B2] font-normal">(직종 ID)</span>
                </label>
                <input
                  id="primaryTradeId"
                  name="primaryTradeId"
                  type="text"
                  value={profile.primaryTradeId}
                  onChange={handleChange}
                  placeholder="직종 ID를 입력하세요"
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
                />
              </div>

              {/* Province */}
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-[#25282A] mb-1">
                  지역
                </label>
                <input
                  id="province"
                  name="province"
                  type="text"
                  value={profile.province}
                  onChange={handleChange}
                  placeholder="거주 지역을 입력하세요"
                  className="w-full px-3 py-2 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-full bg-[#0669F7] text-white font-medium disabled:opacity-50 mt-2 text-sm hover:bg-blue-700 transition-colors"
              >
                {isSaving ? '저장 중...' : '저장하기'}
              </button>
            </form>
          )}
        </div>

        {/* Sub-page links */}
        <div className="mt-4 space-y-2">
          <Link
            href={`/${locale}/worker/profile/id`}
            className="flex items-center justify-between w-full px-4 py-3 bg-white rounded-2xl shadow-sm border border-[#EFF1F5] text-sm text-[#25282A] hover:border-[#0669F7] transition-colors"
          >
            <span>신분증 등록</span>
            <svg className="w-4 h-4 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href={`/${locale}/worker/profile/signature`}
            className="flex items-center justify-between w-full px-4 py-3 bg-white rounded-2xl shadow-sm border border-[#EFF1F5] text-sm text-[#25282A] hover:border-[#0669F7] transition-colors"
          >
            <span>서명 등록</span>
            <svg className="w-4 h-4 text-[#98A2B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  )
}
