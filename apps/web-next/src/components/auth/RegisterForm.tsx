/**
 * RegisterForm — single-page registration.
 *
 * All fields shown on one screen:
 * - Phone number + "인증번호 발송" button
 * - OTP field slides in inline after sending
 * - Email (optional)
 * - Password + confirm password (required)
 * - "가입 완료" enabled once phone verified + password filled
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PhoneInput } from './PhoneInput'
import { OtpInput } from './OtpInput'
import { setSessionCookie } from '../../lib/auth/session'

// RegisterForm doesn't use useAuth — it makes direct API calls.
// No AuthProvider needed here.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

async function apiFetch<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json()
  if (!res.ok) throw Object.assign(new Error(body.message ?? 'API error'), { status: res.status })
  return body
}

interface RegisterFormProps {
  locale: string
}

export function RegisterForm({ locale }: RegisterFormProps) {
  const router = useRouter()

  // ── State ────────────────────────────────────────────────────────────────
  const [phone,          setPhone]          = React.useState('+84')
  const [otpSent,        setOtpSent]        = React.useState(false)
  const [phoneVerified,  setPhoneVerified]  = React.useState(false)
  const [otp,            setOtp]            = React.useState('')
  const [otpError,       setOtpError]       = React.useState(false)
  const [sessionToken,   setSessionToken]   = React.useState<string | null>(null)

  const [email,          setEmail]          = React.useState('')
  const [password,       setPassword]       = React.useState('')
  const [confirmPw,      setConfirmPw]      = React.useState('')
  const [showPass,       setShowPass]       = React.useState(false)

  const [isLoading,      setIsLoading]      = React.useState(false)
  const [countdown,      setCountdown]      = React.useState(0)
  const [error,          setError]          = React.useState<string | null>(null)
  const [otpFieldError,  setOtpFieldError]  = React.useState<string | null>(null)

  // OTP resend countdown
  React.useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!phone || phone === '+84') { setError('전화번호를 입력해주세요.'); return }
    setError(null)
    setOtpFieldError(null)
    setIsLoading(true)
    try {
      await apiFetch('/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone }) })
      setOtpSent(true)
      setOtp('')
      setOtpError(false)
      setCountdown(60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '인증번호 전송에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp(otpValue?: string) {
    const cleaned = (otpValue ?? otp).replace(/\s/g, '')
    if (cleaned.length < 6) { setOtpError(true); return }
    setOtpFieldError(null)
    setOtpError(false)
    setIsLoading(true)
    try {
      const { data } = await apiFetch<{ data: { devToken?: string; customToken?: string; isNewUser: boolean } }>(
        '/auth/otp/verify',
        { method: 'POST', body: JSON.stringify({ phone, otp: cleaned }) },
      )
      const token = data.devToken ?? data.customToken ?? ''
      setSessionToken(token)
      setPhoneVerified(true)
      setOtpFieldError(null)
    } catch (err: unknown) {
      setOtpError(true)
      setOtpFieldError(err instanceof Error ? err.message : '인증번호가 올바르지 않습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!phoneVerified) { setError('전화번호 인증을 완료해주세요.'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    if (password !== confirmPw) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }

    setIsLoading(true)
    try {
      await apiFetch('/auth/profile', {
        method: 'POST',
        token: sessionToken ?? '',
        body: JSON.stringify({ email: email.trim() || undefined, password }),
      })
      // Set session cookie so middleware lets us into /worker
      setSessionCookie(sessionToken ?? '')
      router.push(`/${locale}/worker`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '프로필 저장에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = phoneVerified && password.length >= 8 && password === confirmPw && !isLoading

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F8FA] flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 text-center border-b border-[#EEEEEE]">
        <h1 className="text-[28px] font-bold leading-[35px] text-[#25282A]">
          회원가입
        </h1>
        <p className="mt-2 text-[15px] text-[#98A2B2]">
          전화번호로 본인 인증 후 가입합니다
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex-1 px-6 py-8 max-w-[480px] mx-auto w-full flex flex-col gap-6">

        {/* ── 전화번호 ──────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[#25282A]">
            전화번호 <span className="text-[#D81A48]">*</span>
          </p>
          <p className="text-[12px] text-[#98A2B2] -mt-1">인증 가능한 휴대폰 번호를 입력해주세요</p>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <PhoneInput
                value={phone}
                onChange={v => { setPhone(v); setOtpSent(false); setPhoneVerified(false); setOtp('') }}
                disabled={isLoading || phoneVerified}
              />
            </div>
            {phoneVerified ? (
              <div className="shrink-0 min-h-[52px] px-4 flex items-center gap-1.5 bg-[#E8F3FF] border border-[#0669F7]/30 rounded-2xl text-[14px] font-semibold text-[#0669F7] whitespace-nowrap">
                <span>✓</span> 인증 완료
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading || !phone || phone === '+84'}
                className="shrink-0 min-h-[52px] px-4 bg-[#0669F7] text-white rounded-2xl text-[14px] font-bold disabled:opacity-40 whitespace-nowrap hover:bg-[#0557D4] transition-colors"
              >
                {isLoading && !otpSent ? '전송 중...' : otpSent ? '재발송' : '인증번호 발송'}
              </button>
            )}
          </div>

          {error && !otpSent && <p className="text-[13px] text-[#D81A48]">{error}</p>}
        </div>

        {/* ── OTP 입력 (인증번호 발송 후 표시) ──────── */}
        {otpSent && !phoneVerified && (
          <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-[#EEEEEE]">
            <div className="text-center">
              <p className="text-[14px] text-[#25282A]">
                <strong>{phone}</strong>으로 인증번호를 전송했습니다
              </p>
              <p className="text-[12px] text-[#98A2B2] mt-0.5">
                개발 환경: <strong className="text-[#0669F7]">999999</strong>
              </p>
            </div>

            <OtpInput
              value={otp}
              onChange={v => { setOtp(v); setOtpError(false); setOtpFieldError(null) }}
              onComplete={handleVerifyOtp}
              error={otpError}
              disabled={isLoading}
            />

            {otpFieldError && (
              <p className="text-center text-[13px] text-[#D81A48]">{otpFieldError}</p>
            )}

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={isLoading || otp.replace(/\s/g, '').length < 6}
              className="w-full min-h-[48px] bg-[#0669F7] text-white rounded-2xl text-[15px] font-bold disabled:opacity-40"
            >
              {isLoading ? '확인 중...' : '인증번호 확인'}
            </button>

            <p className="text-center text-[13px] text-[#98A2B2]">
              {countdown > 0 ? (
                `${countdown}초 후 재발송 가능`
              ) : (
                <button type="button" onClick={handleSendOtp} disabled={isLoading}
                  className="text-[#0669F7] underline">
                  인증번호 재발송
                </button>
              )}
            </p>
          </div>
        )}

        {/* ── 이메일 (선택) ─────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-[#25282A]">
            이메일 <span className="text-[#98A2B2] font-normal text-[12px]">(선택)</span>
          </label>
          <p className="text-[12px] text-[#98A2B2] -mt-1">이메일+비밀번호로도 로그인할 수 있습니다</p>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isLoading}
            placeholder="example@email.com"
            className="min-h-[52px] px-4 rounded-2xl border border-[#EFF1F5] text-[16px] outline-none focus:border-[#0669F7] focus:ring-1 focus:ring-[#0669F7] disabled:bg-[#EFF1F5]"
          />
        </div>

        {/* ── 비밀번호 ──────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-[#25282A]">
            비밀번호 <span className="text-[#D81A48]">*</span>
          </label>
          <p className="text-[12px] text-[#98A2B2] -mt-1">8자 이상 입력해주세요</p>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full min-h-[52px] px-4 pr-12 rounded-2xl border border-[#EFF1F5] text-[16px] outline-none focus:border-[#0669F7] focus:ring-1 focus:ring-[#0669F7] disabled:bg-[#EFF1F5]"
            />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B2] p-1">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── 비밀번호 확인 ────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-[#25282A]">
            비밀번호 확인 <span className="text-[#D81A48]">*</span>
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            disabled={isLoading}
            className={[
              'min-h-[52px] px-4 rounded-2xl border text-[16px] outline-none',
              'focus:border-[#0669F7] focus:ring-1 focus:ring-[#0669F7] disabled:bg-[#EFF1F5]',
              confirmPw && password !== confirmPw ? 'border-[#D81A48]' : 'border-[#EFF1F5]',
            ].join(' ')}
          />
          {confirmPw && password !== confirmPw && (
            <p className="text-[12px] text-[#D81A48]">비밀번호가 일치하지 않습니다</p>
          )}
        </div>

        {error && <p className="text-[13px] text-[#D81A48]">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full min-h-[52px] bg-[#0669F7] text-white rounded-2xl text-[16px] font-bold disabled:opacity-40 hover:bg-[#0557D4] transition-colors mt-2"
        >
          {isLoading ? '처리 중...' : '가입 완료'}
        </button>

        <p className="text-center text-[14px] text-[#98A2B2]">
          이미 계정이 있으신가요?{' '}
          <a href={`/${locale}/login`} className="text-[#0669F7] font-medium">로그인</a>
        </p>

      </form>
    </div>
  )
}
