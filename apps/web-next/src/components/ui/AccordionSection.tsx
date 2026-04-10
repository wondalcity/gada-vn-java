'use client'

import * as React from 'react'

interface AccordionSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  contentClassName?: string
  className?: string
}

export function AccordionSection({
  title,
  children,
  defaultOpen = true,
  contentClassName = 'space-y-4',
  className = '',
}: AccordionSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border transition-colors duration-200 overflow-hidden ${
        open ? 'border-[#0669F7]' : 'border-[#EFF1F5] hover:border-[#B3D9FF]'
      } ${className}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left select-none"
        aria-expanded={open}
      >
        <span
          className={`text-sm font-semibold transition-colors duration-200 ${
            open ? 'text-[#0669F7]' : 'text-[#25282A]'
          }`}
        >
          {title}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-all duration-200 ${
            open ? 'rotate-180 text-[#0669F7]' : 'text-[#98A2B2]'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Animated content — grid trick for smooth height transition */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.22s ease',
        }}
        aria-hidden={!open}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className={`border-t border-[#EFF1F5] px-5 pb-5 pt-4 ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
