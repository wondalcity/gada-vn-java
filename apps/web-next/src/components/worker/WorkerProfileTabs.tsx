'use client'

import * as React from 'react'
import { getSessionCookie } from '@/lib/auth/session'
import { getGoogleMapsLoader } from '@/lib/maps/loader'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

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
  terms_accepted: boolean
  privacy_accepted: boolean
  profile_complete: boolean
  phone: string | null
  email: string | null
}

type Tab = 'basic' | 'experience' | 'address' | 'bank' | 'id' | 'signature'

const TABS: { id: Tab; label: string }[] = [
  { id: 'basic',      label: '기본정보' },
  { id: 'experience', label: '직종/경력' },
  { id: 'address',    label: '주소' },
  { id: 'bank',       label: '계좌' },
  { id: 'id',         label: '신분증' },
  { id: 'signature',  label: '서명' },
]

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  basic:      '이름, 생년월일, 성별 등 기본 인적 사항을 관리합니다.',
  experience: '보유 직종과 경력을 입력하면 더 적합한 공고를 추천받을 수 있습니다.',
  address:    '현재 거주지 주소를 설정합니다.',
  bank:       '급여 수령을 위한 계좌 정보를 등록합니다.',
  id:         '신분증을 등록하면 플랫폼 신뢰도가 높아집니다.',
  signature:  '계약서 서명에 사용될 전자서명을 등록합니다.',
}

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
  // signature
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  )
}

// ── File upload helper ───────────────────────────────────────────────────────

async function uploadFile(token: string, file: File, folder: string): Promise<string> {
  const presignRes = await fetch(`${API_BASE}/files/presigned-url`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, folder }),
  })
  if (!presignRes.ok) throw new Error('업로드 URL 발급 실패')
  const { data: presign } = await presignRes.json()

  if (presign.isLocal) {
    const fd = new FormData()
    fd.append('file', file, presign.key)
    const res = await fetch(`${API_BASE}/files/upload-local`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (!res.ok) throw new Error('로컬 업로드 실패')
    const { data } = await res.json()
    return data.key
  }

  const uploadRes = await fetch(presign.url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadRes.ok) throw new Error('업로드 실패')
  return presign.key
}

async function saveProfile(token: string, data: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${API_BASE}/workers/me`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.ok
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

function SaveButton({ saving, onClick, label = '저장' }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="w-full mt-6 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
    >
      {saving ? '저장 중...' : label}
    </button>
  )
}

// ── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ label, url, onChange }: { label: string; url: string | null; onChange: (file: File) => void }) {
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
            <span className="text-xs text-[#98A2B2]">사진 선택</span>
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
  const [fullName, setFullName] = React.useState(profile.full_name ?? '')
  const [dob, setDob] = React.useState(profile.date_of_birth?.split('T')[0] ?? '')
  const [gender, setGender] = React.useState<'MALE' | 'FEMALE' | 'OTHER' | ''>(profile.gender ?? '')
  const [bio, setBio] = React.useState(profile.bio ?? '')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const maxDate = React.useMemo(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 15)
    return d.toISOString().split('T')[0]
  }, [])

  async function save() {
    if (!fullName.trim()) { setError('이름을 입력해주세요'); return }
    if (!dob) { setError('생년월일을 입력해주세요'); return }
    if (!gender) { setError('성별을 선택해주세요'); return }
    setError(''); setSaving(true)
    const token = getSessionCookie()
    try {
      const ok = await saveProfile(token!, { fullName: fullName.trim(), dateOfBirth: dob, gender, bio: bio.trim() || null })
      if (ok) onSaved({ full_name: fullName.trim(), date_of_birth: dob, gender: gender as 'MALE'|'FEMALE'|'OTHER', bio: bio.trim() || null })
      else setError('저장에 실패했습니다')
    } catch { setError('저장 중 오류가 발생했습니다') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Field label="이름 *">
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="이름" className={inputCls} />
      </Field>
      <Field label="생년월일 *">
        <input type="date" value={dob} max={maxDate} onChange={e => setDob(e.target.value)} className={inputCls} />
      </Field>
      <Field label="성별 *">
        <div className="flex gap-2">
          {(['MALE','FEMALE','OTHER'] as const).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${gender === g ? 'border-[#0669F7] bg-blue-50 text-[#0669F7]' : 'border-[#EFF1F5] text-[#98A2B2]'}`}>
              {g === 'MALE' ? '남성' : g === 'FEMALE' ? '여성' : '기타'}
            </button>
          ))}
        </div>
      </Field>
      <Field label="자기소개">
        <textarea rows={3} maxLength={500} value={bio} onChange={e => setBio(e.target.value)}
          placeholder="간단한 자기소개를 입력하세요" className={`${inputCls} resize-none`} />
        <p className="text-xs text-[#98A2B2] text-right mt-1">{bio.length}/500</p>
      </Field>
      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      <SaveButton saving={saving} onClick={save} />
    </div>
  )
}

// ── Experience Tab (multi-trade) ─────────────────────────────────────────────

function ExperienceTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const [trades, setTrades] = React.useState<Trade[]>([])
  const [tradeSkills, setTradeSkills] = React.useState<TradeSkill[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  // selectedTradeIds: Map<tradeId, years>
  const [selectedMap, setSelectedMap] = React.useState<Map<number, number>>(new Map())

  const token = getSessionCookie()

  React.useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/public/trades`).then(r => r.json()).then(b => b.data ?? b),
      fetch(`${API_BASE}/workers/me/trade-skills`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { data: [] }).then(b => b.data ?? []),
    ]).then(([tradesData, skillsData]) => {
      setTrades(tradesData)
      setTradeSkills(skillsData)
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

  if (loading) return <div className="py-8 text-center text-sm text-[#98A2B2]">로딩 중...</div>

  return (
    <div className="space-y-4">
      {/* Selected trades chips */}
      {selectedTrades.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#98A2B2]">선택된 직종 ({selectedTrades.length}개)</p>
          {selectedTrades
            .sort((a, b) => (selectedMap.get(b.id) ?? 0) - (selectedMap.get(a.id) ?? 0))
            .map(t => (
              <div key={t.id} className="flex items-center gap-2 p-2.5 bg-blue-50 border border-[#0669F7] rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0669F7] truncate">{t.nameKo}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={0} max={50}
                    value={selectedMap.get(t.id) ?? 0}
                    onChange={e => setYears(t.id, Number(e.target.value))}
                    className="w-14 px-2 py-1 rounded border border-[#0669F7] text-sm text-center bg-white focus:outline-none"
                  />
                  <span className="text-xs text-[#98A2B2]">년</span>
                  <button type="button" onClick={() => toggleTrade(t.id)}
                    className="ml-1 w-5 h-5 rounded-full bg-[#D81A48] text-white text-xs flex items-center justify-center">✕</button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Trade search */}
      <Field label="직종 검색 (다중 선택 가능)">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="직종 검색 (예: 도장, 용접...)" className={inputCls} />
      </Field>

      <div className="max-h-52 overflow-y-auto rounded-lg border border-[#EFF1F5]">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#98A2B2]">검색 결과가 없습니다</div>
        ) : (
          <ul>
            {filtered.map(t => {
              const isSelected = selectedMap.has(t.id)
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => toggleTrade(t.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 border-b border-[#EFF1F5] last:border-0 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>{t.nameKo}</p>
                      <p className="text-xs text-[#98A2B2]">{t.nameVi}</p>
                    </div>
                    {isSelected && <span className="text-[#0669F7] text-lg">✓</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-[#98A2B2]">직종을 탭하여 선택/해제하고, 각 직종별 경력 연수를 입력하세요.</p>
      <SaveButton saving={saving} onClick={save} />
    </div>
  )
}

// ── Address Tab ──────────────────────────────────────────────────────────────

function AddressTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
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
    })
  }, [mapsLoaded])

  async function save() {
    setSaving(true)
    const token = getSessionCookie()
    try {
      const ok = await saveProfile(token!, { currentProvince: province || null, currentDistrict: district || null, lat, lng })
      if (ok) onSaved({ current_province: province || null, current_district: district || null, lat: lat?.toString() ?? null, lng: lng?.toString() ?? null })
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {!mapsError ? (
        <Field label="주소 검색">
          <input ref={inputRef} type="text" defaultValue={profile.current_province ?? ''}
            placeholder={mapsLoaded ? '베트남 주소 검색...' : '지도 로딩 중...'} disabled={!mapsLoaded}
            className={`${inputCls} disabled:bg-gray-50`} />
        </Field>
      ) : (
        <>
          <Field label="성/시">
            <input type="text" value={province} onChange={e => setProvince(e.target.value)} placeholder="예: Hà Nội" className={inputCls} />
          </Field>
          <Field label="군/구">
            <input type="text" value={district} onChange={e => setDistrict(e.target.value)} placeholder="예: Quận 1" className={inputCls} />
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
      <SaveButton saving={saving} onClick={save} />
    </div>
  )
}

// ── Bank Tab ─────────────────────────────────────────────────────────────────

function BankTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const [bankName, setBankName] = React.useState(profile.bank_name ?? '')
  const [accountNumber, setAccountNumber] = React.useState(profile.bank_account_number ?? '')
  const [bankBookUrl, setBankBookUrl] = React.useState<string | null>(profile.bank_book_url)
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
        setError('통장사본 저장에 실패했습니다')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다')
    } finally { setUploading(false) }
  }

  async function save() {
    setSaving(true); setError('')
    try {
      const ok = await saveProfile(token!, { bankName: bankName.trim() || null, bankAccountNumber: accountNumber.trim() || null })
      if (ok) onSaved({ bank_name: bankName.trim() || null, bank_account_number: accountNumber.trim() || null })
      else setError('저장에 실패했습니다')
    } catch { setError('저장 중 오류가 발생했습니다') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Field label="은행명">
        <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
          placeholder="예: Vietcombank, BIDV, Agribank" className={inputCls} />
      </Field>
      <Field label="계좌번호">
        <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
          placeholder="계좌번호를 입력하세요" className={inputCls} />
      </Field>

      <div>
        <p className="text-xs font-medium text-[#98A2B2] mb-1">통장사본 {uploading && <span className="text-[#0669F7]">업로드 중...</span>}</p>
        <UploadZone label="" url={bankBookUrl} onChange={handleBankBookFile} />
        <p className="text-xs text-[#98A2B2] mt-1">통장 첫 페이지(은행명·계좌번호·이름이 보이는 면)를 촬영해 업로드하세요.</p>
      </div>

      <p className="text-xs text-[#98A2B2] bg-gray-50 rounded-lg p-3 border border-[#EFF1F5]">
        계좌 정보는 급여 지급 및 정산 시에만 사용됩니다.
      </p>

      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      <SaveButton saving={saving} onClick={save} />
    </div>
  )
}

// ── ID Tab ───────────────────────────────────────────────────────────────────

function StatusBadge({ verified, hasDoc }: { verified: boolean; hasDoc: boolean }) {
  if (verified) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">✓ 인증완료</span>
  )
  if (hasDoc) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">검토중</span>
  )
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-[#98A2B2] border border-[#EFF1F5]">미등록</span>
}

function IdTab({ profile, onSaved }: { profile: WorkerProfile; onSaved: (p: Partial<WorkerProfile>) => void }) {
  const [idNumber, setIdNumber] = React.useState(profile.id_number ?? '')
  const [frontUrl, setFrontUrl] = React.useState<string | null>(profile.id_front_url)
  const [backUrl, setBackUrl] = React.useState<string | null>(profile.id_back_url)
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
        setSuccess('앞면이 저장되었습니다.')
      } else setError('앞면 저장 실패')
    } catch (e) { setError(e instanceof Error ? e.message : '업로드 실패') }
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
        setSuccess('뒷면이 저장되었습니다.')
      } else setError('뒷면 저장 실패')
    } catch (e) { setError(e instanceof Error ? e.message : '업로드 실패') }
    finally { setUploading(null) }
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('')
    try {
      const ok = await saveProfile(token!, { idNumber: idNumber.trim() || null })
      if (ok) { onSaved({ id_number: idNumber.trim() || null }); setSuccess('신분증 번호가 저장되었습니다.') }
      else setError('저장에 실패했습니다')
    } catch { setError('저장 중 오류가 발생했습니다') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#25282A]">신분증 등록</p>
        <StatusBadge verified={profile.id_verified} hasDoc={hasDoc} />
      </div>

      <div className="flex gap-3">
        <UploadZone label={uploading === 'front' ? '앞면 업로드 중...' : '앞면'} url={frontUrl} onChange={handleFront} />
        <UploadZone label={uploading === 'back' ? '뒷면 업로드 중...' : '뒷면'} url={backUrl} onChange={handleBack} />
      </div>
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-[#0669F7]">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {uploading === 'front' ? '앞면' : '뒷면'} 이미지 저장 중...
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#98A2B2] mb-1">
          신분증 번호 <span className="text-[#98A2B2] font-normal">(베트남 ID 또는 여권번호)</span>
        </label>
        <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)}
          placeholder="신분증 번호를 입력하세요" className={inputCls} />
      </div>

      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      {success && <p className="text-xs text-green-700">{success}</p>}
      <SaveButton saving={saving} onClick={save} label="번호 저장" />
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
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const { initCanvas, startDrawing, draw, stopDrawing, clear, getBlob, checkIsEmpty } = useSignaturePad(canvasRef)
  const [existingUrl, setExistingUrl] = React.useState<string | null>(profile.signature_url)
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
    if (checkIsEmpty()) { setError('서명을 입력해주세요.'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const blob = await getBlob()
      if (!blob) throw new Error('서명 이미지 생성 실패')
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      const key = await uploadFile(token!, file, 'worker-signatures')
      const ok = await saveProfile(token!, { signatureS3Key: key })
      if (ok) {
        const url = URL.createObjectURL(blob)
        setExistingUrl(url); onSaved({ signature_url: url })
        setSuccess('서명이 저장되었습니다.')
        clear()
      } else {
        setError('저장에 실패했습니다')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {existingUrl && (
        <div>
          <p className="text-xs font-medium text-[#98A2B2] mb-1">현재 서명</p>
          <div className="border border-[#EFF1F5] rounded-lg p-3 bg-gray-50">
            <img src={existingUrl} alt="현재 서명" className="max-h-20 object-contain mx-auto" />
          </div>
          <p className="text-xs text-[#98A2B2] mt-1">아래에 새 서명을 입력하면 덮어쓰기됩니다.</p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-[#98A2B2] mb-1">{existingUrl ? '새 서명 입력' : '서명 입력'}</p>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '160px', border: '1px solid #EFF1F5', borderRadius: '8px', touchAction: 'none', display: 'block', cursor: 'crosshair', backgroundColor: '#FAFAFA' }}
        />
        <p className="text-xs text-[#98A2B2] mt-1">손가락이나 마우스로 서명하세요</p>
      </div>

      {error && <p className="text-xs text-[#D81A48]">{error}</p>}
      {success && <p className="text-xs text-green-700">{success}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => { clear(); setError(''); setSuccess('') }}
          className="flex-1 py-3 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm">지우기</button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}

// ── Completion bar ────────────────────────────────────────────────────────────

function ProfileCompletionBar({ profile }: { profile: WorkerProfile }) {
  const checks = [
    !!profile.full_name, !!profile.date_of_birth, !!profile.gender,
    !!profile.primary_trade_id, !!profile.current_province, !!profile.bank_name,
    !!profile.id_front_url, !!profile.signature_url,
  ]
  const done = checks.filter(Boolean).length
  const pct = Math.round((done / checks.length) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[#F2F4F5] rounded-full overflow-hidden">
        <div className="h-full bg-[#0669F7] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-semibold text-[#0669F7] shrink-0">프로필 {pct}%</p>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

const DEMO_PROFILE: WorkerProfile = {
  full_name: 'Nguyen Van An',
  date_of_birth: '1995-06-15',
  gender: 'MALE',
  bio: '베트남 하노이 출신 건설 근로자입니다. 전기 배선 및 철근 작업 경험 5년 보유.',
  primary_trade_id: 1,
  trade_name_ko: '전기공',
  experience_months: 60,
  current_province: 'Hà Nội',
  current_district: 'Cầu Giấy',
  lat: '21.028511',
  lng: '105.804817',
  id_number: null,
  id_verified: false,
  id_front_url: null,
  id_back_url: null,
  signature_url: null,
  bank_name: 'Vietcombank',
  bank_account_number: '1234567890',
  bank_book_url: null,
  terms_accepted: true,
  privacy_accepted: true,
  profile_complete: false,
  phone: '+84901234567',
  email: null,
}

export default function WorkerProfileTabs({ locale: _locale }: { locale: string }) {
  const [activeTab, setActiveTab] = React.useState<Tab>('basic')
  const [profile, setProfile] = React.useState<WorkerProfile | null>(null)
  const [isDemo, setIsDemo] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const token = getSessionCookie()

  React.useEffect(() => {
    if (!token) {
      setProfile(DEMO_PROFILE)
      setIsDemo(true)
      setLoading(false)
      return
    }
    fetch(`${API_BASE}/workers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data) {
          const p: WorkerProfile = res.data
          if (!p.full_name) {
            setProfile(DEMO_PROFILE)
            setIsDemo(true)
          } else {
            setProfile(p)
            setIsDemo(false)
          }
        } else {
          setProfile(DEMO_PROFILE)
          setIsDemo(true)
        }
      })
      .catch(() => { setProfile(DEMO_PROFILE); setIsDemo(true) })
      .finally(() => setLoading(false))
  }, [token])

  React.useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  function handleSaved(partial: Partial<WorkerProfile>) {
    setProfile(prev => prev ? { ...prev, ...partial } : prev)
    setToast({ message: '저장되었습니다', type: 'success' })
  }

  if (loading) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-[#25282A] mb-6">프로필 관리</h1>
        <div className="bg-white rounded-2xl border border-[#EFF1F5] p-6 shadow-sm">
          <Skeleton />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="py-6 text-center text-[#98A2B2] text-sm">프로필 정보를 불러올 수 없습니다.</div>
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
              <h1 className="text-xl font-bold text-[#25282A]">프로필 관리</h1>
              {isDemo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  데모 데이터
                </span>
              )}
            </div>
            <p className="text-xs text-[#98A2B2] mt-1">{TAB_DESCRIPTIONS[activeTab]}</p>
          </div>
          {/* Completion bar — desktop inline */}
          <div className="hidden md:block w-52 pt-1">
            <ProfileCompletionBar profile={profile} />
          </div>
        </div>
        {/* Completion bar — mobile */}
        <div className="md:hidden mt-3">
          <ProfileCompletionBar profile={profile} />
        </div>
      </div>

      {/* Tab bar — sticky below app bar */}
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

      {/* Content card */}
      <div className="py-4">
        {isDemo && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-700">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            데모 데이터입니다. 실제 정보를 입력하고 저장하면 반영됩니다.
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
