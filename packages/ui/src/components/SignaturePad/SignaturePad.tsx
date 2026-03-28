'use client'

import * as React from 'react'
import { cn } from '../../utils/cn'

export interface SignaturePadProps {
  /** Called when a stroke ends. Provides PNG base64 (without data: prefix). */
  onEnd?: (base64Png: string) => void
  /** Whether the signature is empty */
  isEmpty?: boolean
  disabled?: boolean
  labels?: {
    placeholder?: string
    clear?: string
  }
  className?: string
  /** Canvas width. Default: 360 */
  width?: number
  /** Canvas height. Default: 180 */
  height?: number
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onEnd,
  isEmpty: isEmptyProp,
  disabled = false,
  labels = {},
  className,
  width = 360,
  height = 180,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const padRef = React.useRef<InstanceType<typeof import('signature_pad').default> | null>(null)
  const [isEmpty, setIsEmpty] = React.useState(true)

  React.useEffect(() => {
    let SignaturePadClass: typeof import('signature_pad').default

    import('signature_pad').then(({ default: SP }) => {
      SignaturePadClass = SP
      const canvas = canvasRef.current
      if (!canvas) return

      // 2x DPR for retina
      const ratio = window.devicePixelRatio ?? 1
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.getContext('2d')?.scale(ratio, ratio)

      padRef.current = new SignaturePadClass(canvas, {
        penColor: '#25282A',
        backgroundColor: 'rgba(0,0,0,0)',
        minWidth: 1,
        maxWidth: 2.5,
      })

      padRef.current.addEventListener('endStroke', () => {
        setIsEmpty(false)
        const dataUrl = canvas.toDataURL('image/png')
        onEnd?.(dataUrl.split(',')[1])
      })

      if (disabled) padRef.current.off()
    })

    return () => {
      padRef.current?.off()
    }
  }, [width, height, disabled, onEnd])

  const handleClear = React.useCallback(() => {
    padRef.current?.clear()
    setIsEmpty(true)
  }, [])

  const L = {
    placeholder: labels.placeholder ?? '여기에 서명하세요',
    clear: labels.clear ?? '지우기',
  }

  const empty = isEmptyProp ?? isEmpty

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'relative rounded-sm border',
          disabled ? 'border-outline bg-surface-container cursor-not-allowed' : 'border-outline',
        )}
        style={{ width, height }}
      >
        {/* Placeholder text */}
        {empty && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <span className="text-[14px] text-on-surface-variant">{L.placeholder}</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={cn('touch-none', disabled && 'pointer-events-none')}
          aria-label="Signature canvas"
          role="img"
        />
      </div>

      {/* Clear button */}
      {!disabled && !empty && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'self-end text-[14px] font-medium text-on-surface-variant',
            'hover:text-error transition-colors duration-150',
            'focus-visible:ring-2 focus-visible:ring-primary rounded-sm px-1',
          )}
        >
          {L.clear}
        </button>
      )}
    </div>
  )
}
