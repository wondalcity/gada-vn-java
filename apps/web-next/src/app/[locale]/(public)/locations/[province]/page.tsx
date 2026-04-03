import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchProvinceBySlug, fetchPublicJobs, fetchTrades } from '@/lib/api/public'
import { ProvinceJobsView } from '@/components/locations/ProvinceJobsView'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: string; province: string }>
  searchParams: Promise<{ trade?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, province: provinceSlug } = await params
  const province = await fetchProvinceBySlug(provinceSlug, locale)
  if (!province) return {}

  const title = `${province.nameVi} 건설 일자리 | GADA VN`
  const description = `${province.nameVi} (${province.nameEn}) 지역 건설 현장 일용직 공고를 확인하세요.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : locale === 'vi' ? 'vi_VN' : 'en_US',
      url: `https://gada.vn/${locale}/locations/${provinceSlug}`,
    },
    alternates: {
      canonical: `https://gada.vn/${locale}/locations/${provinceSlug}`,
      languages: {
        ko: `https://gada.vn/ko/locations/${provinceSlug}`,
        vi: `https://gada.vn/vi/locations/${provinceSlug}`,
        en: `https://gada.vn/en/locations/${provinceSlug}`,
      },
    },
  }
}

export default async function ProvinceJobsPage({ params, searchParams }: Props) {
  const { locale, province: provinceSlug } = await params
  const { trade, page: pageStr } = await searchParams
  const page = Math.max(1, Number(pageStr ?? 1))

  const [province, result, trades] = await Promise.all([
    fetchProvinceBySlug(provinceSlug, locale),
    fetchPublicJobs({
      provinceSlug,
      tradeId: trade ? Number(trade) : undefined,
      page,
      locale,
    }),
    fetchTrades(locale),
  ])

  if (!province) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${province.nameVi} 건설 일자리`,
    itemListElement: result.jobs.map((job, i) => ({
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
      <ProvinceJobsView
        province={province}
        jobs={result.jobs}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        trades={trades}
        selectedTrade={trade ? Number(trade) : undefined}
        locale={locale}
      />
    </>
  )
}
