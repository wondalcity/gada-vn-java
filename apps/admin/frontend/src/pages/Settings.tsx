import { useLanguage, useAdminTranslation, type AdminLocale } from '../context/LanguageContext'

const LOCALES: { code: AdminLocale; flag: string }[] = [
  { code: 'ko', flag: '🇰🇷' },
  { code: 'vi', flag: '🇻🇳' },
  { code: 'en', flag: '🇺🇸' },
]

export default function Settings() {
  const { t } = useAdminTranslation()
  const { locale, setLocale } = useLanguage()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('settings.title')}</h1>

      {/* Language section */}
      <div className="bg-white rounded-2xl border border-[#EFF1F5] shadow-sm p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">{t('settings.language.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.language.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-3">
          {LOCALES.map(({ code, flag }) => {
            const isCurrent = code === locale
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={[
                  'flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all',
                  isCurrent
                    ? 'border-[#0669F7] bg-blue-50'
                    : 'border-[#EFF1F5] bg-white hover:border-[#0669F7]/40 hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="text-2xl">{flag}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isCurrent ? 'text-[#0669F7]' : 'text-gray-900'}`}>
                    {t(`settings.language.${code}`)}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-[#0669F7] mt-0.5">{t('settings.language.current_suffix')}</p>
                  )}
                </div>
                {isCurrent && (
                  <svg className="w-5 h-5 text-[#0669F7] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
