'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface CanvasPoint {
  x: number
  y: number
}

export function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<CanvasPoint | null>(null)
  const isEmpty = useRef(true)
  const [hasDrawn, setHasDrawn] = useState(false)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  const initCanvas = useCallback(() => {
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
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      initCanvas()
    })
    return () => cancelAnimationFrame(frame)
  }, [initCanvas])

  const getPoint = useCallback((e: MouseEvent | TouchEvent): CanvasPoint | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return {
      x: (e as MouseEvent).clientX - rect.left,
      y: (e as MouseEvent).clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback(
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
      setHasDrawn(true)
    },
    [getCtx, getPoint],
  )

  const draw = useCallback(
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
      setHasDrawn(true)
    },
    [getCtx, getPoint],
  )

  const stopDrawing = useCallback(() => {
    isDrawing.current = false
    lastPoint.current = null
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = getCtx()
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    isEmpty.current = true
    setHasDrawn(false)
  }, [getCtx])

  const getDataUrl = useCallback((): string => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }, [])

  const checkIsEmpty = useCallback(() => isEmpty.current, [])

  return {
    canvasRef,
    hasDrawn,
    startDrawing,
    draw,
    stopDrawing,
    clear,
    getDataUrl,
    checkIsEmpty,
    initCanvas,
  }
}
