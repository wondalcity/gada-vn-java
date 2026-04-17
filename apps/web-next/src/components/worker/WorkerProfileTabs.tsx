'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { getSessionCookie, clearSessionCookie } from '@/lib/auth/session'
import { getGoogleMapsLoader } from '@/lib/maps/loader'
import { PhoneInput, validatePhone } from '@/components/auth/PhoneInput'
import { DatePicker } from '@/components/ui/DatePicker'
import { useAlert } from '@/context/alert'

const API_BASE = '/api/v1'
const CDN_DOMAIN = process.env.NEXT_PUBLIC_CDN_DOMAIN ?? ''

function toCdnUrl(urlOrKey: string | null): string | null {
  if (!urlOrKey) return null
  if (urlOrKey.startsWith('http') || urlOrKey.startsWith('blob:') || urlOrKey.startsWith('data:')) return urlOrKey
  if (!CDN_DOMAIN) return urlOrKey
  const base = CDN_DOMAIN.startsWith('http') ? CDN_DOMAIN : `https://${CDN_DOMAIN}`
  return `${base}/${urlOrKey}`
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Trade { id: number; nameKo: string; nameVi: string; nameEn?: string }
interface TradeSkill { trade_id: number; years: number; name_ko: string; name_vi: string }

interface WorkerProfile {
  full_name: string
  date_of_birth: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  bio: string | null
  primary_trade_id: number | null
  trade_name_ko: string | null
  experience_months: number
  current_province: string | null
  current_district: string | null
  lat: string | null
  lng: string | null
  id_number: string | null
  id_verified: boolean
  id_front_url: string | null
  id_back_url: string | null
  signature_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_book_url: string | null
  profile_image_url: string | null
  terms_accepted: boolean
  privacy_accepted: boolean
  profile_complete: boolean
  phone: string | null
  email: string | null
}

type Tab = 'basic' | 'experience' | 'address' | 'bank' | 'id' | 'signature'

function NavIcon({ tab }: { tab: Tab }) {
  if (tab === 'basic') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  )
  if (tab === 'experience') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  )
  if (tab === 'address') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )
  if (tab === 'bank') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
  )
  if (tab === 'id') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
  )
  if (tab === 'signature') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  )
  // language
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
  )
}

// ── File upload helper ───────────────────────────────────────────────────────

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('File conversion failed'))
    reader.readAsDataURL(file)
  })
}

async function uploadFile(token: string, file: File, folder: string): Promise<string> {
  try {
    const presignRes = await fetch(`${API_BASE}/files/presigned-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type, folder }),
    })
    if (!presignRes.ok) throw new Error('Upload URL request failed')
    const { data: presign } = await presignRes.json()

    if (presign.isLocal) {
      const fd = new FormData()
      fd.append('file', file, presign.key)
      const res = await fetch(`${API_BASE}/files/upload-local`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) throw new Error('Local upload failed')
      const { data } = await res.json()
      return data.key
    }

    const uploadRes = await fetch(presign.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!uploadRes.ok) throw new Error('Upload failed')
    return presign.key
  } catch (e) {
    if (e instanceof TypeError) return fileToDataUrl(file)
    throw e
  }
}

async function saveProfile(token: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/workers/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch (e) {
    if (e instanceof TypeError) return true
    throw e
  }
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-lg text-sm font-medium text-white ${type === 'success' ? 'bg-[#00C800]' : 'bg-[#ED1C24]'}`}>
      {message}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-[#EFF1F5] rounded w-1/4" />
          <div className="h-10 bg-[#EFF1F5] rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#98A2B2] mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white'

function SaveButton({ saving, onClick, label }: { saving: boolean; onClick: () => void; label: string }) {
  const t = useTranslations('worker')
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="w-full mt-6 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
    >
      {saving ? t('profile_tabs.shared_saving') : label}
    </button>
  )
}

// ── Image Full Modal ─────────────────────────────────────────────────────────

function ImageFullModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-9 right-0 text-white text-3xl font-light leading-none hover:text-[#DDDDDD]"
          aria-label="닫기"
        >
          ×
        </button>
        <img src={url} alt="" className="w-full rounded-xl object-contain max-h-[80vh] shadow-2xl" />
      </div>
    </div>
  )
}

// ── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  label,
  url,
  onChange,
  onDelete,
}: {
  label: string
  url: string | null
  onChange: (file: File) => void
  onDelete?: () => void
}) {
  const t = useTranslations('worker')
  const ref = React.useRef<HTMLInputElement>(null)
  const [viewingFull, setViewingFull] = React.useState(false)
  return (
    <div className="flex-1">
      {viewingFull && url && <ImageFullModal url={url} onClose={() => setViewingFull(false)} />}
      <p className="text-xs font-medium text-[#98A2B2] mb-1">{label}</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`relative w-full h-36 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors bg-[#F2F4F5] cursor-pointer ${url ? 'border-[#0669F7]' : 'border-[#EFF1F5] hover:border-[#0669F7]'}`}
      >
        {url ? (
          <div className="relative w-full h-full group/img">
            <img src={url} alt={label} className="w-full h-full object-contain p-1" />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover/img:opacity-100 text-white text-xs font-semibold bg-black/40 px-2 py-1 rounded-full">
                {t('profile_tabs.id.photo_select')}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center px-3">
            <svg className="w-6 h-6 text-[#98A2B2] mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-[#98A2B2]">{t('profile_tabs.id.photo_select')}</span>
          </div>
        )}
      </button>
      {url ? (
        <div className="flex gap-1 mt-1.5">
          <button
            type="button"
            onClick={() => setViewingFull(true)}
            className="flex-1 text-xs py-1.5 rounded-lg border border-[#EFF1F5] bg-white text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
          >
            {t('profile_tabs.id.view_full')}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 text-xs py-1.5 rounded-lg border border-[#EFF1F5] bg-white text-[#ED1C24] hover:border-[#ED1C24] transition-colors"
            >
              {t('profile_tabs.id.delete')}
            </button>
          )}
        </div>
      ) : null}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = '' }} />
    </div>
  )
}

// ── Basic Info Tab ───────────────────────────────────────────────────────────

function BasicTab({ profile, onSaved, locale }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void; locale: string }) {
  const t = useTranslations('worker')
  const { showAlert } = useAlert()
  const [fullName, setFullName] = React.useState(profile.full_name ?? '')
  const [dob, setDob] = React.useState(profile.date_of_birth?.split('T')[0] ?? '')
  const [gender, setGender] = React.useState<'MALE' | 'FEMALE' | 'OTHER' | ''>(profile.gender ?? '')
  const [bio, setBio] = React.useState(profile.bio ?? '')
  const [email, setEmail] = React.useState(profile.email ?? '')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [emailError, setEmailError] = React.useState('')
  const [profileImageUrl, setProfileImageUrl] = React.useState<string | null>(toCdnUrl(profile.profile_image_url))
  const [imageUploading, setImageUploading] = React.useState(false)
  const [imageError, setImageError] = React.useState('')
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  // Phone change state
  const [phone, setPhone] = React.useState(profile.phone ?? '')
  const [showPhoneModal, setShowPhoneModal] = React.useState(false)
  const [newPhone, setNewPhone] = React.useState('')
  const [phoneOtp, setPhoneOtp] = React.useState('')
  const [otpSent, setOtpSent] = React.useState(false)
  const [phoneSending, setPhoneSending] = React.useState(false)
  const [phoneVerifying, setPhoneVerifying] = React.useState(false)
  const [phoneError, setPhoneError] = React.useState('')

  async function handleSendPhoneOtp() {
    const validationKey = validatePhone(newPhone)
    if (validationKey) { setPhoneError(t('profile_tabs.basic.phone_required')); return }
    setPhoneSending(true); setPhoneError('')
    try {
      const res = await fetch(`${API_BASE}/auth/phone/send-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone }),
      })
      const body = await res.json()
      if (!res.ok) { setPhoneError(body?.message ?? t('profile_tabs.basic.phone_send_error')); return }
      setOtpSent(true)
      // In dev/staging: devOtp is returned for convenience
      if (body.data?.devOtp) setPhoneOtp(body.data.devOtp)
    } catch { setPhoneError(t('profile_tabs.basic.phone_send_error')) }
    finally { setPhoneSending(false) }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtp.trim()) { setPhoneError(t('profile_tabs.basic.otp_required')); return }
    setPhoneVerifying(true); setPhoneError('')
    try {
      const res = await fetch(`${API_BASE}/auth/phone/update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone.trim(), otp: phoneOtp.trim() }),
      })
      const body = await res.json()
      if (!res.ok) { setPhoneError(body?.message ?? t('profile_tabs.basic.phone_verify_error')); return }
      const updatedPhone = body.data?.phone ?? newPhone.trim()
      setPhone(updatedPhone)
      onSaved({ phone: updatedPhone })
      setShowPhoneModal(false)
      setNewPhone(''); setPhoneOtp(''); setOtpSent(false)
    } catch { setPhoneError(t('profile_tabs.basic.phone_verify_error')) }
    finally { setPhoneVerifying(false) }
  }

  function openPhoneModal() {
    setNewPhone('+84'); setPhoneOtp(''); setOtpSent(false); setPhoneError('')
    setShowPhoneModal(true)
  }

  const token = getSessionCookie()

  const maxDate = React.useMemo(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 15)
    return d.toISOString().split('T')[0]
  }, [])

  async function handleProfileImage(file: File) {
    setImageUploading(true); setImageError('')
    try {
      const key = await uploadFile(token!, file, 'worker-profile-pictures')
      const ok = await saveProfile(token!, { profilePictureS3Key: key })
      if (ok) {
        const url = URL.createObjectURL(file)
        setProfileImageUrl(url)
        onSaved({ profile_image_url: url })
      } else {
        setImageError(t('profile_tabs.basic.img_fail'))
      }
    } catch (e) {
      setImageError(e instanceof Error ? e.message : t('profile_tabs.basic.upload_fail'))
    } finally { setImageUploading(false) }
  }

  async function handleDeleteProfileImage() {
    const ok = await saveProfile(token!, { profilePictureS3Key: null })
    if (ok) { setProfileImageUrl(null); onSaved({ profile_image_url: null }) }
  }

  async function save() {
    if (!fullName.trim()) { setError(t('profile_tabs.basic.error_name')); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('profile_tabs.basic.error_email')); return
    }
    const tok = getSessionCookie()
    if (!tok) { setError(t('profile_tabs.basic.save_fail')); return }
    setError(''); setEmailError(''); setSaving(true)
    try {
      const profileOk = await saveProfile(tok, {
        fullName: fullName.trim(),
        dateOfBirth: dob || null,
        gender: gender || null,
        bio: bio.trim() || null,
      })
      // Update email separately — only if user has changed it
      let emailOk = true
      const trimmedEmail = email.trim() || null
      try {
        const emailRes = await fetch(`${API_BASE}/auth/me`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        })
        emailOk = emailRes.ok
      } catch { /* network error — non-critical, profile was already saved */ }

      if (profileOk) {
        onSaved({ full_name: fullName.trim(), date_of_birth: dob || undefined, gender: gender as 'MALE'|'FEMALE'|'OTHER'|null, bio: bio.trim() || null, email: trimmedEmail })
        if (!emailOk) {
          setEmailError(t('profile_tabs.basic.save_fail'))
        }
      } else {
        showAlert(t('profile_tabs.basic.save_fail'))
      }
    } catch { showAlert(t('profile_tabs.basic.save_error')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Profile picture */}
      <div className="flex items-center gap-4 pb-2">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full bg-[#F2F4F5] border-2 border-[#EFF1F5] overflow-hidden flex items-center justify-center">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={t('profile_tabs.basic.full_name')} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-[#C8CBD0]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            )}
          </div>
          {imageUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={imageUploading}
            className="px-4 py-2 rounded-full bg-[#0669F7] text-white text-xs font-medium hover:bg-[#0557D4] disabled:opacity-40">
            {profileImageUrl ? t('profile_tabs.basic.photo_change') : t('profile_tabs.basic.photo_register')}
          </button>
          {profileImageUrl && (
            <button type="button" onClick={handleDeleteProfileImage}
              className="px-4 py-2 rounded-full border border-[#ED1C24] text-[#ED1C24] text-xs font-medium">
              {t('profile_tabs.basic.photo_delete')}
            </button>
          )}
          <p className="text-xs text-[#98A2B2]">{t('profile_tabs.basic.photo_hint')}</p>
        </div>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleProfileImage(f) }} />
      </div>
      {imageError && <p className="text-xs text-[#ED1C24]">{imageError}</p>}

      <Field label={t('profile_tabs.basic.full_name')}>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
          placeholder={t('profile_tabs.basic.name_placeholder')} className={inputCls} />
      </Field>
      <Field label={t('profile_tabs.basic.dob')}>
        <DatePicker value={dob} max={maxDate} onChange={setDob} placeholder={t('profile_tabs.basic.dob_placeholder')} locale={locale} />
      </Field>
      <Field label={t('profile_tabs.basic.gender')}>
        <div className="flex gap-2">
          {(['MALE','FEMALE','OTHER'] as const).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${gender === g ? 'border-[#0669F7] bg-[#E6F0FE] text-[#0669F7]' : 'border-[#EFF1F5] text-[#98A2B2]'}`}>
              {g === 'MALE' ? t('profile_tabs.basic.male') : g === 'FEMALE' ? t('profile_tabs.basic.female') : t('profile_tabs.basic.other')}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('profile_tabs.basic.bio')}>
        <textarea rows={3} maxLength={500} value={bio} onChange={e => setBio(e.target.value)}
          placeholder={t('profile_tabs.basic.bio_placeholder')} className={`${inputCls} resize-none`} />
        <p className="text-xs text-[#98A2B2] text-right mt-1">{bio.length}/500</p>
      </Field>
      {/* 전화번호 */}
      <Field label={t('profile_tabs.basic.phone_label')}>
        <div className="flex items-center gap-2">
          <div className={`flex-1 ${inputCls} bg-[#F8F8FA] text-[#25282A]`}>
            {phone || t('profile_tabs.basic.phone_placeholder')}
          </div>
          <button
            type="button"
            onClick={openPhoneModal}
            className="shrink-0 px-3 py-2.5 rounded-lg border border-[#0669F7] text-[#0669F7] text-xs font-medium hover:bg-[#E6F0FE] transition-colors"
          >
            {t('profile_tabs.basic.phone_change')}
          </button>
        </div>
      </Field>

      {/* Phone change modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPhoneModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#25282A]">{t('profile_tabs.basic.phone_change')}</h3>
            <div className="space-y-3">
              <PhoneInput
                value={newPhone}
                onChange={v => { setNewPhone(v); setOtpSent(false); setPhoneError('') }}
                label={t('profile_tabs.basic.phone_new_label')}
                disabled={phoneSending || otpSent}
                error={!otpSent ? phoneError : undefined}
              />
              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={phoneSending || otpSent || newPhone.length < 8}
                className="w-full py-3 rounded-2xl bg-[#0669F7] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
              >
                {phoneSending ? '...' : otpSent ? t('profile_tabs.basic.phone_sent') : t('profile_tabs.basic.phone_send_otp')}
              </button>
              {otpSent && (
                <div>
                  <label className="block text-xs font-medium text-[#98A2B2] mb-1">{t('profile_tabs.basic.phone_otp_label')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={phoneOtp}
                    onChange={e => { setPhoneOtp(e.target.value); setPhoneError('') }}
                    placeholder={t('profile_tabs.basic.phone_otp_placeholder')}
                    className={inputCls}
                    autoFocus
                  />
                </div>
              )}
              {otpSent && phoneError && <p className="text-xs text-[#ED1C24]">{phoneError}</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="flex-1 py-3 rounded-full border border-[#EFF1F5] text-[#98A2B2] text-sm font-medium"
              >
                {t('profile_tabs.basic.phone_cancel')}
              </button>
              {otpSent && (
                <button
                  type="button"
                  onClick={handleVerifyPhoneOtp}
                  disabled={phoneVerifying || !phoneOtp.trim()}
                  className="flex-1 py-3 rounded-full bg-[#0669F7] text-white text-sm font-medium hover:bg-[#0557D4] disabled:opacity-40"
                >
                  {phoneVerifying ? t('profile_tabs.basic.phone_verifying') : t('profile_tabs.basic.phone_verify')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 이메일 */}
      <Field label={t('profile_tabs.basic.email_label')}>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setEmailError('') }}
          placeholder={t('profile_tabs.basic.email_placeholder')}
          className={inputCls}
        />
      </Field>
      {emailError && <p className="text-xs text-[#ED1C24] mt-1">{emailError}</p>}

      {error && <p className="text-xs text-[#ED1C24]">{error}</p>}
      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.shared_save')} />
    </div>
  )
}

// ── Experience Tab ───────────────────────────────────────────────────────────

function ExperienceTab({ profile, onSaved, locale }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void; locale: string }) {
  const t = useTranslations('worker')
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [selectedMap, setSelectedMap] = React.useState<Map<number, number>>(new Map())

  const token = getSessionCookie()

  React.useEffect(() => {
    const t = getSessionCookie()
    Promise.all([
      fetch(`${API_BASE}/public/trades`).then(r => r.json()).then(b => b.data ?? b),
      fetch(`${API_BASE}/workers/me/trade-skills`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.ok ? r.json() : { data: [] }).then(b => b.data ?? []),
    ]).then(([tradesData, skillsData]) => {
      setTrades(tradesData)
      const map = new Map<number, number>()
      for (const s of skillsData as TradeSkill[]) map.set(s.trade_id, s.years)
      setSelectedMap(map)
    }).catch(() => undefined).finally(() => setLoading(false))
  }, [])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return trades
    const q = search.toLowerCase()
    return trades.filter(t => t.nameKo.toLowerCase().includes(q) || t.nameVi.toLowerCase().includes(q))
  }, [trades, search])

  const selectedTrades = trades.filter(t => selectedMap.has(t.id))

  function toggleTrade(tradeId: number) {
    setSelectedMap(prev => {
      const next = new Map(prev)
      if (next.has(tradeId)) next.delete(tradeId)
      else next.set(tradeId, 1)
      return next
    })
  }

  function setYears(tradeId: number, years: number) {
    setSelectedMap(prev => {
      const next = new Map(prev)
      next.set(tradeId, years)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      const skills = Array.from(selectedMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tradeId, years]) => ({ tradeId, years }))

      const res = await fetch(`${API_BASE}/workers/me/trade-skills`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills }),
      })
      if (res.ok) {
        const primaryTrade = selectedTrades.sort((a, b) => (selectedMap.get(b.id) ?? 0) - (selectedMap.get(a.id) ?? 0))[0]
        onSaved({
          primary_trade_id: primaryTrade?.id ?? null,
          trade_name_ko: primaryTrade?.nameKo ?? null,
          experience_months: primaryTrade ? (selectedMap.get(primaryTrade.id) ?? 1) * 12 : 0,
        })
      } else {
        setSaveError(t('profile_tabs.experience.save_fail'))
      }
    } catch { setSaveError(t('profile_tabs.experience.save_fail')) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-8 text-center text-sm text-[#98A2B2]">{t('profile_tabs.experience.loading')}</div>

  return (
    <div className="space-y-4">
      {selectedTrades.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#98A2B2]">{t('profile_tabs.experience.selected', { count: selectedTrades.length })}</p>
          {selectedTrades
            .sort((a, b) => (selectedMap.get(b.id) ?? 0) - (selectedMap.get(a.id) ?? 0))
            .map(tr => (
              <div key={tr.id} className="flex items-center gap-2 p-2.5 bg-[#E6F0FE] border border-[#0669F7] rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0669F7] truncate">{locale === 'vi' ? tr.nameVi : locale === 'en' ? (tr.nameEn ?? tr.nameKo) : tr.nameKo}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number" min={1} max={50}
                    value={selectedMap.get(tr.id) ?? 1}
                    onChange={e => setYears(tr.id, Math.max(1, Number(e.target.value)))}
                    className="w-14 px-2 py-1 rounded border border-[#0669F7] text-sm text-center bg-white focus:outline-none"
                  />
                  <span className="text-xs text-[#98A2B2]">{t('profile_tabs.experience.years_unit')}</span>
                  <button type="button" onClick={() => toggleTrade(tr.id)}
                    className="ml-1 w-5 h-5 rounded-full bg-[#ED1C24] text-white text-xs flex items-center justify-center">×</button>
                </div>
              </div>
            ))}
        </div>
      )}

      <Field label={t('profile_tabs.experience.search_label')}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('profile_tabs.experience.search_placeholder')} className={inputCls} />
      </Field>

      <div className="max-h-52 overflow-y-auto rounded-lg border border-[#EFF1F5]">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#98A2B2]">{t('profile_tabs.experience.no_results')}</div>
        ) : (
          <ul>
            {filtered.map(tr => {
              const isSelected = selectedMap.has(tr.id)
              return (
                <li key={tr.id}>
                  <button type="button" onClick={() => toggleTrade(tr.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F2F4F5] border-b border-[#EFF1F5] last:border-0 ${isSelected ? 'bg-[#E6F0FE]' : ''}`}>
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>{locale === 'vi' ? tr.nameVi : locale === 'en' ? (tr.nameEn ?? tr.nameKo) : tr.nameKo}</p>
                    </div>
                    {isSelected && <svg className="w-5 h-5 text-[#0669F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-[#98A2B2]">{t('profile_tabs.experience.hint')}</p>
      {saveError && <p className="text-sm text-[#ED1C24]">{saveError}</p>}
      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.shared_save')} />
    </div>
  )
}

// ── Address Tab ──────────────────────────────────────────────────────────────

interface SavedLocation {
  id: string
  label: string
  address: string | null
  lat: number | null
  lng: number | null
  is_default: boolean
}

function AddressTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
  const MAX_LOCATIONS = 3
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([])
  const [loadingLocs, setLoadingLocs] = React.useState(true)
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // ── Add form state ────────────────────────────────────────────────────────
  const addInputRef = React.useRef<HTMLInputElement>(null)
  const addAcRef = React.useRef<google.maps.places.Autocomplete | null>(null)
  const [mapsLoaded, setMapsLoaded] = React.useState(false)
  const [mapsError, setMapsError] = React.useState(false)
  const [addLabel, setAddLabel] = React.useState('')
  const [addAddress, setAddAddress] = React.useState('')
  const [addLat, setAddLat] = React.useState<number | null>(null)
  const [addLng, setAddLng] = React.useState<number | null>(null)
  const [addProvince, setAddProvince] = React.useState('')
  const [addDistrict, setAddDistrict] = React.useState('')
  const [addError, setAddError] = React.useState('')

  React.useEffect(() => {
    getGoogleMapsLoader().load().then(() => setMapsLoaded(true)).catch(() => setMapsError(true))
  }, [])

  // Initialize Autocomplete when add form becomes visible
  const initAutocomplete = React.useCallback(() => {
    if (!mapsLoaded || !addInputRef.current || addAcRef.current) return
    const ac = new window.google.maps.places.Autocomplete(addInputRef.current, {
      componentRestrictions: { country: 'vn' },
      fields: ['address_components', 'formatted_address', 'geometry'],
    })
    addAcRef.current = ac
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.geometry?.location) return
      let prov = '', dist = ''
      for (const c of place.address_components ?? []) {
        if (c.types.includes('administrative_area_level_1')) prov = c.long_name
        if (c.types.includes('administrative_area_level_2')) dist = c.long_name
      }
      setAddProvince(prov); setAddDistrict(dist)
      setAddAddress(place.formatted_address ?? '')
      setAddLat(place.geometry.location.lat())
      setAddLng(place.geometry.location.lng())
    })
  }, [mapsLoaded])

  React.useEffect(() => {
    if (!showAddForm) { addAcRef.current = null; return }
    const id = requestAnimationFrame(() => initAutocomplete())
    return () => cancelAnimationFrame(id)
  }, [showAddForm, initAutocomplete])

  // Load saved locations
  React.useEffect(() => {
    const token = getSessionCookie()
    if (!token) { setLoadingLocs(false); return }
    fetch(`${API_BASE}/workers/saved-locations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data) setSavedLocations(res.data)
      })
      .catch(() => undefined)
      .finally(() => setLoadingLocs(false))
  }, [])

  const token = getSessionCookie()

  function resetAddForm() {
    setAddLabel(''); setAddAddress(''); setAddLat(null); setAddLng(null)
    setAddProvince(''); setAddDistrict(''); setAddError('')
    if (addInputRef.current) addInputRef.current.value = ''
    addAcRef.current = null
  }

  async function handleDelete(loc: SavedLocation) {
    if (!token) return
    await fetch(`${API_BASE}/workers/saved-locations/${loc.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined)
    setSavedLocations(prev => prev.filter(l => l.id !== loc.id))
  }

  async function handleAdd() {
    if (!token) return
    if (!addLabel.trim()) { setAddError(t('profile_tabs.address.error_label_required')); return }
    const finalAddress = addAddress || addProvince || null
    if (!finalAddress) { setAddError(t('profile_tabs.address.error_address_required')); return }
    setAddError('')
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/workers/saved-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          label: addLabel.trim(),
          address: finalAddress,
          lat: addLat,
          lng: addLng,
          isDefault: savedLocations.length === 0,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddError(json?.message ?? t('profile_tabs.address.error_save'))
        return
      }
      const loc: SavedLocation = json.data
      setSavedLocations(prev => [...prev, loc])
      resetAddForm()
      setShowAddForm(false)
    } catch {
      setAddError(t('profile_tabs.address.error_save'))
    } finally {
      setSaving(false)
    }
  }

  const canAdd = savedLocations.length < MAX_LOCATIONS

  if (loadingLocs) {
    return <div className="py-6"><Skeleton /></div>
  }

  return (
    <div className="space-y-3">
      {/* Saved location cards */}
      {savedLocations.length > 0 && (
        <div className="space-y-2">
          {savedLocations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-start gap-3 p-4 bg-[#F8F8FA] rounded-xl border border-[#EFF1F5]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-[#25282A]">{loc.label}</span>
                  {loc.is_default && (
                    <span className="text-[10px] font-bold text-[#0669F7] bg-[#E6F0FE] px-1.5 py-0.5 rounded-full">{t('profile_tabs.address.default_badge')}</span>
                  )}
                </div>
                <p className="text-sm text-[#98A2B2] leading-snug truncate">{loc.address ?? '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(loc)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#FFECEC] text-[#98A2B2] hover:text-[#ED1C24] transition-colors"
                aria-label={t('profile_tabs.address.delete_aria')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {savedLocations.length === 0 && !showAddForm && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-[#F2F4F5] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[#98A2B2]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <p className="text-sm text-[#98A2B2] mb-3">{t('profile_tabs.address.empty')}</p>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="border border-[#EFF1F5] rounded-xl p-4 space-y-3 bg-white">
          <p className="text-sm font-semibold text-[#25282A]">{t('profile_tabs.address.add_form_title')}</p>
          <Field label={t('profile_tabs.address.label_name')}>
            <input
              type="text"
              value={addLabel}
              onChange={e => setAddLabel(e.target.value)}
              placeholder={t('profile_tabs.address.label_name_placeholder')}
              className={inputCls}
            />
          </Field>
          <Field label={mapsLoaded ? t('profile_tabs.address.search_label') : t('profile_tabs.address.address_label')}>
            {!mapsError ? (
              <input
                ref={addInputRef}
                type="text"
                placeholder={mapsLoaded ? t('profile_tabs.address.address_search_placeholder') : t('profile_tabs.address.maps_loading')}
                disabled={!mapsLoaded}
                onChange={() => { setAddAddress(''); setAddLat(null); setAddLng(null) }}
                className={`${inputCls} disabled:bg-[#F2F4F5]`}
              />
            ) : (
              <div className="space-y-2">
                <input type="text" value={addProvince} onChange={e => setAddProvince(e.target.value)}
                  placeholder="시/도 (예: Hà Nội)" className={inputCls} />
                <input type="text" value={addDistrict} onChange={e => setAddDistrict(e.target.value)}
                  placeholder="구/군 (예: Ba Đình)" className={inputCls} />
              </div>
            )}
          </Field>
          {addAddress && (
            <div className="flex items-start gap-2 p-3 bg-[#E6F0FE] rounded-lg border border-[#C3D9FF]">
              <svg className="w-4 h-4 text-[#0669F7] shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <p className="text-sm text-[#0669F7] font-medium leading-snug">{addAddress}</p>
            </div>
          )}
          {addError && <p className="text-xs text-[#ED1C24]">{addError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { resetAddForm(); setShowAddForm(false) }}
              disabled={saving}
              className="flex-1 h-11 rounded-full border border-[#EFF1F5] text-[#98A2B2] font-medium text-sm hover:bg-[#F2F4F5] disabled:opacity-40 transition-colors"
            >
              {t('profile_tabs.address.cancel')}
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 h-11 rounded-full bg-[#0669F7] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
            >
              {saving ? t('profile_tabs.address.saving') : t('profile_tabs.address.save')}
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {canAdd && !showAddForm && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full h-11 flex items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-[#C3D9FF] text-[#0669F7] font-medium text-sm hover:bg-[#E6F0FE] hover:border-[#0669F7] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('profile_tabs.address.add_button')}
        </button>
      )}

      {savedLocations.length > 0 && (
        <p className="text-xs text-[#98A2B2] pt-1">{t('profile_tabs.address.hint', { max: MAX_LOCATIONS })}</p>
      )}
    </div>
  )
}

// ── Vietnam Bank Select ──────────────────────────────────────────────────────

const VN_BANKS = [
  { code: 'VCB',     name: 'Vietcombank',       fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { code: 'CTG',     name: 'VietinBank',         fullName: 'Ngân hàng TMCP Công thương Việt Nam' },
  { code: 'BIDV',    name: 'BIDV',               fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'AGR',     name: 'Agribank',           fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn' },
  { code: 'MBB',     name: 'MB Bank',            fullName: 'Ngân hàng TMCP Quân đội' },
  { code: 'TCB',     name: 'Techcombank',        fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: 'ACB',     name: 'ACB',                fullName: 'Ngân hàng TMCP Á Châu' },
  { code: 'VPB',     name: 'VPBank',             fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'HDB',     name: 'HDBank',             fullName: 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh' },
  { code: 'SHB',     name: 'SHB',                fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: 'TPB',     name: 'TPBank',             fullName: 'Ngân hàng TMCP Tiên Phong' },
  { code: 'STB',     name: 'Sacombank',          fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'VIB',     name: 'VIB',                fullName: 'Ngân hàng TMCP Quốc Tế Việt Nam' },
  { code: 'OCB',     name: 'OCB',                fullName: 'Ngân hàng TMCP Phương Đông' },
  { code: 'MSB',     name: 'MSB',                fullName: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: 'SEAB',    name: 'SeABank',            fullName: 'Ngân hàng TMCP Đông Nam Á' },
  { code: 'EIB',     name: 'Eximbank',           fullName: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
  { code: 'NCB',     name: 'NCB',                fullName: 'Ngân hàng TMCP Quốc Dân' },
  { code: 'PVC',     name: 'PVcomBank',          fullName: 'Ngân hàng TMCP Đại chúng Việt Nam' },
  { code: 'ABB',     name: 'ABBank',             fullName: 'Ngân hàng TMCP An Bình' },
  { code: 'LPB',     name: 'LienVietPostBank',   fullName: 'Ngân hàng TMCP Bưu điện Liên Việt' },
  { code: 'BVB',     name: 'BaoViet Bank',       fullName: 'Ngân hàng TMCP Bảo Việt' },
  { code: 'KLB',     name: 'KienlongBank',       fullName: 'Ngân hàng TMCP Kiên Long' },
  { code: 'NAB',     name: 'NamABank',           fullName: 'Ngân hàng TMCP Nam Á' },
  { code: 'VBB',     name: 'VietBank',           fullName: 'Ngân hàng TMCP Việt Nam Thương Tín' },
  { code: 'SGB',     name: 'Saigonbank',         fullName: 'Ngân hàng TMCP Sài Gòn Công Thương' },
  { code: 'BANVIET', name: 'BVBank',             fullName: 'Ngân hàng TMCP Bản Việt' },
  { code: 'GPB',     name: 'GPBank',             fullName: 'Ngân hàng TM TNHH MTV Dầu khí toàn cầu' },
  { code: 'OJB',     name: 'OceanBank',          fullName: 'Ngân hàng TM TNHH MTV Đại Dương' },
  { code: 'COOP',    name: 'Co-opBank',          fullName: 'Ngân hàng Hợp tác xã Việt Nam' },
  { code: 'WOO',     name: 'Woori Bank',         fullName: 'Ngân hàng Woori Việt Nam' },
  { code: 'SHINHAN', name: 'Shinhan Bank',       fullName: 'Ngân hàng Shinhan Việt Nam' },
  { code: 'KBHN',    name: 'KB Kookmin Bank',    fullName: 'Ngân hàng KB Kookmin Việt Nam' },
  { code: 'HSBC',    name: 'HSBC',               fullName: 'Ngân hàng HSBC Việt Nam' },
  { code: 'SCBVN',   name: 'Standard Chartered', fullName: 'Ngân hàng Standard Chartered Việt Nam' },
] as const

function VietnamBankSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations('worker')
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [fixedTop, setFixedTop] = React.useState(0)
  const [fixedLeft, setFixedLeft] = React.useState(0)
  const [dropW, setDropW] = React.useState(280)
  const [maxListH, setMaxListH] = React.useState(240)

  const filtered = search.trim()
    ? VN_BANKS.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.fullName.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase())
      )
    : VN_BANKS

  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const portal = document.getElementById('vnbank-portal')
      if (containerRef.current?.contains(e.target as Node)) return
      if (portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    function handleClose(e: Event) {
      // Don't close when the scroll originates from inside the portal (i.e. scrolling the list)
      const portal = document.getElementById('vnbank-portal')
      if (portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    function handleResize() { setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleClose as EventListener, true)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleClose as EventListener, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

  React.useEffect(() => {
    if (open) {
      setSearch('')
      const t = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  function openDropdown() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const w = Math.max(rect.width, 280)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      // Always open downward; clamp list height to fit available space (56px = search bar)
      const listH = Math.max(120, Math.min(240, spaceBelow - 56))
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
      setFixedTop(rect.bottom + 4)
      setFixedLeft(left)
      setDropW(w)
      setMaxListH(listH)
    }
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={openDropdown}
        className={[
          'w-full px-3 py-2.5 rounded-lg border text-sm text-left flex items-center justify-between bg-white transition-colors',
          open ? 'border-[#0669F7] ring-2 ring-[#0669F7]/10' : 'border-[#EFF1F5] hover:border-[#0669F7]',
          value ? 'text-[#25282A]' : 'text-[#98A2B2]',
        ].join(' ')}
      >
        <span>{value || t('profile_tabs.bank.bank_select_placeholder')}</span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180 text-[#0669F7]' : 'text-[#98A2B2]'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id="vnbank-portal"
          className="bg-white rounded-xl shadow-2xl border border-[#EFF1F5] overflow-hidden"
          style={{ position: 'fixed', top: fixedTop, left: fixedLeft, zIndex: 9999, width: dropW }}
        >
          <div className="p-2 border-b border-[#EFF1F5]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B2] pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('profile_tabs.bank.bank_search_placeholder')}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#EFF1F5] text-sm text-[#25282A] placeholder-[#98A2B2] focus:outline-none focus:border-[#0669F7]"
              />
            </div>
          </div>
          <div style={{ maxHeight: maxListH, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[#98A2B2] py-6">{t('profile_tabs.bank.bank_no_results')}</p>
            ) : filtered.map((bank) => {
              const isSel = value === bank.name
              return (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => { onChange(bank.name); setOpen(false) }}
                  className={[
                    'w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 transition-colors border-b border-[#EFF1F5] last:border-0',
                    isSel ? 'bg-[#EEF4FF]' : 'hover:bg-[#F2F4F5]',
                  ].join(' ')}
                >
                  <span>
                    <span className={`block text-sm font-semibold ${isSel ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>
                      {bank.name}
                    </span>
                    <span className={`block text-xs mt-0.5 ${isSel ? 'text-[#0669F7]/70' : 'text-[#98A2B2]'}`}>
                      {bank.fullName}
                    </span>
                  </span>
                  {isSel && (
                    <svg className="w-4 h-4 shrink-0 text-[#0669F7]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bank Tab ─────────────────────────────────────────────────────────────────

function BankTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
  const { showAlert } = useAlert()
  const [bankName, setBankName] = React.useState(profile.bank_name ?? '')
  const [accountNumber, setAccountNumber] = React.useState(profile.bank_account_number ?? '')
  const [bankBookUrl, setBankBookUrl] = React.useState<string | null>(toCdnUrl(profile.bank_book_url))
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState('')

  const token = getSessionCookie()

  async function handleBankBookFile(file: File) {
    setUploading(true); setError('')
    try {
      const key = await uploadFile(token!, file, 'worker-bank-books')
      const ok = await saveProfile(token!, { bankBookS3Key: key })
      if (ok) {
        const previewUrl = URL.createObjectURL(file)
        setBankBookUrl(previewUrl)
        onSaved({ bank_book_url: previewUrl })
      } else {
        showAlert(t('profile_tabs.bank.upload_fail'))
      }
    } catch (e) {
      showAlert(e instanceof Error ? e.message : t('profile_tabs.bank.upload_fail'))
    } finally { setUploading(false) }
  }

  async function handleBankBookDelete() {
    try {
      const ok = await saveProfile(token!, { bankBookS3Key: null })
      if (ok) { setBankBookUrl(null); onSaved({ bank_book_url: null }) }
      else showAlert(t('profile_tabs.bank.upload_fail'))
    } catch { showAlert(t('profile_tabs.bank.upload_fail')) }
  }

  async function save() {
    setSaving(true)
    try {
      const ok = await saveProfile(token!, { bankName: bankName.trim() || null, bankAccountNumber: accountNumber.trim() || null })
      if (ok) onSaved({ bank_name: bankName.trim() || null, bank_account_number: accountNumber.trim() || null })
      else showAlert(t('profile_tabs.bank.save_fail'))
    } catch { showAlert(t('profile_tabs.bank.save_error')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Field label={t('profile_tabs.bank.bank_name_label')}>
        <VietnamBankSelect value={bankName} onChange={setBankName} />
      </Field>
      <Field label={t('profile_tabs.bank.account_label')}>
        <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
          placeholder={t('profile_tabs.bank.account_placeholder')} className={inputCls} />
      </Field>

      <div>
        <p className="text-xs font-medium text-[#98A2B2] mb-1">
          {t('profile_tabs.bank.bankbook_label')} {uploading && <span className="text-[#0669F7]">{t('profile_tabs.bank.bankbook_uploading')}</span>}
        </p>
        <UploadZone label="" url={bankBookUrl} onChange={handleBankBookFile} onDelete={bankBookUrl ? handleBankBookDelete : undefined} />
        <p className="text-xs text-[#98A2B2] mt-1">{t('profile_tabs.bank.bankbook_hint')}</p>
      </div>

      <p className="text-xs text-[#98A2B2] bg-[#F2F4F5] rounded-lg p-3 border border-[#EFF1F5]">
        {t('profile_tabs.bank.privacy_notice')}
      </p>

      {error && <p className="text-xs text-[#ED1C24]">{error}</p>}
      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.shared_save')} />
    </div>
  )
}

// ── ID Tab ───────────────────────────────────────────────────────────────────

function StatusBadge({ verified, hasDoc }: { verified: boolean; hasDoc: boolean }) {
  const t = useTranslations('worker')
  if (verified) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#E6F9E6] text-[#1A6B1A] border border-[#86D98A]"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{t('profile_tabs.id.status_verified')}</span>
  )
  if (hasDoc) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFF8E6] text-[#856404] border border-[#F5D87D]">{t('profile_tabs.id.status_pending')}</span>
  )
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EFF1F5] text-[#98A2B2] border border-[#EFF1F5]">{t('profile_tabs.id.status_none')}</span>
}

function IdTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
  const { showAlert } = useAlert()
  const [idNumber, setIdNumber] = React.useState(profile.id_number ?? '')
  const [frontUrl, setFrontUrl] = React.useState<string | null>(toCdnUrl(profile.id_front_url))
  const [backUrl, setBackUrl] = React.useState<string | null>(toCdnUrl(profile.id_back_url))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')

  const token = getSessionCookie()
  const hasDoc = !!(profile.id_front_url || profile.id_back_url)
  const [uploading, setUploading] = React.useState<'front' | 'back' | null>(null)

  async function handleFront(file: File) {
    if (uploading) return
    setError(''); setUploading('front')
    try {
      const key = await uploadFile(token!, file, 'worker-id-docs')
      const ok = await saveProfile(token!, { idFrontS3Key: key })
      if (ok) {
        const url = URL.createObjectURL(file)
        setFrontUrl(url); onSaved({ id_front_url: url })
        setSuccess(t('profile_tabs.id.front_saved'))
      } else showAlert(t('profile_tabs.id.front_fail'))
    } catch (e) { showAlert(e instanceof Error ? e.message : t('profile_tabs.id.upload_fail')) }
    finally { setUploading(null) }
  }

  async function handleBack(file: File) {
    if (uploading) return
    setUploading('back')
    try {
      const key = await uploadFile(token!, file, 'worker-id-docs')
      const ok = await saveProfile(token!, { idBackS3Key: key })
      if (ok) {
        const url = URL.createObjectURL(file)
        setBackUrl(url); onSaved({ id_back_url: url })
        setSuccess(t('profile_tabs.id.back_saved'))
      } else showAlert(t('profile_tabs.id.back_fail'))
    } catch (e) { showAlert(e instanceof Error ? e.message : t('profile_tabs.id.upload_fail')) }
    finally { setUploading(null) }
  }

  async function handleFrontDelete() {
    try {
      const ok = await saveProfile(token!, { idFrontS3Key: null })
      if (ok) { setFrontUrl(null); onSaved({ id_front_url: null }) }
    } catch { /* ignore */ }
  }

  async function handleBackDelete() {
    try {
      const ok = await saveProfile(token!, { idBackS3Key: null })
      if (ok) { setBackUrl(null); onSaved({ id_back_url: null }) }
    } catch { /* ignore */ }
  }

  async function save() {
    setSaving(true); setSuccess('')
    try {
      const ok = await saveProfile(token!, { idNumber: idNumber.trim() || null })
      if (ok) { onSaved({ id_number: idNumber.trim() || null }); setSuccess(t('profile_tabs.id.number_saved')) }
      else showAlert(t('profile_tabs.id.save_fail'))
    } catch { showAlert(t('profile_tabs.id.save_error')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#25282A]">{t('profile_tabs.id.section_title')}</p>
        <StatusBadge verified={profile.id_verified} hasDoc={hasDoc} />
      </div>

      <div className="flex gap-3">
        <UploadZone label={uploading === 'front' ? t('profile_tabs.id.front_uploading') : t('profile_tabs.id.front')} url={frontUrl} onChange={handleFront} onDelete={frontUrl ? handleFrontDelete : undefined} />
        <UploadZone label={uploading === 'back' ? t('profile_tabs.id.back_uploading') : t('profile_tabs.id.back')} url={backUrl} onChange={handleBack} onDelete={backUrl ? handleBackDelete : undefined} />
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-xs text-[#0669F7]">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('profile_tabs.id.uploading_label')}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#98A2B2] mb-1">
          {t('profile_tabs.id.number_label')} <span className="text-[#98A2B2] font-normal">{t('profile_tabs.id.number_hint')}</span>
        </label>
        <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)}
          placeholder={t('profile_tabs.id.number_placeholder')} className={inputCls} />
      </div>

      {error && <p className="text-xs text-[#ED1C24]">{error}</p>}
      {success && <p className="text-xs text-[#1A6B1A]">{success}</p>}
      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.id.save_button')} />
    </div>
  )
}

// ── Signature Tab ────────────────────────────────────────────────────────────

interface CanvasPoint { x: number; y: number }

function useSignaturePad(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const isDrawing = React.useRef(false)
  const lastPoint = React.useRef<CanvasPoint | null>(null)
  const isEmpty = React.useRef(true)

  const getCtx = React.useCallback(() => canvasRef.current?.getContext('2d') ?? null, [canvasRef])

  const initCanvas = React.useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.scale(dpr, dpr); ctx.strokeStyle = '#25282A'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [canvasRef])

  const getPoint = React.useCallback((e: MouseEvent | TouchEvent): CanvasPoint | null => {
    const canvas = canvasRef.current; if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]; if (!touch) return null
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }, [canvasRef])

  const startDrawing = React.useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    const point = getPoint(e); if (!point) return
    isDrawing.current = true; lastPoint.current = point; isEmpty.current = false
    const ctx = getCtx(); if (!ctx) return
    ctx.beginPath(); ctx.arc(point.x, point.y, 1, 0, Math.PI * 2); ctx.fillStyle = '#25282A'; ctx.fill()
  }, [getCtx, getPoint])

  const draw = React.useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const point = getPoint(e); if (!point || !lastPoint.current) return
    const ctx = getCtx(); if (!ctx) return
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(point.x, point.y); ctx.stroke()
    lastPoint.current = point
  }, [getCtx, getPoint])

  const stopDrawing = React.useCallback(() => { isDrawing.current = false; lastPoint.current = null }, [])

  const clear = React.useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = getCtx(); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    isEmpty.current = true
  }, [canvasRef, getCtx])

  const getBlob = React.useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) { resolve(null); return }
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }, [canvasRef])

  return { initCanvas, startDrawing, draw, stopDrawing, clear, getBlob, checkIsEmpty: () => isEmpty.current }
}

function SignatureTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
  const { showAlert } = useAlert()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const { initCanvas, startDrawing, draw, stopDrawing, clear, getBlob, checkIsEmpty } = useSignaturePad(canvasRef)
  const [existingUrl, setExistingUrl] = React.useState<string | null>(toCdnUrl(profile.signature_url))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [viewingFull, setViewingFull] = React.useState(false)

  const token = getSessionCookie()

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => initCanvas())
    return () => cancelAnimationFrame(frame)
  }, [initCanvas])

  React.useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseleave', stopDrawing)
    canvas.addEventListener('touchstart', startDrawing, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDrawing)
    return () => {
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseleave', stopDrawing)
      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [startDrawing, draw, stopDrawing])

  async function handleSave() {
    if (checkIsEmpty()) { showAlert(t('profile_tabs.signature.error_empty')); return }
    const tok = getSessionCookie()
    if (!tok) { showAlert(t('profile_tabs.signature.save_fail')); return }
    setSaving(true); setSuccess('')
    try {
      const blob = await getBlob()
      if (!blob) throw new Error(t('profile_tabs.signature.save_fail'))
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      const key = await uploadFile(tok, file, 'worker-signatures')
      const ok = await saveProfile(tok, { signatureS3Key: key })
      if (ok) {
        const url = toCdnUrl(key) ?? URL.createObjectURL(blob)
        setExistingUrl(url); onSaved({ signature_url: url })
        setSuccess(t('profile_tabs.signature.saved'))
        clear()
      } else {
        showAlert(t('profile_tabs.signature.save_fail'))
      }
    } catch (e) {
      showAlert(e instanceof Error ? e.message : t('profile_tabs.signature.save_error'))
    } finally { setSaving(false) }
  }

  async function handleSignatureDelete() {
    const tok = getSessionCookie()
    if (!tok) return
    setSaving(true); setSuccess('')
    try {
      const ok = await saveProfile(tok, { signatureS3Key: null })
      if (ok) {
        setExistingUrl(null)
        onSaved({ signature_url: null })
        clear()
      } else {
        showAlert(t('profile_tabs.signature.save_fail'))
      }
    } catch {
      showAlert(t('profile_tabs.signature.save_error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {viewingFull && existingUrl && <ImageFullModal url={existingUrl} onClose={() => setViewingFull(false)} />}
      {existingUrl && (
        <div>
          <p className="text-xs font-medium text-[#98A2B2] mb-1">{t('profile_tabs.signature.current_label')}</p>
          <div className="border border-[#EFF1F5] rounded-lg p-3 bg-[#F2F4F5]">
            <img src={existingUrl} alt={t('profile_tabs.signature.current_label')} className="max-h-20 object-contain mx-auto" />
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={() => setViewingFull(true)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-[#EFF1F5] bg-white text-[#25282A] hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
            >
              {t('profile_tabs.signature.view_full')}
            </button>
            <button
              type="button"
              onClick={handleSignatureDelete}
              disabled={saving}
              className="flex-1 text-xs py-1.5 rounded-lg border border-[#EFF1F5] bg-white text-[#ED1C24] hover:border-[#ED1C24] transition-colors disabled:opacity-40"
            >
              {saving ? t('profile_tabs.signature.deleting') : t('profile_tabs.signature.delete')}
            </button>
          </div>
          <p className="text-xs text-[#98A2B2] mt-1">{t('profile_tabs.signature.overwrite_hint')}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-[#98A2B2] mb-1">
          {existingUrl ? t('profile_tabs.signature.new_label') : t('profile_tabs.signature.input_label')}
        </p>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '160px', border: '1px solid #EFF1F5', borderRadius: '8px', touchAction: 'none', display: 'block', cursor: 'crosshair', backgroundColor: '#FAFAFA' }}
        />
        <p className="text-xs text-[#98A2B2] mt-1">{t('profile_tabs.signature.draw_hint')}</p>
      </div>

      {error && <p className="text-xs text-[#ED1C24]">{error}</p>}
      {success && <p className="text-xs text-[#1A6B1A]">{success}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => { clear(); setError(''); setSuccess('') }}
          className="flex-1 py-3 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm">
          {t('profile_tabs.signature.clear')}
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-[#0557D4] disabled:opacity-40">
          {saving ? t('profile_tabs.signature.saving') : t('profile_tabs.signature.save')}
        </button>
      </div>
    </div>
  )
}

// ── Language Tab ─────────────────────────────────────────────────────────────

function LanguageTab({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations('worker')
  const router = useRouter()
  const pathname = usePathname()
  const [pending, setPending] = React.useState<string | null>(null)

  const LOCALES = [
    { code: 'ko', label: t('profile_tabs.language.ko'), abbr: 'KO' },
    { code: 'vi', label: t('profile_tabs.language.vi'), abbr: 'VI' },
    { code: 'en', label: t('profile_tabs.language.en'), abbr: 'EN' },
  ]

  function handleSelect(code: string) {
    if (code === currentLocale) return
    setPending(code)
    router.replace(pathname, { locale: code as 'ko' | 'vi' | 'en' })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-[#25282A]">{t('profile_tabs.language.title')}</h2>
        <p className="text-xs text-[#98A2B2] mt-1">{t('profile_tabs.language.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3">
        {LOCALES.map(({ code, label, abbr }) => {
          const isCurrent = code === currentLocale
          const isLoading = pending === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleSelect(code)}
              disabled={!!pending}
              className={[
                'flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all',
                isCurrent
                  ? 'border-[#0669F7] bg-[#E6F0FE]'
                  : 'border-[#EFF1F5] bg-white hover:border-[#0669F7]/40 hover:bg-[#F2F4F5]',
                !!pending && !isCurrent ? 'opacity-40' : '',
              ].join(' ')}
            >
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCurrent ? 'bg-[#0669F7] text-white' : 'bg-[#EFF1F5] text-[#7A7B7A]'}`}>{abbr}</span>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isCurrent ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>{label}</p>
                {isCurrent && (
                  <p className="text-xs text-[#0669F7] mt-0.5">{t('profile_tabs.language.current_suffix')}</p>
                )}
              </div>
              {isLoading ? (
                <svg className="w-4 h-4 text-[#0669F7] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isCurrent ? (
                <svg className="w-5 h-5 text-[#0669F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Profile Completion Bar ────────────────────────────────────────────────────

function ProfileCompletionBar({ profile }: { profile: WorkerProfile }) {
  const t = useTranslations('worker')
  const checks = [
    !!profile.full_name, !!profile.date_of_birth, !!profile.gender,
    !!profile.primary_trade_id, !!profile.current_province, !!profile.bank_name,
    !!profile.id_front_url, !!profile.signature_url,
  ]
  const done = checks.filter(Boolean).length
  const pct = Math.round((done / checks.length) * 100)

  const isComplete = pct === 100
  const isGood = pct >= 60
  const theme = isComplete
    ? { card: 'bg-[#E6F9E6] border-[#86D98A]', bar: 'bg-[#00C800]', pct: 'text-[#1A6B1A]', sub: 'text-[#00C800]' }
    : isGood
    ? { card: 'bg-[#E6F0FE] border-[#B3D9FF]', bar: 'bg-[#0669F7]', pct: 'text-[#0669F7]', sub: 'text-[#5596F8]' }
    : { card: 'bg-[#FFF8E6] border-[#F5D87D]', bar: 'bg-[#FFC72C]', pct: 'text-[#856404]', sub: 'text-[#FFC72C]' }

  return (
    <div className={`rounded-2xl px-4 py-3 border ${theme.card}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#98A2B2] mb-2">{t('profile_tabs.completion_label')}</p>
          <div className="h-2.5 bg-white/70 rounded-full overflow-hidden">
            <div className={`h-full ${theme.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
          <p className={`text-xs mt-1.5 font-medium ${theme.sub}`}>{t('profile_tabs.completion_items', { done, total: checks.length })}</p>
        </div>
        <p className={`text-3xl font-bold tabular-nums leading-none mt-0.5 shrink-0 ${theme.pct}`}>
          {pct}<span className="text-base font-semibold">%</span>
        </p>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

const EMPTY_PROFILE: WorkerProfile = {
  full_name: '', date_of_birth: '', gender: null, bio: null,
  primary_trade_id: null, trade_name_ko: null, experience_months: 0,
  current_province: null, current_district: null, lat: null, lng: null,
  id_number: null, id_verified: false, id_front_url: null, id_back_url: null,
  signature_url: null, profile_image_url: null, bank_name: null,
  bank_account_number: null, bank_book_url: null, terms_accepted: false,
  privacy_accepted: false, profile_complete: false, phone: null, email: null,
}

export default function WorkerProfileTabs({ locale }: { locale: string }) {
  const t = useTranslations('worker')
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<Tab>('basic')
  const [profile, setProfile] = React.useState<WorkerProfile | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const token = getSessionCookie()

  const TABS: { id: Tab; label: string }[] = [
    { id: 'basic',      label: t('profile_tabs.tabs.basic') },
    { id: 'experience', label: t('profile_tabs.tabs.experience') },
    { id: 'address',    label: t('profile_tabs.tabs.address') },
    { id: 'bank',       label: t('profile_tabs.tabs.bank') },
    { id: 'id',         label: t('profile_tabs.tabs.id') },
    { id: 'signature',  label: t('profile_tabs.tabs.signature') },
  ]

  const TAB_DESCRIPTIONS: Record<Tab, string> = {
    basic:      t('profile_tabs.tab_desc.basic'),
    experience: t('profile_tabs.tab_desc.experience'),
    address:    t('profile_tabs.tab_desc.address'),
    bank:       t('profile_tabs.tab_desc.bank'),
    id:         t('profile_tabs.tab_desc.id'),
    signature:  t('profile_tabs.tab_desc.signature'),
  }

  React.useEffect(() => {
    if (!token) {
      setProfile(EMPTY_PROFILE)
      setLoading(false)
      return
    }
    fetch(`${API_BASE}/workers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data && res.data.full_name) {
          setProfile(res.data as WorkerProfile)
          setIsNew(false)
        } else {
          setProfile(EMPTY_PROFILE)
          setIsNew(true)
        }
      })
      .catch(() => { setProfile(EMPTY_PROFILE); setIsNew(true) })
      .finally(() => setLoading(false))
  }, [token])

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  function handleSaved(partial: Partial<WorkerProfile>) {
    setProfile(prev => prev ? { ...prev, ...partial } : prev)
    setIsNew(false)
    setToast({ message: t('profile_tabs.saved'), type: 'success' })
  }

  if (loading) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">{t('profile_tabs.title')}</h1>
        <div className="bg-white rounded-2xl border border-[#EFF1F5] p-6 shadow-sm">
          <Skeleton />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="py-6 text-center text-[#98A2B2] text-sm">{t('profile_tabs.load_fail')}</div>
    )
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Page header */}
      <div className="py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#25282A]">{t('profile_tabs.title')}</h1>
              {isNew && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#D6E8FE] text-[#0669F7] border border-[#B3D9FF]">
                  {t('profile_tabs.new_badge')}
                </span>
              )}
            </div>
            <p className="text-xs text-[#98A2B2] mt-1">{TAB_DESCRIPTIONS[activeTab]}</p>
          </div>
          <div className="hidden md:block w-72 shrink-0">
            <ProfileCompletionBar profile={profile} />
          </div>
        </div>
        <div className="md:hidden mt-3">
          <ProfileCompletionBar profile={profile} />
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="sticky z-10 bg-white border-b border-[#EFF1F5]"
        style={{ top: 'var(--app-bar-height, 56px)' }}
      >
        <div className="flex overflow-x-auto scrollbar-hide gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#0669F7] text-[#0669F7]'
                  : 'border-transparent text-[#7A7B7A] hover:text-[#25282A]'
              }`}
            >
              <NavIcon tab={tab.id} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="py-4">
        {isNew && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-[#E6F0FE] border border-[#B3D9FF] flex items-center gap-2 text-xs text-[#0669F7]">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('profile_tabs.new_hint')}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm p-5 md:p-8">
          {activeTab === 'basic'      && <BasicTab profile={profile} onSaved={handleSaved} locale={locale} />}
          {activeTab === 'experience' && <ExperienceTab profile={profile} onSaved={handleSaved} locale={locale} />}
          {activeTab === 'address'    && <AddressTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'bank'       && <BankTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'id'         && <IdTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'signature'  && <SignatureTab profile={profile} onSaved={handleSaved} />}

        </div>
      </div>
    </div>
  )
}
