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
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm border text-sm bg-surface transition-colors focus:outline-none ${
          open ? 'border-primary ring-1 ring-primary' : 'border-outline hover:border-primary'
        }`}
      >
        <span className={selectedLabel ? 'text-on-surface' : 'text-on-surface-variant'}>
          {selectedLabel ?? placeholder}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${open ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface rounded-3xl border border-outline shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-primary-8 hover:text-primary ${
                opt.value === value
                  ? 'bg-primary-8 text-primary font-semibold'
                  : opt.value === ''
                    ? 'text-on-surface-variant'
                    : 'text-on-surface'
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
  const t = useTranslations('common.manager_site_form')
  const tType = useTranslations('common.site_type_labels')
  const tStatus = useTranslations('common.site_status')

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

  // Company state
  const [companyId, setCompanyId] = React.useState<string>((initialData as any)?.companyId ?? '')
  const [companies, setCompanies] = React.useState<{ id: string; name: string }[]>([])
  const [showNewCompany, setShowNewCompany] = React.useState(false)
  const [newCompanyName, setNewCompanyName] = React.useState('')
  const [newCompanyPhone, setNewCompanyPhone] = React.useState('')
  const [savingCompany, setSavingCompany] = React.useState(false)

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

  // Load company list for dropdown
  React.useEffect(() => {
    fetch(`${API_BASE}/manager/companies`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res?.data) setCompanies(res.data) })
      .catch(() => undefined)
  }, [idToken])

  async function handleCreateCompany() {
    if (!newCompanyName.trim()) return
    setSavingCompany(true)
    try {
      const res = await fetch(`${API_BASE}/manager/companies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCompanyName.trim(), contactPhone: newCompanyPhone.trim() || undefined }),
      })
      if (!res.ok) throw new Error()
      const { data: co } = await res.json()
      setCompanies((prev) => [...prev, co])
      setCompanyId(co.id)
      setShowNewCompany(false)
      setNewCompanyName('')
      setNewCompanyPhone('')
    } catch {
      // ignore — user can retry
    } finally {
      setSavingCompany(false)
    }
  }

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    let isMounted = true
    getGoogleMapsLoader()
      .importLibrary('places')
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
    if (!uploadRes.ok) throw new Error(t('error_image_upload'))
    const { data: uploadData } = await uploadRes.json()

    // Register S3 key with site
    const res = await fetch(`${API_BASE}/manager/sites/${targetSiteId}/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: uploadData.key }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message ?? t('error_image_register'))
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
      setError(e instanceof Error ? e.message : t('error_image_upload_failed'))
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
    if (!res.ok) throw new Error(t('error_image_delete'))
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
    if (!res.ok) throw new Error(t('error_cover_change'))
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

    if (!name.trim()) { setError(t('error_no_name')); return }
    if (!address.trim()) { setError(t('error_no_address')); return }
    if (!province.trim() && !addressPickedFromMapRef.current) { setError(t('error_no_province')); return }

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
        companyId: companyId || undefined,
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
      setError(e instanceof Error ? e.message : t('error_save'))
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
            {t('name_ko_label')} <span className="text-[#ED1C24]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('name_ko_placeholder')}
            className={inputClass}
            required
          />
        </div>

        {/* Site Name (Vietnamese) */}
        <div>
          <label className={labelClass}>
            {t('name_vi_label')}
            <span className="ml-1 text-xs font-normal text-[#98A2B2]">{t('shown_to_workers')}</span>
          </label>
          <input
            type="text"
            value={nameVi}
            onChange={(e) => setNameVi(e.target.value)}
            placeholder={t('name_vi_placeholder')}
            className={inputClass}
          />
        </div>

        {/* Address */}
        <div>
          <label className={labelClass}>
            {t('address_label')} <span className="text-[#ED1C24]">*</span>
          </label>
          {mapsError ? (
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('address_placeholder')}
              className={inputClass}
            />
          ) : (
            <input
              ref={addressInputRef}
              type="text"
              defaultValue={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('address_search_placeholder')}
              className={inputClass}
            />
          )}
          {lat && lng && !mapsError && (
            <div className="mt-2 p-3 rounded-2xl bg-[#E6F0FE] border border-[#B3D9FF] text-xs text-[#0669F7]">
              {t('address_selected')} {address}{lat && lng && ` (${lat.toFixed(5)}, ${lng.toFixed(5)})`}
            </div>
          )}
        </div>

        {/* Province */}
        <div>
          <label className={labelClass}>
            {t('province_label')} <span className="text-[#ED1C24]">*</span>
          </label>
          <input
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder={t('province_placeholder')}
            className={inputClass}
          />
        </div>

        {/* District */}
        <div>
          <label className={labelClass}>{t('district_label')}</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder={t('district_placeholder')}
            className={inputClass}
          />
        </div>

        {/* Site Type — custom dropdown */}
        <div>
          <label className={labelClass}>{t('site_type_label')}</label>
          <CustomSelect
            value={siteType}
            onChange={setSiteType}
            options={SITE_TYPE_OPTIONS}
          />
        </div>

        {/* Status — custom dropdown (edit only) */}
        {mode === 'edit' && (
          <div>
            <label className={labelClass}>{t('status_label')}</label>
            <CustomSelect
              value={status}
              onChange={(v) => setStatus(v as SiteStatus)}
              options={STATUS_OPTIONS}
            />
          </div>
        )}

        {/* Company (건설사) selection */}
        <div>
          <label className={labelClass}>{t('company_label')}</label>
          <CustomSelect
            value={companyId}
            onChange={setCompanyId}
            options={[
              { value: '', label: t('company_none') },
              ...companies.map((c) => ({ value: c.id, label: c.name })),
            ]}
            placeholder={t('company_placeholder')}
          />
          <button
            type="button"
            onClick={() => setShowNewCompany((v) => !v)}
            className="mt-2 text-xs text-[#0669F7] hover:underline"
          >
            {t('company_add_button')}
          </button>

          {showNewCompany && (
            <div className="mt-2 p-4 rounded-2xl border border-[#EFF1F5] bg-[#F9FAFB] space-y-3">
              <p className="text-xs font-semibold text-[#25282A]">{t('company_add_title')}</p>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder={t('company_name_placeholder')}
                className={inputClass}
              />
              <input
                type="text"
                value={newCompanyPhone}
                onChange={(e) => setNewCompanyPhone(e.target.value)}
                placeholder={t('company_phone_placeholder')}
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateCompany}
                  disabled={savingCompany || !newCompanyName.trim()}
                  className="px-4 py-2 rounded-full bg-[#0669F7] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#0557D4] transition-colors"
                >
                  {savingCompany ? t('company_saving_button') : t('company_save_button')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCompany(false); setNewCompanyName(''); setNewCompanyPhone('') }}
                  className="px-4 py-2 rounded-full border border-[#EFF1F5] text-[#25282A] text-xs font-medium hover:bg-[#F2F4F5] transition-colors"
                >
                  {t('company_cancel_button')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Image section (both create and edit modes) ────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5">
        <div className="flex items-center justify-between mb-3">
          <label className={`${labelClass} mb-0`}>{t('images_label')}</label>
          <span className="text-xs text-[#98A2B2]">{t('images_max')}</span>
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
                {t('image_add')}
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
              {t('image_count', { count: pendingPreviews.length })}
              {pendingPreviews.length > 0 && ` · ${t('image_upload_hint')}`}
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
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-[#0557D4] disabled:opacity-40 transition-colors"
        >
          {isSaving
            ? (pendingFiles.length > 0 && mode === 'create' ? t('saving_with_images') : t('saving'))
            : t('save')}
        </button>
      </div>
    </form>
  )
}
