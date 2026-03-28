'use client'

import * as React from 'react'
import { ProfileDraft } from '@/types/worker-profile'
import { getGoogleMapsLoader } from '@/lib/maps/loader'

interface AddressStepProps {
  draft: ProfileDraft
  onChange: (partial: Partial<ProfileDraft>) => void
  onNext: () => Promise<void>
  isSaving: boolean
}

export default function AddressStep({ draft, onChange, onNext, isSaving }: AddressStepProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null)
  const [mapsLoaded, setMapsLoaded] = React.useState(false)
  const [mapsError, setMapsError] = React.useState(false)

  // Load Google Maps on mount
  React.useEffect(() => {
    let cancelled = false
    const loader = getGoogleMapsLoader()
    loader
      .load()
      .then(() => {
        if (!cancelled) setMapsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setMapsError(true)
      })
    return () => { cancelled = true }
  }, [])

  // Attach Places Autocomplete once maps is loaded and input is mounted
  React.useEffect(() => {
    if (!mapsLoaded || !inputRef.current) return
    if (autocompleteRef.current) return // already attached

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'vn' },
      fields: ['address_components', 'formatted_address', 'geometry'],
    })
    autocompleteRef.current = autocomplete

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry?.location) return

      let province = ''
      let district = ''

      for (const component of place.address_components ?? []) {
        if (component.types.includes('administrative_area_level_1')) {
          province = component.long_name
        } else if (component.types.includes('administrative_area_level_2')) {
          district = component.long_name
        }
      }

      onChange({
        currentProvince: province,
        currentDistrict: district,
        addressLabel: place.formatted_address ?? '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      })
    })

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [mapsLoaded, onChange])

  const hasAddress = Boolean(draft.addressLabel)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">현재 주소</h2>
        <p className="text-sm text-[#98A2B2] mt-1">근무 가능 지역을 설정합니다.</p>
      </div>

      {/* Google Maps Autocomplete */}
      {!mapsError ? (
        <div>
          <label className="block text-sm font-medium text-[#25282A] mb-1">
            주소 검색
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B2]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              defaultValue={draft.addressLabel}
              placeholder={mapsLoaded ? 'Vietnamese 주소를 검색하세요...' : '지도 로딩 중...'}
              disabled={!mapsLoaded}
              className="w-full pl-9 pr-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] disabled:bg-gray-50 disabled:text-[#98A2B2]"
            />
            {!mapsLoaded && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-[#98A2B2] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fallback: manual inputs when Google Maps unavailable */
        <div className="space-y-4">
          <p className="text-xs text-[#98A2B2] bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
            지도 서비스를 불러오지 못했습니다. 직접 입력해주세요.
          </p>
          <div>
            <label className="block text-sm font-medium text-[#25282A] mb-1">성/시</label>
            <input
              type="text"
              value={draft.currentProvince}
              onChange={(e) => onChange({ currentProvince: e.target.value })}
              placeholder="예: Hà Nội, TP. Hồ Chí Minh"
              className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#25282A] mb-1">군/구</label>
            <input
              type="text"
              value={draft.currentDistrict}
              onChange={(e) => onChange({ currentDistrict: e.target.value })}
              placeholder="예: Quận 1, Hoàn Kiếm"
              className="w-full px-3 py-3 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A]"
            />
          </div>
        </div>
      )}

      {/* Selected address card */}
      {hasAddress && (
        <div className="p-4 bg-gray-50 border border-[#EFF1F5] rounded-2xl space-y-2">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-[#0669F7] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#25282A] break-words">{draft.addressLabel}</p>
              <div className="flex gap-3 mt-1 text-xs text-[#98A2B2]">
                {draft.currentProvince && <span>{draft.currentProvince}</span>}
                {draft.currentDistrict && <span>{draft.currentDistrict}</span>}
              </div>
              {draft.lat !== null && draft.lng !== null && (
                <p className="text-xs text-[#98A2B2] mt-0.5">
                  {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onNext}
          className="text-sm text-[#98A2B2] hover:text-[#0669F7] underline-offset-2 hover:underline transition-colors"
        >
          건너뛰기
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isSaving}
          className="px-8 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {isSaving ? '저장 중...' : '다음'}
        </button>
      </div>
    </div>
  )
}
