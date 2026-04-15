import { getTranslations } from 'next-intl/server'
import { Link } from '@/components/navigation'
import type { Province, Trade, PublicJob } from '@/lib/api/public'
import { Breadcrumb } from '@/components/public/Breadcrumb'
import { JobListGrid } from '@/components/jobs/JobListGrid'
import { Pagination } from '@/components/jobs/Pagination'
import { ProvinceGrid } from '@/components/public/ProvinceGrid'
import { WorkerSignupCTA } from '@/components/public/WorkerSignupCTA'

interface Props {
  province: Province
  jobs: PublicJob[]
  total: number
  page: number
  totalPages: number
  trades: Trade[]
  selectedTrade?: number
  locale: string
}

function getTradeName(trade: Trade, locale: string): string {
  if (locale === 'vi') return trade.nameVi ?? trade.nameKo
  if (locale === 'en') return (trade as any).nameEn ?? trade.nameKo
  return trade.nameKo
}

export async function ProvinceJobsView({
  province,
  jobs,
  total,
  page,
  totalPages,
  trades,
  selectedTrade,
  locale,
}: Props) {
  const t = await getTranslations({ locale, namespace: 'locations' })
  const basePath = `/locations/${province.slug}`

  return (
    <div>
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: t('breadcrumb_home'), href: '/' },
            { label: t('breadcrumb_locations'), href: '/locations' },
            { label: t('province.breadcrumb_label', { nameVi: province.nameVi }) },
          ]}
        />

        {/* Hero */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[#25282A]">
              {t('province.hero_title', { nameVi: province.nameVi })}
            </h1>
            <span className="text-sm font-semibold text-[#0669F7] bg-[#E6F0FE] border border-[#B3D9FF] px-3 py-1 rounded-full">
              {t('province.job_count', { total })}
            </span>
          </div>
          <p className="text-sm text-[#98A2B2]">
            {t('province.hero_desc', { nameVi: province.nameVi, nameEn: province.nameEn })}
          </p>
        </div>

        {/* Trade filter — pill buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={basePath}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !selectedTrade
                ? 'bg-[#0669F7] text-white border-[#0669F7]'
                : 'bg-white text-[#98A2B2] border-[#EFF1F5] hover:border-[#0669F7] hover:text-[#0669F7]'
            }`}
          >
            {t('province.all_trades')}
          </Link>
          {trades.map(trade => (
            <Link
              key={trade.id}
              href={`${basePath}?trade=${trade.id}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedTrade === trade.id
                  ? 'bg-[#0669F7] text-white border-[#0669F7]'
                  : 'bg-white text-[#98A2B2] border-[#EFF1F5] hover:border-[#0669F7] hover:text-[#0669F7]'
              }`}
            >
              {getTradeName(trade, locale)}
            </Link>
          ))}
        </div>

        {/* Job grid */}
        <JobListGrid
          jobs={jobs}
          locale={locale}
          emptyMessage={t('province.no_jobs')}
        />

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath={basePath}
          searchParams={selectedTrade ? { trade: String(selectedTrade) } : undefined}
        />
      </div>

      {/* WorkerSignupCTA */}
      <WorkerSignupCTA locale={locale} />

      {/* Other regions section */}
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 py-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#25282A]">{t('other_regions')}</h2>
          <Link href="/jobs" className="text-sm text-[#0669F7] hover:underline">
            {t('view_all_jobs')}
          </Link>
        </div>
        <ProvinceGrid
          provinces={[
            { code: 'HN', nameVi: 'Hà Nội', nameEn: 'Hanoi', slug: 'hn' },
            { code: 'HCM', nameVi: 'Hồ Chí Minh', nameEn: 'Ho Chi Minh City', slug: 'hcm' },
            { code: 'DN', nameVi: 'Đà Nẵng', nameEn: 'Da Nang', slug: 'dn' },
            { code: 'HP', nameVi: 'Hải Phòng', nameEn: 'Hai Phong', slug: 'hp' },
            { code: 'BD', nameVi: 'Bình Dương', nameEn: 'Binh Duong', slug: 'bd' },
          ].filter(p => p.slug !== province.slug)}
          locale={locale}
        />
      </div>
    </div>
  )
}
