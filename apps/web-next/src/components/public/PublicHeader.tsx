import { getTranslations } from 'next-intl/server'
import { Link } from '@/components/navigation'
import PublicHeaderSearch from './PublicHeaderSearch'
import { PublicHeaderAuthMenu } from './PublicHeaderAuthMenu'
import { LocationsDropdown } from './LocationsDropdown'
import type { AuthUser } from '@/lib/auth/server'
import type { Province } from '@/lib/api/public'

interface Props {
  locale: string
  user?: AuthUser | null
  provinces?: Province[]
}

export async function PublicHeader({ locale, user, provinces = [] }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' })
  const tc = await getTranslations({ locale, namespace: 'common' })

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DDDDDD] shadow-sm">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img src="/logo.png" alt="GADA VN" className="h-8 w-auto" />
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#25282A]">
          <Link href="/jobs" className="hover:text-[#0669F7] transition-colors">{t('header.jobs_list')}</Link>
          <LocationsDropdown locale={locale} provinces={provinces} />
        </nav>

        {/* Search + Auth */}
        <div className="flex items-center gap-1 shrink-0">
          <PublicHeaderSearch locale={locale} />
          {user ? (
            <>
              <Link
                href="/worker/notifications"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#EFF1F5] transition-colors"
                aria-label={tc('nav.notifications')}
              >
                <svg className="w-5 h-5 text-[#25282A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <PublicHeaderAuthMenu
                locale={locale}
                userName={user.name}
                isManager={user.isManager}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:block text-sm font-medium text-[#25282A] hover:text-[#0669F7] px-3 py-1.5"
              >
                {tc('nav.login')}
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-white bg-[#0669F7] hover:bg-blue-700 px-4 py-1.5 rounded-full transition-colors"
              >
                {t('header.register_free')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
