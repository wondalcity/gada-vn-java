'use client'

import * as React from 'react'

// ── Singleton loading counter ─────────────────────────────────────────────────
// Tracked outside React so it works across all component trees.

let _count = 0
const _listeners: Set<(active: boolean) => void> = new Set()

export function incrementLoading() {
  _count++
  _listeners.forEach(fn => fn(_count > 0))
}

export function decrementLoading() {
  _count = Math.max(0, _count - 1)
  _listeners.forEach(fn => fn(_count > 0))
}

// ── GlobalLoadingBar component ────────────────────────────────────────────────

export function GlobalLoadingBar() {
  const [active, setActive] = React.useState(false)
  const [visible, setVisible] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    function onChange(isActive: boolean) {
      if (isActive) {
        setVisible(true)
        setActive(true)
      } else {
        setActive(false)
        // Keep bar visible briefly to show 100% completion, then fade out
        timerRef.current = setTimeout(() => setVisible(false), 400)
      }
    }
    _listeners.add(onChange)
    return () => {
      _listeners.delete(onChange)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-[#0669F7] transition-all duration-300 ease-out"
        style={{
          width: active ? '85%' : '100%',
          opacity: active ? 1 : 0,
          transitionDuration: active ? '2s' : '0.3s',
        }}
      />
    </div>
  )
}
