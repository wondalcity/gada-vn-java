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
import { PhoneInput, validatePhone } from './PhoneInput'
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
  const [name,          setName]          = React.useState('')
  const [phone,         setPhone]         = React.useState('+84')
  const [otpSent,       setOtpSent]       = React.useState(false)
  const [otp,           setOtp]           = React.useState('')
  const [otpError,      setOtpError]      = React.useState(false)
  const [countdown,     setCountdown]     = React.useState(0)
  const [isLoading,          setIsLoading]          = React.useState(false)
  const [error,              setError]              = React.useState<string | null>(null)
  const [otpFieldError,      setOtpFieldError]      = React.useState<string | null>(null)
  const [alreadyRegistered,  setAlreadyRegistered]  = React.useState(false)

  React.useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name || name.trim().length < 2) {
      setError(name ? t('register.name_too_short') : t('register.name_required'))
      return
    }
    if (!phone || phone === '+84') { setError(t('otp.phone_required')); return }
    const phoneErr = validatePhone(phone)
    if (phoneErr) { setError(t(phoneErr as Parameters<typeof t>[0])); return }
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

  async function handleGoogle() {
    setError(null)
    setIsLoading(true)
    try {
      const { signInWithGoogle } = await import('../../lib/firebase/auth')
      const { idToken, displayName, email } = await signInWithGoogle()

      await apiFetch('/auth/verify-token', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          name: displayName || undefined,
          email: email || undefined,
        }),
      })

      const { setSessionCookie } = await import('../../lib/auth/session')
      setSessionCookie(idToken)
      window.location.href = `/${locale}/worker`
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('login.google_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFacebook() {
    setError(null)
    setIsLoading(true)
    try {
      const { signInWithFacebook } = await import('../../lib/firebase/auth')
      const { idToken, displayName, email } = await signInWithFacebook()

      await apiFetch('/auth/social/facebook', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          name: displayName || undefined,
          email: email || undefined,
        }),
      })

      setSessionCookie(idToken)
      window.location.href = `/${locale}/worker`
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('login.facebook_failed'))
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

      // Upsert user in DB — response: { statusCode, data: { user, isNew } }
      const result = await apiFetch<{ statusCode: number; data: { user: unknown; isNew: boolean } }>('/auth/verify-token', {
        method: 'POST',
        body: JSON.stringify({ idToken, name }),
      })

      if (!result.data.isNew) {
        // Already registered — show popup, do NOT set session
        setAlreadyRegistered(true)
        return
      }

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
    <div className="bg-[#F8F8FA] flex flex-col">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container-register" />

      {/* Already registered modal */}
      {alreadyRegistered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[320px] rounded-2xl bg-white px-6 py-8 flex flex-col items-center gap-6 shadow-xl">
            <p className="text-center text-[15px] text-[#25282A] leading-relaxed">
              {t('register.already_registered')}
            </p>
            <button
              type="button"
              onClick={() => { window.location.href = `/${locale}/login` }}
              className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-sm font-bold"
            >
              {t('register.already_registered_confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Page header — logo + title + subtitle */}
      <div className="bg-white px-6 py-8 text-center border-b border-[#EEEEEE] flex flex-col items-center">
        <img src="/logo.png" alt="GADA VN" className="h-12 w-auto mb-3" />
        <h1 className="text-[22px] font-bold text-[#25282A]">{t('register.title')}</h1>
        <p className="mt-2 text-[15px] text-[#98A2B2]">{t('register.subtitle_phone')}</p>
      </div>

      <div className="px-6 py-8 max-w-[480px] mx-auto w-full flex flex-col gap-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}
      >

        {/* ── 이름 */}
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[#25282A]">
            {t('register.name_label')} <span className="text-[#ED1C24]">*</span>
          </p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isLoading}
            placeholder={t('register.name_placeholder')}
            autoComplete="name"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className="h-14 px-4 border border-[#EFF1F5] rounded-2xl text-[16px] focus:outline-none focus:ring-2 focus:ring-[#0669F7] disabled:opacity-50"
          />
        </div>

        {/* ── 전화번호 ──────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[#25282A]">
            {t('register.phone_label')} <span className="text-[#ED1C24]">*</span>
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
              className="shrink-0 h-14 px-4 bg-[#0669F7] text-white rounded-2xl text-sm font-bold disabled:opacity-40 whitespace-nowrap hover:bg-[#0557D4] transition-colors"
            >
              {isLoading && !otpSent ? t('register.sending') : otpSent ? t('register.resend') : t('register.send_otp')}
            </button>
          </div>

          {error && <p className="text-[13px] text-[#ED1C24]">{error}</p>}
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
              <p className="text-center text-[13px] text-[#ED1C24]">{otpFieldError}</p>
            )}
            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={isLoading || otp.replace(/\s/g, '').length < 6}
              className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-sm font-bold disabled:opacity-40"
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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#EFF1F5]" />
          <span className="text-[13px] text-[#98A2B2]">{t('login.or')}</span>
          <div className="flex-1 h-px bg-[#EFF1F5]" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full h-14 flex items-center justify-center gap-2 border border-[#EFF1F5] rounded-2xl bg-white text-[16px] font-bold text-[#25282A] hover:bg-[#F2F4F5] transition-colors disabled:opacity-40"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
            <path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16.3 19.3 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2c-7.7 0-14.4 4.3-17.7 10.7z"/>
            <path fill="#FBBC05" d="M24 46c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3C29.6 37.6 26.9 38.5 24 38.5c-6 0-10.6-3.9-11.7-9.2L5.5 34c3.2 6.1 9.7 10 18.5 10z"/>
            <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-0.8 2.9-2.7 5.4-5.2 7l6.5 5.3C41 36.8 44.5 30.9 44.5 24c0-1.3-.2-2.7-.5-4z"/>
          </svg>
          {t('login.google_login')}
        </button>

        <button
          type="button"
          onClick={handleFacebook}
          disabled={isLoading}
          className="w-full h-14 flex items-center justify-center gap-2 border border-[#EFF1F5] rounded-2xl bg-white text-[16px] font-bold text-[#25282A] hover:bg-[#F2F4F5] transition-colors disabled:opacity-40"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="#1877F2">
            <path d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987H5.898V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z"/>
          </svg>
          {t('login.facebook_login')}
        </button>

        <p className="text-center text-[14px] text-[#98A2B2]">
          {t('register.already_account')}{' '}
          <a href={`/${locale}/login`} className="text-[#0669F7] font-medium">{t('register.login_link')}</a>
        </p>

      </div>
    </div>
  )
}
