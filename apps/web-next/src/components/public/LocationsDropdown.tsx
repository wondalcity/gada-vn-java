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

function ProvinceIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
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

  const isActive = pathname.startsWith('/locations')

  const major = MAJOR_SLUGS
    .map(s => provinces.find(p => p.slug === s))
    .filter(Boolean) as Province[]

  const others = provinces.filter(p => !MAJOR_SLUGS.includes(p.slug))

  return (
    <div ref={ref} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 hover:text-primary transition-colors ${
          isActive ? 'text-primary font-semibold' : ''
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
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[520px] bg-surface rounded-3xl border border-outline overflow-hidden z-50"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >
          {/* Major cities */}
          <div className="p-4 border-b border-outline">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">{t('dropdown.major_cities')}</p>
            <div className="grid grid-cols-4 gap-2">
              {major.map(p => (
                <Link
                  key={p.slug}
                  href={`/locations/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-sm border transition-all hover:border-primary hover:bg-primary-8 group ${
                    pathname === `/locations/${p.slug}`
                      ? 'border-primary bg-primary-8'
                      : 'border-outline'
                  }`}
                >
                  <ProvinceIcon />
                  <span className="text-xs font-semibold text-on-surface group-hover:text-primary text-center leading-tight">
                    {p.nameVi}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* All regions */}
          <div className="p-4">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">{t('all_regions')}</p>
            <div className="grid grid-cols-4 gap-x-3 gap-y-1 max-h-48 overflow-y-auto scrollbar-hide">
              {others.map(p => (
                <Link
                  key={p.slug}
                  href={`/locations/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors hover:bg-primary-8 hover:text-primary ${
                    pathname === `/locations/${p.slug}`
                      ? 'bg-primary-8 text-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-outline shrink-0" />
                  <span className="truncate">{p.nameVi}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* View all */}
          <div className="px-4 py-3 bg-surface-container border-t border-outline">
            <Link
              href={'/locations'}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline"
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
