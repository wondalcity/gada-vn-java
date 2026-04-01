/**
 * LoginForm — client component for the login page.
 *
 * Auth methods:
 * 1. Phone OTP — primary method (Firebase phone auth)
 * 2. Facebook — social login via Firebase OAuth
 *    → If Facebook account has a phone number: login immediately
 *    → If no phone number: collect + verify phone via OTP before completing login
 */

'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PhoneInput } from './PhoneInput'
import { OtpInput } from './OtpInput'
import { setSessionCookie } from '../../lib/auth/session'

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

type LoginStep = 'input' | 'otp' | 'fb_phone' | 'fb_otp'

interface LoginFormInnerProps {
  locale: string
  redirectTo?: string
}

function LoginFormInner({ locale, redirectTo }: LoginFormInnerProps) {
  const t = useTranslations('auth')

  const [step, setStep] = React.useState<LoginStep>('input')

  // Phone OTP
  const [phone,     setPhone]     = React.useState('+84')
  const [otp,       setOtp]       = React.useState('')
  const [otpError,  setOtpError]  = React.useState(false)
  const [countdown, setCountdown] = React.useState(0)

  // Facebook phone verification (after Facebook login, phone missing)
  const [fbToken,      setFbToken]      = React.useState<string | null>(null)
  const [fbPhone,      setFbPhone]      = React.useState('+84')
  const [fbOtp,        setFbOtp]        = React.useState('')
  const [fbOtpError,   setFbOtpError]   = React.useState(false)
  const [fbCountdown,  setFbCountdown]  = React.useState(0)

  const [isLoading, setIsLoading] = React.useState(false)
  const [error,     setError]     = React.useState<string | null>(null)

  // ── Countdown timers ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  React.useEffect(() => {
    if (fbCountdown <= 0) return
    const timer = setInterval(() => setFbCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [fbCountdown])

  // ── Phone OTP handlers ────────────────────────────────────────────────────

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!phone || phone === '+84') { setError(t('otp.phone_required')); return }
    setError(null)
    setIsLoading(true)
    try {
      const { sendFirebaseOtp } = await import('../../lib/firebase/auth')
      await sendFirebaseOtp(phone, 'recaptcha-container')
      setStep('otp')
      setCountdown(60)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[sendFirebaseOtp error]', err)
      setError(msg || t('otp.send_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (otp.replace(/\s/g, '').length < 6) { setOtpError(true); return }
    setError(null); setOtpError(false)
    setIsLoading(true)
    try {
      const { confirmFirebaseOtp } = await import('../../lib/firebase/auth')
      const idToken = await confirmFirebaseOtp(otp.replace(/\s/g, ''))

      const { data } = await apiFetch<{ statusCode: number; data: { isNew: boolean } }>(
        '/auth/verify-token',
        { method: 'POST', body: JSON.stringify({ idToken }) },
      )

      setSessionCookie(idToken)
      if (data.isNew) {
        window.location.href = `/${locale}/worker`
      } else {
        window.location.href = redirectTo ?? `/${locale}/worker`
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[verifyOtp error]', err)
      setOtpError(true)
      setError(msg || t('otp.invalid'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Facebook login handler ────────────────────────────────────────────────

  async function handleFacebook() {
    setError(null)
    setIsLoading(true)
    try {
      const { idToken } = await (await import('../../lib/firebase/auth')).signInWithFacebook()

      const { data } = await apiFetch<{
        data: { devToken?: string; isNewUser: boolean; needsPhone: boolean }
      }>('/auth/social/facebook', { method: 'POST', body: JSON.stringify({ idToken }) })

      const sessionToken = data.devToken ?? idToken

      if (data.needsPhone) {
        // Facebook user has no phone → collect it before completing login
        setFbToken(sessionToken)
        setStep('fb_phone')
      } else {
        setSessionCookie(sessionToken)
        window.location.href = redirectTo ?? `/${locale}/worker`
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Facebook login error]', err)
      setError(msg || t('login.facebook_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Facebook phone verification handlers ─────────────────────────────────

  async function handleFbSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!fbPhone || fbPhone === '+84') { setError(t('otp.phone_required')); return }
    setError(null)
    setIsLoading(true)
    try {
      const { sendFirebaseOtp } = await import('../../lib/firebase/auth')
      await sendFirebaseOtp(fbPhone, 'recaptcha-container-fb')
      setStep('fb_otp')
      setFbCountdown(60)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[fbSendOtp error]', err)
      setError(msg || t('otp.send_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFbVerifyOtp(otpValue?: string) {
    const cleaned = (otpValue ?? fbOtp).replace(/\s/g, '')
    if (cleaned.length < 6) { setFbOtpError(true); return }
    setFbOtpError(false); setError(null)
    setIsLoading(true)
    try {
      const { confirmFirebaseOtp } = await import('../../lib/firebase/auth')
      const phoneIdToken = await confirmFirebaseOtp(cleaned)
      await apiFetch('/auth/social/link-phone', {
        method: 'POST',
        token: fbToken ?? '',
        body: JSON.stringify({ phoneIdToken }),
      })
      setSessionCookie(fbToken ?? '')
      window.location.href = redirectTo ?? `/${locale}/worker`
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[fbVerifyOtp error]', err)
      setFbOtpError(true)
      setError(msg || t('otp.invalid'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Facebook phone collection screens
  if (step === 'fb_phone' || step === 'fb_otp') {
    return (
      <div className="min-h-screen bg-[#F8F8FA] flex flex-col">
        <div id="recaptcha-container-fb" />
        <div className="bg-white px-6 pt-12 pb-6 text-center border-b border-[#EFF1F5]">
          <h1 className="text-[24px] font-bold text-[#25282A]">{t('login.fb_phone_title')}</h1>
          <p className="mt-2 text-[14px] text-[#98A2B2]">
            {t('login.fb_phone_subtitle')}
          </p>
        </div>

        <div className="flex-1 px-6 py-8 max-w-[480px] mx-auto w-full flex flex-col gap-6">
          {step === 'fb_phone' && (
            <form onSubmit={handleFbSendOtp} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-semibold text-[#25282A]">
                  {t('login.fb_phone_label')} <span className="text-[#D81A48]">*</span>
                </p>
                <PhoneInput value={fbPhone} onChange={setFbPhone} disabled={isLoading} />
              </div>
              {error && <p className="text-[13px] text-[#D81A48]">{error}</p>}
              <button
                type="submit"
                disabled={isLoading || !fbPhone || fbPhone === '+84'}
                className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-[16px] font-bold disabled:opacity-40"
              >
                {isLoading ? t('otp.sending') : t('login.fb_send_otp')}
              </button>
            </form>
          )}

          {step === 'fb_otp' && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setStep('fb_phone'); setFbOtp(''); setFbOtpError(false) }}
                className="flex items-center gap-1.5 text-[14px] text-[#98A2B2]"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('login.fb_back')}
              </button>
              <p className="text-center text-[14px] text-[#25282A]">
                {t('login.fb_otp_sent_to', { phone: fbPhone })}
              </p>
              <OtpInput
                value={fbOtp}
                onChange={v => { setFbOtp(v); setFbOtpError(false) }}
                onComplete={handleFbVerifyOtp}
                error={fbOtpError}
                disabled={isLoading}
              />
              {error && <p className="text-center text-[13px] text-[#D81A48]">{error}</p>}
              <button
                type="button"
                onClick={() => handleFbVerifyOtp()}
                disabled={isLoading || fbOtp.replace(/\s/g, '').length < 6}
                className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-[16px] font-bold disabled:opacity-40"
              >
                {isLoading ? t('otp.verifying') : t('login.fb_verify')}
              </button>
              <p className="text-center text-[13px] text-[#98A2B2]">
                {fbCountdown > 0 ? t('otp.resend_in', { seconds: fbCountdown }) : (
                  <button type="button" onClick={handleFbSendOtp} disabled={isLoading} className="text-[#0669F7] underline">
                    {t('login.fb_resend')}
                  </button>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F4F5] flex flex-col">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />

      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 text-center">
        <h1 className="text-[28px] font-bold leading-[35px] text-[#25282A]">GADA VN</h1>
        <p className="mt-2 text-[16px] leading-[24px] text-[#98A2B2]">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="flex-1 px-6 py-6 max-w-[480px] mx-auto w-full flex flex-col gap-5">

        {/* ── 전화번호 입력 ────────────────────────── */}
        {step === 'input' && (
          <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-4">
            <PhoneInput
              label={t('login.phone_label')}
              value={phone}
              onChange={setPhone}
              error={error ?? undefined}
              disabled={isLoading}
            />
            {error && <p className="text-[13px] text-[#D81A48]">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || !phone || phone === '+84'}
              className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-[16px] font-bold disabled:opacity-40 hover:bg-[#0554D6] transition-colors"
            >
              {isLoading ? t('otp.sending') : t('login.send_otp')}
            </button>
          </form>
        )}

        {/* ── OTP 입력 ────────────────────────────── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-6">
            <button
              type="button"
              onClick={() => { setStep('input'); setOtp(''); setError(null); setOtpError(false) }}
              className="flex items-center gap-1.5 text-[14px] text-[#98A2B2] hover:text-[#25282A]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('otp.back')}
            </button>
            <div className="text-center">
              <p className="text-[16px] text-[#25282A]">
                {t('otp.sent_to')} <strong>{phone}</strong>
              </p>
            </div>
            <OtpInput
              value={otp}
              onChange={v => { setOtp(v); setOtpError(false) }}
              onComplete={() => handleVerifyOtp()}
              error={otpError}
              disabled={isLoading}
            />
            {error && <p className="text-center text-[13px] text-[#D81A48]">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || otp.replace(/\s/g, '').length < 6}
              className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-[16px] font-bold disabled:opacity-40"
            >
              {isLoading ? t('otp.verifying') : t('otp.verify_button')}
            </button>
            <p className="text-center text-[14px] text-[#98A2B2]">
              {countdown > 0 ? t('otp.resend_in', { seconds: countdown }) : (
                <button type="button" onClick={() => handleSendOtp()} disabled={isLoading}
                  className="text-[#0669F7] font-medium underline">
                  {t('otp.resend')}
                </button>
              )}
            </p>
          </form>
        )}

        {/* ── 구분선 + 페이스북 ─────────────────────── */}
        {step === 'input' && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#EFF1F5]" />
              <span className="text-[13px] text-[#98A2B2]">{t('login.or')}</span>
              <div className="flex-1 h-px bg-[#EFF1F5]" />
            </div>

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
          </>
        )}

        {/* 회원가입 링크 */}
        {step === 'input' && (
          <p className="text-center text-[14px] text-[#98A2B2]">
            {t('login.no_account')}{' '}
            <a href={`/${locale}/register`} className="text-[#0669F7] font-medium">
              {t('login.register_link')}
            </a>
          </p>
        )}

      </div>
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

export interface LoginFormProps {
  locale: string
  redirectTo?: string
}

export function LoginForm({ locale, redirectTo }: LoginFormProps) {
  return <LoginFormInner locale={locale} redirectTo={redirectTo} />
}
