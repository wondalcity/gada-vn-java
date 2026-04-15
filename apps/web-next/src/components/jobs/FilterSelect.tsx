'use client'

import * as React from 'react'

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  options: FilterSelectOption[]
  placeholder: string
  onChange: (v: string) => void
  searchable?: boolean
  searchPlaceholder?: string
}

export function FilterSelect({
  value,
  options,
  placeholder,
  onChange,
  searchable = false,
  searchPlaceholder = '검색...',
}: FilterSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [fixedTop, setFixedTop] = React.useState(0)
  const [fixedLeft, setFixedLeft] = React.useState(0)
  const [dropdownWidth, setDropdownWidth] = React.useState(200)

  const filtered = searchable && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const portal = document.getElementById('filter-select-portal')
      if (containerRef.current?.contains(e.target as Node)) return
      if (portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    function handleClose(e: Event) {
      const portal = document.getElementById('filter-select-portal')
      if (portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    function handleResize() { setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleClose as EventListener, true)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleClose as EventListener, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

  React.useEffect(() => {
    if (open && searchable) {
      setSearch('')
      const t = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open, searchable])

  function openDropdown() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const dropH = searchable ? 320 : 240
      const w = Math.max(rect.width, 200)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const top = spaceBelow >= dropH ? rect.bottom + 4 : Math.max(8, rect.top - dropH - 4)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
      setFixedTop(top)
      setFixedLeft(left)
      setDropdownWidth(w)
    }
    setOpen(true)
  }

  function select(v: string) {
    onChange(v)
    setOpen(false)
  }

  const selectedLabel = options.find(o => o.value === value)?.label

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={openDropdown}
        className={[
          'w-full px-3 py-2.5 rounded-xl border text-sm text-left flex items-center justify-between min-h-[44px] bg-white transition-colors',
          open
            ? 'border-[#0669F7] ring-2 ring-[#0669F7]/10'
            : 'border-[#EFF1F5] hover:border-[#0669F7]',
          value ? 'text-[#25282A]' : 'text-[#98A2B2]',
        ].join(' ')}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <svg
          className={`w-4 h-4 shrink-0 ml-2 transition-transform ${open ? 'rotate-180 text-[#0669F7]' : 'text-[#98A2B2]'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id="filter-select-portal"
          className="bg-white rounded-2xl shadow-2xl border border-[#EFF1F5] overflow-hidden"
          style={{ position: 'fixed', top: fixedTop, left: fixedLeft, zIndex: 9999, width: dropdownWidth }}
        >
          {searchable && (
            <div className="p-2 border-b border-[#EFF1F5]">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B2] pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EFF1F5] text-sm text-[#25282A] placeholder-[#98A2B2] focus:outline-none focus:border-[#0669F7]"
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[#98A2B2] py-6">검색 결과가 없습니다</p>
            ) : (
              filtered.map(opt => {
                const isSelected = value === opt.value
                return (
                  <button
                    key={opt.value || '__all__'}
                    type="button"
                    onClick={() => select(opt.value)}
                    className={[
                      'w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 transition-colors border-b border-[#EFF1F5] last:border-0 text-sm',
                      isSelected
                        ? 'bg-[#EEF4FF] text-[#0669F7] font-medium'
                        : 'text-[#25282A] hover:bg-[#F2F4F5]',
                    ].join(' ')}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 shrink-0 text-[#0669F7]" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
