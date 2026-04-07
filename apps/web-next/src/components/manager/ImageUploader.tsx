'use client'

import * as React from 'react'

interface ImageUploaderProps {
  images: string[]
  coverIdx: number
  onUpload: (file: File) => Promise<void>
  onRemove: (idx: number) => Promise<void>
  onSetCover: (idx: number) => Promise<void>
  isUploading: boolean
  maxCount?: number
}

export default function ImageUploader({
  images,
  coverIdx,
  onUpload,
  onRemove,
  onSetCover,
  isUploading,
  maxCount = 10,
}: ImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [removingIdx, setRemovingIdx] = React.useState<number | null>(null)
  const [settingCoverIdx, setSettingCoverIdx] = React.useState<number | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onUpload(file)
    e.target.value = ''
  }

  async function handleRemove(idx: number) {
    setRemovingIdx(idx)
    try {
      await onRemove(idx)
    } finally {
      setRemovingIdx(null)
    }
  }

  async function handleSetCover(idx: number) {
    setSettingCoverIdx(idx)
    try {
      await onSetCover(idx)
    } finally {
      setSettingCoverIdx(null)
    }
  }

  const canAddMore = images.length < maxCount

  return (
    <div>
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map((url, idx) => {
            const isCover = idx === coverIdx
            const isRemoving = removingIdx === idx
            const isSettingCover = settingCoverIdx === idx
            return (
              <div
                key={idx}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-colors ${
                  isCover ? 'border-[#0669F7]' : 'border-[#EFF1F5]'
                }`}
              >
                <img
                  src={url}
                  alt={`현장 이미지 ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 group">
                  {/* Star / Cover button */}
                  <button
                    type="button"
                    onClick={() => handleSetCover(idx)}
                    disabled={isCover || isSettingCover || isRemoving}
                    title={isCover ? '대표 이미지' : '대표로 설정'}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                      ${isCover
                        ? 'bg-[#0669F7] text-white opacity-100'
                        : 'bg-white/90 text-[#98A2B2] opacity-0 group-hover:opacity-100 hover:bg-[#0669F7] hover:text-white'
                      } disabled:cursor-default`}
                  >
                    {isSettingCover ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isCover ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    disabled={isRemoving || isSettingCover}
                    title="삭제"
                    className="w-7 h-7 rounded-full bg-white/90 text-[#ED1C24] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#ED1C24] hover:text-white transition-all disabled:opacity-50"
                  >
                    {isRemoving ? (
                      <svg className="w-3.5 h-3.5 animate-spin text-[#ED1C24]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Cover badge */}
                {isCover && (
                  <div className="absolute bottom-0 left-0 right-0 bg-[#0669F7]/90 text-white text-[10px] font-semibold text-center py-0.5">
                    대표
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload button */}
      {canAddMore && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-[#EFF1F5] flex items-center justify-center gap-2 bg-gray-50 hover:bg-[#E6F0FE] hover:border-[#0669F7] transition-colors disabled:opacity-60 text-sm text-[#98A2B2] hover:text-[#0669F7]"
        >
          {isUploading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              업로드 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              이미지 추가
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="mt-1.5 text-xs text-[#98A2B2]">
        {images.length}/{maxCount}장 · 이미지를 클릭해 대표 이미지를 변경하세요
      </p>
    </div>
  )
}
