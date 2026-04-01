import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { fetchPublicJobs, fetchProvinces, fetchTrades } from '@/lib/api/public'
import { Breadcrumb } from '@/components/public/Breadcrumb'
import { WorkerJobsClient } from '@/components/jobs/WorkerJobsClient'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    q?: string
    province?: string
    trade?: string
    page?: string
    lat?: string
    lng?: string
    radius?: string
    status?: string
    view?: string
  }>
}

export const revalidate = 60

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'jobs' })
  return {
    title: t('listing.meta.title'),
    description: t('listing.meta.description'),
    openGraph: {
      title: t('listing.meta.title'),
      description: t('listing.meta.description'),
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : locale === 'vi' ? 'vi_VN' : 'en_US',
    },
    alternates: {
      canonical: `https://gada.vn/${locale}/jobs`,
      languages: {
        ko: 'https://gada.vn/ko/jobs',
        vi: 'https://gada.vn/vi/jobs',
        en: 'https://gada.vn/en/jobs',
      },
    },
  }
}

export default async function JobsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'jobs' })
  const { q, province, trade, page: pageStr, lat, lng, radius, status, view } = await searchParams

  const page = Math.max(1, Number(pageStr ?? 1))
  const tradeId = trade ? Number(trade) : undefined
  const selectedLat = lat ? Number(lat) : undefined
  const selectedLng = lng ? Number(lng) : undefined
  const selectedRadius = radius ? Number(radius) : 30

  const [result, provinces, trades] = await Promise.all([
    fetchPublicJobs({
      q: q?.trim() || undefined,
      provinceSlug: province,
      tradeId,
      page,
      locale,
      lat: selectedLat,
      lng: selectedLng,
      radiusKm: selectedLat != null ? selectedRadius : undefined,
      statusFilter: status,
    }),
    fetchProvinces(locale),
    fetchTrades(locale),
  ])

  const { jobs, total, totalPages } = result

  const paginationParams: Record<string, string> = {}
  if (q)        paginationParams.q = q
  if (province) paginationParams.province = province
  if (trade)    paginationParams.trade = trade
  if (lat)      paginationParams.lat = lat
  if (lng)      paginationParams.lng = lng
  if (radius)   paginationParams.radius = radius
  if (status)   paginationParams.status = status

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('listing.heading'),
    itemListElement: jobs.map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: job.titleKo,
      url: `https://gada.vn/${locale}/jobs/${job.slug}`,
    })),
  }

  const geoActive = selectedLat != null && selectedLng != null
  const emptyMessage = q
    ? t('listing.empty_search', { q })
    : geoActive
    ? t('listing.empty_geo')
    : t('listing.empty')

  const activeFilterCount = [q, province, trade, geoActive ? 'geo' : null, status].filter(Boolean).length

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20 pt-6">
        <Breadcrumb
          items={[
            { label: t('listing.breadcrumb_home'), href: '/' },
            { label: t('listing.breadcrumb_jobs') },
          ]}
        />
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-[#25282A]">{t('listing.heading')}</h1>
        </div>
      </div>

      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-20">
        <Suspense>
          <WorkerJobsClient
            jobs={jobs}
            total={total}
            totalPages={totalPages}
            page={page}
            provinces={provinces}
            trades={trades}
            locale={locale}
            q={q}
            province={province}
            tradeId={tradeId}
            selectedLat={selectedLat}
            selectedLng={selectedLng}
            selectedRadius={selectedRadius}
            selectedStatus={status}
            paginationParams={paginationParams}
            geoActive={geoActive}
            emptyMessage={emptyMessage}
            activeFilterCount={activeFilterCount}
            initialView={view === 'map' ? 'map' : 'list'}
            basePath="/jobs"
            fetchSavedLocation={false}
          />
        </Suspense>
      </div>
    </>
  )
}
