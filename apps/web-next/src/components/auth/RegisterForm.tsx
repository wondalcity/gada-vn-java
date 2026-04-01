/**
 * RegisterForm — new user registration.
 *
 * Flow:
 * 1. Enter phone → Firebase SMS OTP sent
 * 2. Verify OTP → Firebase ID Token obtained → user created in DB
 * 3. Redirect to /worker (email/password can be added in profile settings later)
 */

'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PhoneInput } from './PhoneInput'
import { OtpInput } from './OtpInput'
import { setSessionCookie } from '../../lib/auth/session'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  })
  const body = await res.json()
  if (!res.ok) throw Object.assign(new Error(body.message ?? 'API error'), { status: res.status })
  return body
}

interface RegisterFormProps {
  locale: string
}

export function RegisterForm({ locale }: RegisterFormProps) {
  const t = useTranslations('auth')
  const [phone,         setPhone]         = React.useState('+84')
  const [otpSent,       setOtpSent]       = React.useState(false)
  const [otp,           setOtp]           = React.useState('')
  const [otpError,      setOtpError]      = React.useState(false)
  const [countdown,     setCountdown]     = React.useState(0)
  const [isLoading,     setIsLoading]     = React.useState(false)
  const [error,         setError]         = React.useState<string | null>(null)
  const [otpFieldError, setOtpFieldError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!phone || phone === '+84') { setError(t('otp.phone_required')); return }
    setError(null); setOtpFieldError(null)
    setIsLoading(true)
    try {
      const { sendFirebaseOtp } = await import('../../lib/firebase/auth')
      await sendFirebaseOtp(phone, 'recaptcha-container-register')
      setOtpSent(true)
      setOtp('')
      setOtpError(false)
      setCountdown(60)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[register sendOtp error]', err)
      setError(msg || t('otp.send_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp(otpValue?: string) {
    const cleaned = (otpValue ?? otp).replace(/\s/g, '')
    if (cleaned.length < 6) { setOtpError(true); return }
    setOtpFieldError(null); setOtpError(false)
    setIsLoading(true)
    try {
      const { confirmFirebaseOtp } = await import('../../lib/firebase/auth')
      const idToken = await confirmFirebaseOtp(cleaned)

      // Upsert user in DB
      await apiFetch('/auth/verify-token', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      })

      setSessionCookie(idToken)
      window.location.href = `/${locale}/worker`
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[register verifyOtp error]', err)
      setOtpError(true)
      setOtpFieldError(msg || t('otp.invalid'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8FA] flex flex-col">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container-register" />

      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 text-center border-b border-[#EEEEEE]">
        <h1 className="text-[28px] font-bold leading-[35px] text-[#25282A]">{t('register.title')}</h1>
        <p className="mt-2 text-[15px] text-[#98A2B2]">{t('register.subtitle_phone')}</p>
      </div>

      <div className="flex-1 px-6 py-8 max-w-[480px] mx-auto w-full flex flex-col gap-6">

        {/* ── 전화번호 ──────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[#25282A]">
            {t('register.phone_label')} <span className="text-[#D81A48]">*</span>
          </p>
          <p className="text-[12px] text-[#98A2B2] -mt-1">{t('register.phone_hint')}</p>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <PhoneInput
                value={phone}
                onChange={v => { setPhone(v); setOtpSent(false); setOtp('') }}
                disabled={isLoading}
              />
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isLoading || !phone || phone === '+84'}
              className="shrink-0 min-h-[52px] px-4 bg-[#0669F7] text-white rounded-2xl text-[14px] font-bold disabled:opacity-40 whitespace-nowrap hover:bg-[#0557D4] transition-colors"
            >
              {isLoading && !otpSent ? t('register.sending') : otpSent ? t('register.resend') : t('register.send_otp')}
            </button>
          </div>

          {error && <p className="text-[13px] text-[#D81A48]">{error}</p>}
        </div>

        {/* ── OTP 입력 ──────────────────────────────── */}
        {otpSent && (
          <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-[#EEEEEE]">
            <p className="text-center text-[14px] text-[#25282A]">
              {t('register.otp_sent_to', { phone })}
            </p>
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
              {isLoading ? t('register.verifying') : t('register.verify_button')}
            </button>
            <p className="text-center text-[13px] text-[#98A2B2]">
              {countdown > 0 ? t('otp.resend_in', { seconds: countdown }) : (
                <button type="button" onClick={handleSendOtp} disabled={isLoading}
                  className="text-[#0669F7] underline">
                  {t('register.resend_link')}
                </button>
              )}
            </p>
          </div>
        )}

        <p className="text-center text-[14px] text-[#98A2B2]">
          {t('register.already_account')}{' '}
          <a href={`/${locale}/login`} className="text-[#0669F7] font-medium">{t('register.login_link')}</a>
        </p>

      </div>
    </div>
  )
}
