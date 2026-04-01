import { getTranslations } from 'next-intl/server'
import { Link } from '@/components/navigation'
import type { Province } from '@/lib/api/public'

interface Props {
  provinces: Province[]
  locale: string
}

export async function ProvinceGrid({ provinces, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' })
  const displayProvinces = provinces.slice(0, 10)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {displayProvinces.map(p => (
        <Link
          key={p.slug}
          href={`/locations/${p.slug}`}
          className="group block bg-white border border-[#EFF1F5] rounded-lg p-4 text-center hover:border-[#0669F7] hover:text-[#0669F7] transition-all hover:shadow-sm"
        >
          <p className="text-sm font-semibold text-[#25282A] group-hover:text-[#0669F7] transition-colors">
            {p.nameVi}
          </p>
          <p className="text-xs text-[#98A2B2] mt-1 group-hover:text-[#0669F7] transition-colors">
            {t('provinces.view_jobs')}
          </p>
        </Link>
      ))}
    </div>
  )
}
