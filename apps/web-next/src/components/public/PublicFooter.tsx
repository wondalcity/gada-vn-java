import { Link } from '@/components/navigation'

interface Props {
  locale: string
}

const TOP_PROVINCES = [
  { nameKo: '하노이',  slug: 'ha-noi' },
  { nameKo: '호치민',  slug: 'ho-chi-minh-city' },
  { nameKo: '다낭',    slug: 'da-nang' },
  { nameKo: '하이퐁',  slug: 'hai-phong' },
  { nameKo: '빈즈엉',  slug: 'binh-duong' },
]

export function PublicFooter({ locale }: Props) {
  return (
    <footer className="bg-[#1A1D23] text-white">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <span className="text-2xl font-black text-[#0669F7] tracking-tight">GADA</span>
            <p className="mt-3 text-sm text-[#9CA3AF] leading-relaxed">
              베트남 전역 건설 현장의 일용직 일자리를 연결합니다. 하노이, 호치민, 다낭 등 전국 건설 현장 공고.
            </p>
          </div>

          {/* 인기 지역 */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">인기 지역</h3>
            <ul className="space-y-2">
              {TOP_PROVINCES.map(p => (
                <li key={p.slug}>
                  <Link
                    href={`/locations/${p.slug}`}
                    className="text-sm text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    {p.nameKo} 건설 일자리
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 빠른 링크 */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">빠른 링크</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/jobs" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                  공고 목록
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                  회원가입
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                  로그인
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2D3139] mt-10 pt-6 text-center">
          <p className="text-xs text-[#6B7280]">© 2026 GADA VN. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
