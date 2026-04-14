'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/lib/api/client'
import { getGoogleMapsLoader } from '@/lib/maps/loader'
import ImageUploader from '@/components/manager/ImageUploader'
import type { Site, SiteStatus } from '@/types/manager-site-job'

const API_BASE = '/api/v1'

interface SiteFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Site>
  siteId?: string
  locale: string
  idToken: string
}

// ── Custom dropdown ──────────────────────────────────────────────────────────
interface CustomSelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

function CustomSelect({ value, onChange, options, placeholder }: CustomSelectProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const selectedLabel = options.find((o) => o.value === value)?.label

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm bg-white"
      >
        <span className={selectedLabel ? 'text-[#25282A]' : 'text-[#98A2B2]'}>
          {selectedLabel ?? placeholder ?? '선택'}
        </span>
        <svg
          className={`w-4 h-4 text-[#98A2B2] shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-[#EFF1F5] shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#E6F0FE] hover:text-[#0669F7] ${
                opt.value === value
                  ? 'bg-[#E6F0FE] text-[#0669F7] font-semibold'
                  : opt.value === ''
                    ? 'text-[#98A2B2]'
                    : 'text-[#25282A]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main form ────────────────────────────────────────────────────────────────
export default function SiteForm({ mode, initialData, siteId, locale, idToken }: SiteFormProps) {
  const router = useRouter()
  const tType = useTranslations('site_type_labels')
  const tStatus = useTranslations('site_status')

  const SITE_TYPE_OPTIONS = [
    { value: '', label: tType('select') },
    { value: '아파트/주거', label: tType('residential') },
    { value: '도로/교량',   label: tType('road_bridge') },
    { value: '상업시설',    label: tType('commercial') },
    { value: '산업시설',    label: tType('industrial') },
    { value: '공공시설',    label: tType('public') },
    { value: '기타',        label: tType('other') },
  ]

  const STATUS_OPTIONS: { value: SiteStatus; label: string }[] = [
    { value: 'ACTIVE',    label: tStatus('ACTIVE') },
    { value: 'PAUSED',    label: tStatus('PAUSED') },
    { value: 'COMPLETED', label: tStatus('COMPLETED') },
  ]

  const [name, setName] = React.useState(initialData?.name ?? '')
  const [nameVi, setNameVi] = React.useState(initialData?.nameVi ?? '')
  const [address, setAddress] = React.useState(initialData?.address ?? '')
  const [province, setProvince] = React.useState(initialData?.province ?? '')
  const [district, setDistrict] = React.useState(initialData?.district ?? '')
  const [lat, setLat] = React.useState<number | undefined>(initialData?.lat)
  const [lng, setLng] = React.useState<number | undefined>(initialData?.lng)
  const [siteType, setSiteType] = React.useState(initialData?.siteType ?? '')
  const [status, setStatus] = React.useState<SiteStatus>(initialData?.status ?? 'ACTIVE')

  // Edit mode: uploaded image URLs + cover index
  const [images, setImages] = React.useState<string[]>(initialData?.imageUrls ?? [])
  const [coverIdx, setCoverIdx] = React.useState<number>(
    (initialData as (Partial<Site> & { coverImageIdx?: number }) | undefined)?.coverImageIdx ?? 0,
  )
  const [isUploading, setIsUploading] = React.useState(false)

  // Create mode: pending files (queued for upload after site is saved)
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = React.useState<string[]>([])
  const pendingInputRef = React.useRef<HTMLInputElement>(null)

  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mapsError, setMapsError] = React.useState(false)

  const addressInputRef = React.useRef<HTMLInputElement>(null)
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null)
  const addressPickedFromMapRef = React.useRef(false)

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    let isMounted = true
    getGoogleMapsLoader()
      .load()
      .then(() => {
        if (!isMounted || !addressInputRef.current) return
        const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'vn' },
          fields: ['formatted_address', 'geometry', 'address_components'],
        })
        autocompleteRef.current = autocomplete
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (!place.geometry) return
          const formatted = place.formatted_address ?? ''
          setAddress(formatted)
          const geo = place.geometry.location
          if (geo) { setLat(geo.lat()); setLng(geo.lng()) }

          let provinceVal = ''
          let districtVal = ''
          for (const component of place.address_components ?? []) {
            if (component.types.includes('administrative_area_level_1')) provinceVal = component.long_name
            if (component.types.includes('administrative_area_level_2')) districtVal = component.long_name
          }
          if (!provinceVal) {
            for (const component of place.address_components ?? []) {
              if (component.types.includes('locality')) { provinceVal = component.long_name; break }
            }
          }
          if (!provinceVal && formatted) {
            const parts = formatted.split(',').map((p: string) => p.trim()).filter(Boolean)
            const filtered = parts.filter((p: string) =>
              p.toLowerCase() !== 'vietnam' && p.toLowerCase() !== 'việt nam'
            )
            if (filtered.length > 0) provinceVal = filtered[filtered.length - 1]
          }
          setProvince(provinceVal)
          setDistrict(districtVal)
          addressPickedFromMapRef.current = true
        })
      })
      .catch(() => { if (isMounted) setMapsError(true) })
    return () => { isMounted = false }
  }, [])

  // ── Upload via base64 proxy (server → S3, no CORS issues) ────────────────
  async function uploadOneFile(targetSiteId: string, file: File): Promise<void> {
    // Read file as base64 data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })

    // Upload via NestJS API → S3 (server-side, no CORS needed)
    const uploadRes = await fetch(`${API_BASE}/files/upload-base64`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, folder: 'sites' }),
    })
    if (!uploadRes.ok) throw new Error('이미지 업로드 실패')
    const { data: uploadData } = await uploadRes.json()

    // Register S3 key with site
    const res = await fetch(`${API_BASE}/manager/sites/${targetSiteId}/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: uploadData.key }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message ?? '이미지 등록 실패')
    }
    const { data } = await res.json()
    setImages(data.imageUrls)
    setCoverIdx(data.coverImageIdx)
  }

  // ── Edit mode: ImageUploader callback ────────────────────────────────────
  async function handleImageUpload(files: File[]) {
    if (!siteId || files.length === 0) return
    setIsUploading(true)
    setError(null)
    try {
      for (const file of files) {
        await uploadOneFile(siteId, file)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Edit mode: remove image ──────────────────────────────────────────────
  async function handleRemoveImage(idx: number) {
    if (!siteId) return
    const res = await fetch(`${API_BASE}/manager/sites/${siteId}/images/${idx}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (!res.ok) throw new Error('이미지 삭제 실패')
    const { data } = await res.json()
    setImages(data.imageUrls)
    setCoverIdx(data.coverImageIdx)
  }

  // ── Edit mode: set cover ─────────────────────────────────────────────────
  async function handleSetCover(idx: number) {
    if (!siteId) return
    const res = await fetch(`${API_BASE}/manager/sites/${siteId}/cover`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: idx }),
    })
    if (!res.ok) throw new Error('대표 이미지 변경 실패')
    const { data } = await res.json()
    setCoverIdx(data.coverImageIdx)
  }

  // ── Create mode: queue image files (uploaded after site creation) ─────────
  function handlePendingFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const remaining = 10 - pendingFiles.length
    const toAdd = files.slice(0, remaining)
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f))
    setPendingFiles((prev) => [...prev, ...toAdd])
    setPendingPreviews((prev) => [...prev, ...newPreviews])
    e.target.value = ''
  }

  function removePendingFile(idx: number) {
    URL.revokeObjectURL(pendingPreviews[idx])
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
    setPendingPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Form submit ──────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('현장 이름을 입력해주세요.'); return }
    if (!address.trim()) { setError('주소를 입력해주세요.'); return }
    if (!province.trim() && !addressPickedFromMapRef.current) { setError('성/시를 입력해주세요.'); return }

    setIsSaving(true)
    try {
      const payload = {
        name: name.trim(),
        nameVi: nameVi.trim() || undefined,
        address: address.trim(),
        province: province.trim(),
        district: district.trim() || undefined,
        lat,
        lng,
        siteType: siteType || undefined,
        status,
      }

      const apiPayload: Record<string, unknown> = { ...payload }
      if (mode !== 'edit') delete apiPayload.status

      if (mode === 'create') {
        const res = await apiClient<Site>('/manager/sites', {
          method: 'POST',
          token: idToken,
          body: JSON.stringify(apiPayload),
        })
        const newSiteId = res.data.id

        // Upload any queued images now that we have a siteId
        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            await uploadOneFile(newSiteId, file)
          }
          pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
        }

        router.push(`/manager/sites/${newSiteId}`)
      } else {
        await apiClient<Site>(`/manager/sites/${siteId}`, {
          method: 'PUT',
          token: idToken,
          body: JSON.stringify(apiPayload),
        })
        router.push(`/manager/sites/${siteId}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white'
  const labelClass = 'block text-sm font-medium text-[#25282A] mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-5">
        {/* Site Name (Korean) */}
        <div>
          <label className={labelClass}>
            현장 이름 (한국어) <span className="text-[#ED1C24]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 하노이 아파트 신축 현장"
            className={inputClass}
            required
          />
        </div>

        {/* Site Name (Vietnamese) */}
        <div>
          <label className={labelClass}>
            현장 이름 (베트남어)
            <span className="ml-1 text-xs font-normal text-[#98A2B2]">근로자에게 표시됩니다</span>
          </label>
          <input
            type="text"
            value={nameVi}
            onChange={(e) => setNameVi(e.target.value)}
            placeholder="예: Công trường căn hộ Hà Nội"
            className={inputClass}
          />
        </div>

        {/* Address */}
        <div>
          <label className={labelClass}>
            주소 <span className="text-[#ED1C24]">*</span>
          </label>
          {mapsError ? (
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="주소를 입력해주세요"
              className={inputClass}
            />
          ) : (
            <input
              ref={addressInputRef}
              type="text"
              defaultValue={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="주소를 검색해주세요"
              className={inputClass}
            />
          )}
          {lat && lng && !mapsError && (
            <div className="mt-2 p-3 rounded-2xl bg-[#E6F0FE] border border-[#B3D9FF] text-xs text-[#0669F7]">
              선택된 주소: {address}{lat && lng && ` (${lat.toFixed(5)}, ${lng.toFixed(5)})`}
            </div>
          )}
        </div>

        {/* Province */}
        <div>
          <label className={labelClass}>
            성/시 <span className="text-[#ED1C24]">*</span>
          </label>
          <input
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="예: Hà Nội"
            className={inputClass}
          />
        </div>

        {/* District */}
        <div>
          <label className={labelClass}>구/현</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="예: Hoàn Kiếm"
            className={inputClass}
          />
        </div>

        {/* Site Type — custom dropdown */}
        <div>
          <label className={labelClass}>현장 유형</label>
          <CustomSelect
            value={siteType}
            onChange={setSiteType}
            options={SITE_TYPE_OPTIONS}
            placeholder="유형 선택"
          />
        </div>

        {/* Status — custom dropdown (edit only) */}
        {mode === 'edit' && (
          <div>
            <label className={labelClass}>상태</label>
            <CustomSelect
              value={status}
              onChange={(v) => setStatus(v as SiteStatus)}
              options={STATUS_OPTIONS}
            />
          </div>
        )}
      </div>

      {/* ── Image section (both create and edit modes) ────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
        <div className="flex items-center justify-between mb-3">
          <label className={`${labelClass} mb-0`}>현장 이미지</label>
          <span className="text-xs text-[#98A2B2]">최대 10장</span>
        </div>

        {mode === 'create' ? (
          /* Create mode: show local previews, upload after site is saved */
          <div>
            {pendingPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {pendingPreviews.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#EFF1F5]"
                  >
                    <img src={url} alt={`이미지 ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-[#ED1C24] flex items-center justify-center hover:bg-[#ED1C24] hover:text-white transition-colors shadow-sm"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingPreviews.length < 10 && (
              <button
                type="button"
                onClick={() => pendingInputRef.current?.click()}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-[#EFF1F5] flex items-center justify-center gap-2 bg-[#F2F4F5] hover:bg-[#E6F0FE] hover:border-[#0669F7] transition-colors text-sm text-[#98A2B2] hover:text-[#0669F7]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                이미지 추가
              </button>
            )}

            <input
              ref={pendingInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePendingFileChange}
            />
            <p className="mt-1.5 text-xs text-[#98A2B2]">
              {pendingPreviews.length}/10장
              {pendingPreviews.length > 0 && ' · 저장 시 자동으로 업로드됩니다'}
            </p>
          </div>
        ) : (
          /* Edit mode: live image management */
          <ImageUploader
            images={images}
            coverIdx={coverIdx}
            onUpload={handleImageUpload}
            onRemove={handleRemoveImage}
            onSetCover={handleSetCover}
            isUploading={isUploading}
            maxCount={10}
          />
        )}
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-[#FDE8EE] border border-[#F4A8B8] text-sm text-[#ED1C24]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm hover:bg-[#F2F4F5] transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-[#0557D4] disabled:opacity-40 transition-colors"
        >
          {isSaving
            ? (pendingFiles.length > 0 && mode === 'create' ? `저장 중... (이미지 업로드 포함)` : '저장 중...')
            : '저장'}
        </button>
      </div>
    </form>
  )
}
