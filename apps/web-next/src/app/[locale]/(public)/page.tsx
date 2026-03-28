import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchPublicJobs, fetchProvinces, fetchTrades } from '@/lib/api/public'
import { JobListGrid } from '@/components/jobs/JobListGrid'
import { ProvinceGrid } from '@/components/public/ProvinceGrid'
import { WorkerSignupCTA } from '@/components/public/WorkerSignupCTA'
import { SearchBar } from '@/components/public/SearchBar'

export const revalidate = 300

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'GADA VN — 베트남 건설 일용직 구인구직',
    description: '베트남 전역 건설 현장의 일용직 일자리를 찾아보세요. 하노이, 호치민, 다낭 등 지역별 공고.',
    openGraph: {
      title: 'GADA VN — 베트남 건설 일용직 구인구직',
      description: '베트남 전역 건설 현장의 일용직 일자리를 찾아보세요.',
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : locale === 'vi' ? 'vi_VN' : 'en_US',
      url: `https://gada.vn/${locale}`,
    },
    alternates: {
      canonical: `https://gada.vn/${locale}`,
      languages: {
        ko: 'https://gada.vn/ko',
        vi: 'https://gada.vn/vi',
        en: 'https://gada.vn/en',
      },
    },
  }
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params

  const [jobsResult, provinces, trades] = await Promise.all([
    fetchPublicJobs({ page: 1, locale }),
    fetchProvinces(locale),
    fetchTrades(locale),
  ])

  const latestJobs = jobsResult.jobs.slice(0, 6)
  const totalJobs = jobsResult.total
  const totalCities = provinces.length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'GADA VN 최신 건설 일자리',
    itemListElement: latestJobs.map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: job.titleKo,
      url: `https://gada.vn/${locale}/jobs/${job.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0F2247] to-[#0669F7] py-16 md:py-24">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
            베트남 건설 일자리<br />
            <span className="text-blue-200">한 곳에서 찾는다</span>
          </h1>
          <p className="text-base md:text-lg text-blue-100 mb-8">
            하노이부터 호치민까지, 전국 건설 현장 일용직 공고
          </p>

          {/* Search bar (client component for interactivity) */}
          <SearchBar provinces={provinces} trades={trades} locale={locale} />

          {/* Stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{totalJobs.toLocaleString()}+</p>
              <p className="text-xs text-blue-200 mt-0.5">활성 공고</p>
            </div>
            <div className="w-px h-8 bg-white/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">{totalCities}+</p>
              <p className="text-xs text-blue-200 mt-0.5">도시</p>
            </div>
            <div className="w-px h-8 bg-white/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">무료</p>
              <p className="text-xs text-blue-200 mt-0.5">회원가입</p>
            </div>
          </div>
        </div>
      </section>

      {/* Province grid */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20">
          <h2 className="text-xl font-bold text-[#25282A] mb-6">지역별 공고 찾기</h2>
          <ProvinceGrid provinces={provinces} locale={locale} />
        </div>
      </section>

      {/* Latest jobs */}
      <section className="py-12 md:py-16 bg-[#F2F4F5]">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#25282A]">최신 공고</h2>
            <a
              href={`/${locale}/jobs`}
              className="text-sm text-[#0669F7] hover:underline font-medium"
            >
              전체 보기 →
            </a>
          </div>
          <JobListGrid
            jobs={latestJobs}
            locale={locale}
            emptyMessage="현재 등록된 공고가 없습니다."
          />
        </div>
      </section>

      {/* CTA */}
      <WorkerSignupCTA />
    </>
  )
}
