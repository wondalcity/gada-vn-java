import { Link } from '@/components/navigation'
import PublicHeaderSearch from './PublicHeaderSearch'
import { PublicHeaderAuthMenu } from './PublicHeaderAuthMenu'
import type { AuthUser } from '@/lib/auth/server'

interface Props {
  locale: string
  user?: AuthUser | null
}

const TOP_PROVINCES = [
  { nameKo: '하노이',  slug: 'ha-noi' },
  { nameKo: '호치민',  slug: 'ho-chi-minh-city' },
  { nameKo: '다낭',    slug: 'da-nang' },
  { nameKo: '하이퐁',  slug: 'hai-phong' },
  { nameKo: '빈즈엉',  slug: 'binh-duong' },
]

export function PublicHeader({ locale, user }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DDDDDD] shadow-sm">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-black text-[#0669F7] tracking-tight">GADA</span>
          <span className="hidden sm:block text-xs text-[#7A7B7A] font-medium">베트남 건설 일자리</span>
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#25282A]">
          <Link href="/jobs" className="hover:text-[#0669F7] transition-colors">공고 목록</Link>
          <div className="relative group">
            <button className="hover:text-[#0669F7] transition-colors flex items-center gap-1">
              지역별 공고
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-[#DDDDDD] py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-36 z-50">
              {TOP_PROVINCES.map(p => (
                <Link
                  key={p.slug}
                  href={`/locations/${p.slug}`}
                  className="block px-4 py-2 text-sm hover:bg-[#F5F7FA] hover:text-[#0669F7]"
                >
                  {p.nameKo}
                </Link>
              ))}
              <div className="border-t border-[#DDDDDD] mt-1 pt-1">
                <Link href="/locations" className="block px-4 py-2 text-sm text-[#7A7B7A] hover:text-[#0669F7]">
                  전체 지역 보기 →
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Search + Auth */}
        <div className="flex items-center gap-1 shrink-0">
          <PublicHeaderSearch locale={locale} />
          {user ? (
            <>
              {/* Notification bell */}
              <Link
                href="/worker/notifications"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#EFF1F5] transition-colors"
                aria-label="알림"
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
                href={`/${locale}/login`}
                className="hidden sm:block text-sm font-medium text-[#25282A] hover:text-[#0669F7] px-3 py-1.5"
              >
                로그인
              </Link>
              <Link
                href={`/${locale}/register`}
                className="text-sm font-semibold text-white bg-[#0669F7] hover:bg-blue-700 px-4 py-1.5 rounded-full transition-colors"
              >
                무료 가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
