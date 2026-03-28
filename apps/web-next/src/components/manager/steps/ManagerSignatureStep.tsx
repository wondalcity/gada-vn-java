'use client'

import * as React from 'react'
import { ManagerDraft } from '@/types/manager-application'

interface Props {
  draft: ManagerDraft
  onChange: (partial: Partial<ManagerDraft>) => void
  onNext: () => void
  onBack: () => void
}

// ─── Canvas signature pad hook ────────────────────────────────────────────────

interface CanvasPoint {
  x: number
  y: number
}

function useManagerSignaturePad(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const isDrawing = React.useRef(false)
  const lastPoint = React.useRef<CanvasPoint | null>(null)
  const isEmpty = React.useRef(true)

  const getCtx = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [canvasRef])

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

  const getDataUrl = React.useCallback((): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.toDataURL('image/png')
  }, [canvasRef])

  const checkIsEmpty = () => isEmpty.current

  return { initCanvas, startDrawing, draw, stopDrawing, clear, getDataUrl, checkIsEmpty }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagerSignatureStep({ draft, onChange, onNext, onBack }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const { initCanvas, startDrawing, draw, stopDrawing, clear, getDataUrl, checkIsEmpty } =
    useManagerSignaturePad(canvasRef)

  const [showCanvas, setShowCanvas] = React.useState(!draft.signatureUrl)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Init canvas with requestAnimationFrame after mount
  React.useEffect(() => {
    if (!showCanvas) return
    const frame = requestAnimationFrame(() => {
      initCanvas()
    })
    return () => cancelAnimationFrame(frame)
  }, [initCanvas, showCanvas])

  // Attach canvas event listeners
  React.useEffect(() => {
    if (!showCanvas) return
    const canvas = canvasRef.current
    if (!canvas) return

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
  }, [startDrawing, draw, stopDrawing, showCanvas])

  function handleSave() {
    if (checkIsEmpty()) {
      setError('서명을 입력해주세요.')
      return
    }
    const dataUrl = getDataUrl()
    if (!dataUrl) {
      setError('서명 이미지를 생성하지 못했습니다.')
      return
    }
    onChange({ signatureDataUrl: dataUrl })
    setSaved(true)
    setError(null)
  }

  function handleClear() {
    clear()
    setSaved(false)
    setError(null)
    onChange({ signatureDataUrl: null })
  }

  function handleReSign() {
    setShowCanvas(true)
    setSaved(false)
    onChange({ signatureDataUrl: null })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">서명 등록</h2>
        <p className="text-sm text-[#98A2B2] mt-1">계약서 서명에 사용됩니다.</p>
      </div>

      {/* Existing signature preview */}
      {draft.signatureUrl && !showCanvas && (
        <div>
          <p className="text-sm font-medium text-[#25282A] mb-2">현재 서명</p>
          <div className="border border-[#EFF1F5] rounded-2xl p-3 bg-gray-50">
            <img
              src={draft.signatureUrl}
              alt="현재 서명"
              className="max-h-24 object-contain mx-auto"
            />
          </div>
          <button
            type="button"
            onClick={handleReSign}
            className="mt-2 text-sm text-[#0669F7] hover:underline"
          >
            다시 서명
          </button>
        </div>
      )}

      {/* Canvas */}
      {showCanvas && (
        <div>
          <p className="text-sm font-medium text-[#25282A] mb-2">
            {draft.signatureUrl ? '새 서명 입력' : '서명 입력'}
          </p>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '180px',
              border: '1px solid #EFF1F5',
              borderRadius: '4px',
              touchAction: 'none',
              display: 'block',
              cursor: 'crosshair',
              backgroundColor: '#FAFAFA',
            }}
          />
          <p className="text-xs text-[#98A2B2] mt-1">손가락이나 마우스로 서명하세요</p>
        </div>
      )}

      {/* Success message */}
      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
          서명이 저장되었습니다
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-[#D81A48]">
          {error}
        </div>
      )}

      {/* Clear / Done buttons (shown when canvas is visible) */}
      {showCanvas && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 py-3 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm hover:border-[#0669F7] hover:text-[#0669F7] transition-colors"
          >
            지우기
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-full bg-[#0669F7] text-white font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            완료
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
        >
          이전
        </button>
        <div className="flex-1 flex items-center gap-3">
          <button
            type="button"
            onClick={onNext}
            className="text-sm text-[#98A2B2] hover:text-[#0669F7] underline-offset-2 hover:underline transition-colors whitespace-nowrap"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 py-3.5 rounded-full bg-[#0669F7] text-white font-semibold text-sm"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
