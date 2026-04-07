'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getSessionCookie } from '@/lib/auth/session'
import { apiClient } from '@/lib/api/client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignatureStatus {
  signatureUrl: string | null
}

// ─── Canvas signature pad ─────────────────────────────────────────────────────

interface CanvasPoint {
  x: number
  y: number
}

function useSignaturePad(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const isDrawing = React.useRef(false)
  const lastPoint = React.useRef<CanvasPoint | null>(null)
  const isEmpty = React.useRef(true)

  const getCtx = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [canvasRef])

  // Scale canvas for device pixel ratio
  const initCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#25282A'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [canvasRef])

  // Convert event coordinates to canvas-relative coordinates
  const getPoint = React.useCallback(
    (e: MouseEvent | TouchEvent): CanvasPoint | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        const touch = e.touches[0]
        if (!touch) return null
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
    },
    [canvasRef],
  )

  const startDrawing = React.useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const point = getPoint(e)
      if (!point) return
      isDrawing.current = true
      lastPoint.current = point
      const ctx = getCtx()
      if (!ctx) return
      ctx.beginPath()
      ctx.arc(point.x, point.y, 1, 0, Math.PI * 2)
      ctx.fillStyle = '#25282A'
      ctx.fill()
      isEmpty.current = false
    },
    [getCtx, getPoint],
  )

  const draw = React.useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!isDrawing.current) return
      const point = getPoint(e)
      if (!point || !lastPoint.current) return
      const ctx = getCtx()
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
      lastPoint.current = point
      isEmpty.current = false
    },
    [getCtx, getPoint],
  )

  const stopDrawing = React.useCallback(() => {
    isDrawing.current = false
    lastPoint.current = null
  }, [])

  const clear = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = getCtx()
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    isEmpty.current = true
  }, [canvasRef, getCtx])

  const getBlob = React.useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) return resolve(null)
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }, [canvasRef])

  const checkIsEmpty = () => isEmpty.current

  return { initCanvas, startDrawing, draw, stopDrawing, clear, getBlob, checkIsEmpty }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SignaturePadForm({ locale }: { locale: string }) {
  const idToken = getSessionCookie()
  const t = useTranslations('common')
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const { initCanvas, startDrawing, draw, stopDrawing, clear, getBlob, checkIsEmpty } =
    useSignaturePad(canvasRef)

  const [existingSignatureUrl, setExistingSignatureUrl] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // ── Fetch existing signature ──────────────────────────────────────────────

  React.useEffect(() => {
    if (!idToken) return
    apiClient<SignatureStatus>('/workers/me', { token: idToken })
      .then(({ data }) => {
        setExistingSignatureUrl(data.signatureUrl ?? null)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [idToken])

  // ── Init canvas after load ────────────────────────────────────────────────

  React.useEffect(() => {
    if (isLoading) return
    // Wait for next frame so canvas has its layout size
    const frame = requestAnimationFrame(() => {
      initCanvas()
    })
    return () => cancelAnimationFrame(frame)
  }, [isLoading, initCanvas])

  // ── Attach canvas event listeners ─────────────────────────────────────────

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isLoading) return

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
  }, [isLoading, startDrawing, draw, stopDrawing])

  // ── Save signature ────────────────────────────────────────────────────────

  async function handleSave() {
    if (!idToken) return
    if (checkIsEmpty()) {
      setErrorMessage(t('worker_signature.error_empty'))
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Signature upload API is currently under development.
      setErrorMessage(t('worker_signature.not_available'))
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href={'/worker/profile'}
        className="inline-flex items-center gap-1 text-sm text-[#98A2B2] hover:text-[#0669F7] mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('worker_signature.back_to_profile')}
      </Link>

      <h1 className="text-xl font-semibold text-[#25282A] mb-6">{t('worker_signature.title')}</h1>

      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-4">
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-10 bg-gray-100 rounded-full animate-pulse" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EFF1F5] p-5 space-y-5">
          {/* Existing signature */}
          {existingSignatureUrl && (
            <div>
              <p className="block text-sm font-medium text-[#25282A] mb-2">{t('worker_signature.current')}</p>
              <div className="border border-[#EFF1F5] rounded-2xl p-3 bg-gray-50">
                <img
                  src={existingSignatureUrl}
                  alt={t('worker_signature.current_alt')}
                  className="max-h-24 object-contain mx-auto"
                />
              </div>
              <p className="text-xs text-[#98A2B2] mt-1">{t('worker_signature.overwrite_hint')}</p>
            </div>
          )}

          {/* Canvas */}
          <div>
            <p className="block text-sm font-medium text-[#25282A] mb-2">
              {existingSignatureUrl ? t('worker_signature.new_input') : t('worker_signature.input')}
            </p>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '160px',
                border: '1px solid #EFF1F5',
                borderRadius: '4px',
                touchAction: 'none',
                display: 'block',
                cursor: 'crosshair',
                backgroundColor: '#FAFAFA',
              }}
            />
            <p className="text-xs text-[#98A2B2] mt-1">{t('worker_signature.hint')}</p>
          </div>

          {/* Success / error */}
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-[#ED1C24]">
              {errorMessage}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                clear()
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className="flex-1 py-3 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
            >
              {t('worker_signature.clear')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-medium disabled:opacity-50 text-sm hover:bg-blue-700 transition-colors"
            >
              {isSaving ? t('worker_signature.saving') : t('worker_signature.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
