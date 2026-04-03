import { getTranslations } from 'next-intl/server'
import { Link } from '@/components/navigation'

interface Props {
  locale: string
}

const TOP_PROVINCES = [
  { nameKo: '하노이',  nameVi: 'Hà Nội',         nameEn: 'Hanoi',             slug: 'hn' },
  { nameKo: '호치민',  nameVi: 'Hồ Chí Minh',    nameEn: 'Ho Chi Minh City', slug: 'hcm' },
  { nameKo: '다낭',    nameVi: 'Đà Nẵng',         nameEn: 'Da Nang',          slug: 'dn' },
  { nameKo: '하이퐁',  nameVi: 'Hải Phòng',       nameEn: 'Hai Phong',        slug: 'hp' },
  { nameKo: '빈즈엉',  nameVi: 'Bình Dương',      nameEn: 'Binh Duong',       slug: 'bd' },
]

function getProvinceName(p: typeof TOP_PROVINCES[0], locale: string) {
  if (locale === 'vi') return p.nameVi
  if (locale === 'en') return p.nameEn
  return p.nameKo
}

export async function PublicFooter({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' })

  return (
    <footer className="bg-[#1A1D23] text-white">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <span className="text-2xl font-black text-[#0669F7] tracking-tight">GADA</span>
            <p className="mt-3 text-sm text-[#9CA3AF] leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          {/* Popular regions */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">{t('footer.popular_regions')}</h3>
            <ul className="space-y-2">
              {TOP_PROVINCES.map(p => (
                <li key={p.slug}>
                  <Link
                    href={`/locations/${p.slug}`}
                    className="text-sm text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    {getProvinceName(p, locale)} {t('footer.job_suffix')}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">{t('footer.quick_links')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/jobs" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                  {t('footer.jobs_list')}
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                  {t('footer.register')}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                  {t('footer.login')}
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
