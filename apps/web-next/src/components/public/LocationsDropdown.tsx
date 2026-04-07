'use client'

import { useState, useRef, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { Province } from '@/lib/api/public'

interface Props {
  locale: string
  provinces: Province[]
}

const MAJOR_SLUGS = ['hn', 'hcm', 'dn', 'hp', 'ct', 'bd', 'dn-t', 'qni']

const PROVINCE_ICONS: Record<string, string> = {
  hn: '🏛️', hcm: '🌆', dn: '🌊', hp: '⚓',
  ct: '🛶', bd: '🏭', 'dn-t': '🌿', qni: '⛰️',
}

export function LocationsDropdown({ locale, provinces }: Props) {
  const t = useTranslations('locations')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function onEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function onLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const isActive = pathname.startsWith(`/${locale}/locations`)

  const major = MAJOR_SLUGS
    .map(s => provinces.find(p => p.slug === s))
    .filter(Boolean) as Province[]

  const others = provinces.filter(p => !MAJOR_SLUGS.includes(p.slug))

  return (
    <div ref={ref} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 hover:text-[#0669F7] transition-colors ${
          isActive ? 'text-[#0669F7] font-semibold' : ''
        }`}
      >
        {t('dropdown.nav_label')}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[520px] bg-white rounded-2xl border border-[#EFF1F5] overflow-hidden z-50"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >
          {/* Major cities */}
          <div className="p-4 border-b border-[#EFF1F5]">
            <p className="text-[11px] font-bold text-[#98A2B2] uppercase tracking-wider mb-3">{t('dropdown.major_cities')}</p>
            <div className="grid grid-cols-4 gap-2">
              {major.map(p => (
                <Link
                  key={p.slug}
                  href={`/${locale}/locations/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all hover:border-[#0669F7] hover:bg-[#EEF5FF] group ${
                    pathname === `/${locale}/locations/${p.slug}`
                      ? 'border-[#0669F7] bg-[#EEF5FF]'
                      : 'border-[#EFF1F5]'
                  }`}
                >
                  <span className="text-xl">{PROVINCE_ICONS[p.slug] ?? '🏗️'}</span>
                  <span className="text-xs font-semibold text-[#25282A] group-hover:text-[#0669F7] text-center leading-tight">
                    {p.nameVi}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* All regions */}
          <div className="p-4">
            <p className="text-[11px] font-bold text-[#98A2B2] uppercase tracking-wider mb-3">{t('all_regions')}</p>
            <div className="grid grid-cols-4 gap-x-3 gap-y-1 max-h-48 overflow-y-auto scrollbar-hide">
              {others.map(p => (
                <Link
                  key={p.slug}
                  href={`/${locale}/locations/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[#EEF5FF] hover:text-[#0669F7] ${
                    pathname === `/${locale}/locations/${p.slug}`
                      ? 'bg-[#EEF5FF] text-[#0669F7]'
                      : 'text-[#4B5563]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] shrink-0" />
                  <span className="truncate">{p.nameVi}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* View all */}
          <div className="px-4 py-3 bg-[#F7F8FA] border-t border-[#EFF1F5]">
            <Link
              href={`/${locale}/locations`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0669F7] hover:underline"
            >
              {t('dropdown.view_all_map')}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
