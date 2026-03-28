/**
 * LoginForm — client component for the login page.
 *
 * Two auth methods:
 * 1. Phone OTP — primary method for Vietnamese workers
 * 2. Email + password — only if the user registered an email+password
 * 3. Facebook — social login via Firebase OAuth
 *
 * Error handling:
 * - EMAIL_NOT_REGISTERED → "전화번호로 로그인해 주세요."
 * - PHONE_ACCOUNT (email exists but no password) → "전화번호로 로그인해 주세요."
 * - FACEBOOK_ACCOUNT (email exists, no phone, no password) → "페이스북으로 로그인해주세요."
 * - Facebook login with no phone on account → inline phone verification step
 */

'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PhoneInput } from './PhoneInput'
import { OtpInput } from './OtpInput'
import { AuthProvider, useAuth } from '../../hooks/useAuth'
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

type LoginTab  = 'phone' | 'email'
type LoginStep = 'input' | 'otp' | 'fb_phone' | 'fb_otp'

interface LoginFormInnerProps {
  locale: string
  redirectTo?: string
}

function LoginFormInner({ locale, redirectTo }: LoginFormInnerProps) {
  const t    = useTranslations('auth')
  const auth = useAuth()

  // ── State ────────────────────────────────────────────────────────────────
  const [tab,      setTab]      = React.useState<LoginTab>('phone')
  const [step,     setStep]     = React.useState<LoginStep>('input')

  // Phone OTP
  const [phone,    setPhone]    = React.useState('+84')
  const [otp,      setOtp]      = React.useState('')
  const [otpError, setOtpError] = React.useState(false)
  const [countdown, setCountdown] = React.useState(0)

  // Email/password
  const [email,    setEmail]    = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPass, setShowPass] = React.useState(false)

  // Facebook phone verification (after Facebook login, phone missing)
  const [fbToken,  setFbToken]  = React.useState<string | null>(null)
  const [fbPhone,  setFbPhone]  = React.useState('+84')
  const [fbOtp,    setFbOtp]    = React.useState('')
  const [fbOtpError, setFbOtpError] = React.useState(false)
  const [fbCountdown, setFbCountdown] = React.useState(0)

  const [isLoading, setIsLoading] = React.useState(false)
  const [error,     setError]     = React.useState<string | null>(null)
  const [alertMsg,  setAlertMsg]  = React.useState<string | null>(null)

  // ── Countdown timers ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  React.useEffect(() => {
    if (fbCountdown <= 0) return
    const t = setInterval(() => setFbCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [fbCountdown])

  // ── Phone OTP handlers ────────────────────────────────────────────────────

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!phone || phone === '+84') { setError(t('otp.phone_required')); return }
    setError(null)
    setIsLoading(true)
    try {
      await auth.sendOtp(phone)
      setStep('otp')
      setCountdown(60)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('429') || msg.includes('TOO_MANY')
        ? t('otp.rate_limited')
        : t('otp.send_failed'))
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
      await auth.verifyOtp(phone, otp.replace(/\s/g, ''), redirectTo)
    } catch (err: unknown) {
      setOtpError(true)
      setError(t('otp.invalid'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Email login handler ───────────────────────────────────────────────────

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setAlertMsg(null)
    setIsLoading(true)
    try {
      await auth.loginEmail(email, password, redirectTo)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'EMAIL_NOT_REGISTERED' || msg === 'PHONE_ACCOUNT') {
        // Account has no email registered or uses phone auth
        setAlertMsg('전화번호로 로그인해 주세요.')
      } else if (msg === 'FACEBOOK_ACCOUNT') {
        // Account was created via Facebook OAuth
        setAlertMsg('페이스북으로 로그인해 주세요.')
      } else if (msg === 'INVALID_CREDENTIALS') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError(t('login.failed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Facebook login handler ────────────────────────────────────────────────

  async function handleFacebook() {
    setError(null); setAlertMsg(null)
    setIsLoading(true)
    try {
      // Firebase Facebook auth → gets idToken
      const { idToken } = await (await import('../../lib/firebase/auth')).signInWithFacebook()

      // Backend: upsert user, returns needsPhone flag
      const { data } = await apiFetch<{
        data: { devToken?: string; customToken?: string; isNewUser: boolean; needsPhone: boolean }
      }>('/auth/social/facebook', { method: 'POST', body: JSON.stringify({ idToken }) })

      const sessionToken = data.devToken ?? data.customToken ?? ''

      if (data.needsPhone) {
        // Facebook user has no phone → collect it before completing login
        setFbToken(sessionToken)
        setStep('fb_phone')
      } else {
        // Phone already on file → complete login
        setSessionCookie(sessionToken)
        if (data.isNewUser) {
          window.location.href = `/${locale}/register`
        } else {
          window.location.href = redirectTo ?? `/${locale}/worker`
        }
      }
    } catch {
      setError(t('login.facebook_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Facebook phone verification handlers ─────────────────────────────────

  async function handleFbSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!fbPhone || fbPhone === '+84') { setError('전화번호를 입력해주세요.'); return }
    setError(null)
    setIsLoading(true)
    try {
      await apiFetch('/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone: fbPhone }) })
      setStep('fb_otp')
      setFbCountdown(60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '인증번호 전송에 실패했습니다.')
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
      // Verify OTP → links phone to the Facebook session account
      await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: fbPhone, otp: cleaned }),
      })
      // Complete login with Facebook token
      setSessionCookie(fbToken ?? '')
      window.location.href = redirectTo ?? `/${locale}/worker`
    } catch {
      setFbOtpError(true)
      setError('인증번호가 올바르지 않습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Facebook phone collection screens
  if (step === 'fb_phone' || step === 'fb_otp') {
    return (
      <div className="min-h-screen bg-[#F8F8FA] flex flex-col">
        <div className="bg-white px-6 pt-12 pb-6 text-center border-b border-[#EFF1F5]">
          <h1 className="text-[24px] font-bold text-[#25282A]">전화번호 인증</h1>
          <p className="mt-2 text-[14px] text-[#98A2B2]">
            Facebook 계정의 보안을 위해 전화번호 인증이 필요합니다
          </p>
        </div>

        <div className="flex-1 px-6 py-8 max-w-[480px] mx-auto w-full flex flex-col gap-6">
          {step === 'fb_phone' && (
            <form onSubmit={handleFbSendOtp} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-semibold text-[#25282A]">
                  전화번호 <span className="text-[#D81A48]">*</span>
                </p>
                <PhoneInput value={fbPhone} onChange={setFbPhone} disabled={isLoading} />
              </div>
              {error && <p className="text-[13px] text-[#D81A48]">{error}</p>}
              <button
                type="submit"
                disabled={isLoading || !fbPhone || fbPhone === '+84'}
                className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-[16px] font-bold disabled:opacity-40"
              >
                {isLoading ? '전송 중...' : '인증번호 발송'}
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
                번호 다시 입력
              </button>
              <p className="text-center text-[14px] text-[#25282A]">
                <strong>{fbPhone}</strong>으로 인증번호를 전송했습니다
              </p>
              <p className="text-center text-[12px] text-[#98A2B2]">
                개발 환경: <strong className="text-[#0669F7]">999999</strong>
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
                {isLoading ? '확인 중...' : '인증 완료'}
              </button>
              <p className="text-center text-[13px] text-[#98A2B2]">
                {fbCountdown > 0 ? `${fbCountdown}초 후 재발송 가능` : (
                  <button type="button" onClick={handleFbSendOtp} disabled={isLoading} className="text-[#0669F7] underline">
                    인증번호 재발송
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
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 text-center">
        <h1 className="text-[28px] font-bold leading-[35px] text-[#25282A]">GADA VN</h1>
        <p className="mt-2 text-[16px] leading-[24px] text-[#98A2B2]">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="flex-1 px-6 py-6 max-w-[480px] mx-auto w-full flex flex-col gap-5">

        {/* Tab selector */}
        {step === 'input' && (
          <div className="flex bg-[#EFF1F5] rounded-xl p-1">
            {(['phone', 'email'] as LoginTab[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => { setTab(tabKey); setError(null); setAlertMsg(null) }}
                className={[
                  'flex-1 py-2.5 text-[14px] font-bold rounded-lg transition-colors duration-150',
                  tab === tabKey
                    ? 'bg-white text-[#0669F7]'
                    : 'text-[#98A2B2] hover:text-[#25282A]',
                ].join(' ')}
              >
                {tabKey === 'phone' ? t('login.phone_tab') : t('login.email_tab')}
              </button>
            ))}
          </div>
        )}

        {/* ── 전화번호 OTP ────────────────────────── */}
        {tab === 'phone' && step === 'input' && (
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
              {isLoading ? '전송 중...' : t('login.send_otp')}
            </button>
          </form>
        )}

        {/* ── OTP 입력 ────────────────────────────── */}
        {tab === 'phone' && step === 'otp' && (
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
              <p className="text-[12px] text-[#98A2B2] mt-1">
                개발 환경: <strong className="text-[#0669F7]">999999</strong>
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
              {isLoading ? '확인 중...' : t('otp.verify_button')}
            </button>
            <p className="text-center text-[14px] text-[#98A2B2]">
              {countdown > 0 ? `${countdown}초 후 재발송 가능` : (
                <button type="button" onClick={() => handleSendOtp()} disabled={isLoading}
                  className="text-[#0669F7] font-medium underline">
                  {t('otp.resend')}
                </button>
              )}
            </p>
          </form>
        )}

        {/* ── 이메일+비밀번호 ──────────────────────── */}
        {tab === 'email' && step === 'input' && (
          <form onSubmit={handleEmailLogin} noValidate className="flex flex-col gap-4">
            {/* Alert banner */}
            {alertMsg && (
              <div className="flex items-start gap-3 p-4 bg-[#FFF6F0] border border-[#F5A623]/40 rounded-2xl">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
                  <path d="M9 2L16.5 15H1.5L9 2z" stroke="#F5A623" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M9 7v4M9 12.5v.5" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p className="text-[14px] text-[#7A4A00] font-medium">{alertMsg}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#25282A]">{t('login.email_label')}</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setAlertMsg(null) }}
                disabled={isLoading}
                placeholder="example@email.com"
                className="min-h-[52px] px-4 rounded-2xl border border-[#EFF1F5] text-[16px] outline-none focus:border-[#0669F7] focus:ring-1 focus:ring-[#0669F7] disabled:bg-[#EFF1F5]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#25282A]">{t('login.password_label')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setAlertMsg(null) }}
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

            {error && <p className="text-[13px] text-[#D81A48]">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-14 bg-[#0669F7] text-white rounded-2xl text-[16px] font-bold disabled:opacity-40 hover:bg-[#0554D6] transition-colors"
            >
              {isLoading ? '로그인 중...' : t('login.login_button')}
            </button>

            <p className="text-[12px] text-[#98A2B2] text-center">
              이메일+비밀번호 로그인은 회원가입 시 이메일을 등록한 경우에만 사용 가능합니다
            </p>
          </form>
        )}

        {/* ── 구분선 ───────────────────────────────── */}
        {step === 'input' && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#EFF1F5]" />
              <span className="text-[13px] text-[#98A2B2]">{t('login.or')}</span>
              <div className="flex-1 h-px bg-[#EFF1F5]" />
            </div>

            {/* Facebook login */}
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

        {/* Register link */}
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

// ─── Exported component — wraps with AuthProvider ────────────────────────────

export interface LoginFormProps {
  locale: string
  redirectTo?: string
}

export function LoginForm({ locale, redirectTo }: LoginFormProps) {
  return (
    <AuthProvider locale={locale}>
      <LoginFormInner locale={locale} redirectTo={redirectTo} />
    </AuthProvider>
  )
}
