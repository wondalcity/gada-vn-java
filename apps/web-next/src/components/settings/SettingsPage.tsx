'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SettingsSection {
  id: string
  title: string
  items: React.ReactNode
}

interface Props {
  currentLocale: string
  extraSections?: SettingsSection[]
}

// ── Language Section ──────────────────────────────────────────────────────────

function LanguageSection({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations('common')
  const router = useRouter()
  const pathname = usePathname()
  const [pending, setPending] = React.useState<string | null>(null)

  const LOCALES = [
    { code: 'ko', label: t('settings.language.ko'), flag: '🇰🇷' },
    { code: 'vi', label: t('settings.language.vi'), flag: '🇻🇳' },
    { code: 'en', label: t('settings.language.en'), flag: '🇺🇸' },
  ]

  function handleSelect(code: string) {
    if (code === currentLocale || pending) return
    setPending(code)
    router.replace(pathname, { locale: code as 'ko' | 'vi' | 'en' })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#25282A]">{t('settings.language.title')}</h2>
        <p className="text-xs text-[#98A2B2] mt-1">{t('settings.language.subtitle')}</p>
      </div>
      <div className="flex flex-col gap-3">
        {LOCALES.map(({ code, label, flag }) => {
          const isCurrent = code === currentLocale
          const isLoading = pending === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleSelect(code)}
              disabled={!!pending}
              className={[
                'flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all',
                isCurrent
                  ? 'border-[#0669F7] bg-blue-50'
                  : 'border-[#EFF1F5] bg-white hover:border-[#0669F7]/40 hover:bg-gray-50',
                !!pending && !isCurrent ? 'opacity-40' : '',
              ].join(' ')}
            >
              <span className="text-2xl">{flag}</span>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isCurrent ? 'text-[#0669F7]' : 'text-[#25282A]'}`}>{label}</p>
                {isCurrent && (
                  <p className="text-xs text-[#0669F7] mt-0.5">{t('settings.language.current_suffix')}</p>
                )}
              </div>
              {isLoading ? (
                <svg className="w-4 h-4 text-[#0669F7] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isCurrent ? (
                <svg className="w-5 h-5 text-[#0669F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsPage({ currentLocale, extraSections = [] }: Props) {
  const t = useTranslations('common')

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-xl font-bold text-[#25282A]">{t('settings.title')}</h1>

      {/* Language section */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm p-5 md:p-8">
        <LanguageSection currentLocale={currentLocale} />
      </div>

      {/* Extra extensible sections */}
      {extraSections.map((section) => (
        <div key={section.id} className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm p-5 md:p-8">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#25282A]">{section.title}</h2>
            {section.items}
          </div>
        </div>
      ))}
    </div>
  )
}
