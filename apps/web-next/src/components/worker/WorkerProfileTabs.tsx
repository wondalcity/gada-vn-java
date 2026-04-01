'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { getSessionCookie, clearSessionCookie } from '@/lib/auth/session'
import { getGoogleMapsLoader } from '@/lib/maps/loader'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'
const CDN_DOMAIN = process.env.NEXT_PUBLIC_CDN_DOMAIN ?? ''

function toCdnUrl(urlOrKey: string | null): string | null {
  if (!urlOrKey) return null
  if (urlOrKey.startsWith('http') || urlOrKey.startsWith('blob:') || urlOrKey.startsWith('data:')) return urlOrKey
  if (!CDN_DOMAIN) return urlOrKey
  const base = CDN_DOMAIN.startsWith('http') ? CDN_DOMAIN : `https://${CDN_DOMAIN}`
  return `${base}/${urlOrKey}`
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Trade { id: number; nameKo: string; nameVi: string }
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
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-lg text-sm font-medium text-white ${type === 'success' ? 'bg-green-600' : 'bg-[#D81A48]'}`}>
      {type === 'success' ? '✓ ' : '✕ '}{message}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="h-10 bg-gray-100 rounded-lg" />
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
      className="w-full mt-6 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
    >
      {saving ? t('profile_tabs.shared_saving') : label}
    </button>
  )
}

// ── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ label, url, onChange }: { label: string; url: string | null; onChange: (file: File) => void }) {
  const t = useTranslations('worker')
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div className="flex-1">
      <p className="text-xs font-medium text-[#98A2B2] mb-1">{label}</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`relative w-full h-36 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors bg-gray-50 ${url ? 'border-[#0669F7]' : 'border-[#EFF1F5] hover:border-[#0669F7]'}`}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-3">
            <svg className="w-6 h-6 text-[#98A2B2] mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-[#98A2B2]">{t('profile_tabs.id.photo_select')}</span>
          </div>
        )}
      </button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f) }} />
    </div>
  )
}

// ── Basic Info Tab ───────────────────────────────────────────────────────────

function BasicTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
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
    if (!dob) { setError(t('profile_tabs.basic.error_dob')); return }
    if (!gender) { setError(t('profile_tabs.basic.error_gender')); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('profile_tabs.basic.error_email')); return
    }
    setError(''); setEmailError(''); setSaving(true)
    try {
      const [profileOk, emailRes] = await Promise.all([
        saveProfile(token!, { fullName: fullName.trim(), dateOfBirth: dob, gender, bio: bio.trim() || null }),
        fetch(`${API_BASE}/auth/me`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() || null }),
        }),
      ])
      if (profileOk && emailRes.ok) {
        onSaved({ full_name: fullName.trim(), date_of_birth: dob, gender: gender as 'MALE'|'FEMALE'|'OTHER', bio: bio.trim() || null, email: email.trim() || null })
      } else {
        setError(t('profile_tabs.basic.save_fail'))
      }
    } catch { setError(t('profile_tabs.basic.save_error')) }
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
            className="px-4 py-2 rounded-full bg-[#0669F7] text-white text-xs font-medium disabled:opacity-40">
            {profileImageUrl ? t('profile_tabs.basic.photo_change') : t('profile_tabs.basic.photo_register')}
          </button>
          {profileImageUrl && (
            <button type="button" onClick={handleDeleteProfileImage}
              className="px-4 py-2 rounded-full border border-[#D81A48] text-[#D81A48] text-xs font-medium">
              {t('profile_tabs.basic.photo_delete')}
            </button>
          )}
          <p className="text-xs text-[#98A2B2]">{t('profile_tabs.basic.photo_hint')}</p>
        </div>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleProfileImage(f) }} />
      </div>
      {imageError && <p className="text-xs text-[#D81A48]">{imageError}</p>}

      <Field label={t('profile_tabs.basic.full_name')}>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
          placeholder={t('profile_tabs.basic.name_placeholder')} className={inputCls} />
      </Field>
      <Field label={t('profile_tabs.basic.dob')}>
        <input type="date" value={dob} max={maxDate} onChange={e => setDob(e.target.value)} className={inputCls} />
      </Field>
      <Field label={t('profile_tabs.basic.gender')}>
        <div className="flex gap-2">
          {(['MALE','FEMALE','OTHER'] as const).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${gender === g ? 'border-[#0669F7] bg-blue-50 text-[#0669F7]' : 'border-[#EFF1F5] text-[#98A2B2]'}`}>
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
      {/* 전화번호 (읽기전용) */}
      {profile.phone && (
        <Field label={t('profile_tabs.basic.phone_label')}>
          <div className={`${inputCls} bg-[#F8F8FA] text-[#98A2B2] cursor-not-allowed`}>
            {profile.phone}
          </div>
        </Field>
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
      {emailError && <p className="text-xs text-[#D81A48] mt-1">{emailError}</p>}

      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.shared_save')} />
    </div>
  )
}

// ── Experience Tab ───────────────────────────────────────────────────────────

function ExperienceTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [selectedMap, setSelectedMap] = React.useState<Map<number, number>>(new Map())

  const token = getSessionCookie()

  React.useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/public/trades`).then(r => r.json()).then(b => b.data ?? b),
      fetch(`${API_BASE}/workers/me/trade-skills`, { headers: { Authorization: `Bearer ${token}` } })
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
      else next.set(tradeId, 0)
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
          experience_months: primaryTrade ? (selectedMap.get(primaryTrade.id) ?? 0) * 12 : 0,
        })
      }
    } catch { /* ignore */ }
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
              <div key={tr.id} className="flex items-center gap-2 p-2.5 bg-blue-50 border border-[#0669F7] rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0669F7] truncate">{tr.nameKo}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number" min={0} max={50}
                    value={selectedMap.get(tr.id) ?? 0}
                    onChange={e => setYears(tr.id, Number(e.target.value))}
                    className="w-14 px-2 py-1 rounded border border-[#0669F7] text-sm text-center bg-white focus:outline-none"
                  />
                  <span className="text-xs text-[#98A2B2]">{t('profile_tabs.experience.years_unit')}</span>
                  <button type="button" onClick={() => toggleTrade(tr.id)}
                    className="ml-1 w-5 h-5 rounded-full bg-[#D81A48] text-white text-xs flex items-center justify-center">✕</button>
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
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 border-b border-[#EFF1F5] last:border-0 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>{tr.nameKo}</p>
                      <p className="text-xs text-[#98A2B2]">{tr.nameVi}</p>
                    </div>
                    {isSelected && <span className="text-[#0669F7] text-lg">✓</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-[#98A2B2]">{t('profile_tabs.experience.hint')}</p>
      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.shared_save')} />
    </div>
  )
}

// ── Address Tab ──────────────────────────────────────────────────────────────

interface SavedLocation {
  id: string
  label: string
  address: string | null
  lat: number
  lng: number
  is_default: boolean
}

function AddressTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const acRef = React.useRef<google.maps.places.Autocomplete | null>(null)
  const [mapsLoaded, setMapsLoaded] = React.useState(false)
  const [mapsError, setMapsError] = React.useState(false)
  const [province, setProvince] = React.useState(profile.current_province ?? '')
  const [district, setDistrict] = React.useState(profile.current_district ?? '')
  const [addressLabel, setAddressLabel] = React.useState('')
  const [lat, setLat] = React.useState<number | null>(profile.lat ? Number(profile.lat) : null)
  const [lng, setLng] = React.useState<number | null>(profile.lng ? Number(profile.lng) : null)
  const [saving, setSaving] = React.useState(false)
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([])
  const [savingLocation, setSavingLocation] = React.useState(false)
  const [locationLabel, setLocationLabel] = React.useState(t('profile_tabs.address.default_location_label'))
  const [locationSaved, setLocationSaved] = React.useState(false)

  React.useEffect(() => {
    getGoogleMapsLoader().load().then(() => setMapsLoaded(true)).catch(() => setMapsError(true))
  }, [])

  React.useEffect(() => {
    if (!mapsLoaded || !inputRef.current || acRef.current) return
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'vn' },
      fields: ['address_components', 'formatted_address', 'geometry'],
    })
    acRef.current = ac
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.geometry?.location) return
      let prov = '', dist = ''
      for (const c of place.address_components ?? []) {
        if (c.types.includes('administrative_area_level_1')) prov = c.long_name
        if (c.types.includes('administrative_area_level_2')) dist = c.long_name
      }
      setProvince(prov); setDistrict(dist)
      setAddressLabel(place.formatted_address ?? '')
      setLat(place.geometry.location.lat()); setLng(place.geometry.location.lng())
      setLocationSaved(false)
    })
  }, [mapsLoaded])

  React.useEffect(() => {
    const token = getSessionCookie()
    if (!token) return
    fetch(`${API_BASE}/workers/saved-locations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(res => { if (res?.data) setSavedLocations(res.data) })
      .catch(() => undefined)
  }, [])

  async function save() {
    setSaving(true)
    const token = getSessionCookie()
    try {
      const ok = await saveProfile(token!, { currentProvince: province || null, currentDistrict: district || null, lat, lng })
      if (ok) onSaved({ current_province: province || null, current_district: district || null, lat: lat?.toString() ?? null, lng: lng?.toString() ?? null })
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function saveAsSearchLocation() {
    if (lat == null || lng == null) return
    const token = getSessionCookie()
    if (!token) return
    setSavingLocation(true)
    try {
      const res = await fetch(`${API_BASE}/workers/saved-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          label: locationLabel || t('profile_tabs.address.default_location_label'),
          address: addressLabel || province || null,
          lat, lng,
          isDefault: savedLocations.length === 0,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        const loc: SavedLocation = json.data
        setSavedLocations(prev => {
          const filtered = prev.filter(l => l.label !== loc.label)
          return loc.is_default
            ? [loc, ...filtered.map(l => ({ ...l, is_default: false }))]
            : [...filtered, loc]
        })
        setLocationSaved(true)
      }
    } catch { /* ignore */ }
    finally { setSavingLocation(false) }
  }

  async function deleteLocation(id: string) {
    const token = getSessionCookie()
    if (!token) return
    await fetch(`${API_BASE}/workers/saved-locations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined)
    setSavedLocations(prev => prev.filter(l => l.id !== id))
  }

  const canSaveLocation = lat != null && lng != null

  return (
    <div className="space-y-4">
      {!mapsError ? (
        <Field label={t('profile_tabs.address.search_label')}>
          <input ref={inputRef} type="text" defaultValue={profile.current_province ?? ''}
            placeholder={mapsLoaded ? t('profile_tabs.address.search_placeholder') : t('profile_tabs.address.maps_loading')}
            disabled={!mapsLoaded}
            className={`${inputCls} disabled:bg-gray-50`} />
        </Field>
      ) : (
        <>
          <Field label={t('profile_tabs.address.province_label')}>
            <input type="text" value={province} onChange={e => setProvince(e.target.value)}
              placeholder={t('profile_tabs.address.province_placeholder')} className={inputCls} />
          </Field>
          <Field label={t('profile_tabs.address.district_label')}>
            <input type="text" value={district} onChange={e => setDistrict(e.target.value)}
              placeholder={t('profile_tabs.address.district_placeholder')} className={inputCls} />
          </Field>
        </>
      )}

      {(addressLabel || province) && (
        <div className="p-3 bg-gray-50 rounded-lg border border-[#EFF1F5] text-sm">
          <p className="font-medium text-[#25282A]">{addressLabel || province}</p>
          {district && <p className="text-xs text-[#98A2B2] mt-0.5">{district}</p>}
          {lat != null && <p className="text-xs text-[#98A2B2] mt-0.5">{lat.toFixed(5)}, {lng?.toFixed(5)}</p>}
        </div>
      )}

      {canSaveLocation && !locationSaved && (
        <div className="p-3 bg-[#E6F0FE] rounded-lg border border-[#0669F7]">
          <p className="text-xs font-medium text-[#0669F7] mb-2">{t('profile_tabs.address.save_location_title')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={locationLabel}
              onChange={e => setLocationLabel(e.target.value)}
              placeholder={t('profile_tabs.address.location_label_placeholder')}
              className="flex-1 px-3 py-1.5 text-sm border border-[#0669F7] rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#0669F7]"
            />
            <button
              type="button"
              onClick={saveAsSearchLocation}
              disabled={savingLocation || !locationLabel.trim()}
              className="px-4 py-1.5 text-sm font-medium bg-[#0669F7] text-white rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {savingLocation ? t('profile_tabs.address.location_saving') : t('profile_tabs.address.location_save')}
            </button>
          </div>
        </div>
      )}

      {locationSaved && (
        <p className="text-xs text-[#0669F7] font-medium">{t('profile_tabs.address.location_saved')}</p>
      )}

      {savedLocations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[#98A2B2] mb-2">{t('profile_tabs.address.saved_locations_title')}</p>
          <div className="flex flex-col gap-1.5">
            {savedLocations.map(loc => (
              <div key={loc.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#EFF1F5] rounded-lg">
                <span className="text-sm">{loc.is_default ? '⭐' : '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#25282A] truncate">{loc.label}</p>
                  {loc.address && <p className="text-xs text-[#98A2B2] truncate">{loc.address}</p>}
                </div>
                <button type="button" onClick={() => deleteLocation(loc.id)}
                  className="text-[#98A2B2] hover:text-[#D81A48] text-sm font-bold shrink-0"
                  aria-label="delete">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.shared_save')} />
    </div>
  )
}

// ── Bank Tab ─────────────────────────────────────────────────────────────────

function BankTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
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
        setError(t('profile_tabs.bank.upload_fail'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile_tabs.bank.upload_fail'))
    } finally { setUploading(false) }
  }

  async function save() {
    setSaving(true); setError('')
    try {
      const ok = await saveProfile(token!, { bankName: bankName.trim() || null, bankAccountNumber: accountNumber.trim() || null })
      if (ok) onSaved({ bank_name: bankName.trim() || null, bank_account_number: accountNumber.trim() || null })
      else setError(t('profile_tabs.bank.save_fail'))
    } catch { setError(t('profile_tabs.bank.save_error')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Field label={t('profile_tabs.bank.bank_name_label')}>
        <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
          placeholder={t('profile_tabs.bank.bank_name_placeholder')} className={inputCls} />
      </Field>
      <Field label={t('profile_tabs.bank.account_label')}>
        <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
          placeholder={t('profile_tabs.bank.account_placeholder')} className={inputCls} />
      </Field>

      <div>
        <p className="text-xs font-medium text-[#98A2B2] mb-1">
          {t('profile_tabs.bank.bankbook_label')} {uploading && <span className="text-[#0669F7]">{t('profile_tabs.bank.bankbook_uploading')}</span>}
        </p>
        <UploadZone label="" url={bankBookUrl} onChange={handleBankBookFile} />
        <p className="text-xs text-[#98A2B2] mt-1">{t('profile_tabs.bank.bankbook_hint')}</p>
      </div>

      <p className="text-xs text-[#98A2B2] bg-gray-50 rounded-lg p-3 border border-[#EFF1F5]">
        {t('profile_tabs.bank.privacy_notice')}
      </p>

      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      <SaveButton saving={saving} onClick={save} label={t('profile_tabs.shared_save')} />
    </div>
  )
}

// ── ID Tab ───────────────────────────────────────────────────────────────────

function StatusBadge({ verified, hasDoc }: { verified: boolean; hasDoc: boolean }) {
  const t = useTranslations('worker')
  if (verified) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">✓ {t('profile_tabs.id.status_verified')}</span>
  )
  if (hasDoc) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">{t('profile_tabs.id.status_pending')}</span>
  )
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-[#98A2B2] border border-[#EFF1F5]">{t('profile_tabs.id.status_none')}</span>
}

function IdTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const t = useTranslations('worker')
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
      } else setError(t('profile_tabs.id.front_fail'))
    } catch (e) { setError(e instanceof Error ? e.message : t('profile_tabs.id.upload_fail')) }
    finally { setUploading(null) }
  }

  async function handleBack(file: File) {
    if (uploading) return
    setError(''); setUploading('back')
    try {
      const key = await uploadFile(token!, file, 'worker-id-docs')
      const ok = await saveProfile(token!, { idBackS3Key: key })
      if (ok) {
        const url = URL.createObjectURL(file)
        setBackUrl(url); onSaved({ id_back_url: url })
        setSuccess(t('profile_tabs.id.back_saved'))
      } else setError(t('profile_tabs.id.back_fail'))
    } catch (e) { setError(e instanceof Error ? e.message : t('profile_tabs.id.upload_fail')) }
    finally { setUploading(null) }
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('')
    try {
      const ok = await saveProfile(token!, { idNumber: idNumber.trim() || null })
      if (ok) { onSaved({ id_number: idNumber.trim() || null }); setSuccess(t('profile_tabs.id.number_saved')) }
      else setError(t('profile_tabs.id.save_fail'))
    } catch { setError(t('profile_tabs.id.save_error')) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#25282A]">{t('profile_tabs.id.section_title')}</p>
        <StatusBadge verified={profile.id_verified} hasDoc={hasDoc} />
      </div>

      <div className="flex gap-3">
        <UploadZone label={uploading === 'front' ? t('profile_tabs.id.front_uploading') : t('profile_tabs.id.front')} url={frontUrl} onChange={handleFront} />
        <UploadZone label={uploading === 'back' ? t('profile_tabs.id.back_uploading') : t('profile_tabs.id.back')} url={backUrl} onChange={handleBack} />
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

      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      {success && <p className="text-xs text-green-700">{success}</p>}
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
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const { initCanvas, startDrawing, draw, stopDrawing, clear, getBlob, checkIsEmpty } = useSignaturePad(canvasRef)
  const [existingUrl, setExistingUrl] = React.useState<string | null>(toCdnUrl(profile.signature_url))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')

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
    if (checkIsEmpty()) { setError(t('profile_tabs.signature.error_empty')); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const blob = await getBlob()
      if (!blob) throw new Error(t('profile_tabs.signature.save_fail'))
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      const key = await uploadFile(token!, file, 'worker-signatures')
      const ok = await saveProfile(token!, { signatureS3Key: key })
      if (ok) {
        const url = toCdnUrl(key) ?? URL.createObjectURL(blob)
        setExistingUrl(url); onSaved({ signature_url: url })
        setSuccess(t('profile_tabs.signature.saved'))
        clear()
      } else {
        setError(t('profile_tabs.signature.save_fail'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile_tabs.signature.save_error'))
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {existingUrl && (
        <div>
          <p className="text-xs font-medium text-[#98A2B2] mb-1">{t('profile_tabs.signature.current_label')}</p>
          <div className="border border-[#EFF1F5] rounded-lg p-3 bg-gray-50">
            <img src={existingUrl} alt={t('profile_tabs.signature.current_label')} className="max-h-20 object-contain mx-auto" />
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

      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      {success && <p className="text-xs text-green-700">{success}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => { clear(); setError(''); setSuccess('') }}
          className="flex-1 py-3 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm">
          {t('profile_tabs.signature.clear')}
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40">
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
    { code: 'ko', label: t('profile_tabs.language.ko'), flag: '🇰🇷' },
    { code: 'vi', label: t('profile_tabs.language.vi'), flag: '🇻🇳' },
    { code: 'en', label: t('profile_tabs.language.en'), flag: '🇺🇸' },
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
        {LOCALES.map(({ code, label, flag }) => {
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
                  ? 'border-[#0669F7] bg-blue-50'
                  : 'border-[#EFF1F5] bg-white hover:border-[#0669F7]/40 hover:bg-gray-50',
                !!pending && !isCurrent ? 'opacity-40' : '',
              ].join(' ')}
            >
              <span className="text-2xl">{flag}</span>
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
    ? { card: 'bg-green-50 border-green-200', bar: 'bg-green-500', pct: 'text-green-600', sub: 'text-green-500' }
    : isGood
    ? { card: 'bg-blue-50 border-blue-200', bar: 'bg-[#0669F7]', pct: 'text-[#0669F7]', sub: 'text-[#5596F8]' }
    : { card: 'bg-amber-50 border-amber-200', bar: 'bg-amber-500', pct: 'text-amber-600', sub: 'text-amber-500' }

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
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
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
          <div className="mb-4 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2 text-xs text-blue-700">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('profile_tabs.new_hint')}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm p-5 md:p-8">
          {activeTab === 'basic'      && <BasicTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'experience' && <ExperienceTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'address'    && <AddressTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'bank'       && <BankTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'id'         && <IdTab profile={profile} onSaved={handleSaved} />}
          {activeTab === 'signature'  && <SignatureTab profile={profile} onSaved={handleSaved} />}

        </div>
      </div>
    </div>
  )
}
