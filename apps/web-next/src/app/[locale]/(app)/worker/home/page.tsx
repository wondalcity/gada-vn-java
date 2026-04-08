import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchPublicJobs, fetchProvinces, fetchTrades } from '@/lib/api/public'
import { JobListGrid } from '@/components/jobs/JobListGrid'
import { ProvinceGrid } from '@/components/public/ProvinceGrid'
import { WorkerSignupCTA } from '@/components/public/WorkerSignupCTA'
import { SearchBar } from '@/components/public/SearchBar'
import { Link } from '@/i18n/navigation'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing' })
  return { title: t('meta.title') }
}

export default async function WorkerHomePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing' })

  const [jobsResult, provinces, trades] = await Promise.all([
    fetchPublicJobs({ page: 1, locale }),
    fetchProvinces(locale),
    fetchTrades(locale),
  ])

  const latestJobs = jobsResult.jobs.slice(0, 6)
  const totalJobs = jobsResult.total
  const totalCities = provinces.length

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0F2247] to-[#0669F7] py-10 md:py-20">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 text-center">
          <h1 className="text-2xl md:text-5xl font-black text-white leading-tight mb-3">
            {t('hero.h1')}<br />
            <span className="text-white/70">{t('hero.h1_highlight')}</span>
          </h1>
          <p className="text-sm md:text-lg text-white/80 mb-6">
            {t('hero.description')}
          </p>

          <SearchBar provinces={provinces} trades={trades} locale={locale} />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xl font-black text-white">{totalJobs.toLocaleString()}+</p>
              <p className="text-xs text-white/70 mt-0.5">{t('hero.stat_jobs')}</p>
            </div>
            <div className="w-px h-6 bg-white/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-xl font-black text-white">{totalCities}+</p>
              <p className="text-xs text-white/70 mt-0.5">{t('hero.stat_cities')}</p>
            </div>
            <div className="w-px h-6 bg-white/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-xl font-black text-white">{t('hero.stat_free')}</p>
              <p className="text-xs text-white/70 mt-0.5">{t('hero.stat_signup')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Province grid */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20">
          <h2 className="text-base md:text-xl font-bold text-[#25282A] mb-4">{t('provinces.section_title')}</h2>
          <ProvinceGrid provinces={provinces} locale={locale} />
        </div>
      </section>

      {/* Latest jobs */}
      <section className="py-8 md:py-16 bg-[#F8F8FA]">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-xl font-bold text-[#25282A]">{t('jobs.section_title')}</h2>
            <Link
              href={'/worker/jobs' as never}
              className="text-sm text-[#0669F7] hover:underline font-medium"
            >
              {t('jobs.view_all')}
            </Link>
          </div>
          <JobListGrid
            jobs={latestJobs}
            locale={locale}
            emptyMessage={t('jobs.empty')}
          />
        </div>
      </section>

      {/* CTA */}
      <WorkerSignupCTA locale={locale} />
    </div>
  )
}
