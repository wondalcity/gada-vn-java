import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchPublicSiteBySlug, fetchPublicJobs } from '@/lib/api/public'
import { SiteDetailView } from '@/components/sites/SiteDetailView'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const site = await fetchPublicSiteBySlug(slug, locale).catch(() => null)
  if (!site) return {}

  const title = `${site.nameKo} | GADA VN`
  const description = `${site.nameKo} 건설 현장 — ${site.address}. 현재 ${site.activeJobCount}건의 공고가 있습니다.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : locale === 'vi' ? 'vi_VN' : 'en_US',
      ...(site.coverImageUrl ? { images: [{ url: site.coverImageUrl }] } : {}),
    },
    alternates: {
      canonical: `https://gada.vn/${locale}/sites/${slug}`,
      languages: {
        ko: `https://gada.vn/ko/sites/${slug}`,
        vi: `https://gada.vn/vi/sites/${slug}`,
        en: `https://gada.vn/en/sites/${slug}`,
      },
    },
  }
}

export default async function SiteDetailPage({ params }: Props) {
  const { locale, slug } = await params

  const [site, jobsResult] = await Promise.all([
    fetchPublicSiteBySlug(slug, locale).catch(() => null),
    fetchPublicJobs({ siteSlug: slug, locale }).catch(() => ({
      jobs: [],
      total: 0,
      page: 1,
      totalPages: 0,
    })),
  ])

  if (!site) notFound()

  const siteLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.nameKo,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address,
      addressCountry: 'VN',
      addressRegion: site.province,
    },
    ...(site.lat && site.lng
      ? { geo: { '@type': 'GeoCoordinates', latitude: site.lat, longitude: site.lng } }
      : {}),
    ...(site.coverImageUrl ? { image: site.coverImageUrl } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }}
      />
      <SiteDetailView site={site} jobs={jobsResult.jobs} locale={locale} />
    </>
  )
}
