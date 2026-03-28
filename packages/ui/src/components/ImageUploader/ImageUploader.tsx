'use client'

import * as React from 'react'
import { cn } from '../../utils/cn'

export interface UploadedFile {
  id: string
  file: File
  previewUrl: string
  status: 'idle' | 'uploading' | 'done' | 'error'
  progress?: number
  errorMessage?: string
}

export interface ImageUploaderProps {
  /** Max file size in bytes. Default: 10MB */
  maxBytes?: number
  /** Max number of files. Default: 1 */
  maxFiles?: number
  accept?: string
  /** Array of current uploaded files */
  value?: UploadedFile[]
  onChange?: (files: UploadedFile[]) => void
  onError?: (error: string) => void
  /** Labels for i18n */
  labels?: {
    tap?: string
    or?: string
    gallery?: string
    maxSize?: string
    tooLarge?: string
    invalidType?: string
    remove?: string
  }
  className?: string
  disabled?: boolean
}

const defaultLabels = {
  tap: '탭하여 사진 선택',
  or: '또는',
  gallery: '갤러리에서 선택',
  maxSize: '최대 10MB',
  tooLarge: '파일이 너무 큽니다',
  invalidType: '지원하지 않는 파일 형식입니다',
  remove: '삭제',
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  maxBytes = 10 * 1024 * 1024,
  maxFiles = 1,
  accept = 'image/jpeg,image/png',
  value = [],
  onChange,
  onError,
  labels = {},
  className,
  disabled = false,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const L = { ...defaultLabels, ...labels }

  const handleFiles = React.useCallback(
    (fileList: FileList) => {
      const newFiles: UploadedFile[] = []
      for (const file of Array.from(fileList)) {
        if (value.length + newFiles.length >= maxFiles) break
        if (file.size > maxBytes) {
          onError?.(L.tooLarge)
          continue
        }
        if (accept && !accept.split(',').some((t) => file.type.match(t.trim()))) {
          onError?.(L.invalidType)
          continue
        }
        newFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'idle',
        })
      }
      if (newFiles.length > 0) {
        onChange?.([...value, ...newFiles])
      }
    },
    [value, maxFiles, maxBytes, accept, onChange, onError, L],
  )

  const handleRemove = React.useCallback(
    (id: string) => {
      const removed = value.find((f) => f.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      onChange?.(value.filter((f) => f.id !== id))
    },
    [value, onChange],
  )

  const canAdd = !disabled && value.length < maxFiles

  return (
    <div className={cn('w-full', className)}>
      {/* Previews */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((f) => (
            <div key={f.id} className="relative w-20 h-20 rounded-sm overflow-hidden border border-outline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.previewUrl}
                alt=""
                className="w-full h-full object-cover"
                aria-hidden="true"
              />
              {/* Status overlay */}
              {f.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                  <span className="text-white text-[11px]">{f.progress ?? 0}%</span>
                </div>
              )}
              {f.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[rgba(237,28,36,0.7)]">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="white" aria-hidden="true">
                    <path d="M10 6v4m0 4h.01M2 10a8 8 0 1016 0A8 8 0 002 10z" stroke="white" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
              )}
              {/* Remove button */}
              <button
                onClick={() => handleRemove(f.id)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-[rgba(0,0,0,0.6)] flex items-center justify-center"
                aria-label={L.remove}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white" aria-hidden="true">
                  <path d="M8 2L2 8M2 2l6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload trigger */}
      {canAdd && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'w-full min-h-[80px] flex flex-col items-center justify-center gap-1.5',
              'rounded-sm border-2 border-dashed border-outline',
              'text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary-8',
              'transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[14px] font-medium">{L.tap}</span>
            <span className="text-[12px]">{L.maxSize}</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            className="sr-only"
            aria-hidden="true"
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }}
            onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
          />
        </>
      )}
    </div>
  )
}
