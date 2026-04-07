'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/navigation'
import { apiClient } from '@/lib/api/client'
import { siteStore } from '@/lib/demo/siteStore'
import { getGoogleMapsLoader } from '@/lib/maps/loader'
import ImageUploader from '@/components/manager/ImageUploader'
import type { Site, SiteStatus } from '@/types/manager-site-job'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface SiteFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Site>
  siteId?: string
  locale: string
  idToken: string
}

const SITE_TYPE_OPTIONS = [
  { value: '', label: '유형 선택' },
  { value: '아파트/주거', label: '아파트/주거' },
  { value: '도로/교량', label: '도로/교량' },
  { value: '상업시설', label: '상업시설' },
  { value: '산업시설', label: '산업시설' },
  { value: '공공시설', label: '공공시설' },
  { value: '기타', label: '기타' },
]

const STATUS_OPTIONS: { value: SiteStatus; label: string }[] = [
  { value: 'ACTIVE', label: '운영중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'PAUSED', label: '일시중지' },
]

export default function SiteForm({ mode, initialData, siteId, locale, idToken }: SiteFormProps) {
  const router = useRouter()

  const [name, setName] = React.useState(initialData?.name ?? '')
  const [nameVi, setNameVi] = React.useState(initialData?.nameVi ?? '')
  const [address, setAddress] = React.useState(initialData?.address ?? '')
  const [province, setProvince] = React.useState(initialData?.province ?? '')
  const [district, setDistrict] = React.useState(initialData?.district ?? '')
  const [lat, setLat] = React.useState<number | undefined>(initialData?.lat)
  const [lng, setLng] = React.useState<number | undefined>(initialData?.lng)
  const [siteType, setSiteType] = React.useState(initialData?.siteType ?? '')
  const [status, setStatus] = React.useState<SiteStatus>(initialData?.status ?? 'ACTIVE')

  // Image state — tracks current URLs and cover index from API
  const [images, setImages] = React.useState<string[]>(initialData?.imageUrls ?? [])
  const [coverIdx, setCoverIdx] = React.useState<number>(
    (initialData as (Partial<Site> & { coverImageIdx?: number }) | undefined)?.coverImageIdx ?? 0,
  )
  const [isUploading, setIsUploading] = React.useState(false)

  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mapsError, setMapsError] = React.useState(false)

  const addressInputRef = React.useRef<HTMLInputElement>(null)
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null)

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
          setAddress(place.formatted_address ?? '')
          const geo = place.geometry.location
          if (geo) { setLat(geo.lat()); setLng(geo.lng()) }
          let provinceVal = ''
          let districtVal = ''
          for (const component of place.address_components ?? []) {
            if (component.types.includes('administrative_area_level_1')) provinceVal = component.long_name
            if (component.types.includes('administrative_area_level_2')) districtVal = component.long_name
          }
          setProvince(provinceVal)
          setDistrict(districtVal)
        })
      })
      .catch(() => { if (isMounted) setMapsError(true) })
    return () => { isMounted = false }
  }, [])

  // ── Image upload: presigned URL → S3 (or local) → register key ─
  async function handleImageUpload(file: File) {
    if (!siteId) return
    setIsUploading(true)
    setError(null)
    try {
      // 1. Get presigned URL (or local mode token)
      const presignRes = await fetch(`${API_BASE}/files/presigned-url`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, folder: 'sites' }),
      })
      if (!presignRes.ok) throw new Error('업로드 URL 발급 실패')
      const { data: presign } = await presignRes.json()

      let imageKey: string

      if (presign.isLocal) {
        // 2a. Local dev — POST file directly to API
        const localFd = new FormData()
        localFd.append('file', file, presign.key)
        const uploadRes = await fetch(`${API_BASE}/files/upload-local`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
          body: localFd,
        })
        if (!uploadRes.ok) throw new Error('로컬 업로드 실패')
        const { data: localData } = await uploadRes.json()
        imageKey = localData.key  // full URL (http://localhost:...)
      } else {
        // 2b. Production — PUT directly to S3 presigned URL
        const uploadRes = await fetch(presign.url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!uploadRes.ok) throw new Error('S3 업로드 실패')
        imageKey = presign.key
      }

      // 3. Register key with site
      const res = await fetch(`${API_BASE}/manager/sites/${siteId}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: imageKey }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? '이미지 등록 실패')
      }
      const { data } = await res.json()
      setImages(data.imageUrls)
      setCoverIdx(data.coverImageIdx)
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Remove image ────────────────────────────────────────────────
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

  // ── Set cover image ─────────────────────────────────────────────
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('현장 이름을 입력해주세요.'); return }
    if (!address.trim()) { setError('주소를 입력해주세요.'); return }
    if (!province.trim()) { setError('성/시를 입력해주세요.'); return }

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

      // Demo mode (no API token) — use localStorage store
      if (!idToken) {
        if (mode === 'create') {
          const newSite = siteStore.create(payload)
          router.push(`/manager/sites/${newSite.id}`)
        } else if (siteId) {
          siteStore.update(siteId, payload)
          router.push(`/manager/sites/${siteId}`)
        }
        return
      }

      const apiPayload: Record<string, unknown> = { ...payload }
      if (mode !== 'edit') delete apiPayload.status

      if (mode === 'create') {
        const res = await apiClient<Site>('/manager/sites', {
          method: 'POST',
          token: idToken,
          body: JSON.stringify(apiPayload),
        })
        router.push(`/manager/sites/${res.data.id}`)
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
            현장 이름 (한국어) <span className="text-[#D81A48]">*</span>
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

        {/* Address — Google Maps Autocomplete */}
        <div>
          <label className={labelClass}>
            주소 <span className="text-[#D81A48]">*</span>
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
            <div className="mt-2 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-[#0669F7]">
              선택된 주소: {address}{lat && lng && ` (${lat.toFixed(5)}, ${lng.toFixed(5)})`}
            </div>
          )}
        </div>

        {/* Province */}
        <div>
          <label className={labelClass}>
            성/시 <span className="text-[#D81A48]">*</span>
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

        {/* Site Type */}
        <div>
          <label className={labelClass}>현장 유형</label>
          <select
            value={siteType}
            onChange={(e) => setSiteType(e.target.value)}
            className={inputClass}
          >
            {SITE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Status (edit only) */}
        {mode === 'edit' && (
          <div>
            <label className={labelClass}>상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SiteStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Image notice (create only) ─────────────────────────── */}
      {mode === 'create' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-[#0669F7] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[#0669F7]">현장 이미지는 저장 후 등록할 수 있습니다</p>
            <p className="text-xs text-[#98A2B2] mt-0.5">현장 저장 후 수정 화면에서 최대 10장의 이미지를 업로드하세요. 이미지는 근로자에게 표시됩니다.</p>
          </div>
        </div>
      )}

      {/* ── Image Management (edit only) ──────────────────────── */}
      {mode === 'edit' && siteId && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
          <div className="flex items-center justify-between mb-3">
            <label className={`${labelClass} mb-0`}>현장 이미지</label>
            <span className="text-xs text-[#98A2B2]">최대 10장</span>
          </div>
          <ImageUploader
            images={images}
            coverIdx={coverIdx}
            onUpload={handleImageUpload}
            onRemove={handleRemoveImage}
            onSetCover={handleSetCover}
            isUploading={isUploading}
            maxCount={10}
          />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#D81A48]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
