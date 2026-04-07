'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/components/navigation'

const LOCALES = ['ko', 'vi', 'en'] as const
type LocaleCode = typeof LOCALES[number]

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

  const shortLabels: Record<LocaleCode, string> = {
    ko: 'KO',
    vi: 'VI',
    en: 'EN',
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-full text-sm font-medium text-[#98A2B2] hover:text-[#25282A] hover:bg-[#EFF1F5] transition-colors"
        aria-label={t('locale.switch_aria')}
      >
        {/* Globe icon */}
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="hidden sm:inline">{shortLabels[currentLocale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-2xl shadow-lg border border-[#EFF1F5] py-1 z-[200]">
          {LOCALES.map(locale => (
            <button
              key={locale}
              type="button"
              onClick={() => switchLocale(locale)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F2F4F5] ${
                locale === currentLocale
                  ? 'text-[#0669F7] font-semibold'
                  : 'text-[#25282A]'
              }`}
            >
              {labels[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
