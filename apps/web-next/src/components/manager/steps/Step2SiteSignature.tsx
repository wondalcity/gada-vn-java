'use client'

import * as React from 'react'
import { ManagerDraft } from '@/types/manager-application'

interface Props {
  draft: ManagerDraft
  onChange: (partial: Partial<ManagerDraft>) => void
  onNext: () => void
  onBack: () => void
}

// ─── Signature pad hook ────────────────────────────────────────────────────────

interface CanvasPoint { x: number; y: number }

function useSignaturePad(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const isDrawing = React.useRef(false)
  const lastPoint = React.useRef<CanvasPoint | null>(null)
  const isEmpty = React.useRef(true)

  const getCtx = React.useCallback(() => {
    const canvas = canvasRef.current
    return canvas ? canvas.getContext('2d') : null
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

  const getPoint = React.useCallback((e: MouseEvent | TouchEvent): CanvasPoint | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }, [canvasRef])

  const startDrawing = React.useCallback((e: MouseEvent | TouchEvent) => {
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
  }, [getCtx, getPoint])

  const draw = React.useCallback((e: MouseEvent | TouchEvent) => {
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
  }, [getCtx, getPoint])

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
    return canvas ? canvas.toDataURL('image/png') : null
  }, [canvasRef])

  const checkIsEmpty = () => isEmpty.current

  return { initCanvas, startDrawing, draw, stopDrawing, clear, getDataUrl, checkIsEmpty }
}

// ─── Main component ────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2.5 rounded-2xl border border-[#EFF1F5] focus:outline-none focus:border-[#0669F7] text-sm text-[#25282A] bg-white'
const labelClass = 'block text-sm font-medium text-[#25282A] mb-1.5'

export default function Step2SiteSignature({ draft, onChange, onNext, onBack }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const { initCanvas, startDrawing, draw, stopDrawing, clear, getDataUrl, checkIsEmpty } =
    useSignaturePad(canvasRef)

  const [showCanvas, setShowCanvas] = React.useState(!draft.signatureUrl)
  const [sigSaved, setSigSaved] = React.useState(false)
  const [sigError, setSigError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!showCanvas) return
    const frame = requestAnimationFrame(() => initCanvas())
    return () => cancelAnimationFrame(frame)
  }, [initCanvas, showCanvas])

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

  function handleSaveSig() {
    if (checkIsEmpty()) { setSigError('서명을 입력해주세요.'); return }
    const dataUrl = getDataUrl()
    if (!dataUrl) { setSigError('서명 이미지를 생성하지 못했습니다.'); return }
    onChange({ signatureDataUrl: dataUrl })
    setSigSaved(true)
    setSigError(null)
  }

  function handleClearSig() {
    clear()
    setSigSaved(false)
    setSigError(null)
    onChange({ signatureDataUrl: null })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#25282A]">현장 및 서명</h2>
        <p className="text-sm text-[#98A2B2] mt-1">관리하실 현장 정보와 서명을 등록해주세요.</p>
      </div>

      {/* ── Site info ───────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <label htmlFor="firstSiteName" className={labelClass}>
            현장명
            <span className="ml-1 text-xs font-normal text-[#98A2B2]">(선택)</span>
          </label>
          <input
            id="firstSiteName"
            type="text"
            value={draft.firstSiteName}
            onChange={(e) => onChange({ firstSiteName: e.target.value })}
            placeholder="예: 한강 아파트 3공구"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="firstSiteAddress" className={labelClass}>
            현장 주소
            <span className="ml-1 text-xs font-normal text-[#98A2B2]">(선택)</span>
          </label>
          <input
            id="firstSiteAddress"
            type="text"
            value={draft.firstSiteAddress}
            onChange={(e) => onChange({ firstSiteAddress: e.target.value })}
            placeholder="현장 상세 주소"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="province" className={labelClass}>
            지역 (성/시)
            <span className="ml-1 text-xs font-normal text-[#98A2B2]">(선택)</span>
          </label>
          <input
            id="province"
            type="text"
            value={draft.province}
            onChange={(e) => onChange({ province: e.target.value })}
            placeholder="예: Hà Nội, TP. Hồ Chí Minh"
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div className="border-t border-[#EEEEEE]" />

      {/* ── Signature ───────────────────────────────────── */}
      <div>
        <p className={labelClass}>
          서명
          <span className="ml-1 text-xs font-normal text-[#98A2B2]">계약서에 사용됩니다 (선택)</span>
        </p>

        {/* Existing signature */}
        {draft.signatureUrl && !showCanvas && (
          <div className="mb-3">
            <div className="border border-[#EFF1F5] rounded-2xl p-3 bg-[#F2F4F5]">
              <img src={draft.signatureUrl} alt="현재 서명" className="max-h-20 object-contain mx-auto" />
            </div>
            <button
              type="button"
              onClick={() => { setShowCanvas(true); setSigSaved(false); onChange({ signatureDataUrl: null }) }}
              className="mt-1.5 text-sm text-[#0669F7] hover:underline"
            >
              다시 서명
            </button>
          </div>
        )}

        {/* Canvas */}
        {showCanvas && (
          <div>
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
            <p className="text-xs text-[#98A2B2] mt-1">손가락이나 마우스로 서명하세요</p>

            {sigError && (
              <p className="text-xs text-[#ED1C24] mt-1">{sigError}</p>
            )}
            {sigSaved && (
              <p className="text-xs text-[#1A6B1A] mt-1">서명이 저장되었습니다</p>
            )}

            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={handleClearSig}
                className="flex-1 py-2.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
              >
                지우기
              </button>
              <button
                type="button"
                onClick={handleSaveSig}
                className="flex-1 py-2.5 rounded-full bg-[#25282A] text-white font-medium text-sm"
              >
                서명 완료
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3.5 rounded-full border border-[#EFF1F5] text-[#25282A] font-medium text-sm"
        >
          이전
        </button>
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3.5 rounded-full bg-[#0669F7] text-white font-semibold hover:bg-[#0557D4] transition-colors text-sm"
        >
          다음
        </button>
      </div>
    </div>
  )
}
