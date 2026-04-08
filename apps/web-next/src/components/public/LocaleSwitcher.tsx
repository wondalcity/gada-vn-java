'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/components/navigation'

const LOCALES = ['ko', 'vi', 'en'] as const
type LocaleCode = typeof LOCALES[number]

const LOCALE_META: Record<LocaleCode, { flag: string; short: string }> = {
  ko: { flag: '🇰🇷', short: 'KO' },
  vi: { flag: '🇻🇳', short: 'VI' },
  en: { flag: '🇺🇸', short: 'EN' },
}

export function LocaleSwitcher() {
  const t = useTranslations('common')
  const currentLocale = useLocale() as LocaleCode
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function switchLocale(locale: LocaleCode) {
    router.replace(pathname, { locale })
    setOpen(false)
  }

  const labels: Record<LocaleCode, string> = {
    ko: t('locale.ko'),
    vi: t('locale.vi'),
    en: t('locale.en'),
  }

  const current = LOCALE_META[currentLocale]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-full text-sm font-medium text-[#98A2B2] hover:text-[#25282A] hover:bg-[#EFF1F5] transition-colors"
        aria-label={t('locale.switch_aria')}
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-xs font-semibold">{current.short}</span>
        <svg className="w-3 h-3 shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[190] sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-[#EFF1F5] py-1.5 z-[200]"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
          >
            {LOCALES.map(locale => {
              const meta = LOCALE_META[locale]
              const isSelected = locale === currentLocale
              return (
                <button
                  key={locale}
                  type="button"
                  onClick={() => switchLocale(locale)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[#F2F4F5] ${
                    isSelected ? 'text-[#0669F7] font-semibold' : 'text-[#25282A]'
                  }`}
                >
                  <span className="text-lg leading-none">{meta.flag}</span>
                  <span className="flex-1 text-left">{labels[locale]}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-[#0669F7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
